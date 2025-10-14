import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { phone, name } = await req.json();
  const normalized = String(phone || "").trim();
  const cleanName = String(name || "").trim();

  if (!normalized) return NextResponse.json({ error: "phone required" }, { status: 400 });
  if (!cleanName)  return NextResponse.json({ error: "name required" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { phone: normalized } });
  if (exists) return NextResponse.json({ error: "User already exists. Please login." }, { status: 409 });

  // We don’t create the user yet; first verify phone via OTP (purpose = VERIFY_PHONE)
  const { expiresAt } = await issueOtp(normalized, "VERIFY_PHONE");

  // You can optionally return the echoed name to persist in client state
  return NextResponse.json({ ok: true, expiresAt });
}
