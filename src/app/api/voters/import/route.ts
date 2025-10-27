// app/api/voters/import/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import * as XLSX from "xlsx"; // static import (matches your other working project)
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import type { FamilyRole, ColourCode, FamilyIdType, Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // generous for larger files

/* ========================= tunables via env ========================= */
const MAX_UPLOAD_BYTES = Number(process.env.IMPORT_MAX_UPLOAD_BYTES ?? 4_500_000); // ~4.5MB
const IMPORT_CHUNK_SIZE = Number(process.env.IMPORT_CHUNK_SIZE ?? 100);
const IMPORT_CONCURRENCY = Number(process.env.IMPORT_CONCURRENCY ?? 2);
const LOG_SUCCESS_ROWS = (process.env.IMPORT_LOG_SUCCESS_ROWS ?? "false") === "true";

/* ========================= parsing ========================= */
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

function parseXlsx(buf: Buffer): UnknownRecord[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const first = wb.SheetNames?.[0];
  if (!first) return [];
  // defval: "" keeps empty cells as empty strings instead of undefined
  return XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: "" });
}

/* ========================= mapping helpers ========================= */
function pickInsensitive<T = unknown>(row: Record<string, unknown>, keys: string[], def: T): T {
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
  if (["M","F","O"].includes(s)) return s as any;
  if (s === "MALE") return "M";
  if (s === "FEMALE") return "F";
  if (s === "OTHER") return "O";
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
    "RATION_CARD_NO": "RATION_CARD_NO",
    "RATION CARD NO": "RATION_CARD_NO",
    "RATION CARD": "RATION_CARD_NO",
    "RC": "RATION_CARD_NO",
    "OTHER": "OTHER",
  };
  return map[s] ?? null;
}

function mapRow(row: UnknownRecord) {
  const name = String(pickInsensitive(row, ["name","full name","voter_name"], "")).trim();
  const voterId = (String(pickInsensitive(row, ["voterId","voter_id","epic"], "")).trim() || null);
  const mobile1 = (String(pickInsensitive(row, ["mobile1","phone","mobile"], "")).trim() || null);

  return {
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
    relationToHead: toFamilyRoleEnum(pickInsensitive(row, ["relationToHead","role"], "")),
    headId: null as bigint | null,
    dob: null as Date | null,
  };
}

/* ========================= tiny limiter ========================= */
function limiter(max: number) {
  let running = 0;
  const q: Array<() => void> = [];
  const next = () => { if (running >= max) return; const fn = q.shift(); if (!fn) return; running++; fn(); };
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const run = () => task().then(resolve).catch(reject).finally(() => { running--; next(); });
      q.push(run); next();
    });
}

/* ========================= background worker ========================= */
type Mapped = ReturnType<typeof mapRow>;

async function processImport(batchId: bigint, filename: string, buf: Buffer) {
  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "PROCESSING", startedAt: new Date() } });

  let raw: UnknownRecord[] = [];
  try {
    raw = /\.(xlsx|xlsm|xls)$/i.test(filename) ? parseXlsx(buf) : parseCsv(buf);
  } catch (e) {
    await prisma.importBatch.update({ where: { id: batchId }, data: { status: "FAILED", completedAt: new Date() } });
    console.error("[import parse error]", e);
    return;
  }

  const total = raw.length;
  await prisma.importBatch.update({ where: { id: batchId }, data: { rowCount: total } });
  if (total === 0) {
    await prisma.importBatch.update({ where: { id: batchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    return;
  }

  const run = limiter(IMPORT_CONCURRENCY);
  let success = 0;
  let failed = 0;

  // Phase 1: create/update voters (without headId), and log rows
  const epicToId = new Map<string, bigint>();               // EPIC -> id for in-batch resolution
  const created: Array<{ id: bigint; data: Mapped }> = [];  // rows to revisit for headId

  for (let i = 0; i < raw.length; i += IMPORT_CHUNK_SIZE) {
    const slice = raw.slice(i, i + IMPORT_CHUNK_SIZE).map(mapRow);

    const successRows: Prisma.ImportRowCreateManyInput[] = [];
    const failedRows: Prisma.ImportRowCreateManyInput[] = [];

    await Promise.all(
      slice.map((m) =>
        run(async () => {
          const baseRow = {
            batchId,
            status: "SKIPPED" as const,
            raw: JSON.stringify(m),
            voterIdStr: m.voterId ?? null,
            phone1: m.mobile1 ?? null,
            familyExternalId: m.familyId ?? null,
            familyIdType: m.familyIdType ?? null,
            fatherNameStr: m.fatherName ?? null,
            partySupportStr: m.partySupport ?? null,
            wardNoStr: String(m.wardNo ?? "") || null,
            voterId: null as bigint | null,
            error: null as string | null,
            createdAt: new Date(),
          };

          if (!m.name) {
            failedRows.push({ ...baseRow, status: "SKIPPED", error: "Missing required field: name" });
            return;
          }

          try {
            const data = { ...m };
            let id: bigint;

            if (m.voterId) {
              const up = await prisma.voter.upsert({
                where: { voterId: m.voterId },
                update: data,
                create: data,
                select: { id: true, voterId: true },
              });
              id = up.id as unknown as bigint;
            } else if (m.mobile1) {
              const ex = await prisma.voter.findFirst({
                where: { name: m.name, mobile1: m.mobile1 },
                select: { id: true, voterId: true },
              });
              if (ex) {
                await prisma.voter.update({ where: { id: ex.id }, data });
                id = ex.id as unknown as bigint;
              } else {
                const c = await prisma.voter.create({ data, select: { id: true, voterId: true } });
                id = c.id as unknown as bigint;
              }
            } else {
              const c = await prisma.voter.create({ data, select: { id: true, voterId: true } });
              id = c.id as unknown as bigint;
            }

            if (m.voterId) epicToId.set(m.voterId.toUpperCase(), id);
            created.push({ id, data: m });

            if (LOG_SUCCESS_ROWS) successRows.push({ ...baseRow, status: "SUCCESS", voterId: id });
            else success++; // count success immediately if not logging per row
          } catch (e: any) {
            const msg = (e?.code === "P2002" && "duplicate (unique constraint)") || e?.message || "insert failed";
            failedRows.push({ ...baseRow, status: "FAILED", error: String(msg).slice(0, 1024) });
          }
        })
      )
    );

    // persist rows & update batch counters
    if (LOG_SUCCESS_ROWS && successRows.length) {
      await prisma.importRow.createMany({ data: successRows });
      success += successRows.length;
    }
    if (failedRows.length) {
      await prisma.importRow.createMany({ data: failedRows });
      failed += failedRows.length;
    }

    await prisma.importBatch.update({ where: { id: batchId }, data: { successCount: success, failedCount: failed } });
    await new Promise(r => setTimeout(r, 0));
  }

  // Phase 2: resolve headId (using numeric id or EPIC)
  for (let i = 0; i < created.length; i += IMPORT_CHUNK_SIZE) {
    const chunk = created.slice(i, i + IMPORT_CHUNK_SIZE);
    await Promise.all(
      chunk.map(async ({ id, data }) => {
        const rel = data.relationToHead;
        if (!rel) return;
        if (rel === "HEAD") {
          await prisma.voter.update({ where: { id }, data: { headId: null } });
          return;
        }

        // accept headId (numeric) or headEpic/headId string EPIC (if present in raw)
        const headEpic = (data as any).headEpic || null;
        const headIdStr = (data as any).headId || null;

        let target: bigint | null = null;

        // numeric?
        const numeric = String(headIdStr ?? "").trim();
        if (numeric && /^\d+$/.test(numeric)) {
          try { target = BigInt(numeric); } catch {}
        }

        // EPIC?
        const epic = String(headEpic ?? headIdStr ?? "").trim().toUpperCase();
        if (!target && epic) {
          target = epicToId.get(epic) ?? (await (async () => {
            const found = await prisma.voter.findFirst({
              where: { voterId: { in: [epic, epic.toLowerCase(), epic.toUpperCase()] } },
              select: { id: true },
            });
            return found ? (found.id as unknown as bigint) : null;
          })());
        }

        if (target && target !== id) {
          try { await prisma.voter.update({ where: { id }, data: { headId: target } }); } catch {}
        }
      })
    );
  }

  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "COMPLETED", completedAt: new Date() } });
}

/* ========================= route (background-safe) ========================= */
export async function POST(req: NextRequest) {
  // auth
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // form/file
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required (CSV/XLSX)" }, { status: 400 });
  }
  if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `File too large (${file.size} bytes). Limit ~${MAX_UPLOAD_BYTES} bytes.` }, { status: 413 });
  }

  const filename = file.name || "upload";
  const buf = Buffer.from(await file.arrayBuffer());

  // create batch now → UI can poll /api/imports/[batchId]
  const batch = await prisma.importBatch.create({
    data: {
      fileName: filename,
      status: "PENDING",
      uploadedById: (user.id as unknown as bigint) ?? null,
      rowCount: 0,
      successCount: 0,
      failedCount: 0,
    },
    select: { id: true },
  });

  // respond immediately and keep the function running in background
  const res = NextResponse.json({ batchId: String(batch.id), status: "PENDING", queued: true });
  res.headers.set("x-vercel-background", "true");

  (async () => {
    try {
      await processImport(batch.id as unknown as bigint, filename, buf);
    } catch (e) {
      await prisma.importBatch.update({
        where: { id: batch.id as unknown as bigint },
        data: { status: "FAILED", completedAt: new Date() },
      });
      console.error("[import worker crashed]", e);
    }
  })();

  return res;
}



// // app/api/voters/import/route.ts
// import type { NextRequest } from "next/server";
// import { NextResponse } from "next/server";
// import { Buffer } from "node:buffer";
// import { prisma } from "@/lib/prisma";
// import { getAuthedUser } from "@/lib/auth";
// import { isAdmin } from "@/lib/role";
// import type { ColourCode, FamilyIdType, FamilyRole, Prisma } from "@prisma/client";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// // ===== small, safe upload size (override via env if needed) =====
// const MAX_UPLOAD_BYTES = Number(process.env.IMPORT_MAX_UPLOAD_BYTES ?? 4_500_000); // ~4.5 MB

// /* ========================= CSV/XLSX parsing ========================= */
// type UnknownRecord = Record<string, unknown>;
// type StringRecord = Record<string, string>;

// function escCsvSplit(line: string): string[] {
//   const out: string[] = [];
//   let cur = "", inQ = false;
//   for (let i = 0; i < line.length; i++) {
//     const ch = line[i];
//     if (inQ) {
//       if (ch === `"` && line[i + 1] === `"`) { cur += `"`; i++; }
//       else if (ch === `"`) { inQ = false; }
//       else cur += ch;
//     } else {
//       if (ch === `"`) inQ = true;
//       else if (ch === `,`) { out.push(cur); cur = ""; }
//       else cur += ch;
//     }
//   }
//   out.push(cur);
//   return out;
// }

// function parseCsv(buf: Buffer): StringRecord[] {
//   const text = buf.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
//   const lines = text.split("\n").filter(l => l.trim().length > 0);
//   if (lines.length === 0) return [];
//   const header = escCsvSplit(lines[0]).map(h => h.trim());
//   const rows: StringRecord[] = [];
//   for (let i = 1; i < lines.length; i++) {
//     const cols = escCsvSplit(lines[i]);
//     const rec: StringRecord = {};
//     header.forEach((h, idx) => { rec[h] = cols[idx] ?? ""; });
//     rows.push(rec);
//   }
//   return rows;
// }

// // minimal + robust XLSX loader
// type SheetJSLike = {
//   read: (buf: Buffer, opts: { type: "buffer" }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
//   utils: { sheet_to_json: (sheet: unknown, opts: { raw: boolean }) => Record<string, unknown>[] };
// };
// function getDefaultIfPresent<T extends object>(mod: T | { default: T }): T {
//   const anyMod = mod as unknown as { default?: T };
//   return anyMod && anyMod.default ? anyMod.default : (mod as T);
// }
// async function parseXlsx(buf: Buffer): Promise<UnknownRecord[]> {
//   try {
//     const m = await import("xlsx");
//     const XLSX = getDefaultIfPresent(m as unknown as object) as unknown as SheetJSLike;
//     const wb = XLSX.read(buf, { type: "buffer" });
//     const first = wb.SheetNames?.[0];
//     if (!first) return [];
//     return XLSX.utils.sheet_to_json(wb.Sheets[first], { raw: false });
//   } catch (e) {
//     const err = new Error("XLSX parser not available. Ensure `xlsx` is installed and in next.config.ts serverExternalPackages.");
//     (err as any).cause = e;
//     throw err;
//   }
// }

// /* ========================= mapping helpers (slim) ========================= */
// function pickInsensitive<T = unknown>(row: Record<string, unknown>, keys: string[], def: T): T {
//   for (const k of keys) {
//     const hit = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
//     if (hit) return row[hit] as T;
//   }
//   return def;
// }
// function toBool(v: unknown): boolean | null {
//   const s = String(v ?? "").trim().toLowerCase();
//   if (["1","true","yes","y"].includes(s)) return true;
//   if (["0","false","no","n"].includes(s)) return false;
//   return null;
// }
// function toNum(v: unknown): number | null {
//   if (v == null || v === "") return null;
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// }
// function toColour(v: unknown): ColourCode {
//   const s = String(v ?? "").trim().toUpperCase();
//   return (["OUR","OPPOSITE","DOUBTFUL","OTHER"] as const).includes(s as ColourCode) ? (s as ColourCode) : "OTHER";
// }
// function toGender(v: unknown): "M"|"F"|"O"|null {
//   const s = String(v ?? "").trim().toUpperCase();
//   if (["M","F","O"].includes(s)) return s as any;
//   if (s === "MALE") return "M";
//   if (s === "FEMALE") return "F";
//   if (s === "OTHER") return "O";
//   return null;
// }
// function toFamilyRoleEnum(input: unknown): FamilyRole | null {
//   const s = String(input ?? "").trim().toUpperCase();
//   const ok: FamilyRole[] = ["HEAD","SPOUSE","CHILD","PARENT","SIBLING","OTHER"];
//   return ok.includes(s as FamilyRole) ? (s as FamilyRole) : null;
// }
// function toFamilyIdTypeEnum(input: unknown): FamilyIdType | null {
//   const s = String(input ?? "").trim().toUpperCase();
//   const map: Record<string, FamilyIdType> = {
//     "JAN_AADHAAR_FAMILY_ID": "JAN_AADHAAR_FAMILY_ID",
//     "JAN AADHAAR FAMILY ID": "JAN_AADHAAR_FAMILY_ID",
//     "JANAADHAAR": "JAN_AADHAAR_FAMILY_ID",
//     "JAN AADHAAR": "JAN_AADHAAR_FAMILY_ID",
//     "RATION_CARD_NO": "RATION_CARD_NO",
//     "RATION CARD NO": "RATION_CARD_NO",
//     "RATION CARD": "RATION_CARD_NO",
//     "RC": "RATION_CARD_NO",
//     "OTHER": "OTHER",
//   };
//   return map[s] ?? null;
// }

// function mapRow(row: UnknownRecord) {
//   const name = String(pickInsensitive(row, ["name","full name","voter_name"], "")).trim();
//   const voterId = (String(pickInsensitive(row, ["voterId","voter_id","epic"], "")).trim() || null);
//   const mobile1 = (String(pickInsensitive(row, ["mobile1","phone","mobile"], "")).trim() || null);

//   const data = {
//     name,
//     voterId,
//     village: (String(pickInsensitive(row, ["village","area"], "")).trim() || null),
//     houseNo: (String(pickInsensitive(row, ["houseNo","house_no"], "")).trim() || null),
//     address: (String(pickInsensitive(row, ["address"], "")).trim() || null),
//     boothName: (String(pickInsensitive(row, ["boothName","booth_name"], "")).trim() || null),
//     boothNo: toNum(pickInsensitive(row, ["boothNo","booth_no"], "")),
//     partNo: toNum(pickInsensitive(row, ["partNo","part_no"], "")),
//     srn: toNum(pickInsensitive(row, ["srn","serial"], "")),
//     mobile1,
//     mobile2: (String(pickInsensitive(row, ["mobile2","alt_phone"], "")).trim() || null),
//     email: (String(pickInsensitive(row, ["email"], "")).trim() || null),
//     gender: toGender(pickInsensitive(row, ["gender","sex"], "")) as any,
//     colourCode: toColour(pickInsensitive(row, ["colourCode","color","segment"], "")),
//     voted: toBool(pickInsensitive(row, ["voted"], "")) ?? false,
//     starVoter: toBool(pickInsensitive(row, ["starVoter","star"], "")) ?? false,
//     dead: toBool(pickInsensitive(row, ["dead","is_dead"], "")) ?? false,
//     caste: (String(pickInsensitive(row, ["caste"], "")).trim() || null),
//     profession: (String(pickInsensitive(row, ["profession"], "")).trim() || null),
//     demands: (String(pickInsensitive(row, ["demands"], "")).trim() || null),
//     extraInfo: (String(pickInsensitive(row, ["extraInfo","notes","remark"], "")).trim() || null),
//     // simple: we accept "age" as number; skip dob parsing here to keep it robust
//     age: toNum(pickInsensitive(row, ["age"], "")),
//     fatherName: (String(pickInsensitive(row, ["fatherName","father","father_name"], "")).trim() || null),
//     partySupport: (String(pickInsensitive(row, ["partySupport","party_support","party"], "")).trim() || null),
//     wardNo: toNum(pickInsensitive(row, ["wardNo","ward_no","ward"], "")),
//     familyId: (String(pickInsensitive(row, ["familyId","family","family_code","janAadhaar","jan_aadhaar","rationCard","ration_card","family_id"], "")).trim() || null),
//     familyIdType: toFamilyIdTypeEnum(pickInsensitive(row, ["familyIdType","family_id_type","id_type"], "")),
//     relationToHead: toFamilyRoleEnum(pickInsensitive(row, ["relationToHead","role"], "")),
//     // We ignore headId/headEpic in this simplified version to reduce failure points
//     headId: null as bigint | null,
//     dob: null as Date | null,
//   };

//   return data;
// }

// /* ========================= route ========================= */
// export async function POST(req: NextRequest) {
//   // 1) auth
//   const user = await getAuthedUser(req);
//   if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
//   if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

//   // 2) form/file
//   const form = await req.formData().catch(() => null);
//   const file = form?.get("file");
//   if (!file || !(file instanceof File)) {
//     return NextResponse.json({ error: "file required (CSV/XLSX)" }, { status: 400 });
//   }
//   if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
//     return NextResponse.json(
//       { error: `File too large (${file.size} bytes). Limit ~${MAX_UPLOAD_BYTES} bytes.` },
//       { status: 413 }
//     );
//   }

//   // 3) parse
//   const filename = file.name || "upload";
//   const buf = Buffer.from(await file.arrayBuffer());
//   let rows: UnknownRecord[] = [];
//   try {
//     rows = /\.(xlsx|xlsm|xls)$/i.test(filename) ? await parseXlsx(buf) : parseCsv(buf);
//   } catch (e:any) {
//     return NextResponse.json({ error: e?.message || "parse failed" }, { status: 400 });
//   }

//   if (rows.length === 0) {
//     return NextResponse.json({ rowCount: 0, successCount: 0, failedCount: 0, errors: [] });
//   }

//   // 4) process (simple/synchronous)
//   let successCount = 0;
//   let failedCount = 0;
//   const errors: Array<{ index: number; reason: string }> = [];

//   // gentle concurrency to avoid DB saturation on serverless
//   const CONCURRENCY = Number(process.env.IMPORT_CONCURRENCY ?? 2);
//   let running = 0;
//   const queue: Array<() => Promise<void>> = [];

//   function run<T>(fn: () => Promise<T>): Promise<T> {
//     return new Promise<T>((resolve, reject) => {
//       const task = async () => {
//         try {
//           running++;
//           const res = await fn();
//           resolve(res);
//         } catch (e) {
//           reject(e);
//         } finally {
//           running--;
//           pump();
//         }
//       };
//       queue.push(task);
//       pump();
//     });
//   }
//   function pump() {
//     while (running < CONCURRENCY && queue.length) {
//       const t = queue.shift()!;
//       t();
//     }
//   }

//   const tasks = rows.map((r, idx) =>
//     run(async () => {
//       const m = mapRow(r);
//       if (!m.name) {
//         failedCount++;
//         errors.push({ index: idx, reason: "Missing required field: name" });
//         return;
//       }
//       try {
//         // upsert by voterId if present; else by (name + mobile1)
//         if (m.voterId) {
//           await prisma.voter.upsert({
//             where: { voterId: m.voterId },
//             update: { ...m },
//             create: { ...m },
//           });
//         } else if (m.mobile1) {
//           const existing = await prisma.voter.findFirst({
//             where: { name: m.name, mobile1: m.mobile1 },
//             select: { id: true },
//           });
//           if (existing) {
//             await prisma.voter.update({ where: { id: existing.id }, data: { ...m } });
//           } else {
//             await prisma.voter.create({ data: { ...m } });
//           }
//         } else {
//           // no stable key → create new
//           await prisma.voter.create({ data: { ...m } });
//         }
//         successCount++;
//       } catch (e: any) {
//         failedCount++;
//         const msg =
//           (e?.code === "P2002" && "duplicate (unique constraint)") ||
//           e?.message ||
//           "insert failed";
//         errors.push({ index: idx, reason: String(msg).slice(0, 200) });
//       }
//     })
//   );

//   await Promise.allSettled(tasks);

//   // 5) return one-shot summary (no batchId)
//   return NextResponse.json({
//     rowCount: rows.length,
//     successCount,
//     failedCount,
//     errors,
//   });
// }

// // app/api/voters/import/route.ts
// import type { NextRequest } from "next/server";
// import { NextResponse } from "next/server";
// import { Buffer } from "node:buffer";
// import * as XLSX from "xlsx"; // static import (works on Node runtime)
// import { prisma } from "@/lib/prisma";
// import { getAuthedUser } from "@/lib/auth";
// import { isAdmin } from "@/lib/role";
// import type { ColourCode, FamilyIdType, FamilyRole } from "@prisma/client";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// /* --------------------- tunables --------------------- */
// // Keep modest on serverless to avoid 413s/timeouts; raise if you self-host
// const MAX_UPLOAD_BYTES = Number(process.env.IMPORT_MAX_UPLOAD_BYTES ?? 4_500_000); // ~4.5 MB
// const MAX_ROWS = Number(process.env.IMPORT_MAX_ROWS ?? 5000);
// const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE ?? 25); // rows per transaction

// /* --------------------- helpers --------------------- */
// type UnknownRecord = Record<string, unknown>;
// type StringRecord = Record<string, string>;

// function escCsvSplit(line: string): string[] {
//   const out: string[] = [];
//   let cur = "", inQ = false;
//   for (let i = 0; i < line.length; i++) {
//     const ch = line[i];
//     if (inQ) {
//       if (ch === `"` && line[i + 1] === `"`) { cur += `"`; i++; }
//       else if (ch === `"`) { inQ = false; }
//       else cur += ch;
//     } else {
//       if (ch === `"`) inQ = true;
//       else if (ch === `,`) { out.push(cur); cur = ""; }
//       else cur += ch;
//     }
//   }
//   out.push(cur);
//   return out;
// }

// function parseCsv(buf: Buffer): StringRecord[] {
//   const text = buf.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
//   const lines = text.split("\n").filter(l => l.trim().length > 0);
//   if (lines.length === 0) return [];
//   const header = escCsvSplit(lines[0]).map(h => h.trim());
//   const rows: StringRecord[] = [];
//   for (let i = 1; i < lines.length; i++) {
//     const cols = escCsvSplit(lines[i]);
//     const rec: StringRecord = {};
//     header.forEach((h, idx) => { rec[h] = cols[idx] ?? ""; });
//     rows.push(rec);
//   }
//   return rows;
// }

// function toNum(v: unknown): number | null {
//   if (v == null || v === "") return null;
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// }
// function toBool(v: unknown): boolean | null {
//   const s = String(v ?? "").trim().toLowerCase();
//   if (["1","true","yes","y"].includes(s)) return true;
//   if (["0","false","no","n"].includes(s)) return false;
//   return null;
// }
// function toColour(v: unknown): ColourCode {
//   const s = String(v ?? "").trim().toUpperCase();
//   return (["OUR","OPPOSITE","DOUBTFUL","OTHER"] as const).includes(s as ColourCode) ? (s as ColourCode) : "OTHER";
// }
// function toGender(v: unknown): "M"|"F"|"O"|null {
//   const s = String(v ?? "").trim().toUpperCase();
//   if (["M","F","O"].includes(s)) return s as any;
//   if (s === "MALE") return "M";
//   if (s === "FEMALE") return "F";
//   if (s === "OTHER") return "O";
//   return null;
// }
// function toFamilyRoleEnum(input: unknown): FamilyRole | null {
//   const s = String(input ?? "").trim().toUpperCase();
//   const ok: FamilyRole[] = ["HEAD","SPOUSE","CHILD","PARENT","SIBLING","OTHER"];
//   return ok.includes(s as FamilyRole) ? (s as FamilyRole) : null;
// }
// function toFamilyIdTypeEnum(input: unknown): FamilyIdType | null {
//   const s = String(input ?? "").trim().toUpperCase();
//   const map: Record<string, FamilyIdType> = {
//     "JAN_AADHAAR_FAMILY_ID": "JAN_AADHAAR_FAMILY_ID",
//     "JAN AADHAAR FAMILY ID": "JAN_AADHAAR_FAMILY_ID",
//     "JANAADHAAR": "JAN_AADHAAR_FAMILY_ID",
//     "JAN AADHAAR": "JAN_AADHAAR_FAMILY_ID",
//     "RATION_CARD_NO": "RATION_CARD_NO",
//     "RATION CARD NO": "RATION_CARD_NO",
//     "RATION CARD": "RATION_CARD_NO",
//     "RC": "RATION_CARD_NO",
//     "OTHER": "OTHER",
//   };
//   return map[s] ?? null;
// }
// function pickInsensitive<T = unknown>(row: Record<string, unknown>, keys: string[], def: T): T {
//   for (const k of keys) {
//     const hit = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
//     if (hit) return row[hit] as T;
//   }
//   return def;
// }
// function mapRow(row: UnknownRecord) {
//   const name = String(pickInsensitive(row, ["name","full name","voter_name"], "")).trim();
//   const voterId = (String(pickInsensitive(row, ["voterId","voter_id","epic"], "")).trim() || null);
//   const mobile1 = (String(pickInsensitive(row, ["mobile1","phone","mobile"], "")).trim() || null);

//   return {
//     name,
//     voterId,
//     village: (String(pickInsensitive(row, ["village","area"], "")).trim() || null),
//     houseNo: (String(pickInsensitive(row, ["houseNo","house_no"], "")).trim() || null),
//     address: (String(pickInsensitive(row, ["address"], "")).trim() || null),
//     boothName: (String(pickInsensitive(row, ["boothName","booth_name"], "")).trim() || null),
//     boothNo: toNum(pickInsensitive(row, ["boothNo","booth_no"], "")),
//     partNo: toNum(pickInsensitive(row, ["partNo","part_no"], "")),
//     srn: toNum(pickInsensitive(row, ["srn","serial"], "")),
//     mobile1,
//     mobile2: (String(pickInsensitive(row, ["mobile2","alt_phone"], "")).trim() || null),
//     email: (String(pickInsensitive(row, ["email"], "")).trim() || null),
//     gender: toGender(pickInsensitive(row, ["gender","sex"], "")) as any,
//     colourCode: toColour(pickInsensitive(row, ["colourCode","color","segment"], "")),
//     voted: toBool(pickInsensitive(row, ["voted"], "")) ?? false,
//     starVoter: toBool(pickInsensitive(row, ["starVoter","star"], "")) ?? false,
//     dead: toBool(pickInsensitive(row, ["dead","is_dead"], "")) ?? false,
//     caste: (String(pickInsensitive(row, ["caste"], "")).trim() || null),
//     profession: (String(pickInsensitive(row, ["profession"], "")).trim() || null),
//     demands: (String(pickInsensitive(row, ["demands"], "")).trim() || null),
//     extraInfo: (String(pickInsensitive(row, ["extraInfo","notes","remark"], "")).trim() || null),
//     age: toNum(pickInsensitive(row, ["age"], "")),
//     fatherName: (String(pickInsensitive(row, ["fatherName","father","father_name"], "")).trim() || null),
//     partySupport: (String(pickInsensitive(row, ["partySupport","party_support","party"], "")).trim() || null),
//     wardNo: toNum(pickInsensitive(row, ["wardNo","ward_no","ward"], "")),
//     familyId: (String(pickInsensitive(row, ["familyId","family","family_code","janAadhaar","jan_aadhaar","rationCard","ration_card","family_id"], "")).trim() || null),
//     familyIdType: toFamilyIdTypeEnum(pickInsensitive(row, ["familyIdType","family_id_type","id_type"], "")),
//     relationToHead: toFamilyRoleEnum(pickInsensitive(row, ["relationToHead","role"], "")),
//     headId: null as bigint | null,
//     dob: null as Date | null,
//   };
// }

// /* --------------------- route --------------------- */
// export async function POST(req: NextRequest) {
//   // auth
//   const user = await getAuthedUser(req);
//   if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
//   if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

//   // file
//   const form = await req.formData().catch(() => null);
//   const file = form?.get("file");
//   if (!file || !(file instanceof File)) {
//     return NextResponse.json({ error: "file required (CSV/XLSX)" }, { status: 400 });
//   }
//   if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
//     return NextResponse.json({ error: `File too large (${file.size} bytes). Limit ~${MAX_UPLOAD_BYTES} bytes.` }, { status: 413 });
//   }

//   // parse
//   const filename = file.name || "upload";
//   const buf = Buffer.from(await file.arrayBuffer());

//   let rows: UnknownRecord[] = [];
//   try {
//     if (/\.(xlsx|xlsm|xls)$/i.test(filename)) {
//       // static XLSX import (same approach as your other working project)
//       const wb = XLSX.read(buf, { type: "buffer" });
//       const sheet = wb.Sheets[wb.SheetNames[0]];
//       rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // avoid undefineds
//     } else {
//       rows = parseCsv(buf);
//     }
//   } catch {
//     return NextResponse.json({ error: "Failed to parse file. Upload a valid Excel/CSV." }, { status: 400 });
//   }

//   if (rows.length === 0) {
//     return NextResponse.json({ rowCount: 0, successCount: 0, failedCount: 0, errors: [] });
//   }
//   if (rows.length > MAX_ROWS) {
//     return NextResponse.json({ error: `Too many rows (${rows.length}). Max is ${MAX_ROWS}.` }, { status: 400 });
//   }

//   // map → inputs
//   const mapped = rows.map(mapRow);

//   // batched DB writes using callback $transaction (type-safe, no red squiggles)
//   const errors: Array<{ index: number; reason: string }> = [];
//   let successCount = 0;

//   for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
//     const chunk = mapped.slice(i, i + BATCH_SIZE);

//     try {
//       await prisma.$transaction(async (tx) => {
//         for (let j = 0; j < chunk.length; j++) {
//           const m = chunk[j];
//           const idx = i + j;

//           if (!m.name) {
//             errors.push({ index: idx, reason: "Missing required field: name" });
//             continue;
//           }

//           try {
//             if (m.voterId) {
//               await tx.voter.upsert({
//                 where: { voterId: m.voterId },
//                 update: { ...m },
//                 create: { ...m },
//               });
//             } else if (m.mobile1) {
//               const ex = await tx.voter.findFirst({
//                 where: { name: m.name, mobile1: m.mobile1 },
//                 select: { id: true },
//               });
//               if (ex) {
//                 await tx.voter.update({ where: { id: ex.id }, data: { ...m } });
//               } else {
//                 await tx.voter.create({ data: { ...m } });
//               }
//             } else {
//               await tx.voter.create({ data: { ...m } });
//             }
//             successCount++;
//           } catch (rowErr: any) {
//             const msg =
//               (rowErr?.code === "P2002" && "duplicate (unique constraint)") ||
//               rowErr?.message ||
//               "insert failed";
//             errors.push({ index: idx, reason: String(msg).slice(0, 200) });
//             // keep processing other rows in the same tx block
//           }
//         }
//       });
//     } catch (batchErr) {
//       // If the whole batch failed (e.g., deadlock), retry per-row outside tx
//       for (let j = 0; j < chunk.length; j++) {
//         const m = chunk[j];
//         const idx = i + j;
//         if (!m.name) continue;
//         try {
//           if (m.voterId) {
//             await prisma.voter.upsert({
//               where: { voterId: m.voterId },
//               update: { ...m },
//               create: { ...m },
//             });
//           } else if (m.mobile1) {
//             const ex = await prisma.voter.findFirst({
//               where: { name: m.name, mobile1: m.mobile1 },
//               select: { id: true },
//             });
//             if (ex) await prisma.voter.update({ where: { id: ex.id }, data: { ...m } });
//             else await prisma.voter.create({ data: { ...m } });
//           } else {
//             await prisma.voter.create({ data: { ...m } });
//           }
//           successCount++;
//         } catch (rowErr: any) {
//           const msg =
//             (rowErr?.code === "P2002" && "duplicate (unique constraint)") ||
//             rowErr?.message ||
//             "insert failed";
//           errors.push({ index: idx, reason: String(msg).slice(0, 200) });
//         }
//       }
//     }
//   }

//   const failedCount = rows.length - successCount;
//   return NextResponse.json({
//     rowCount: rows.length,
//     successCount,
//     failedCount,
//     errors,
//   });
// }
