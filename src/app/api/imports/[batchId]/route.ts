// app/api/imports/[batchId]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";

function toId(s: string) {
  try { return BigInt(s); } catch { return null; }
}

type ParamsPromise = { params: Promise<{ batchId: string }> };

export async function GET(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { batchId } = await ctx.params;
  const id = toId(batchId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const b = await prisma.importBatch.findUnique({
    where: { id },
    select: {
      id: true,
      fileName: true,
      status: true,
      rowCount: true,
      successCount: true,
      failedCount: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      uploadedById: true,
    },
  });
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });

  const processedCount = (b.successCount ?? 0) + (b.failedCount ?? 0);
  const total = b.rowCount ?? 0;

  // Progress + ETA (derived)
  const now = Date.now();
  const started = b.startedAt ? b.startedAt.getTime() : null;
  const elapsedSec = started ? Math.max(0, (now - started) / 1000) : null;
  const ratePerSec = elapsedSec && processedCount > 0 ? processedCount / elapsedSec : null;

  let etaSeconds: number | null = null;
  if (ratePerSec && total > 0 && processedCount < total) {
    const remaining = total - processedCount;
    etaSeconds = Math.round(remaining / ratePerSec);
  }

  const progress = total > 0 ? processedCount / total : (b.status === "COMPLETED" ? 1 : 0);

  return NextResponse.json({
    id: b.id.toString(),
    fileName: b.fileName,
    status: b.status,
    rowCount: total,
    successCount: b.successCount,
    failedCount: b.failedCount,
    processedCount,
    progress,            // 0..1
    ratePerSec,          // rows per second (approx)
    etaSeconds,          // seconds until completion (approx)
    startedAt: b.startedAt,
    completedAt: b.completedAt,
    createdAt: b.createdAt,
    uploadedById: b.uploadedById ? b.uploadedById.toString() : null,
  });
}
