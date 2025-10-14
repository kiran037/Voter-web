import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp, setJwtCookie } from "@/lib/auth";
import { signJwt } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { phone, code, name } = await req.json();
  const normalized = String(phone || "").trim();
  const otp = String(code || "").trim();
  const cleanName = String(name || "").trim();

  if (!normalized || !otp) {
    return NextResponse.json({ error: "phone & code required" }, { status: 400 });
  }
  if (!cleanName) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  // must NOT already exist
  const exists = await prisma.user.findUnique({ where: { phone: normalized } });
  if (exists) {
    return NextResponse.json({ error: "User already exists. Please login." }, { status: 409 });
  }

  const ok = await verifyOtp(normalized, otp, "VERIFY_PHONE");
  if (!ok) return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });

  // Create user (role ignored; schema default applies)
  const user = await prisma.user.create({
    data: { phone: normalized, name: cleanName, phoneVerifiedAt: new Date() },
  });

  // JWT without role
  const { token, exp } = await signJwt({ uid: user.id.toString(), phone: user.phone });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id.toString(), phone: user.phone, name: user.name },
  });
  setJwtCookie(res, token, exp);
  return res;
}
