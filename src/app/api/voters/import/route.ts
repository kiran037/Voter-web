import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { Buffer } from "node:buffer";

export const runtime = "nodejs"; // Node APIs (Buffer) + SheetJS

type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";

function toBool(v: unknown): boolean | null {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return null;
}
function toColour(v: unknown): Colour | null {
  if (!v) return null;
  const s = String(v).trim().toUpperCase();
  if (s === "OUR" || s === "OPPOSITE" || s === "DOUBTFUL" || s === "OTHER") return s as Colour;
  return null;
}

// --- tiny CSV splitter (supports quotes) ---
function escCsvSplit(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === `"` && line[i + 1] === `"`) { cur += `"`; i++; }
      else if (ch === `"`) { inQ = false; }
      else cur += ch;
    } else {
      if (ch === `"`) inQ = true;
      else if (ch === `,`) { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
function parseCsv(buf: Buffer): Record<string, string>[] {
  const text = buf.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = escCsvSplit(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = escCsvSplit(lines[i]);
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => { rec[h] = cols[idx] ?? ""; });
    rows.push(rec);
  }
  return rows;
}

// --- SheetJS loader (single, reliable path) ---
async function parseXlsx(buf: Buffer): Promise<Record<string, any>[]> {
  try {
    const mod = await import("xlsx"); // rely on package root
    const XLSX: any = (mod as any).default?.read ? (mod as any).default : mod;

    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { raw: false }) as Record<string, any>[];
  } catch (err: any) {
    const e = new Error("XLSX parsing not available. Ensure `xlsx` is installed.");
    (e as any).status = 400;
    throw e;
  }
}

// Map input row -> voter fields expected by Prisma
function mapRowToVoter(row: Record<string, any>) {
  const pick = (keys: string[], def: any = null) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
      if (found) return row[found];
    }
    return def;
  };
  const name = String(pick(["name", "full name", "voter_name"], "")).trim();
  const village = (pick(["village", "area"], "") as string).trim() || null;
  const voterId = (pick(["voterId", "voter_id", "epic"], "") as string).trim() || null;
  const mobile1 = (pick(["mobile1", "phone", "mobile"], "") as string).trim() || null;
  const mobile2 = (pick(["mobile2", "alt_phone"], "") as string).trim() || null;
  const colourCode = toColour(pick(["colourCode", "color", "segment"], "")) ?? "OTHER";
  const voted = toBool(pick(["voted"], "")) ?? false;
  const starVoter = toBool(pick(["starVoter", "star"], "")) ?? false;
  const dead = toBool(pick(["dead", "is_dead"], "")) ?? false;

  const n = (x: any) => (x === "" || x == null ? null : Number(x));
  const boothNo = n(pick(["boothNo", "booth_no"]));
  const partNo = n(pick(["partNo", "part_no"]));
  const srn = n(pick(["srn", "serial"]));

  return {
    name, village, voterId, mobile1, mobile2,
    colourCode, voted, starVoter, dead,
    boothNo, partNo, srn,
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required (CSV/XLSX)" }, { status: 400 });
    }

  const filename = file.name || "upload";
  const buf = Buffer.from(await file.arrayBuffer());

  // Create batch (processing)
  const batch = await prisma.importBatch.create({
    data: {
      fileName: filename,
      status: "PROCESSING",
      uploadedById: user.id,
      startedAt: new Date(),
    },
  });

  let rows: Record<string, any>[] = [];
  try {
    if (/\.(xlsx|xlsm|xls)$/i.test(filename)) {
      rows = await parseXlsx(buf);
    } else {
      rows = parseCsv(buf);
    }
  } catch (e: any) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    const status = Number.isFinite(e?.status) ? e.status : 400;
    return NextResponse.json({ error: e?.message || "parse failed" }, { status });
  }

  let rowCount = 0, success = 0, failed = 0;

  for (const raw of rows) {
    rowCount++;
    const voterData = mapRowToVoter(raw);

    const importRowBase = {
      batchId: batch.id,
      raw: JSON.stringify(raw),
      voterIdStr: voterData.voterId ?? null,
      phone1: voterData.mobile1 ?? null,
    };

    if (!voterData.name) {
      failed++;
      await prisma.importRow.create({
        data: { ...importRowBase, status: "SKIPPED", error: "Missing required field: name" },
      });
      continue;
    }

    try {
      const created = await prisma.voter.create({
        data: voterData,
        select: { id: true },
      });
      success++;
      await prisma.importRow.create({
        data: { ...importRowBase, status: "SUCCESS", voterId: created.id },
      });
    } catch (e: any) {
      failed++;
      let err = e?.message || "insert failed";
      if (e?.code === "P2002") err = "duplicate (unique constraint)";
      await prisma.importRow.create({
        data: { ...importRowBase, status: "FAILED", error: err.slice(0, 1024) },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      rowCount,
      successCount: success,
      failedCount: failed,
    },
  });

  return NextResponse.json({
    batchId: batch.id.toString(),
    rowCount,
    successCount: success,
    failedCount: failed,
  });
}
