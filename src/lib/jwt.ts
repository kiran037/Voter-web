// src/lib/jwt.ts
import { jwtVerify, SignJWT } from "jose";

const ALG = "HS256";
const enc = (s: string) => new TextEncoder().encode(s);

// IMPORTANT: match auth.ts default ("session")
const COOKIE = (process.env.SESSION_COOKIE_NAME || "session").trim();

const SECRET = (process.env.JWT_SECRET || "dev-secret-change-me").trim();
// falls back to 30d if not set, but your .env sets 24h which will be used
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || "720");

export const TOKEN_COOKIE_NAME = COOKIE;

export async function signJwt(payload: object) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TTL_HOURS * 60 * 60;

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(enc(SECRET));

  return { token, exp: new Date(exp * 1000) };
}

export async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, enc(SECRET));
  return payload as { uid?: string | number; phone?: string; role?: string; [k: string]: any };
}
