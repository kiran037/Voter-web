// app/api/voters/search/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
type SearchRow = {
  id: bigint;
  name: string;
  village: string | null;
  mobile1: string | null;
  voterId: string | null;
  colourCode: Colour;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));

  // NOTE: removed `mode: "insensitive"` to satisfy your Prisma client
  const where = q
    ? {
        OR: [
          { name:    { contains: q } },
          { village: { contains: q } },
          { voterId: { contains: q } },
          { mobile1: { contains: q } },
          { mobile2: { contains: q } },
        ],
      }
    : {};

  const rows = (await prisma.voter.findMany({
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
    },
  })) as SearchRow[];

  const payload = rows.map((r) => ({ ...r, id: r.id.toString() }));
  return NextResponse.json(payload);
}
