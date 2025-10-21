// app/api/voters/search/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));

  // Optional: filter by familyId (string like Jan Aadhaar / Ration Card / any family code)
  const familyIdParam = (searchParams.get("familyId") || "").trim();

  const where: Record<string, any> = {};
  if (q) {
    where.OR = [
      { name:       { contains: q } },
      { fatherName: { contains: q } }, // NEW: search by fatherName
      { village:    { contains: q } },
      { voterId:    { contains: q } },
      { mobile1:    { contains: q } },
      { mobile2:    { contains: q } },
      { familyId:   { contains: q } },
    ];
  }
  if (familyIdParam) {
    where.familyId = { contains: familyIdParam };
  }

  const rows = await prisma.voter.findMany({
    where,
    take: limit,
    orderBy: [{ starVoter: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      village: true,
      mobile1: true,
      voterId: true,
      colourCode: true,
      familyId: true,
    },
  });

  const payload = rows.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    village: r.village,
    mobile1: r.mobile1,
    voterId: r.voterId,
    colourCode: r.colourCode as Colour,
    familyId: r.familyId ?? null,
  }));

  return NextResponse.json(payload);
}
