// app/api/auth/logout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(process.env.SESSION_COOKIE_NAME || "session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",          // IMPORTANT
    expires: new Date(0),
    maxAge: 0,
  });
  return res;
}
