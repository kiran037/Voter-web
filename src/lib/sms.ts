// src/lib/sms.ts

type Provider = "twilio" | "log";

const SMS_PROVIDER = (process.env.SMS_PROVIDER || "log").toLowerCase() as Provider;
const SMS_TEMPLATE = process.env.SMS_TEMPLATE || "Your OTP is {{CODE}}.";
const COUNTRY = process.env.SMS_COUNTRY_CODE || "+91";

function toE164(input: string): string {
  let p = input.trim();
  if (p.startsWith("+")) return p; // already E.164
  p = p.replace(/\D/g, "");
  return `${COUNTRY}${p}`;
}

export async function sendOtpSms(phoneRaw: string, code: string): Promise<{ ok: true; id: string }> {
  const to = toE164(phoneRaw);
  const message = SMS_TEMPLATE.replace("{{CODE}}", code);

  if (SMS_PROVIDER === "log") {
    // Dev/no-op provider: just log
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

    const json: unknown = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = typeof json === "object" && json !== null && "message" in json ? String((json as { message: unknown }).message) : "Failed to send OTP SMS";
      console.error("[SMS:Twilio] error", resp.status, json);
      throw new Error(msg);
    }

    const sidOut =
      typeof json === "object" && json !== null && "sid" in json ? String((json as { sid: unknown }).sid) : "twilio-ok";

    return { ok: true, id: sidOut };
  }

  // Unknown provider fallback
  console.log(`[SMS:unknown provider=${SMS_PROVIDER}] to=${to} body="${message}"`);
  return { ok: true, id: "unknown-provider" };
}
