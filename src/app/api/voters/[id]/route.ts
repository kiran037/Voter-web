// app/api/voters/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import type { FamilyIdType, FamilyRole, ColourCode, Gender } from "@prisma/client";

function toId(param: string) {
  try { return BigInt(param); } catch { return null; }
}

// Next.js 15 dynamic route: params can be awaited
type ParamsPromise = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: ParamsPromise) {
  const { id: idStr } = await ctx.params;
  const id = toId(idStr);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // fetch voter + resolve head (if any) + minimal family peek (members count and a few names)
  const v = await prisma.voter.findUnique({
    where: { id },
    include: {
      head: { select: { id: true, name: true } },             // self-ref head
      members: { select: { id: true }, take: 1 },             // who point to this voter as head
    },
  });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });

  // If you want to preview family members, get a few with same familyId
  let familyPreview: Array<{ id: string; name: string }> = [];
  if (v.familyId) {
    const others = await prisma.voter.findMany({
      where: { familyId: v.familyId, NOT: { id: v.id } },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
      take: 5,
    });
    familyPreview = others.map(m => ({ id: m.id.toString(), name: m.name }));
  }

  return NextResponse.json({
    id: v.id.toString(),
    name: v.name,
    voterId: v.voterId,
    age: v.age,
    gender: v.gender as Gender | null,
    village: v.village,
    houseNo: v.houseNo,
    address: v.address,
    boothName: v.boothName,
    boothNo: v.boothNo,
    partNo: v.partNo,
    srn: v.srn,
    mobile1: v.mobile1,
    mobile2: v.mobile2,
    email: v.email,
    colourCode: v.colourCode as ColourCode,
    voted: v.voted,
    starVoter: v.starVoter,
    dead: v.dead,
    caste: v.caste,
    profession: v.profession,
    demands: v.demands,
    extraInfo: v.extraInfo,
    dob: v.dob,
    // family linkage (string code + typing)
    familyId: v.familyId,
    familyIdType: v.familyIdType as FamilyIdType | null,
    relationToHead: v.relationToHead as FamilyRole | null,
    headId: v.headId ? v.headId.toString() : null,
    head: v.head ? { id: v.head.id.toString(), name: v.head.name } : null,
    // small preview for UI
    familyPreview,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  });
}

export async function PUT(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = toId(idStr);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  try {
    const body = await req.json();

    // parse enums safely
    const colour = typeof body.colourCode === "string" ? (body.colourCode.toUpperCase() as ColourCode) : undefined;
    const famType =
      typeof body.familyIdType === "string" ? (body.familyIdType.toUpperCase() as FamilyIdType) : undefined;
    const rel =
      typeof body.relationToHead === "string" ? (body.relationToHead.toUpperCase() as FamilyRole) : undefined;

    // parse numeric-ish fields
    const boothNo = typeof body.boothNo === "number" ? body.boothNo : undefined;
    const partNo  = typeof body.partNo  === "number" ? body.partNo  : undefined;
    const srn     = typeof body.srn     === "number" ? body.srn     : undefined;
    const age     = typeof body.age     === "number" ? body.age     : undefined;

    // parse headId (bigint) if provided
    let headIdToSet: bigint | null | undefined = undefined;
    if (body.hasOwnProperty("headId")) {
      if (body.headId === null) headIdToSet = null;
      else if (typeof body.headId === "string" && body.headId.trim()) {
        const b = toId(body.headId.trim());
        if (!b) return NextResponse.json({ error: "invalid headId" }, { status: 400 });
        headIdToSet = b;
      } else if (typeof body.headId === "number" && Number.isFinite(body.headId)) {
        headIdToSet = BigInt(body.headId);
      } else {
        return NextResponse.json({ error: "invalid headId" }, { status: 400 });
      }
    }

    // familyId is a STRING in schema; allow set/clear
    const familyIdToSet: string | null | undefined =
      body.hasOwnProperty("familyId")
        ? (typeof body.familyId === "string" ? body.familyId.trim() || null : null)
        : undefined;

    const updated = await prisma.voter.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        voterId: typeof body.voterId === "string" ? (body.voterId.trim() || null) : undefined,
        age,
        gender: typeof body.gender === "string" ? (body.gender.toUpperCase() as Gender) : undefined,
        village: typeof body.village === "string" ? body.village : undefined,
        houseNo: typeof body.houseNo === "string" ? body.houseNo : undefined,
        address: typeof body.address === "string" ? body.address : undefined,
        boothName: typeof body.boothName === "string" ? body.boothName : undefined,
        boothNo,
        partNo,
        srn,
        mobile1: typeof body.mobile1 === "string" ? body.mobile1 : undefined,
        mobile2: typeof body.mobile2 === "string" ? body.mobile2 : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        colourCode: colour,
        voted: typeof body.voted === "boolean" ? body.voted : undefined,
        starVoter: typeof body.starVoter === "boolean" ? body.starVoter : undefined,
        dead: typeof body.dead === "boolean" ? body.dead : undefined,
        caste: typeof body.caste === "string" ? body.caste : undefined,
        profession: typeof body.profession === "string" ? body.profession : undefined,
        demands: typeof body.demands === "string" ? body.demands : undefined,
        extraInfo: typeof body.extraInfo === "string" ? body.extraInfo : undefined,
        dob: body.dob ? new Date(body.dob) : undefined,

        // family linkage (string code + enums)
        familyId: familyIdToSet,
        familyIdType: famType,
        relationToHead: rel,
        headId: headIdToSet,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id.toString() });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "duplicate entry" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = toId(idStr);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  try {
    // Before delete: null out dependents' headId to avoid FK restriction
    await prisma.voter.updateMany({
      where: { headId: id },
      data: { headId: null, relationToHead: null },
    });

    await prisma.voter.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "cannot delete voter due to related records (FK constraint)" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
