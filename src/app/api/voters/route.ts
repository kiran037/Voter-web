// // app/api/voters/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import type { FamilyIdType, ColourCode } from "@prisma/client";

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

  // 🔴 added for Home table
  fatherName: string | null;
  wardNo: number | null;
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

  // boothNo filter (numeric)
  const boothNoParam = (searchParams.get("boothNo") || "").trim();
  const boothNo = boothNoParam ? toInt(boothNoParam) : undefined;

  const where: Record<string, any> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { fatherName: { contains: q } },
      { village: { contains: q } },
      { voterId: { contains: q } },
      { mobile1: { contains: q } },
      { mobile2: { contains: q } },
      { boothName: { contains: q } },
      { familyId: { contains: q } },
    ];
  }
  if (colour !== undefined) where.colourCode = colour;
  if (voted !== undefined) where.voted = voted;
  if (star !== undefined) where.starVoter = star;
  if (dead !== undefined) where.dead = dead;
  if (boothNo !== undefined) where.boothNo = boothNo;

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

        // 🔴 ensure these are returned
        fatherName: true,
        wardNo: true,
      },
    }),
  ]);

  const typedRows = rows as VoterListRow[];
  const items = typedRows.map((r) => ({
    ...r,
    id: r.id.toString(),
    // (Dates will be serialized to ISO by NextResponse.json)
  }));

  return NextResponse.json({ page, limit, total, items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const body = await req.json();

    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const familyId: string | null =
      typeof body.familyId === "string" && body.familyId.trim() ? body.familyId.trim() : null;

    // optional enum (string) -> FamilyIdType
    const familyIdType: FamilyIdType | null =
      typeof body.familyIdType === "string" && body.familyIdType.trim()
        ? (body.familyIdType.toUpperCase() as FamilyIdType)
        : null;

    let headIdBig: bigint | null = null;
    if (body.headId != null) {
      if (typeof body.headId === "string" && body.headId.trim()) {
        try { headIdBig = BigInt(body.headId.trim()); } catch {
          return NextResponse.json({ error: "invalid headId" }, { status: 400 });
        }
      } else if (typeof body.headId === "number" && Number.isFinite(body.headId)) {
        try { headIdBig = BigInt(body.headId); } catch {
          return NextResponse.json({ error: "invalid headId" }, { status: 400 });
        }
      } else if (body.headId === null) {
        headIdBig = null;
      }
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
        colourCode: (body.colourCode as ColourCode) ?? "OTHER",
        voted: typeof body.voted === "boolean" ? body.voted : false,
        starVoter: typeof body.starVoter === "boolean" ? body.starVoter : false,
        dead: typeof body.dead === "boolean" ? body.dead : false,

        caste: body.caste ?? null,
        profession: body.profession ?? null,
        demands: body.demands ?? null,
        extraInfo: body.extraInfo ?? null,

        dob: body.dob ? new Date(body.dob) : null,

        // NEW fields
        fatherName: typeof body.fatherName === "string" ? body.fatherName : null,
        partySupport: typeof body.partySupport === "string" ? body.partySupport : null,
        wardNo: typeof body.wardNo === "number" ? body.wardNo : null,

        familyId,
        familyIdType,
        relationToHead:
          typeof body.relationToHead === "string" && body.relationToHead.trim()
            ? (body.relationToHead as any)
            : null,
        headId: headIdBig,
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
