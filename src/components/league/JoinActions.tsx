"use client";

// src/components/league/JoinActions.tsx — 초대 코드 복사 + 앱 설치/열기 버튼
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import {
  LEAGUE_APP_STORE_URL,
  LEAGUE_PLAY_STORE_URL,
  leagueDeepLink,
} from "@/lib/league/invite";

type CopyState = "idle" | "copied" | "failed";

export function JoinActions({
  code,
  description,
}: {
  code: string | null;
  description: string;
}) {
  // 서버 렌더는 App Store 기본, 안드로이드는 마운트 뒤에 바꾼다(하이드레이션 불일치 방지).
  const [storeUrl, setStoreUrl] = useState(LEAGUE_APP_STORE_URL);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) setStoreUrl(LEAGUE_PLAY_STORE_URL);
  }, []);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <>
      {code && (
        <div className="mt-7 flex items-center gap-3 border border-cart-rule bg-cart-paper rounded-[4px] px-5 py-4">
          <div className="min-w-0">
            <KickerLabel tone="muted">초대 코드</KickerLabel>
            <div className="mt-1.5 font-mono text-[28px] font-bold tracking-[0.06em] text-cart-ink tabular-nums select-all">
              {code}
            </div>
          </div>
          <button
            type="button"
            onClick={copy}
            className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-[4px] border border-cart-rule px-3 py-2 text-[13px] font-semibold text-cart-ink active:scale-95 transition-transform"
          >
            {copyState === "copied" ? (
              <Check className="w-3.5 h-3.5 text-[hsl(var(--lime))]" aria-hidden />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden />
            )}
            {copyState === "copied" ? "복사했어요" : copyState === "failed" ? "길게 눌러 복사" : "복사하기"}
          </button>
        </div>
      )}

      <p className="mt-5 text-[15px] leading-[1.7] text-cart-ink-60 break-keep">{description}</p>

      <div className="flex-1 min-h-10" />

      <div className="flex flex-col gap-2.5">
        <a
          href={storeUrl}
          className="block text-center rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] py-4 text-[16px] font-bold active:scale-[0.98] transition-transform"
        >
          앱 설치하고 들어가기
        </a>
        <a
          href={leagueDeepLink(code)}
          className="block text-center rounded-[4px] border border-cart-rule text-cart-ink py-4 text-[15px] font-semibold active:scale-[0.98] transition-transform"
        >
          이미 앱이 있어요 · 앱에서 열기
        </a>
      </div>
    </>
  );
}
