import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp, setJwtCookie } from "@/lib/auth";
import { signJwt } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json();
  const normalized = String(phone || "").trim();
  const otp = String(code || "").trim();

  if (!normalized || !otp) {
    return NextResponse.json({ error: "phone & code required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone: normalized } });
  if (!user) return NextResponse.json({ error: "User not found. Please register." }, { status: 404 });

  const ok = await verifyOtp(normalized, otp, "LOGIN");
  if (!ok) return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });

  const { token, exp } = await signJwt({
    uid: user.id.toString(),
    phone: user.phone,
    role: user.role,
  });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id.toString(), phone: user.phone, role: user.role },
  });
  setJwtCookie(res, token, exp);
  return res;
}
