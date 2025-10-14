///Users/xeoren/voter-web/src/app/api/auth/otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { issueOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }

    const normalized = phone.trim();
    const { expiresAt } = await issueOtp(normalized, "LOGIN");

    // In prod, send via SMS in issueOtp. We just return expiry.
    return NextResponse.json({ expiresAt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
