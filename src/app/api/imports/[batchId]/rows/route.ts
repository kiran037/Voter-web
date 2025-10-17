// app/api/imports/[batchId]/rows/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";
import type { Prisma } from "@prisma/client";

type RowStatus = "SUCCESS" | "FAILED" | "SKIPPED";

function toBigIntId(s: string): bigint | null {
  try { return BigInt(s); } catch { return null; }
}
function toPosInt(v: string | null, def: number): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}
function parseStatus(v: string | null): RowStatus | null {
  if (!v) return null;
  const s = v.toUpperCase();
  return s === "SUCCESS" || s === "FAILED" || s === "SKIPPED" ? (s as RowStatus) : null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ batchId: string }> } // Next 15: params is a Promise
) {
  // auth
  const me = await getAuthedUser(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // params (await the promise)
  const { batchId: batchIdStr } = await ctx.params;
  const batchId = toBigIntId(batchIdStr);
  if (!batchId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // query
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, toPosInt(searchParams.get("page"), 1));
  const limit = Math.min(500, toPosInt(searchParams.get("limit"), 100));
  const skip = (page - 1) * limit;

  const status = parseStatus(searchParams.get("status"));
  if (searchParams.get("status") && !status) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  // where clause (typed)
  const where: Prisma.ImportRowWhereInput = {
    batchId: batchId,
    ...(status ? { status } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.importRow.count({ where }),
    prisma.importRow.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        batchId: true,
        status: true,
        error: true,
        raw: true,
        voterIdStr: true,
        phone1: true,
        voterId: true,
        createdAt: true,
      },
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id.toString(),
    batchId: r.batchId.toString(),
    status: r.status as RowStatus,
    error: r.error,
    raw: r.raw,
    voterIdStr: r.voterIdStr,
    phone1: r.phone1,
    voterId: r.voterId ? r.voterId.toString() : null,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ page, limit, total, items });
}
