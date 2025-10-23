// app/api/voters/bulk-delete/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const rawIds: unknown = body?.ids;

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 });
  }
  // optional safety cap
  if (rawIds.length > 2000) {
    return NextResponse.json({ error: "too many ids in one request (max 2000)" }, { status: 413 });
  }

  const ids: bigint[] = [];
  for (const r of rawIds) {
    try {
      const b = typeof r === "string" ? BigInt(r) : BigInt(Number(r));
      ids.push(b);
    } catch {
      return NextResponse.json({ error: `invalid id: ${r}` }, { status: 400 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // clear dependents that reference any of these ids as head
      const upd = await tx.voter.updateMany({
        where: { headId: { in: ids } },
        data: { headId: null, relationToHead: null },
      });

      // bulk delete the voters
      const del = await tx.voter.deleteMany({
        where: { id: { in: ids } },
      });

      return { dependentsCleared: upd.count, deleted: del.count };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json({ error: "cannot delete due to related records (FK constraint)" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
