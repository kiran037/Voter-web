// app/api/voters/import/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import { Buffer } from "node:buffer";
import type { Prisma, FamilyRole, ColourCode, FamilyIdType } from "@prisma/client";

export const runtime = "nodejs";

/* ========================= CSV/XLSX parsing ========================= */
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
  if (lines.length === 0) return [];
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

type SheetJSLike = {
  read: (buf: Buffer, opts: { type: "buffer" }) => { SheetNames: string[]; Sheets: Record<string, unknown>; };
  utils: { sheet_to_json: (sheet: unknown, opts: { raw: boolean }) => Record<string, unknown>[]; };
};
function isSheetJSLike(mod: unknown): mod is SheetJSLike {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  const candidate = (("default" in m ? (m as { default: unknown }).default : mod) ?? mod) as Record<string, unknown>;
  const read = (candidate as Record<string, unknown>).read;
  const utils = (candidate as Record<string, unknown>).utils as Record<string, unknown> | undefined;
  return typeof read === "function" && !!utils && typeof utils.sheet_to_json === "function";
}
function getDefaultIfPresent<T extends object>(mod: T | { default: T }): T {
  const anyMod = mod as unknown as { default?: T };
  return anyMod && anyMod.default ? anyMod.default : (mod as T);
}
async function loadSheetJS(): Promise<SheetJSLike | null> {
  try {
    const m1 = await import("xlsx/xlsx.mjs");
    const c1 = getDefaultIfPresent(m1 as unknown as object);
    if (isSheetJSLike(c1)) return c1 as SheetJSLike;
  } catch { }
  try {
    const m2 = await import("xlsx");
    const c2 = getDefaultIfPresent(m2 as unknown as object);
    if (isSheetJSLike(c2)) return c2 as SheetJSLike;
  } catch { }
  return null;
}
async function parseXlsx(buf: Buffer): Promise<UnknownRecord[]> {
  const XLSX = await loadSheetJS();
  if (!XLSX) {
    const err = new Error("XLSX parser not available. Install `xlsx` and run on Node runtime.");
    (err as { status?: number }).status = 400;
    throw err;
  }
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { raw: false });
}

/* ========================= mapping helpers ========================= */
type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
type GenderString = "M" | "F" | "O";

function toBool(v: unknown): boolean | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return null;
}
function toColour(v: unknown): Colour | null {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  return (["OUR", "OPPOSITE", "DOUBTFUL", "OTHER"] as const).includes(s as Colour) ? (s as Colour) : null;
}
function toGender(v: unknown): GenderString | null {
  const g = String(v ?? "").trim().toUpperCase();
  if (g === "MALE") return "M";
  if (g === "FEMALE") return "F";
  if (g === "OTHER") return "O";
  if (g === "M" || g === "F" || g === "O") return g as GenderString;
  return null;
}
function pickInsensitive<T = unknown>(row: Record<string, unknown>, keys: string[], def: T): T {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
    if (found) return row[found] as T;
  }
  return def;
}
function toFamilyRoleEnum(input: string | null): FamilyRole | null {
  if (!input) return null;
  const v = input.trim().toUpperCase() as FamilyRole;
  const allowed = new Set<FamilyRole>(["HEAD", "SPOUSE", "CHILD", "PARENT", "SIBLING", "OTHER"]);
  return allowed.has(v) ? v : null;
}
function toFamilyIdTypeEnum(input: string | null): FamilyIdType | null {
  if (!input) return null;
  const v = input.trim().toUpperCase();
  const map: Record<string, FamilyIdType> = {
    "JAN_AADHAAR_FAMILY_ID": "JAN_AADHAAR_FAMILY_ID",
    "JAN AADHAAR FAMILY ID": "JAN_AADHAAR_FAMILY_ID",
    "JANAADHAAR": "JAN_AADHAAR_FAMILY_ID",
    "JAN AADHAAR": "JAN_AADHAAR_FAMILY_ID",
    "RATION_CARD NO": "RATION_CARD_NO",
    "RATION CARD": "RATION_CARD_NO",
    "RATION_CARD_NO": "RATION_CARD_NO",
    "RC": "RATION_CARD_NO",
    "OTHER": "OTHER",
  };
  return map[v] ?? null;
}
function parsePossibleDate(value: unknown): Date | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (Number.isFinite(num) && num > 59 && num < 60000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = Math.round(num * 86400000);
    const d = new Date(base.getTime() + ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function toNumberOrNull(x: unknown): number | null {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function toBigIntOrNull(x: unknown): bigint | null {
  const s = String(x ?? "").trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  try { return BigInt(s); } catch { return null; }
}

// --- age helpers ---
function calcAgeFromDate(d: Date): number | null {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const beforeBirthday = (now.getUTCMonth() < m) || (now.getUTCMonth() === m && now.getUTCDate() < day);
  if (beforeBirthday) age--;
  return age >= 0 && age < 150 ? age : null;
}

/* ========================= row mapping ========================= */
type Mapped = ReturnType<typeof mapRow>;

function mapRow(row: UnknownRecord) {
  const name = String(pickInsensitive(row, ["name", "full name", "voter_name"], "")).trim();

  const village = (String(pickInsensitive(row, ["village", "area"], "")).trim() || null);
  const voterId = (String(pickInsensitive(row, ["voterId", "voter_id", "epic"], "")).trim() || null);
  const mobile1 = (String(pickInsensitive(row, ["mobile1", "phone", "mobile"], "")).trim() || null);
  const mobile2 = (String(pickInsensitive(row, ["mobile2", "alt_phone"], "")).trim() || null);
  const email = (String(pickInsensitive(row, ["email"], "")).trim() || null);

  const gender = toGender(pickInsensitive(row, ["gender", "sex"], ""));

  const colourCode = (toColour(pickInsensitive(row, ["colourCode", "color", "segment"], "")) ?? "OTHER") as ColourCode;
  const voted = toBool(pickInsensitive(row, ["voted"], "")) ?? false;
  const starVoter = toBool(pickInsensitive(row, ["starVoter", "star"], "")) ?? false;
  const dead = toBool(pickInsensitive(row, ["dead", "is_dead"], "")) ?? false;

  const boothNo = toNumberOrNull(pickInsensitive(row, ["boothNo", "booth_no"], ""));
  const partNo = toNumberOrNull(pickInsensitive(row, ["partNo", "part_no"], ""));
  const srn = toNumberOrNull(pickInsensitive(row, ["srn", "serial"], ""));

  const houseNo = (String(pickInsensitive(row, ["houseNo", "house_no"], "")).trim() || null);
  const address = (String(pickInsensitive(row, ["address"], "")).trim() || null);
  const boothName = (String(pickInsensitive(row, ["boothName", "booth_name"], "")).trim() || null);

  const caste = (String(pickInsensitive(row, ["caste"], "")).trim() || null);
  const profession = (String(pickInsensitive(row, ["profession"], "")).trim() || null);
  const demands = (String(pickInsensitive(row, ["demands"], "")).trim() || null);
  const extraInfo = (String(pickInsensitive(row, ["extraInfo", "notes", "remark"], "")).trim() || null);

  const dobVal = pickInsensitive(row, ["dob", "date_of_birth"], "");
  const dob = parsePossibleDate(dobVal);

  // ---- age rule: take provided age; ELSE if dob exists, compute; else null
  const ageProvided = toNumberOrNull(pickInsensitive(row, ["age"], ""));
  const age = ageProvided ?? (dob ? calcAgeFromDate(dob) : null);

  const fatherNameStr = (String(pickInsensitive(row, ["fatherName", "father", "father_name"], "")).trim() || null);
  const partySupportStr = (String(pickInsensitive(row, ["partySupport", "party_support", "party"], "")).trim() || null);
  const wardNoStr = (String(pickInsensitive(row, ["wardNo", "ward_no", "ward"], "")).trim() || null);
  const wardNo = toNumberOrNull(wardNoStr);

  const familyExternalId =
    (String(
      pickInsensitive(
        row,
        ["familyId", "family", "janAadhaar", "jan_aadhaar", "rationCard", "ration_card", "family_code", "family_id"],
        ""
      )
    ).trim() || null);

  const familyIdTypeRaw = (String(pickInsensitive(row, ["familyIdType", "family_id_type", "id_type"], "")).trim() || null);
  const familyIdType = toFamilyIdTypeEnum(familyIdTypeRaw);

  const relationRaw = (String(pickInsensitive(row, ["relationToHead", "role"], "")).trim() || null);
  const relationToHead = toFamilyRoleEnum(relationRaw);

  // Head can be numeric id (internal) OR EPIC
  const headIdCell = String(pickInsensitive(row, ["headId", "head_id"], "")).trim();
  const headEpicCell = String(pickInsensitive(row, ["headEpic", "head_epic"], "")).trim();
  const headIdNumeric = toBigIntOrNull(headIdCell);
  const headRef = headIdNumeric
    ? { numeric: headIdNumeric, epic: null as string | null }
    : { numeric: null as bigint | null, epic: (headIdCell || headEpicCell) || null };

  return {
    voter: {
      name, village, voterId, mobile1, mobile2, email,
      gender,
      colourCode, voted, starVoter, dead,
      boothNo, partNo, srn, houseNo, address, boothName,
      caste, profession, demands, extraInfo, dob,
      age, // <-- the rule applied here
      fatherName: fatherNameStr,
      partySupport: partySupportStr,
      wardNo,
      familyId: familyExternalId,
      familyIdType: familyIdType ?? null,
      relationToHead,
      // headId resolved in phase 2
    },
    headRef,
    familyExternalId,
    familyIdType,
    fatherNameStr,
    partySupportStr,
    wardNoStr,
  };
}

/* ========================= tiny concurrency helper ========================= */
function limiter(max: number) {
  let running = 0;
  const q: Array<() => void> = [];
  const next = () => {
    if (running >= max) return;
    const fn = q.shift();
    if (!fn) return;
    running++;
    fn();
  };
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        task().then(resolve).catch(reject).finally(() => { running--; next(); });
      };
      q.push(run);
      next();
    });
}

/* ========================= worker ========================= */
async function processImport({
  batchId,
  filename,
  buf,
  uploaderId: _uploaderId, 
}: {
  batchId: bigint;
  filename: string;
  buf: Buffer;
  uploaderId: bigint | null;
}) {

  const startedAt = new Date();
  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "PROCESSING", startedAt } });

  // Parse
  let rawRows: UnknownRecord[] = [];
  try {
    rawRows = /\.(xlsx|xlsm|xls)$/i.test(filename) ? await parseXlsx(buf) : parseCsv(buf);
  } catch {
    await prisma.importBatch.update({ where: { id: batchId }, data: { status: "FAILED", completedAt: new Date() } });
    return;
  }

  const total = rawRows.length;
  await prisma.importBatch.update({ where: { id: batchId }, data: { rowCount: total } });
  if (total === 0) {
    await prisma.importBatch.update({ where: { id: batchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    return;
  }

  const mapped: Mapped[] = rawRows.map(mapRow);

  const CHUNK = 200;
  const CONCURRENCY = 8;
  const runLimited = limiter(CONCURRENCY);

  let success = 0;
  let failed = 0;

  // Phase 1 — upsert all voters (without headId), keep EPIC->id map
  const inBatchEpicToId = new Map<string, bigint>();
  const createdRowsPhase1: Array<{ createdId: bigint; data: Mapped }> = [];

  for (let i = 0; i < mapped.length; i += CHUNK) {
    const slice = mapped.slice(i, i + CHUNK);

    const successRows: Prisma.ImportRowCreateManyInput[] = [];
    const failedRows: Prisma.ImportRowCreateManyInput[] = [];

    const tasks = slice.map((m) =>
      runLimited(async () => {
        const importRowBase = {
          batchId,
          status: "SKIPPED" as const,
          raw: JSON.stringify(m),
          voterIdStr: m.voter.voterId ?? null,
          phone1: m.voter.mobile1 ?? null,
          familyExternalId: m.familyExternalId ?? null,
          familyIdType: m.familyIdType ?? null,
          fatherNameStr: m.fatherNameStr ?? null,
          partySupportStr: m.partySupportStr ?? null,
          wardNoStr: m.wardNoStr ?? null,
          voterId: null as bigint | null,
          error: null as string | null,
          createdAt: new Date(),
        };

        if (!m.voter.name) {
          failedRows.push({ ...importRowBase, status: "SKIPPED", error: "Missing required field: name" });
          return;
        }

        try {
          const baseData = {
            name: m.voter.name,
            voterId: m.voter.voterId ?? null,
            village: m.voter.village,
            houseNo: m.voter.houseNo,
            address: m.voter.address,
            boothName: m.voter.boothName,
            boothNo: m.voter.boothNo,
            partNo: m.voter.partNo,
            srn: m.voter.srn,
            mobile1: m.voter.mobile1,
            mobile2: m.voter.mobile2,
            email: m.voter.email,
            gender: (m.voter.gender ?? null) as any,
            colourCode: m.voter.colourCode,
            voted: m.voter.voted,
            starVoter: m.voter.starVoter,
            dead: m.voter.dead,
            caste: m.voter.caste,
            profession: m.voter.profession,
            demands: m.voter.demands,
            extraInfo: m.voter.extraInfo,
            dob: m.voter.dob,
            age: m.voter.age ?? null, // <-- persisted exactly as mapped (rule already applied)
            fatherName: m.voter.fatherName ?? null,
            partySupport: m.voter.partySupport ?? null,
            wardNo: m.voter.wardNo ?? null,
            familyId: m.voter.familyId ?? null,
            familyIdType: m.voter.familyIdType ?? null,
            relationToHead: m.voter.relationToHead ?? null,
            // headId omitted in phase 1
          };

          let createdId: bigint;

          if (m.voter.voterId) {
            const up = await prisma.voter.upsert({
              where: { voterId: m.voter.voterId },
              update: baseData,
              create: baseData,
              select: { id: true, voterId: true },
            });
            createdId = up.id as unknown as bigint;
          } else {
            const existing = m.voter.mobile1
              ? await prisma.voter.findFirst({ where: { name: m.voter.name, mobile1: m.voter.mobile1 }, select: { id: true, voterId: true } })
              : null;

            if (existing) {
              await prisma.voter.update({ where: { id: existing.id }, data: baseData });
              createdId = existing.id as unknown as bigint;
            } else {
              const c = await prisma.voter.create({ data: baseData, select: { id: true, voterId: true } });
              createdId = (c.id as unknown) as bigint;
            }
          }

          if (m.voter.voterId) inBatchEpicToId.set(m.voter.voterId.toUpperCase(), createdId);
          createdRowsPhase1.push({ createdId, data: m });

          successRows.push({ ...importRowBase, status: "SUCCESS", voterId: createdId });
        } catch (e) {
          let err = e instanceof Error ? e.message : "insert failed";
          if ((e as { code?: string })?.code === "P2002") err = "duplicate (unique constraint)";
          failedRows.push({ ...importRowBase, status: "FAILED", error: err.slice(0, 1024) });
        }
      })
    );

    await Promise.all(tasks);

    if (successRows.length) { await prisma.importRow.createMany({ data: successRows }); success += successRows.length; }
    if (failedRows.length) { await prisma.importRow.createMany({ data: failedRows }); failed += failedRows.length; }

    await prisma.importBatch.update({ where: { id: batchId }, data: { successCount: success, failedCount: failed } });
    await new Promise((r) => setTimeout(r, 0));
  }

  // Phase 2 — resolve head references and update headId
  for (let i = 0; i < createdRowsPhase1.length; i += CHUNK) {
    const slice = createdRowsPhase1.slice(i, i + CHUNK);

    await Promise.all(
      slice.map(async ({ createdId, data }) => {
        const role = data.voter.relationToHead;
        if (!role) return;
        if (role === "HEAD") {
          await prisma.voter.update({ where: { id: createdId }, data: { headId: null } });
          return;
        }

        let targetHead: bigint | null = null;

        if (data.headRef.numeric) {
          targetHead = data.headRef.numeric;
        } else if (data.headRef.epic) {
          const epic = data.headRef.epic.trim().toUpperCase();
          targetHead =
            inBatchEpicToId.get(epic) ??
            (await (async () => {
              // no "mode" here; emulate case-insensitivity by trying variants
              const found = await prisma.voter.findFirst({
                where: { voterId: { in: [epic, epic.toLowerCase(), epic.toUpperCase()] } },
                select: { id: true },
              });
              return found ? (found.id as unknown as bigint) : null;
            })());
        }

        if (!targetHead || targetHead === createdId) return;

        try {
          await prisma.voter.update({
            where: { id: createdId },
            data: { headId: targetHead },
          });
        } catch {
          // ignore bad references in phase 2
        }
      })
    );
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

/* ========================= route ========================= */
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
      status: "PENDING",
      uploadedById: (user.id as unknown as bigint) ?? null,
      rowCount: 0, successCount: 0, failedCount: 0,
    },
    select: { id: true },
  });

  (async () => {
    try {
      await processImport({ batchId: batch.id as unknown as bigint, filename, buf, uploaderId: (user.id as unknown as bigint) ?? null });
    } catch {
      await prisma.importBatch.update({ where: { id: batch.id as unknown as bigint }, data: { status: "FAILED", completedAt: new Date() } });
    }
  })();

  return NextResponse.json({ batchId: (batch.id as unknown as bigint).toString(), queued: true });
}
