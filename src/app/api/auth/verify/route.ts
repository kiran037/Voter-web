import { NextRequest, NextResponse } from "next/server";
import { createOrGetUser, verifyOtp, setJwtCookie } from "@/lib/auth";
import { signJwt } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "phone & code required" }, { status: 400 });
    }

    const normalized = String(phone).trim();
    const ok = await verifyOtp(normalized, String(code).trim(), "LOGIN");
    if (!ok) {
      return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
    }

    const user = await createOrGetUser(normalized);

    // JWT without role
    const { token, exp } = await signJwt({ uid: user.id.toString(), phone: user.phone });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id.toString(), phone: user.phone, name: user.name ?? null },
    });
    setJwtCookie(res, token, exp);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
