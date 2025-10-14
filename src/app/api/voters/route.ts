// // app/api/voters/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

// ---------- helpers ----------
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
type Colour = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
function pickColour(v: string | null): Colour | undefined {
  if (!v) return undefined;
  const up = v.toUpperCase();
  return (["OUR", "OPPOSITE", "DOUBTFUL", "OTHER"] as const).includes(up as Colour)
    ? (up as Colour)
    : undefined;
}

// Shape of a row we select for the list
type VoterListRow = {
  id: bigint;
  name: string;
  voterId: string | null;
  village: string | null;
  boothNo: number | null;
  partNo: number | null;
  srn: number | null;
  mobile1: string | null;
  colourCode: Colour;
  voted: boolean;
  starVoter: boolean;
  dead: boolean;
  updatedAt: Date;
};

// ---------- handlers ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, toInt(searchParams.get("page")) ?? 1);
  const limit = Math.min(100, Math.max(1, toInt(searchParams.get("limit")) ?? 20));

  const colour = pickColour(searchParams.get("colourCode"));
  const voted = toBool(searchParams.get("voted"));
  const star = toBool(searchParams.get("starVoter"));
  const dead = toBool(searchParams.get("dead"));

  // Build where clause (NO `mode: "insensitive"` anywhere)
  const where: Record<string, any> = {};
  if (q) {
    where.OR = [
      { name:     { contains: q } },
      { village:  { contains: q } },
      { voterId:  { contains: q } },
      { mobile1:  { contains: q } },
      { mobile2:  { contains: q } },
      { boothName:{ contains: q } },
    ];
  }
  if (colour !== undefined) where.colourCode = colour;
  if (voted !== undefined) where.voted = voted;
  if (star !== undefined) where.starVoter = star;
  if (dead !== undefined) where.dead = dead;

  const [total, rows] = await Promise.all([
    prisma.voter.count({ where }),
    prisma.voter.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: [{ starVoter: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        voterId: true,
        village: true,
        boothNo: true,
        partNo: true,
        srn: true,
        mobile1: true,
        colourCode: true,
        voted: true,
        starVoter: true,
        dead: true,
        updatedAt: true,
      },
    }),
  ]);

  const typedRows = rows as VoterListRow[];
  const items = typedRows.map((r) => ({ ...r, id: r.id.toString() }));

  return NextResponse.json({ page, limit, total, items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const created = await prisma.voter.create({
      data: {
        name,
        voterId: body.voterId ?? null,
        age: typeof body.age === "number" ? body.age : null,
        gender: body.gender ?? null,
        village: body.village ?? null,
        houseNo: body.houseNo ?? null,
        address: body.address ?? null,
        boothName: body.boothName ?? null,
        boothNo: typeof body.boothNo === "number" ? body.boothNo : null,
        partNo: typeof body.partNo === "number" ? body.partNo : null,
        srn: typeof body.srn === "number" ? body.srn : null,
        mobile1: body.mobile1 ?? null,
        mobile2: body.mobile2 ?? null,
        email: body.email ?? null,
        colourCode: (body.colourCode as Colour) ?? "OTHER",
        voted: typeof body.voted === "boolean" ? body.voted : false,
        starVoter: typeof body.starVoter === "boolean" ? body.starVoter : false,
        dead: typeof body.dead === "boolean" ? body.dead : false,
        caste: body.caste ?? null,
        profession: body.profession ?? null,
        personnel: body.personnel ?? null,
        society: body.society ?? null,
        flatNo: body.flatNo ?? null,
        newAddress: body.newAddress ?? null,
        demands: body.demands ?? null,
        extraInfo1: body.extraInfo1 ?? null,
        extraInfo2: body.extraInfo2 ?? null,
        extraInfo3: body.extraInfo3 ?? null,
        extraInfo4: body.extraInfo4 ?? null,
        extraInfo5: body.extraInfo5 ?? null,
        extraCheck1: typeof body.extraCheck1 === "boolean" ? body.extraCheck1 : null,
        extraCheck2: typeof body.extraCheck2 === "boolean" ? body.extraCheck2 : null,
        dob: body.dob ? new Date(body.dob) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id.toString() }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "duplicate entry" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
