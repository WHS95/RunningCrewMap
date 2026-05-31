// src/lib/server/sso.ts
// RunHouse SSO IdP 핵심 로직 — JWT 발급 + redirect_uri 화이트리스트
import "server-only";
import crypto from "crypto";
import { SignJWT } from "jose";

// ── 스펙 §2: redirect_uri 화이트리스트 (하드코딩, 오픈 리다이렉트 방지) ──
const REDIRECT_URI_ALLOWLIST: Record<string, string[]> = {
  custom_hat: [
    "https://runhouse-custom.vercel.app/sso/callback",
    "http://localhost:3000/sso/callback",
  ],
  certification: [
    "https://running-crew-certification-maker.vercel.app/sso/callback",
    "http://localhost:3000/sso/callback",
  ],
};

/** 허용된 client_id 목록 */
export const ALLOWED_CLIENT_IDS = Object.keys(REDIRECT_URI_ALLOWLIST);

/**
 * redirect_uri 화이트리스트 검증.
 * 일치하지 않으면 false — 절대 리다이렉트하지 않는다.
 */
export function isAllowedRedirectUri(
  clientId: string,
  redirectUri: string
): boolean {
  const list = REDIRECT_URI_ALLOWLIST[clientId];
  if (!list) return false;
  return list.includes(redirectUri);
}

/** SSO JWT 클레임 타입 (스펙 §1) */
export interface SsoJwtPayload {
  iss: "runhouse-idp";
  aud: string; // client_id
  sub: string; // crew_id (uuid)
  instagram: string; // @ 없는 소문자
  crew_name: string;
  logo_url: string | null;
  iat: number;
  exp: number; // iat + 60
}

function getSsoSecret(): Uint8Array {
  const raw = process.env.RUNHOUSE_SSO_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      "RUNHOUSE_SSO_SECRET 환경 변수가 없거나 너무 짧습니다 (최소 32자)."
    );
  }
  return new TextEncoder().encode(raw);
}

/**
 * 스펙 §1 클레임으로 HS256 JWT 발급.
 * TTL: 60초
 */
export async function mintSsoToken(
  clientId: string,
  crewId: string,
  instagram: string,
  crewName: string,
  logoUrl: string | null
): Promise<string> {
  const secret = getSsoSecret();
  const now = Math.floor(Date.now() / 1000);

  const payload: Omit<SsoJwtPayload, "iss" | "aud" | "iat" | "exp"> = {
    sub: crewId,
    instagram,
    crew_name: crewName,
    logo_url: logoUrl,
  };

  return new SignJWT({ ...payload, logo_url: logoUrl ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("runhouse-idp")
    .setAudience(clientId)
    .setJti(crypto.randomUUID()) // 단일-사용 강제용 replay-protection 클레임
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(secret);
}
