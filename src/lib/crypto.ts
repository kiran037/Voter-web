// src/lib/crypto.ts
import crypto from "crypto";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomNumericCode(len = 6) {
  // crypto-secure digits
  let out = "";
  for (let i = 0; i < len; i++) {
    out += String(crypto.randomInt(0, 10));
  }
  return out;
}

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("hex");
}
