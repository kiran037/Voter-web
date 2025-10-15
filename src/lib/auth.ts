// src/lib/auth.ts
import type { NextRequest, NextResponse } from "next/server";
import { cookies as serverCookies } from "next/headers";
import { prisma } from "./prisma";
import { sha256, randomNumericCode } from "./crypto";
import { signJwt, verifyJwt } from "./jwt";
import { sendOtpSms } from "./sms";

type Purpose = "LOGIN" | "VERIFY_PHONE";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";
const OTP_DEV_BYPASS = (process.env.OTP_DEV_BYPASS || "").trim();
// OTP resend throttle (seconds)
const RESEND_COOLDOWN_SEC = Number(process.env.SMS_RESEND_COOLDOWN_SEC || "30");

// Normalize cookies() so it works in both sync/async environments
async function getCookieStore() {
  const result = (serverCookies as unknown as () => any)();
  return typeof (result as any)?.then === "function" ? await result : result;
}

function addMinutes(d: Date, m: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + m);
  return x;
}

export async function issueOtp(phone: string, purpose: Purpose = "LOGIN") {
  const now = new Date();

  // Throttle re-sends for same phone/purpose
  const recent = await prisma.authOtp.findFirst({
    where: { phone, purpose },
    orderBy: { id: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    const ageSec = Math.floor((now.getTime() - recent.createdAt.getTime()) / 1000);
    if (ageSec < RESEND_COOLDOWN_SEC) {
      const wait = RESEND_COOLDOWN_SEC - ageSec;
      const err = new Error(`Please wait ${wait}s before requesting another OTP.`);
      (err as any).status = 429;
      throw err;
    }
  }

  const code = randomNumericCode(6);
  const expiresAt = addMinutes(now, 15);
  const codeHash = sha256(code);

  await prisma.authOtp.create({ data: { phone, purpose, codeHash, expiresAt } });

  // Try to send SMS (non-fatal on failure)
  try {
    await sendOtpSms(phone, code);
  } catch (e: any) {
    console.error("[OTP] SMS send failed:", e?.message || e);
  }

  // Dev visibility
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP:DEV] ${phone} -> ${code} (expires 15m)`);
  }

  return { expiresAt, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

export async function verifyOtp(phone: string, code: string, purpose: Purpose = "LOGIN") {
  if (OTP_DEV_BYPASS && code === OTP_DEV_BYPASS) return true;

  const now = new Date();
  const found = await prisma.authOtp.findFirst({
    where: { phone, purpose, expiresAt: { gt: now }, consumedAt: null, codeHash: sha256(code) },
    orderBy: { id: "desc" },
  });

  if (!found) return false;

  await prisma.authOtp.update({
    where: { id: found.id },
    data: { consumedAt: new Date(), attempts: { increment: 1 } },
  });
  return true;
}

export async function createOrGetUser(phone: string) {
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) user = await prisma.user.create({ data: { phone, role: "STAFF" } });
  return user;
}

/**
 * Set the JWT cookie on a NextResponse.
 * Accepts either a relative max-age in seconds OR an absolute Date expiry.
 */
export function setJwtCookie(res: NextResponse, token: string, exp: number | Date) {
  let maxAgeSeconds: number | undefined;
  let expires: Date | undefined;

  if (typeof exp === "number") {
    maxAgeSeconds = exp;
  } else if (exp instanceof Date) {
    // Convert absolute Date -> max-age (seconds). Also set `expires` for clarity.
    const deltaSec = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
    maxAgeSeconds = deltaSec;
    expires = exp;
  }

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(typeof maxAgeSeconds === "number" ? { maxAge: maxAgeSeconds } : {}),
    ...(expires ? { expires } : {}),
  });
}

export async function getAuthedUser(req?: NextRequest) {
  // Prefer request cookies (when available in a route handler)
  let token = req?.cookies?.get(COOKIE_NAME)?.value;

  // Fallback to server cookie store — handles both sync/async cookies()
  if (!token) {
    const store = await getCookieStore();
    token = store.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;

  try {
    const payload = await verifyJwt(token);
    const idStr = String((payload as any)?.sub ?? (payload as any)?.uid ?? "");
    let id: bigint | null = null;
    try {
      id = BigInt(idStr);
    } catch {
      id = null;
    }
    if (!id) return null;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        phoneVerifiedAt: true,
        createdAt: true,
      },
    });
    return user ?? null;
  } catch {
    return null;
  }
}
