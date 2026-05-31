"use server";

// SSO 로그인 서버 액션 — PIN 검증 → JWT 발급 → redirect URL 반환
import { loginWithPin } from "@/app/actions/crewAuth";
import { serverSupabase } from "@/lib/server/supabase";
import { isAllowedRedirectUri, mintSsoToken } from "@/lib/server/sso";
import { normalizeInstagramHandle } from "@/lib/server/pin";

type SsoLoginResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: "invalid" | "locked" | "no-pin" | "config-error"; unlocksAt?: string };

/**
 * SSO 컨텍스트에서 PIN 로그인.
 * 1. redirect_uri 화이트리스트 재검증 (서버 액션도 검증 — 클라이언트 변조 방어)
 * 2. loginWithPin으로 크루 인증
 * 3. 크루 프로필 조회 (name, logo_image_url)
 * 4. JWT 발급 → redirect URL 반환
 */
export async function ssoLoginWithPin(
  instagramInput: string,
  pin: string,
  clientId: string,
  redirectUri: string,
  state: string
): Promise<SsoLoginResult> {
  // 화이트리스트 재검증 — 클라이언트에서 변조 시도 방어
  if (!isAllowedRedirectUri(clientId, redirectUri)) {
    return { ok: false, reason: "config-error" };
  }

  // 기존 loginWithPin 재사용 (잠금·검증 포함)
  const loginResult = await loginWithPin(instagramInput, pin);
  if (!loginResult.ok) {
    return {
      ok: false,
      reason: loginResult.reason,
      unlocksAt: loginResult.reason === "locked" ? loginResult.unlocksAt : undefined,
    };
  }

  const crewId = loginResult.crewId;

  // 크루 프로필 조회 (name, logo_image_url, instagram)
  const handle = normalizeInstagramHandle(instagramInput);
  const { data, error } = await serverSupabase
    .from("crews")
    .select("id, name, instagram, logo_image_url")
    .eq("id", crewId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "invalid" };
  }

  const crew = data as {
    id: string;
    name: string;
    instagram: string | null;
    logo_image_url: string | null;
  };

  // instagram: DB 값 우선, 없으면 입력값 정규화
  const instagram = crew.instagram
    ? crew.instagram.replace(/^@/, "").toLowerCase()
    : (handle ?? "");

  // JWT 발급 (TTL 60초, 스펙 §1)
  let token: string;
  try {
    token = await mintSsoToken(
      clientId,
      crewId,
      instagram,
      crew.name,
      crew.logo_image_url ?? null
    );
  } catch {
    return { ok: false, reason: "config-error" };
  }

  // redirect URL 조합
  const url = new URL(redirectUri);
  url.searchParams.set("token", token);
  url.searchParams.set("state", state);

  return { ok: true, redirectUrl: url.toString() };
}
