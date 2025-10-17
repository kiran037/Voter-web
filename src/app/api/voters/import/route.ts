// app/api/voters/import/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import { Buffer } from "node:buffer";
import type { Prisma, FamilyRole, ColourCode, FamilyIdType } from "@prisma/client";

export const runtime = "nodejs";

// ---------------------------------------------
// Types & helpers (lint-safe, no "any")
// ---------------------------------------------
type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
type UnknownRecord = Record<string, unknown>;
type StringRecord = Record<string, string>;

function toBool(v: unknown): boolean | null {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return null;
}
function toColour(v: unknown): Colour | null {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  return (["OUR", "OPPOSITE", "DOUBTFUL", "OTHER"] as const).includes(s as Colour) ? (s as Colour) : null;
}

/** Excel CSV splitter with quotes support */
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

/** Basic CSV → array of objects (header-based) */
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
  read: (buf: Buffer, opts: { type: "buffer" }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (sheet: unknown, opts: { raw: boolean }) => Record<string, unknown>[];
  };
};

// Runtime type guard so TS won’t complain about “always true”
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
  // Try ESM path first
  try {
    const m1 = await import("xlsx/xlsx.mjs");
    const c1 = getDefaultIfPresent(m1 as unknown as object);
    if (isSheetJSLike(c1)) return c1 as SheetJSLike;
  } catch {
    /* ignore */
  }

  // Fallback to main entry (CJS/ESM auto)
  try {
    const m2 = await import("xlsx");
    const c2 = getDefaultIfPresent(m2 as unknown as object);
    if (isSheetJSLike(c2)) return c2 as SheetJSLike;
  } catch {
    /* ignore */
  }

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

/** case-insensitive pick */
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
    "RATION_CARD_NO": "RATION_CARD_NO",
    "RATION CARD": "RATION_CARD_NO",
    "RC": "RATION_CARD_NO",
    "OTHER": "OTHER",
  };
  return map[v] ?? null;
}

/** Excel serial date (days since 1899-12-30) → JS Date; otherwise try Date(...) */
function parsePossibleDate(value: unknown): Date | null {
  if (value == null) return null;
  // Numbers from Excel often arrive as strings when raw:false; handle both.
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (Number.isFinite(num) && num > 59 && num < 60000) {
    // Excel's day 1 = 1899-12-31 in some impls; we’ll use 1899-12-30 baseline for safety
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = Math.round(num * 86400000);
    const d = new Date(base.getTime() + ms);
    return isNaN(d.getTime()) ? null : d;
  }
  // Fallback string parse
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** number-ish to number | null */
function toNumberOrNull(x: unknown): number | null {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Safe BigInt from string */
function toBigIntOrNull(x: unknown): bigint | null {
  const s = String(x ?? "").trim();
  if (!s) return null;
  try { return BigInt(s); } catch { return null; }
}

function mapRow(row: UnknownRecord) {
  const name = String(pickInsensitive(row, ["name", "full name", "voter_name"], "")).trim();

  const village   = (String(pickInsensitive(row, ["village", "area"], "")).trim() || null);
  const voterId   = (String(pickInsensitive(row, ["voterId", "voter_id", "epic"], "")).trim() || null);
  const mobile1   = (String(pickInsensitive(row, ["mobile1", "phone", "mobile"], "")).trim() || null);
  const mobile2   = (String(pickInsensitive(row, ["mobile2", "alt_phone"], "")).trim() || null);
  const email     = (String(pickInsensitive(row, ["email"], "")).trim() || null);

  const colourCode = (toColour(pickInsensitive(row, ["colourCode", "color", "segment"], "")) ?? "OTHER") as ColourCode;
  const voted      = toBool(pickInsensitive(row, ["voted"], "")) ?? false;
  const starVoter  = toBool(pickInsensitive(row, ["starVoter", "star"], "")) ?? false;
  const dead       = toBool(pickInsensitive(row, ["dead", "is_dead"], "")) ?? false;

  const boothNo  = toNumberOrNull(pickInsensitive(row, ["boothNo", "booth_no"], ""));
  const partNo   = toNumberOrNull(pickInsensitive(row, ["partNo", "part_no"], ""));
  const srn      = toNumberOrNull(pickInsensitive(row, ["srn", "serial"], ""));

  const houseNo  = (String(pickInsensitive(row, ["houseNo", "house_no"], "")).trim() || null);
  const address  = (String(pickInsensitive(row, ["address"], "")).trim() || null);
  const boothName= (String(pickInsensitive(row, ["boothName", "booth_name"], "")).trim() || null);

  const caste      = (String(pickInsensitive(row, ["caste"], "")).trim() || null);
  const profession = (String(pickInsensitive(row, ["profession"], "")).trim() || null);
  const demands    = (String(pickInsensitive(row, ["demands"], "")).trim() || null);
  const extraInfo  = (String(pickInsensitive(row, ["extraInfo", "notes", "remark"], "")).trim() || null);

  const dobVal = pickInsensitive(row, ["dob", "date_of_birth"], "");
  const dob = parsePossibleDate(dobVal);

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

  const headIdRaw = (String(pickInsensitive(row, ["headId", "head_id"], "")).trim());
  const headId = headIdRaw ? toBigIntOrNull(headIdRaw) : null;

  return {
    voter: {
      name, village, voterId, mobile1, mobile2, email,
      colourCode, voted, starVoter, dead,
      boothNo, partNo, srn, houseNo, address, boothName,
      caste, profession, demands, extraInfo, dob,
      familyId: familyExternalId,
      familyIdType: familyIdType ?? null,
      relationToHead,
      headId,
    },
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
      status: "PROCESSING",
      uploadedById: user.id,
      startedAt: new Date(),
    },
  });

  let rows: UnknownRecord[] = [];
  try {
    if (/\.(xlsx|xlsm|xls)$/i.test(filename)) rows = await parseXlsx(buf);
    else rows = parseCsv(buf);
  } catch (e) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    const msg = e instanceof Error ? e.message : "parse failed";
    const status = e && typeof (e as { status?: number }).status === "number" ? (e as { status?: number }).status! : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  let rowCount = 0, success = 0, failed = 0;

  for (const raw of rows) {
    rowCount++;
    const mapped = mapRow(raw);
    const { voter, familyExternalId, familyIdType } = mapped;

    const importRowBase: Prisma.ImportRowUncheckedCreateInput = {
      batchId: batch.id as unknown as bigint,
      status: "SKIPPED",
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
      const baseData = {
        name: voter.name,
        voterId: voter.voterId ?? null,
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
        colourCode: voter.colourCode,
        voted: voter.voted,
        starVoter: voter.starVoter,
        dead: voter.dead,
        caste: voter.caste,
        profession: voter.profession,
        demands: voter.demands,
        extraInfo: voter.extraInfo,
        dob: voter.dob,
        familyId: voter.familyId ?? null,
        familyIdType: voter.familyIdType ?? null,
        relationToHead: voter.relationToHead ?? null,
        headId: voter.headId ?? null,
      };

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
        createdId = up.id as unknown as bigint;
      } else {
        const existing = voter.mobile1
          ? await prisma.voter.findFirst({
              where: { name: voter.name, mobile1: voter.mobile1 },
              select: { id: true },
            })
          : null;

        if (existing) {
          await prisma.voter.update({ where: { id: existing.id }, data: updateData });
          createdId = existing.id as unknown as bigint;
        } else {
          const c = await prisma.voter.create({ data: createData, select: { id: true } });
          createdId = c.id as unknown as bigint;
        }
      }

      success++;
      await prisma.importRow.create({ data: { ...importRowBase, status: "SUCCESS", voterId: createdId } });
    } catch (e) {
      failed++;
      let err = e instanceof Error ? e.message : "insert failed";
      // Prisma unique
      if (typeof (e as { code?: string }).code === "string" && (e as { code: string }).code === "P2002") {
        err = "duplicate (unique constraint)";
      }
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
