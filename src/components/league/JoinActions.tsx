"use client";

// src/components/league/JoinActions.tsx — 초대 코드 복사 + 앱 설치/열기 버튼
import { useState } from "react";
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
  const [copyState, setCopyState] = useState<CopyState>("idle");

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
        {/* 기기 판별 없이 두 스토어를 나란히 둔다 — 컴퓨터에서 열어도 고를 수 있게. */}
        <KickerLabel tone="muted" className="pb-0.5">
          앱 설치하고 들어가기
        </KickerLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <StoreButton href={LEAGUE_APP_STORE_URL} platform="아이폰" store="App Store" />
          <StoreButton href={LEAGUE_PLAY_STORE_URL} platform="안드로이드" store="Google Play" />
        </div>
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

export function StoreButton({ href, platform, store }: { href: string; platform: string; store: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-0.5 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] py-3 active:scale-[0.98] transition-transform"
    >
      <span className="text-[11px] font-semibold opacity-70">{platform}</span>
      <span className="text-[16px] font-bold">{store}</span>
    </a>
  );
}
