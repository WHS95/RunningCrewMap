// src/app/sso/authorize/page.tsx
// GET /sso/authorize?client_id=&redirect_uri=&state=
// RunHouse SSO IdP 엔드포인트.
// - redirect_uri 화이트리스트 검증 (불일치 시 400, 리다이렉트 절대 금지)
// - 유효한 crew_session 있으면 즉시 토큰 발급 → 302
// - 없으면 PIN 로그인 폼 표시

import { redirect } from "next/navigation";
import { getCrewSession } from "@/lib/server/crewSession";
import { serverSupabase } from "@/lib/server/supabase";
import {
  isAllowedRedirectUri,
  mintSsoToken,
  ALLOWED_CLIENT_IDS,
} from "@/lib/server/sso";
import SsoLoginForm from "./SsoLoginForm";

export const runtime = "nodejs";

interface PageProps {
  searchParams: Promise<{
    client_id?: string;
    redirect_uri?: string;
    state?: string;
  }>;
}

export default async function SsoAuthorizePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const clientId = sp.client_id?.trim() ?? "";
  const redirectUri = sp.redirect_uri?.trim() ?? "";
  const state = sp.state?.trim() ?? "";

  // ── 파라미터 검증 ──────────────────────────────────────────────
  // client_id 유효 여부 확인
  if (!ALLOWED_CLIENT_IDS.includes(clientId)) {
    return (
      <SsoErrorPage
        message={`알 수 없는 client_id: "${clientId}". 허용값: ${ALLOWED_CLIENT_IDS.join(", ")}`}
      />
    );
  }

  // redirect_uri 화이트리스트 검증 — 불일치 시 절대 리다이렉트 금지, 400 표시
  if (!isAllowedRedirectUri(clientId, redirectUri)) {
    return (
      <SsoErrorPage
        message={`redirect_uri "${redirectUri}"는 허용 목록에 없습니다. 오픈 리다이렉트 방지를 위해 리다이렉트하지 않습니다.`}
      />
    );
  }

  if (!state) {
    return <SsoErrorPage message="state 파라미터가 필요합니다." />;
  }

  // ── 기존 세션 확인 (진짜 SSO) ────────────────────────────────
  const session = await getCrewSession();
  if (session) {
    // 유효한 세션 → 크루 프로필 조회 후 즉시 토큰 발급
    const { data, error } = await serverSupabase
      .from("crews")
      .select("id, name, instagram, logo_image_url")
      .eq("id", session.crewId)
      .maybeSingle();

    if (!error && data) {
      const crew = data as {
        id: string;
        name: string;
        instagram: string | null;
        logo_image_url: string | null;
      };
      const instagram = crew.instagram
        ? crew.instagram.replace(/^@/, "").toLowerCase()
        : "";

      try {
        const token = await mintSsoToken(
          clientId,
          crew.id,
          instagram,
          crew.name,
          crew.logo_image_url ?? null
        );

        const url = new URL(redirectUri);
        url.searchParams.set("token", token);
        url.searchParams.set("state", state);
        // 302 redirect → RP 콜백
        redirect(url.toString());
      } catch {
        // 시크릿 미설정 등 서버 설정 오류
        return (
          <SsoErrorPage message="SSO 서버 설정 오류입니다. 관리자에게 문의해주세요." />
        );
      }
    }
    // 세션이 있지만 DB 조회 실패 → 로그인 폼으로 폴백
  }

  // ── PIN 로그인 폼 표시 ────────────────────────────────────────
  return (
    <SsoLoginForm
      clientId={clientId}
      redirectUri={redirectUri}
      state={state}
    />
  );
}

/** 400 에러 페이지 — redirect 없이 텍스트만 표시 */
function SsoErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6">
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-red-400 mb-2">
          · SSO · ERROR · 400
        </div>
        <h1 className="font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink mb-3">
          잘못된 SSO 요청
        </h1>
        <p className="text-[12px] text-cart-ink-60 leading-relaxed break-all">
          {message}
        </p>
      </div>
    </div>
  );
}
