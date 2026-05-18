// src/lib/server/crewSession.ts
import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "crew_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

interface SessionPayload {
  crewId: string;
  pinSetAt: string; // ISO string
  exp: number; // epoch seconds
}

function getSecret(): string {
  const s = process.env.CREW_SESSION_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error(
      "CREW_SESSION_SECRET is missing or too short. Set it to at least 32 hex chars."
    );
  }
  return s;
}

function sign(payloadB64: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function encodeSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = sign(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

export function decodeSession(cookieValue: string): SessionPayload | null {
  const dot = cookieValue.indexOf(".");
  if (dot < 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = sign(payloadB64, getSecret());
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;
    if (
      typeof payload.crewId !== "string" ||
      typeof payload.pinSetAt !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * 새 세션 쿠키 발급 (Server Action 안에서만 호출).
 */
export async function setCrewSessionCookie(
  crewId: string,
  pinSetAt: string
): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const value = encodeSession({ crewId, pinSetAt, exp });
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearCrewSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * 현재 요청의 세션 쿠키를 읽고 검증 (DB의 pin_set_at과 일치 확인까지).
 * 통과하면 { crewId } 반환. 하나라도 실패하면 null.
 */
export async function getCrewSession(): Promise<{ crewId: string } | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = decodeSession(raw);
  if (!payload) return null;

  // pin_set_at 일치 확인 — admin이 PIN 초기화한 세션 무효화
  const { serverSupabase } = await import("@/lib/server/supabase");
  const { data, error } = await serverSupabase
    .from("crews")
    .select("pin_set_at")
    .eq("id", payload.crewId)
    .maybeSingle();
  if (error || !data) return null;
  const currentPinSetAt = (data as { pin_set_at: string | null }).pin_set_at;
  if (!currentPinSetAt || currentPinSetAt !== payload.pinSetAt) return null;

  return { crewId: payload.crewId };
}
