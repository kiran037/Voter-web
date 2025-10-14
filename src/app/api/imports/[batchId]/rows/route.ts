// app/api/imports/[batchId]/rows/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toId(s: string) { try { return BigInt(s); } catch { return null; } }

type RowStatus = "SUCCESS" | "FAILED" | "SKIPPED";

type ImportRow = {
  id: bigint;
  batchId: bigint;
  status: RowStatus;
  error: string | null;
  raw: string | null;
  voterIdStr: string | null;
  phone1: string | null;
  voterId: bigint | null;
  createdAt: Date;
};

export async function GET(req: NextRequest, { params }: { params: { batchId: string } }) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || "100")));

  const batchId = toId(params.batchId);
  if (!batchId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // Build where filter
  const where: Record<string, any> = { batchId };
  if (statusParam) {
    const s = statusParam.toUpperCase();
    if (!["SUCCESS", "FAILED", "SKIPPED"].includes(s)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    where.status = s as RowStatus;
  }

  const [total, rowsRaw] = await Promise.all([
    prisma.importRow.count({ where }),
    prisma.importRow.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { id: "desc" },
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

  const rows = rowsRaw as ImportRow[];

  const items = rows.map((r: ImportRow) => ({
    id: r.id.toString(),
    batchId: r.batchId.toString(),
    status: r.status,
    error: r.error,
    raw: r.raw,
    voterIdStr: r.voterIdStr,
    phone1: r.phone1,
    voterId: r.voterId ? r.voterId.toString() : null,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    page,
    limit,
    total,
    items,
  });
}
