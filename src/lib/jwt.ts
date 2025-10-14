///Users/xeoren/voter-web/src/lib/jwt.ts
import { jwtVerify, SignJWT } from "jose";

const ALG = "HS256";
function enc(s: string) { return new TextEncoder().encode(s); }

const COOKIE = process.env.SESSION_COOKIE_NAME || "token";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || "720"); // 30 days

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
  return payload as { uid: string; phone: string; role?: string; [k: string]: any };
}
