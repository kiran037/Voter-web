// app/api/voters/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

function toId(param: string) {
  try { return BigInt(param); } catch { return null; }
}

// Next.js 15 dynamic route: params is a Promise
type ParamsPromise = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: ParamsPromise) {
  const { id: idStr } = await ctx.params;
  const id = toId(idStr);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const v = await prisma.voter.findUnique({ where: { id } });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ...v, id: v.id.toString() });
}

export async function PUT(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = toId(idStr);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  try {
    const body = await req.json();

    const updated = await prisma.voter.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        voterId: body.voterId ?? undefined,
        age: typeof body.age === "number" ? body.age : undefined,
        gender: body.gender ?? undefined,
        village: body.village ?? undefined,
        houseNo: body.houseNo ?? undefined,
        address: body.address ?? undefined,
        boothName: body.boothName ?? undefined,
        boothNo: typeof body.boothNo === "number" ? body.boothNo : undefined,
        partNo: typeof body.partNo === "number" ? body.partNo : undefined,
        srn: typeof body.srn === "number" ? body.srn : undefined,
        mobile1: body.mobile1 ?? undefined,
        mobile2: body.mobile2 ?? undefined,
        email: body.email ?? undefined,
        colourCode: body.colourCode ?? undefined,
        voted: typeof body.voted === "boolean" ? body.voted : undefined,
        starVoter: typeof body.starVoter === "boolean" ? body.starVoter : undefined,
        dead: typeof body.dead === "boolean" ? body.dead : undefined,
        caste: body.caste ?? undefined,
        profession: body.profession ?? undefined,
        personnel: body.personnel ?? undefined,
        society: body.society ?? undefined,
        flatNo: body.flatNo ?? undefined,
        newAddress: body.newAddress ?? undefined,
        demands: body.demands ?? undefined,
        extraInfo1: body.extraInfo1 ?? undefined,
        extraInfo2: body.extraInfo2 ?? undefined,
        extraInfo3: body.extraInfo3 ?? undefined,
        extraInfo4: body.extraInfo4 ?? undefined,
        extraInfo5: body.extraInfo5 ?? undefined,
        extraCheck1: typeof body.extraCheck1 === "boolean" ? body.extraCheck1 : undefined,
        extraCheck2: typeof body.extraCheck2 === "boolean" ? body.extraCheck2 : undefined,
        dob: body.dob ? new Date(body.dob) : undefined,
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
    // Remove dependent family links first to satisfy FK constraints
    await prisma.$transaction([
      prisma.voterKin.deleteMany({ where: { voterId: id } }),
      prisma.voterKin.deleteMany({ where: { relativeId: id } }),
      prisma.voter.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2003") {
      // Just in case some other FK appears in future
      return NextResponse.json(
        { error: "cannot delete voter due to related records (FK constraint)" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
