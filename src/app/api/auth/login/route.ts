import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  const normalized = String(phone || "").trim();
  if (!normalized) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { phone: normalized } });
  if (!exists) return NextResponse.json({ error: "User not found. Please register first." }, { status: 404 });

  const { expiresAt } = await issueOtp(normalized, "LOGIN");
  return NextResponse.json({ ok: true, expiresAt });
}
