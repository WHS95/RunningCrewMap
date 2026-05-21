"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithPin } from "@/app/actions/crewAuth";

export default function LoginForm() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginWithPin(instagram, pin);
      if (res.ok) {
        router.push(`/crew/edit/${res.crewId}`);
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
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[hsl(var(--lime))] mb-2">
          · CREW · EDIT · LOGIN
        </div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink mb-5">
          크루 정보 수정
        </h1>

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

        <label className="block text-[11px] text-cart-ink-60 mb-1.5 font-mono tracking-[0.1em] uppercase">
          수정 PIN
        </label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="current-password"
          placeholder="4자리 숫자"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
          {isPending ? "로그인 중…" : "로그인"}
        </button>

        <div className="mt-4 text-center">
          <Link
            href="/crew/edit/forgot"
            className="text-[11px] text-cart-ink-60 underline underline-offset-2 hover:text-cart-ink"
          >
            PIN을 잊으셨나요?
          </Link>
        </div>
      </form>
    </div>
  );
}
