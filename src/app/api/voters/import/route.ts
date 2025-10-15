// app/api/voters/import/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { Buffer } from "node:buffer";
import type { Prisma, FamilyRole, ColourCode, FamilyIdType } from "@prisma/client";

export const runtime = "nodejs";

// ---------------------------------------------
// Helpers
// ---------------------------------------------
type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";

function toBool(v: unknown): boolean | null {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return null;
}
function toColour(v: unknown): Colour | null {
  if (!v) return null;
  const s = String(v).trim().toUpperCase();
  return (["OUR","OPPOSITE","DOUBTFUL","OTHER"] as const).includes(s as Colour) ? (s as Colour) : null;
}

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

// XLSX loader
async function loadSheetJS(): Promise<any | null> {
  try {
    // @ts-ignore
    const m1 = await import("xlsx/xlsx.mjs");
    return (m1 as any).read ? m1 : (m1 as any).default || m1;
  } catch {}
  try {
    const m2 = await import("xlsx");
    return (m2 as any).read ? m2 : (m2 as any).default || m2;
  } catch {}
  return null;
}
async function parseXlsx(buf: Buffer): Promise<Record<string, any>[]> {
  const XLSX = await loadSheetJS();
  if (!XLSX || typeof XLSX.read !== "function") {
    const err = new Error("XLSX parser not available. Install `xlsx` and run on Node runtime.");
    (err as any).status = 400;
    throw err;
  }
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { raw: false }) as Record<string, any>[];
}

function pickInsensitive(row: Record<string, any>, keys: string[], def: any = null) {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
    if (found) return row[found];
  }
  return def;
}

// Map free text -> FamilyRole enum (or null)
function toFamilyRoleEnum(input: string | null): FamilyRole | null {
  if (!input) return null;
  const v = input.trim().toUpperCase();
  const allowed = new Set<FamilyRole>(["HEAD","SPOUSE","CHILD","PARENT","SIBLING","OTHER"] as FamilyRole[]);
  return allowed.has(v as FamilyRole) ? (v as FamilyRole) : null;
}

// Map free text -> FamilyIdType enum (or null)
function toFamilyIdTypeEnum(input: string | null): FamilyIdType | null {
  if (!input) return null;
  const v = input.trim().toUpperCase();
  const map: Record<string, FamilyIdType> = {
    "JAN_AADHAAR_FAMILY_ID": "JAN_AADHAAR_FAMILY_ID",
    "JAN AADHAAR FAMILY ID": "JAN_AADHAAR_FAMILY_ID",
    "JANAADHAAR": "JAN_AADHAAR_FAMILY_ID",
    "JAN AADHAAR": "JAN_AADHAAR_FAMILY_ID",
    "RATION_CARD_NO": "RATION_CARD_NO",
    "RATION CARD": "RATION_CARD_NO",
    "RC": "RATION_CARD_NO",
    "OTHER": "OTHER",
  };
  return map[v] ?? null;
}

// Map Excel/CSV row -> Voter fields per your new schema
function mapRow(row: Record<string, any>) {
  const name = String(pickInsensitive(row, ["name","full name","voter_name"], "")).trim();

  const village  = String(pickInsensitive(row, ["village","area"], "")).trim() || null;
  const voterId  = String(pickInsensitive(row, ["voterId","voter_id","epic"], "")).trim() || null;
  const mobile1  = String(pickInsensitive(row, ["mobile1","phone","mobile"], "")).trim() || null;
  const mobile2  = String(pickInsensitive(row, ["mobile2","alt_phone"], "")).trim() || null;
  const email    = String(pickInsensitive(row, ["email"], "")).trim() || null;

  const colourCode = (toColour(pickInsensitive(row, ["colourCode","color","segment"], "")) ?? "OTHER") as ColourCode;
  const voted      = toBool(pickInsensitive(row, ["voted"], "")) ?? false;
  const starVoter  = toBool(pickInsensitive(row, ["starVoter","star"], "")) ?? false;
  const dead       = toBool(pickInsensitive(row, ["dead","is_dead"], "")) ?? false;

  const n = (x: any) => (x === "" || x == null ? null : Number(x));
  const boothNo  = n(pickInsensitive(row, ["boothNo","booth_no"]));
  const partNo   = n(pickInsensitive(row, ["partNo","part_no"]));
  const srn      = n(pickInsensitive(row, ["srn","serial"]));

  const houseNo  = String(pickInsensitive(row, ["houseNo","house_no"], "")).trim() || null;
  const address  = String(pickInsensitive(row, ["address"], "")).trim() || null;
  const boothName= String(pickInsensitive(row, ["boothName","booth_name"], "")).trim() || null;

  const caste     = String(pickInsensitive(row, ["caste"], "")).trim() || null;
  const profession= String(pickInsensitive(row, ["profession"], "")).trim() || null;
  const demands   = String(pickInsensitive(row, ["demands"], "")).trim() || null;
  const extraInfo = String(pickInsensitive(row, ["extraInfo","notes","remark"], "")).trim() || null;

  const dobRaw = String(pickInsensitive(row, ["dob","date_of_birth"], "")).trim();
  const dob = dobRaw ? new Date(dobRaw) : null;

  // Family fields from the sheet
  const familyExternalId =
    String(
      pickInsensitive(
        row,
        ["familyId","family","janAadhaar","jan_aadhaar","rationCard","ration_card","family_code","family_id"],
        ""
      )
    ).trim() || null;

  const familyIdTypeRaw =
    String(pickInsensitive(row, ["familyIdType","family_id_type","id_type"], "")).trim() || null;
  const familyIdType = toFamilyIdTypeEnum(familyIdTypeRaw);

  // Optional: relation/head (if present)
  const relationRaw = String(pickInsensitive(row, ["relationToHead","role"], "")).trim() || null;
  const relationToHead = toFamilyRoleEnum(relationRaw);

  const headIdRaw = String(pickInsensitive(row, ["headId","head_id"], "")).trim();
  const headId = headIdRaw ? BigInt(headIdRaw) : null;

  return {
    voter: {
      name, village, voterId, mobile1, mobile2, email,
      colourCode, voted, starVoter, dead,
      boothNo, partNo, srn, houseNo, address, boothName,
      caste, profession, demands, extraInfo, dob,
      // IMPORTANT: In your schema, Voter stores the *familyId string* directly:
      familyId: familyExternalId,
      familyIdType: familyIdType ?? null,
      relationToHead, // enum or null
      headId,
    },
    // for ImportRow audit trail
    familyExternalId,
    familyIdType,
  };
}

// ---------------------------------------------
// Route
// ---------------------------------------------
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
    if (/\.(xlsx|xlsm|xls)$/i.test(filename)) rows = await parseXlsx(buf);
    else rows = parseCsv(buf);
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
    const mapped = mapRow(raw);
    const { voter, familyExternalId, familyIdType } = mapped;

    // ImportRow base (MUST match schema fields)
    const importRowBase: Prisma.ImportRowUncheckedCreateInput = {
      batchId: batch.id as unknown as bigint,
      status: "SKIPPED", // default; will override below
      raw: JSON.stringify(raw),
      voterIdStr: voter.voterId ?? null,
      phone1: voter.mobile1 ?? null,
      familyExternalId: familyExternalId ?? null,
      familyIdType: familyIdType ?? null,
    };

    if (!voter.name) {
      failed++;
      await prisma.importRow.create({
        data: { ...importRowBase, status: "SKIPPED", error: "Missing required field: name" },
      });
      continue;
    }

    try {
      // Build typed payloads so TS matches Prisma expectations
      const baseData = {
        name: voter.name,
        voterId: voter.voterId ?? null,
        // age/gender omitted unless you map them from sheet
        village: voter.village,
        houseNo: voter.houseNo,
        address: voter.address,
        boothName: voter.boothName,
        boothNo: voter.boothNo,
        partNo: voter.partNo,
        srn: voter.srn,
        mobile1: voter.mobile1,
        mobile2: voter.mobile2,
        email: voter.email,
        colourCode: voter.colourCode, // Prisma enum ColourCode
        voted: voter.voted,
        starVoter: voter.starVoter,
        dead: voter.dead,
        caste: voter.caste,
        profession: voter.profession,
        demands: voter.demands,
        extraInfo: voter.extraInfo,
        dob: voter.dob,
        familyId: voter.familyId ?? null,          // string per schema
        familyIdType: voter.familyIdType ?? null,  // enum or null
        relationToHead: voter.relationToHead ?? null, // FamilyRole | null
        headId: voter.headId ?? null,
      };

      // Explicit create/update types
      const createData: Prisma.VoterUncheckedCreateInput = { ...baseData };
      const updateData: Prisma.VoterUncheckedUpdateInput = { ...baseData };

      let createdId: bigint;

      if (voter.voterId) {
        const up = await prisma.voter.upsert({
          where: { voterId: voter.voterId },
          update: updateData,
          create: createData,
          select: { id: true },
        });
        createdId = up.id as any;
      } else {
        const existing = voter.mobile1
          ? await prisma.voter.findFirst({
              where: { name: voter.name, mobile1: voter.mobile1 },
              select: { id: true },
            })
          : null;

        if (existing) {
          await prisma.voter.update({
            where: { id: existing.id },
            data: updateData,
          });
          createdId = existing.id as any;
        } else {
          const c = await prisma.voter.create({
            data: createData,
            select: { id: true },
          });
          createdId = c.id as any;
        }
      }

      success++;
      await prisma.importRow.create({
        data: { ...importRowBase, status: "SUCCESS", voterId: createdId },
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
