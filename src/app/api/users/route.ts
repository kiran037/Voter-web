///Users/xeoren/voter-web/src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

function forbid() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

function isAdmin(user: any) {
  return user && user.role === "ADMIN";
}

// GET /api/users?q=&page=1&limit=50
export async function GET(req: NextRequest) {
  const me = await getAuthedUser(req);
  if (!isAdmin(me)) return forbid();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { phone: { contains: q } },
          { name: { contains: q } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  // BigInt -> string
  const shaped = items.map((u) => ({
    ...u,
    id: u.id.toString(),
  }));

  return NextResponse.json({ items: shaped, total });
}

// POST /api/users { phone, name?, role? }
export async function POST(req: NextRequest) {
  const me = await getAuthedUser(req);
  if (!isAdmin(me)) return forbid();

  const body = await req.json().catch(() => ({}));
  const phone = String(body?.phone || "").trim();
  const name = typeof body?.name === "string" ? body.name.trim() : null;
  const role = body?.role === "ADMIN" ? "ADMIN" : "STAFF";

  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  try {
    const created = await prisma.user.create({
      data: { phone, name, role },
      select: { id: true, phone: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user: { ...created, id: created.id.toString() } }, { status: 201 });
  } catch (e: any) {
    const msg = (e?.code === "P2002") ? "Phone already exists" : (e?.message || "Create failed");
    const status = e?.code === "P2002" ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
