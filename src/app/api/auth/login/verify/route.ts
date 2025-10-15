// src/app/api/auth/login/verify/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/jwt";
import crypto from "crypto";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";
const DEV_BYPASS = (process.env.OTP_DEV_BYPASS || "").trim();

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function normPhone(p: string) {
  return p.replace(/\s+/g, "");
}
function isSixDigits(s: string) {
  return /^\d{6}$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    const ph = normPhone(String(phone || ""));
    const otp = String(code || "").trim();

    if (!/^\+?\d{10,15}$/.test(ph) || !isSixDigits(otp)) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }

    // Accept dev bypass OR validate latest OTP
    let consumeId: bigint | null = null;
    if (!(DEV_BYPASS && otp === DEV_BYPASS)) {
      const row = await prisma.authOtp.findFirst({
        where: { phone: ph, purpose: "LOGIN", consumedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      });
      if (!row) return NextResponse.json({ error: "otp not found or expired" }, { status: 400 });
      if (row.codeHash !== sha256(otp)) {
        await prisma.authOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
        return NextResponse.json({ error: "invalid code" }, { status: 400 });
      }
      consumeId = row.id as unknown as bigint;
    }

    if (consumeId) {
      await prisma.authOtp.update({ where: { id: consumeId }, data: { consumedAt: new Date() } });
    }

    // Ensure user exists
    const user = await prisma.user.upsert({
      where: { phone: ph },
      update: {},
      create: { phone: ph },
      select: { id: true, phone: true, name: true, role: true },
    });

    // JWT payload with embedded exp (avoid 2-arg sign)
    const ttlHours = Number(process.env.SESSION_TTL_HOURS || "24");
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = nowSec + ttlHours * 60 * 60;

    const signed = await signJwt({
      sub: user.id.toString(),
      phone: user.phone,
      role: user.role,
      iat: nowSec,
      exp,
    });

    const token: string = typeof signed === "string" ? signed : (signed as any).token;

    // Safe user for response
    const safeUser = { ...user, id: user.id.toString() };

    // Build response and set cookie ON THE RESPONSE ONLY
    const res = NextResponse.json({ ok: true, user: safeUser });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ttlHours * 60 * 60, // seconds
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
