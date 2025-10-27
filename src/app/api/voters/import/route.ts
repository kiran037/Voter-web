

// app/api/voters/import/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import type { FamilyRole, ColourCode, FamilyIdType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* -------- tunables (env overrides) -------- */
const MAX_UPLOAD_BYTES = Number(process.env.IMPORT_MAX_UPLOAD_BYTES ?? 4_500_000);
const CHUNK_SIZE       = Number(process.env.IMPORT_CHUNK_SIZE ?? 200);
const CONCURRENCY      = Number(process.env.IMPORT_CONCURRENCY ?? 4);
const MAX_ROWS         = Number(process.env.IMPORT_MAX_ROWS ?? 20000);

/* -------- parsing helpers -------- */
type UnknownRecord = Record<string, unknown>;
type StringRecord = Record<string, string>;

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
function parseCsv(buf: Buffer): StringRecord[] {
  const text = buf.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const header = escCsvSplit(lines[0]).map(h => h.trim());
  const rows: StringRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = escCsvSplit(lines[i]);
    const rec: StringRecord = {};
    header.forEach((h, idx) => { rec[h] = cols[idx] ?? ""; });
    rows.push(rec);
  }
  return rows;
}
function parseXlsx(buf: Buffer): UnknownRecord[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const first = wb.SheetNames?.[0];
  if (!first) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: "" }); // keep blanks as ""
}

/* -------- coercers -------- */
function pickInsensitive<T=unknown>(row: Record<string, unknown>, keys: string[], def: T): T {
  for (const k of keys) {
    const hit = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
    if (hit) return row[hit] as T;
  }
  return def;
}
function toBool(v: unknown): boolean | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (["1","true","yes","y"].includes(s)) return true;
  if (["0","false","no","n"].includes(s)) return false;
  return null;
}
function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toColour(v: unknown): ColourCode {
  const s = String(v ?? "").trim().toUpperCase();
  return (["OUR","OPPOSITE","DOUBTFUL","OTHER"] as const).includes(s as ColourCode) ? (s as ColourCode) : "OTHER";
}
function toGender(v: unknown): "M"|"F"|"O"|null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "MALE") return "M";
  if (s === "FEMALE") return "F";
  if (["M","F","O"].includes(s)) return s as any;
  return null;
}
function toFamilyRoleEnum(input: unknown): FamilyRole | null {
  const s = String(input ?? "").trim().toUpperCase();
  const ok: FamilyRole[] = ["HEAD","SPOUSE","CHILD","PARENT","SIBLING","OTHER"];
  return ok.includes(s as FamilyRole) ? (s as FamilyRole) : null;
}
function toFamilyIdTypeEnum(input: unknown): FamilyIdType | null {
  const s = String(input ?? "").trim().toUpperCase();
  const map: Record<string, FamilyIdType> = {
    "JAN_AADHAAR_FAMILY_ID": "JAN_AADHAAR_FAMILY_ID",
    "JAN AADHAAR FAMILY ID": "JAN_AADHAAR_FAMILY_ID",
    "JANAADHAAR": "JAN_AADHAAR_FAMILY_ID",
    "JAN AADHAAR": "JAN_AADHAAR_FAMILY_ID",
    "RATION CARD": "RATION_CARD_NO",
    "RATION_CARD_NO": "RATION_CARD_NO",
    "RATION CARD NO": "RATION_CARD_NO",
    "RC": "RATION_CARD_NO",
    "OTHER": "OTHER",
  };
  return map[s] ?? null;
}
function toBigIntOrNull(v: unknown): bigint | null {
  const s = String(v ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  try { return BigInt(s); } catch { return null; }
}

/* -------- row mapping (includes head refs) -------- */
type MappedRow = ReturnType<typeof mapRow>;

function mapRow(row: UnknownRecord) {
  const name = String(pickInsensitive(row, ["name","full name","voter_name"], "")).trim();
  const voterId = (String(pickInsensitive(row, ["voterId","voter_id","epic"], "")).trim() || null);
  const mobile1 = (String(pickInsensitive(row, ["mobile1","phone","mobile"], "")).trim() || null);

  const relationToHead = toFamilyRoleEnum(pickInsensitive(row, ["relationToHead","role"], ""));

  // Head reference can come from: headId (numeric or EPIC string) or headEpic
  const headIdRaw  = String(pickInsensitive(row, ["headId","head_id"], "")).trim();
  const headEpic   = String(pickInsensitive(row, ["headEpic","head_epic"], "")).trim();
  const headIdNum  = toBigIntOrNull(headIdRaw);
  const headHint   = headIdNum ? { numeric: headIdNum, epic: null as string | null }
                               : { numeric: null as bigint | null, epic: (headEpic || headIdRaw) || null };

  return {
    voter: {
      name,
      voterId,
      village: (String(pickInsensitive(row, ["village","area"], "")).trim() || null),
      houseNo: (String(pickInsensitive(row, ["houseNo","house_no"], "")).trim() || null),
      address: (String(pickInsensitive(row, ["address"], "")).trim() || null),
      boothName: (String(pickInsensitive(row, ["boothName","booth_name"], "")).trim() || null),
      boothNo: toNum(pickInsensitive(row, ["boothNo","booth_no"], "")),
      partNo: toNum(pickInsensitive(row, ["partNo","part_no"], "")),
      srn: toNum(pickInsensitive(row, ["srn","serial"], "")),
      mobile1,
      mobile2: (String(pickInsensitive(row, ["mobile2","alt_phone"], "")).trim() || null),
      email: (String(pickInsensitive(row, ["email"], "")).trim() || null),
      gender: toGender(pickInsensitive(row, ["gender","sex"], "")) as any,
      colourCode: toColour(pickInsensitive(row, ["colourCode","color","segment"], "")),
      voted: toBool(pickInsensitive(row, ["voted"], "")) ?? false,
      starVoter: toBool(pickInsensitive(row, ["starVoter","star"], "")) ?? false,
      dead: toBool(pickInsensitive(row, ["dead","is_dead"], "")) ?? false,
      caste: (String(pickInsensitive(row, ["caste"], "")).trim() || null),
      profession: (String(pickInsensitive(row, ["profession"], "")).trim() || null),
      demands: (String(pickInsensitive(row, ["demands"], "")).trim() || null),
      extraInfo: (String(pickInsensitive(row, ["extraInfo","notes","remark"], "")).trim() || null),
      age: toNum(pickInsensitive(row, ["age"], "")),
      fatherName: (String(pickInsensitive(row, ["fatherName","father","father_name"], "")).trim() || null),
      partySupport: (String(pickInsensitive(row, ["partySupport","party_support","party"], "")).trim() || null),
      wardNo: toNum(pickInsensitive(row, ["wardNo","ward_no","ward"], "")),
      familyId: (String(pickInsensitive(row, ["familyId","family","family_code","janAadhaar","jan_aadhaar","rationCard","ration_card","family_id"], "")).trim() || null),
      familyIdType: toFamilyIdTypeEnum(pickInsensitive(row, ["familyIdType","family_id_type","id_type"], "")),
      relationToHead,
      headId: null as bigint | null, // set in phase 2
      dob: null as Date | null,
    },
    headHint,
  };
}

/* -------- small concurrency limiter -------- */
function limiter(max: number) {
  let running = 0;
  const q: Array<() => void> = [];
  const pump = () => {
    if (running >= max) return;
    const fn = q.shift();
    if (!fn) return;
    running++;
    fn();
  };
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const run = () =>
        task().then(resolve).catch(reject).finally(() => {
          running--;
          pump();
        });
      q.push(run);
      pump();
    });
}

/* ========================= route ========================= */
export async function POST(req: NextRequest) {
  // 1) auth
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 2) form/file
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required (CSV/XLSX)" }, { status: 400 });
  }
  if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (${file.size} bytes). Limit ~${MAX_UPLOAD_BYTES} bytes.` },
      { status: 413 }
    );
  }

  // 3) parse
  const filename = file.name || "upload";
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: UnknownRecord[] = [];
  try {
    rows = /\.(xlsx|xlsm|xls)$/i.test(filename) ? parseXlsx(buf) : parseCsv(buf);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "parse failed" }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ rowCount: 0, successCount: 0, failedCount: 0, errors: [] });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (${rows.length}). Max ${MAX_ROWS}.` }, { status: 400 });
  }

  /* -------- Phase 1: upsert voters, collect ids -------- */
  const mapped: MappedRow[] = rows.map(mapRow);
  const run = limiter(CONCURRENCY);
  const epicToId = new Map<string, bigint>(); // EPIC->created id (for same file references)
  const createdList: Array<{ id: bigint; rel: FamilyRole | null; headHint: { numeric: bigint | null; epic: string | null } }> = [];

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
    const chunk = mapped.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map((m, offset) =>
        run(async () => {
          const idx = i + offset;

          if (!m.voter.name) {
            failedCount++;
            errors.push({ index: idx, reason: "Missing required field: name" });
            return;
          }
          try {
            const baseData = { ...m.voter };
            // head will be set in phase 2
            delete (baseData as any).headId;

            let createdId: bigint;
            if (m.voter.voterId) {
              const up = await prisma.voter.upsert({
                where: { voterId: m.voter.voterId },
                update: baseData,
                create: baseData,
                select: { id: true, voterId: true },
              });
              createdId = up.id as unknown as bigint;
            } else if (m.voter.mobile1) {
              const ex = await prisma.voter.findFirst({
                where: { name: m.voter.name, mobile1: m.voter.mobile1 },
                select: { id: true, voterId: true },
              });
              if (ex) {
                await prisma.voter.update({ where: { id: ex.id }, data: baseData });
                createdId = ex.id as unknown as bigint;
              } else {
                const c = await prisma.voter.create({ data: baseData, select: { id: true, voterId: true } });
                createdId = c.id as unknown as bigint;
              }
            } else {
              const c = await prisma.voter.create({ data: baseData, select: { id: true, voterId: true } });
              createdId = c.id as unknown as bigint;
            }

            if (m.voter.voterId) epicToId.set(m.voter.voterId.toUpperCase(), createdId);
            createdList.push({ id: createdId, rel: m.voter.relationToHead ?? null, headHint: m.headHint });
            successCount++;
          } catch (e: any) {
            failedCount++;
            const msg = (e?.code === "P2002" && "duplicate (unique constraint)") || e?.message || "insert failed";
            errors.push({ index: idx, reason: String(msg).slice(0, 200) });
          }
        })
      )
    );
  }

  /* -------- Phase 2: set headId where applicable -------- */
  for (let i = 0; i < createdList.length; i += CHUNK_SIZE) {
    const chunk = createdList.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async ({ id, rel, headHint }) => {
        try {
          if (!rel) return;
          if (rel === "HEAD") {
            await prisma.voter.update({ where: { id }, data: { headId: null } });
            return;
          }

          let target: bigint | null = null;

          // Numeric head id takes precedence if present
          if (headHint.numeric) {
            target = headHint.numeric;
          } else if (headHint.epic) {
            const epic = headHint.epic.trim().toUpperCase();
            // try in-batch map first, then DB
            target =
              epicToId.get(epic) ??
              (await (async () => {
                const found = await prisma.voter.findFirst({
                  where: { voterId: { in: [epic, epic.toLowerCase(), epic.toUpperCase()] } },
                  select: { id: true },
                });
                return found ? (found.id as unknown as bigint) : null;
              })());
          }

          if (target && target !== id) {
            await prisma.voter.update({ where: { id }, data: { headId: target } });
          }
        } catch {
          /* ignore bad references */
        }
      })
    );
  }

  return NextResponse.json({
    rowCount: rows.length,
    successCount,
    failedCount,
    errors,
  });
}
