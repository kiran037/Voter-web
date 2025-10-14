///Users/xeoren/voter-web/src/lib/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { sha256, randomNumericCode } from "./crypto";
import { signJwt, TOKEN_COOKIE_NAME, verifyJwt } from "./jwt";

// enum-like local types to avoid @prisma/client enum imports
type Purpose = "LOGIN" | "VERIFY_PHONE";

const OTP_DEV_BYPASS = process.env.OTP_DEV_BYPASS || "";

function addMinutes(d: Date, m: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + m);
  return x;
}

export async function issueOtp(phone: string, purpose: Purpose = "LOGIN") {
  const code = randomNumericCode(6);
  const expiresAt = addMinutes(new Date(), 15);
  const codeHash = sha256(code);

  await prisma.authOtp.create({ data: { phone, purpose, codeHash, expiresAt } });

  // TODO: send via SMS in prod
  console.log(`[OTP] ${phone} -> ${code}`);
  return { expiresAt };
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
  if (!user) {
    user = await prisma.user.create({ data: { phone, role: "STAFF" } });
  }
  return user;
}

export function setJwtCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getAuthedUser(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const p = await verifyJwt(token);
    // Optionally re-fetch user to ensure it still exists / role current
    const user = await prisma.user.findUnique({ where: { id: BigInt(p.uid) } });
    return user ?? null;
  } catch {
    return null;
  }
}
