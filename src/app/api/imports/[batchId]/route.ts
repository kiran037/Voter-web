// app/api/imports/[batchId]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdmin } from "@/lib/role";

function toId(s: string) { try { return BigInt(s); } catch { return null; } }

type Batch = {
  id: bigint;
  fileName: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  rowCount: number;
  successCount: number;
  failedCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  uploadedById: bigint | null;
};

export async function GET(req: NextRequest, { params }: { params: { batchId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = toId(params.batchId);
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

  const batch = b as Batch;

  return NextResponse.json({
    id: batch.id.toString(),
    fileName: batch.fileName,
    status: batch.status,
    rowCount: batch.rowCount,
    successCount: batch.successCount,
    failedCount: batch.failedCount,
    startedAt: batch.startedAt,
    completedAt: batch.completedAt,
    createdAt: batch.createdAt,
    uploadedById: batch.uploadedById ? batch.uploadedById.toString() : null,
  });
}
