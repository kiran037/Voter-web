// src/lib/sms.ts
import type { NextRequest } from "next/server";

type Provider = "twilio" | "log";

const SMS_PROVIDER = (process.env.SMS_PROVIDER || "log").toLowerCase() as Provider;
const SMS_TEMPLATE = process.env.SMS_TEMPLATE || "Your OTP is {{CODE}}.";
const COUNTRY = process.env.SMS_COUNTRY_CODE || "+91";

function toE164(input: string) {
  let p = input.trim();
  // already E.164?
  if (p.startsWith("+")) return p;
  // assume national (India default) -> add country code
  p = p.replace(/\D/g, "");
  return `${COUNTRY}${p}`;
}

export async function sendOtpSms(phoneRaw: string, code: string) {
  const to = toE164(phoneRaw);
  const message = SMS_TEMPLATE.replace("{{CODE}}", code);

  if (SMS_PROVIDER === "log") {
    console.log(`[SMS:DEV] to=${to} body="${message}"`);
    return { ok: true, id: "dev-log" };
  }

  if (SMS_PROVIDER === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID || "";
    const token = process.env.TWILIO_AUTH_TOKEN || "";
    const from = process.env.TWILIO_FROM || "";
    if (!sid || !token || !from) {
      console.warn("[SMS] Twilio env vars missing; falling back to log");
      console.log(`[SMS:DEV] to=${to} body="${message}"`);
      return { ok: true, id: "dev-fallback" };
    }

    const creds = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({ To: to, From: from, Body: message });

    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("[SMS:Twilio] error", resp.status, json);
      throw new Error(json?.message || "Failed to send OTP SMS");
    }
    return { ok: true, id: json.sid || "twilio-ok" };
  }

  console.log(`[SMS:unknown provider=${SMS_PROVIDER}] to=${to} body="${message}"`);
  return { ok: true, id: "unknown-provider" };
}
