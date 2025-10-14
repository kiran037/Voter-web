import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").trim();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const exists = !!(await prisma.user.findUnique({ where: { phone } }));
  return NextResponse.json({ exists });
}
