// // src/app/api/auth/otp/route.ts
// import type { NextRequest } from "next/server";
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// const DEV_BYPASS = (process.env.OTP_DEV_BYPASS || "").trim();
// const OTP_TTL_MIN = 5;          // code validity in minutes
// const SEND_COOLDOWN_SEC = 30;   // min gap between send requests for same phone
// const MAX_ACTIVE_PER_PHONE = 5; // keep DB tidy

// function hash(str: string) {
//   const crypto = require("crypto");
//   return crypto.createHash("sha256").update(str).digest("hex");
// }
// function normPhone(p: string) {
//   return p.replace(/\s+/g, "");
// }

// async function sendSms(phone: string, otp: string) {
//   // TODO: wire your provider here (e.g., MSG91/Twilio). Example:
//   // if (!process.env.SMS_API_KEY) return; // skip in dev
//   // await fetch("https://sms.example.com/send", { method: "POST", body: ... });
//   // For now, just log on the server:
//   console.log(`[OTP] ${phone} -> ${otp}`);
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { phone, purpose = "LOGIN" } = await req.json();
//     const ph = normPhone(String(phone || ""));
//     if (!/^\+?\d{10,15}$/.test(ph)) {
//       return NextResponse.json({ error: "invalid phone" }, { status: 400 });
//     }

//     // cooldown: prevent spamming
//     const last = await prisma.authOtp.findFirst({
//       where: { phone: ph, purpose },
//       orderBy: { createdAt: "desc" },
//       select: { createdAt: true },
//     });
//     if (last) {
//       const diffSec = (Date.now() - last.createdAt.getTime()) / 1000;
//       if (diffSec < SEND_COOLDOWN_SEC) {
//         return NextResponse.json(
//           { error: `wait ${Math.ceil(SEND_COOLDOWN_SEC - diffSec)}s before next OTP` },
//           { status: 429 }
//         );
//       }
//     }

//     // generate OTP (random 6-digit)
//     const otp = DEV_BYPASS || String(Math.floor(100000 + Math.random() * 900000));
//     const codeHash = hash(otp);
//     const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

//     // keep only some recent pending rows per phone/purpose
//     const existing = await prisma.authOtp.findMany({
//       where: { phone: ph, purpose },
//       orderBy: { createdAt: "desc" },
//       select: { id: true },
//       skip: 0,
//       take: 100,
//     });
//     if (existing.length > MAX_ACTIVE_PER_PHONE) {
//       const toDelete = existing.slice(MAX_ACTIVE_PER_PHONE);
//       await prisma.authOtp.deleteMany({
//         where: { id: { in: toDelete.map((x) => x.id) } },
//       });
//     }

//     // store
//     await prisma.authOtp.create({
//       data: {
//         phone: ph,
//         purpose,
//         codeHash,
//         expiresAt,
//       },
//     });

//     await sendSms(ph, otp);

//     // Don’t leak the real OTP in prod; in dev we can optionally return it
//     const payload: any = { ok: true, ttlMin: OTP_TTL_MIN };
//     if (process.env.NODE_ENV !== "production") payload.devOtp = otp;

//     return NextResponse.json(payload, { status: 201 });
//   } catch (e: any) {
//     return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
//   }
// }

// src/app/api/auth/otp/route.ts
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
