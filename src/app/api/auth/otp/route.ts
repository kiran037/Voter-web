import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

const DEV_BYPASS = (process.env.OTP_DEV_BYPASS || "").trim();
const SHOW_OTP_IN_RESPONSE = (process.env.OTP_SHOW_IN_RESPONSE || "").toLowerCase() === "true";
// NEW: turn on to see OTP in your terminal (never enable in prod)
const LOG_OTP = (process.env.OTP_LOG_TO_CONSOLE || "").toLowerCase() === "true";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function normPhone(p: string) {
  return p.replace(/\s+/g, "");
}
function randomOtp(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export async function POST(req: NextRequest) {
  try {
    const { phone, purpose = "LOGIN" } = await req.json();
    const ph = normPhone(String(phone || ""));

    if (!/^\+?\d{10,15}$/.test(ph)) {
      return NextResponse.json({ error: "invalid phone" }, { status: 400 });
    }

    const otp = randomOtp();
    const codeHash = sha256(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store hashed OTP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await prisma.authOtp.create({
      data: { phone: ph, purpose, codeHash, expiresAt, ip, userAgent },
    });

    // ---- DEV-ONLY LOGGING TO TERMINAL ----
    if (LOG_OTP && process.env.NODE_ENV !== "production") {
      // This shows in the same terminal where you run `npm run dev`
      console.log(
        `[OTP][${purpose}] phone=${ph} otp=${otp} expires=${expiresAt.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`
      );
    }

    // TODO: send SMS in production

    const payload: Record<string, any> = { ok: true, sent: true };
    if (DEV_BYPASS) payload.devBypass = DEV_BYPASS;
    if (SHOW_OTP_IN_RESPONSE && process.env.NODE_ENV !== "production") {
      payload.devOtp = otp;
      payload.expiresAt = expiresAt.toISOString();
    }

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
