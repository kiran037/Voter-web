// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

function forbid() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
function isAdmin(user: any) {
  return user && user.role === "ADMIN";
}
function parseId(id: string) {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

// GET /api/users/[id]
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // NOTE: params is a Promise in Next 15
) {
  const me = await getAuthedUser(req);
  if (!isAdmin(me)) return forbid();

  const { id } = await ctx.params;        // <-- await params
  const bid = parseId(id);
  if (!bid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id: bid },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      phoneVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ user: { ...u, id: u.id.toString() } });
}

// PUT /api/users/[id] { phone?, name?, role? }
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await getAuthedUser(req);
  if (!isAdmin(me)) return forbid();

  const { id } = await ctx.params;        // <-- await params
  const bid = parseId(id);
  if (!bid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (typeof body?.phone === "string") data.phone = body.phone.trim();
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (body?.role === "ADMIN" || body?.role === "STAFF") data.role = body.role;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no changes" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: bid },
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ user: { ...updated, id: updated.id.toString() } });
  } catch (e: any) {
    const msg = e?.code === "P2002" ? "Phone already exists" : e?.message || "Update failed";
    const status = e?.code === "P2002" ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await getAuthedUser(req);
  if (!isAdmin(me)) return forbid();

  const { id } = await ctx.params;        // <-- await params
  const bid = parseId(id);
  if (!bid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  try {
    await prisma.user.delete({ where: { id: bid } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
