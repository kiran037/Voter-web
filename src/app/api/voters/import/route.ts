// app/api/voters/import/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import * as XLSX from "xlsx"; // static import → add "xlsx" to next.config.ts serverExternalPackages
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import type { FamilyRole, ColourCode, FamilyIdType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Some platforms ignore this, but set it anyway:
export const maxDuration = 300;

/* ============== Tunables (env) ============== */
const MAX_UPLOAD_BYTES = Number(process.env.IMPORT_MAX_UPLOAD_BYTES ?? 4_500_000); // ~4.5 MB
const CHUNK_SIZE       = Number(process.env.IMPORT_CHUNK_SIZE ?? 200);  // rows per batch
const CONCURRENCY      = Number(process.env.IMPORT_CONCURRENCY ?? 4);    // parallel writes per batch
const MAX_ROWS         = Number(process.env.IMPORT_MAX_ROWS ?? 20000);   // hard guard

/* ============== CSV/XLSX parsing ============== */
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
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = escCsvSplit(lines[0]).map((h) => h.trim());
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
  // defval keeps empty cells as "" instead of undefined (easier mapping)
  return XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: "" });
}

/* ============== mapping helpers ============== */
function pickInsensitive<T = unknown>(row: Record<string, unknown>, keys: string[], def: T): T {
  for (const k of keys) {
    const hit = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
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
function toGender(v: unknown): "M" | "F" | "O" | null {
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

type InputRow = ReturnType<typeof mapRow>;
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

/* ============== tiny limiter (per-batch concurrency) ============== */
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

/* ============== route ============== */
export async function POST(req: NextRequest) {
  // auth
  const me = await getAuthedUser(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // form/file
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

  // parse
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
    return NextResponse.json({ error: `Too many rows (${rows.length}). Max is ${MAX_ROWS}.` }, { status: 400 });
  }

  const mapped: InputRow[] = rows.map(mapRow);

  // process synchronously (chunked + limited concurrency)
  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
    const slice = mapped.slice(i, i + CHUNK_SIZE);
    const run = limiter(CONCURRENCY);

    await Promise.all(
      slice.map((m, offset) =>
        run(async () => {
          const idx = i + offset;

          if (!m.name) {
            failedCount++;
            errors.push({ index: idx, reason: "Missing required field: name" });
            return;
          }

          try {
            if (m.voterId) {
              await prisma.voter.upsert({
                where: { voterId: m.voterId },
                update: { ...m },
                create: { ...m },
              });
            } else if (m.mobile1) {
              const existing = await prisma.voter.findFirst({
                where: { name: m.name, mobile1: m.mobile1 },
                select: { id: true },
              });
              if (existing) {
                await prisma.voter.update({ where: { id: existing.id }, data: { ...m } });
              } else {
                await prisma.voter.create({ data: { ...m } });
              }
            } else {
              await prisma.voter.create({ data: { ...m } });
            }

            successCount++;
          } catch (e: any) {
            failedCount++;
            const msg =
              (e?.code === "P2002" && "duplicate (unique constraint)") ||
              e?.message ||
              "insert failed";
            errors.push({ index: idx, reason: String(msg).slice(0, 200) });
          }
        })
      )
    );

    // yield to event loop between batches to avoid long blocking
    await new Promise((r) => setTimeout(r, 0));
  }

  return NextResponse.json({
    rowCount: mapped.length,
    successCount,
    failedCount,
    errors,
  });
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
