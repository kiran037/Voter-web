// app/api/voters/[id]/family/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import type { FamilyIdType, FamilyRole } from "@prisma/client";

function toId(s: string) { try { return BigInt(s); } catch { return null; } }
type ParamsPromise = { params: Promise<{ id: string }> };

// GET: family summary for this voter (group by same string familyId)
export async function GET(_: NextRequest, ctx: ParamsPromise) {
  const { id: idStr } = await ctx.params;
  const voterId = toId(idStr);
  if (!voterId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const v = await prisma.voter.findUnique({
    where: { id: voterId },
    select: {
      id: true, name: true, familyId: true, headId: true, relationToHead: true,
    },
  });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!v.familyId) {
    return NextResponse.json({
      familyId: null,
      you: { id: v.id.toString(), name: v.name, relationToHead: v.relationToHead },
      head: null,
      members: [],
    });
  }

  const members = await prisma.voter.findMany({
    where: { familyId: v.familyId },
    select: { id: true, name: true, relationToHead: true, headId: true },
    orderBy: { id: "asc" },
  });

  // resolve head: prefer explicit relationToHead == HEAD; else someone referenced by headId
  const explicitHead = members.find(m => m.relationToHead === "HEAD");
  let head = explicitHead;
  if (!head) {
    const referencedHead = members.find(m => members.some(x => x.headId === m.id));
    if (referencedHead) head = referencedHead;
  }

  return NextResponse.json({
    familyId: v.familyId,
    you: { id: v.id.toString(), name: v.name, relationToHead: v.relationToHead },
    head: head ? { id: head.id.toString(), name: head.name } : null,
    members: members
      .filter(m => m.id !== v.id)
      .map(m => ({
        id: m.id.toString(),
        name: m.name,
        relationToHead: m.relationToHead as FamilyRole | null,
      })),
  });
}

// POST: join/move family or set head
// Body examples:
// { "familyId": "JAN12345" }                             -> join/move to this family string
// { "familyId": "JAN12345", "familyIdType": "JAN_AADHAAR_FAMILY_ID" }
// { "familyId": "JAN12345", "setHead": true }            -> also mark this voter as HEAD
export async function POST(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const voterId = toId(idStr);
  if (!voterId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const familyId = typeof body.familyId === "string" ? body.familyId.trim() : "";
  const setHead = !!body.setHead;
  const famType: FamilyIdType | undefined =
    typeof body.familyIdType === "string" ? (body.familyIdType.toUpperCase() as FamilyIdType) : undefined;

  if (!familyId) {
    return NextResponse.json({ error: "familyId (string) required" }, { status: 400 });
  }

  // Move into family (string) + optionally mark as head and point others' headId
  await prisma.voter.update({
    where: { id: voterId },
    data: {
      familyId,
      familyIdType: famType,
      relationToHead: setHead ? "HEAD" : undefined,
      headId: setHead ? null : undefined, // head's headId should be null
    },
  });

  if (setHead) {
    // set other members' headId to this voter (only within same familyId)
    await prisma.voter.updateMany({
      where: { familyId, NOT: { id: voterId } },
      data: { headId: voterId as any },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: leave family (clear family fields)
export async function DELETE(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const voterId = toId(idStr);
  if (!voterId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // Clear this voter’s family linkage
  const me = await prisma.voter.update({
    where: { id: voterId },
    data: { familyId: null, familyIdType: null, relationToHead: null, headId: null },
    select: { id: true },
  });

  // Also clear headId for anyone who pointed to this voter
  await prisma.voter.updateMany({
    where: { headId: voterId },
    data: { headId: null, relationToHead: null },
  });

  return NextResponse.json({ ok: true, id: me.id.toString() });
}
