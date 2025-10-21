// app/api/voters/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// small CSV escaper
function esc(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toBool(v: string | null) {
  if (v == null) return undefined;
  const s = v.toLowerCase();
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}
function toInt(v: string | null) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function pickColour(v: string | null) {
  if (!v) return undefined;
  const up = v.toUpperCase();
  if (["OUR", "OPPOSITE", "DOUBTFUL", "OTHER"].includes(up))
    return up as "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
  return undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const colour = pickColour(searchParams.get("colourCode"));
  const voted = toBool(searchParams.get("voted"));
  const star = toBool(searchParams.get("starVoter"));
  const dead = toBool(searchParams.get("dead"));

  // NEW: numeric filters
  const boothNo = toInt(searchParams.get("boothNo"));
  const wardNo = toInt(searchParams.get("wardNo"));

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { village: { contains: q } },
      { voterId: { contains: q } },
      { mobile1: { contains: q } },
      { mobile2: { contains: q } },
      { boothName: { contains: q } },
      { familyId: { contains: q } },
      // also allow search across some new/free-text fields
      { fatherName: { contains: q } },
      { partySupport: { contains: q } },
    ];
  }
  if (colour !== undefined) where.colourCode = colour;
  if (voted !== undefined) where.voted = voted;
  if (star !== undefined) where.starVoter = star;
  if (dead !== undefined) where.dead = dead;
  if (boothNo !== undefined) where.boothNo = boothNo;
  if (wardNo !== undefined) where.wardNo = wardNo;

  // Export up to 50k rows (tweak as needed)
  const MAX = Math.min(50000, Number(searchParams.get("max") || "20000"));

  const rows = await prisma.voter.findMany({
    where,
    take: MAX,
    orderBy: [{ starVoter: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      voterId: true,
      age: true,
      gender: true,
      village: true,
      houseNo: true,
      address: true,
      boothName: true,
      boothNo: true,
      partNo: true,
      srn: true,
      mobile1: true,
      mobile2: true,
      email: true,
      colourCode: true,
      voted: true,
      starVoter: true,
      dead: true,
      caste: true,
      profession: true,
      demands: true,
      extraInfo: true,
      dob: true,

      // NEW fields
      fatherName: true,
      partySupport: true,
      wardNo: true,
      familyIdType: true,

      familyId: true,
      relationToHead: true,
      headId: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  // Updated header to include new fields (kept order logical)
  const header = [
    "id","name","voterId","age","gender","village","houseNo","address",
    "boothName","boothNo","partNo","srn",
    "mobile1","mobile2","email",
    "colourCode","voted","starVoter","dead",
    "caste","profession","demands","extraInfo","dob",
    // NEW:
    "fatherName","partySupport","wardNo","familyIdType",
    "familyId","relationToHead","headId",
    "createdAt","updatedAt"
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      esc(r.id.toString()),
      esc(r.name),
      esc(r.voterId ?? ""),
      esc(r.age ?? ""),
      esc(r.gender ?? ""),
      esc(r.village ?? ""),
      esc(r.houseNo ?? ""),
      esc(r.address ?? ""),
      esc(r.boothName ?? ""),
      esc(r.boothNo ?? ""),
      esc(r.partNo ?? ""),
      esc(r.srn ?? ""),
      esc(r.mobile1 ?? ""),
      esc(r.mobile2 ?? ""),
      esc(r.email ?? ""),
      esc(r.colourCode),
      esc(r.voted ? 1 : 0),
      esc(r.starVoter ? 1 : 0),
      esc(r.dead ? 1 : 0),
      esc(r.caste ?? ""),
      esc(r.profession ?? ""),
      esc(r.demands ?? ""),
      esc(r.extraInfo ?? ""),
      esc(r.dob ? r.dob.toISOString().slice(0, 10) : ""),

      // NEW fields
      esc(r.fatherName ?? ""),
      esc(r.partySupport ?? ""),
      esc(r.wardNo ?? ""),
      esc(r.familyIdType ?? ""),

      esc(r.familyId ?? ""),
      esc(r.relationToHead ?? ""),
      esc(r.headId ? r.headId.toString() : ""),

      esc(r.createdAt.toISOString()),
      esc(r.updatedAt.toISOString()),
    ].join(","));
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voters_export_${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
