// src/lib/auth.ts
import type { NextRequest } from "next/server";
import { cookies as serverCookies } from "next/headers";
import { prisma } from "./prisma";
import { sha256, randomNumericCode } from "./crypto";
import { verifyJwt } from "./jwt";
import { sendOtpSms } from "./sms";

type Purpose = "LOGIN" | "VERIFY_PHONE";

// Infer the store type from the actual cookies() return type (works across Next versions)
type CookieStore = Awaited<ReturnType<typeof serverCookies>>;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";
const OTP_DEV_BYPASS = (process.env.OTP_DEV_BYPASS || "").trim();
const RESEND_COOLDOWN_SEC = Number(process.env.SMS_RESEND_COOLDOWN_SEC || "30");

// Normalize cookies() so it works if it’s sync or async, with correct typing.
async function getCookieStore(): Promise<CookieStore> {
  const maybe = (serverCookies as unknown as () => CookieStore | Promise<CookieStore>)();
  // If it's a Promise, await; if not, return directly.
  return (typeof (maybe as any)?.then === "function") ? await (maybe as Promise<CookieStore>) : (maybe as CookieStore);
}

function addMinutes(d: Date, m: number): Date {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + m);
  return x;
}

class ThrottledError extends Error {
  readonly status = 429 as const;
  constructor(secondsRemaining: number) {
    super(`Please wait ${secondsRemaining}s before requesting another OTP.`);
  }
}

export async function issueOtp(
  phone: string,
  purpose: Purpose = "LOGIN"
): Promise<{ expiresAt: Date; devCode?: string }> {
  const now = new Date();

  const recent = await prisma.authOtp.findFirst({
    where: { phone, purpose },
    orderBy: { id: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    const ageSec = Math.floor((now.getTime() - recent.createdAt.getTime()) / 1000);
    if (ageSec < RESEND_COOLDOWN_SEC) {
      const wait = RESEND_COOLDOWN_SEC - ageSec;
      throw new ThrottledError(wait);
    }
  }

  const code = randomNumericCode(6);
  const expiresAt = addMinutes(now, 15);
  const codeHash = sha256(code);

  await prisma.authOtp.create({ data: { phone, purpose, codeHash, expiresAt } });

  try {
    await sendOtpSms(phone, code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[OTP] SMS send failed:", msg);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP:DEV] ${phone} -> ${code} (expires 15m)`);
  }

  return { expiresAt, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: Purpose = "LOGIN"
): Promise<boolean> {
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

/** Minimal, typed JWT payload we care about. */
type MinimalJwtPayload = {
  sub?: string | number;
  uid?: string | number;
} & Record<string, unknown>;

export async function getAuthedUser(req?: NextRequest) {
  // Prefer request cookies (route handlers)
  let token = req?.cookies?.get(COOKIE_NAME)?.value;

  // Fallback to server cookie store (sync/async safe)
  if (!token) {
    const store = await getCookieStore();
    token = store.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;

  try {
    const payload = (await verifyJwt(token)) as MinimalJwtPayload;
    const idStr = String(payload.sub ?? payload.uid ?? "");
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

/** Set the JWT cookie on the outgoing response. Accepts max-age (sec) or Date. */
export function setJwtCookie(
  res: import("next/server").NextResponse,
  token: string,
  exp: number | Date
): void {
  let maxAgeSeconds: number | undefined;
  let expires: Date | undefined;

  if (typeof exp === "number") {
    maxAgeSeconds = exp;
  } else {
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
