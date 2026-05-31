"use client";

// SSO 인증 폼 — 크루 인스타 + PIN 입력 → server action ssoLoginWithPin 호출
import { useState, useTransition } from "react";
import { ssoLoginWithPin } from "./actions";

interface Props {
  clientId: string;
  redirectUri: string;
  state: string;
}

export default function SsoLoginForm({ clientId, redirectUri, state }: Props) {
  const [instagram, setInstagram] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await ssoLoginWithPin(instagram, pin, clientId, redirectUri, state);
      if (res.ok) {
        // 서버 액션이 302 redirect를 수행하므로 여기는 도달 안 함.
        // 혹시 도달하면 redirect URL로 이동.
        window.location.href = res.redirectUrl;
        return;
      }
      if (res.reason === "locked") {
        const unlock = res.unlocksAt
          ? new Date(res.unlocksAt).getTime()
          : Date.now() + 15 * 60 * 1000;
        const mins = Math.max(1, Math.ceil((unlock - Date.now()) / 60000));
        setError(`5회 잘못 입력하셨습니다. ${mins}분 후 다시 시도해주세요.`);
      } else if (res.reason === "no-pin") {
        setError(
          "이 크루는 아직 수정 PIN을 설정하지 않았어요. 등록 시 받으신 수정 링크에서 PIN을 먼저 설정해주세요."
        );
      } else {
        setError("인스타그램 아이디 또는 PIN이 일치하지 않습니다.");
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6"
      >
        {/* 헤더 */}
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[hsl(var(--lime))] mb-2">
          · CREW · SSO · LOGIN
        </div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink mb-1">
          크루로 로그인
        </h1>
        <p className="text-[11px] text-cart-ink-60 leading-relaxed mb-5">
          <span className="font-semibold text-cart-ink">{clientId}</span>에서
          런하우스 크루 인증을 요청했습니다.
        </p>

        {/* 인스타그램 */}
        <label className="block text-[11px] text-cart-ink-60 mb-1.5 font-mono tracking-[0.1em] uppercase">
          인스타그램 아이디
        </label>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="@runhouse_official"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          className="w-full bg-background border border-cart-rule rounded-[4px] px-3 py-2.5 text-[14px] mb-4"
        />

        {/* PIN */}
        <label className="block text-[11px] text-cart-ink-60 mb-1.5 font-mono tracking-[0.1em] uppercase">
          수정 PIN
        </label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoComplete="current-password"
          placeholder="4~8자리 숫자"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="w-full font-mono text-[16px] tracking-[0.4em] text-center bg-background border border-cart-rule rounded-[4px] px-3 py-2.5 mb-4"
        />

        {error && (
          <p className="text-[11px] text-red-400 mb-3 leading-relaxed">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-[4px] bg-[hsl(var(--lime))] text-cart-ink font-mono text-[12px] tracking-[0.2em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isPending ? "인증 중…" : "로그인 · 인증"}
        </button>
      </form>
    </div>
  );
}
