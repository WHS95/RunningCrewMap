// src/lib/server/adminSession.ts
// 서명된 어드민 쿠키(admin_sig).
//
// 기존 `auth=true` 쿠키는 서명이 없어 누구나 만들 수 있다. 미들웨어·기존 어드민 화면은
// 그대로 두고, 개인정보(기록증·배번)를 다루는 기록 각인 어드민 액션만 이 서명 쿠키를
// 추가로 요구한다. 서명 키에 ADMIN_PASSWORD 를 섞어 비밀번호를 바꾸면 기존 서명이 무효가 된다.
import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SIG_COOKIE = "admin_sig";

function getKey(): string | null {
  const secret = (process.env.ADMIN_SESSION_SECRET || process.env.CREW_SESSION_SECRET || "").trim();
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  if (secret.length < 32 || !password) return null;
  return `${secret}:${password}`;
}

function sign(payloadB64: string, key: string): string {
  return crypto.createHmac("sha256", key).update(`admin:${payloadB64}`).digest("base64url");
}

/** 로그인 성공 시 발급. 키가 없으면 null(기록 어드민만 막히고 나머지 어드민은 동작). */
export function createAdminSignature(maxAgeSecs: number): string | null {
  const key = getKey();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + maxAgeSecs;
  const payloadB64 = Buffer.from(JSON.stringify({ exp }), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64, key)}`;
}

function verify(value: string | undefined): boolean {
  if (!value) return false;
  const key = getKey();
  if (!key) return false;
  const dot = value.indexOf(".");
  if (dot < 0) return false;
  const payloadB64 = value.slice(0, dot);
  const sig = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payloadB64, key));
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** 서명된 어드민 세션인지 (Server Action / Server Component 에서 호출). */
export async function isSignedAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("auth")?.value === "true" && verify(jar.get(ADMIN_SIG_COOKIE)?.value);
}
