"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginStoreWithPin } from "@/app/actions/store";

export default function LoginForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginStoreWithPin(name, pin);
      if (res.success && res.storeId) {
        router.push(`/store/edit/${res.storeId}`);
        return;
      }
      setError(res.error || "로그인 실패");
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6"
      >
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[hsl(var(--lime))] mb-2">
          · STORE · EDIT · LOGIN
        </div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink mb-5">
          매장 정보 수정
        </h1>

        <label className="block text-[11px] text-cart-ink-60 mb-1.5 font-mono tracking-[0.1em] uppercase">
          매장 이름
        </label>
        <input
          type="text"
          autoComplete="organization"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="등록한 매장 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-cart-rule rounded-[4px] px-3 py-2.5 text-[14px] mb-4"
          required
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
          required
        />

        {error && (
          <p className="text-[11px] text-red-400 mb-3 leading-relaxed">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-[4px] bg-[hsl(var(--lime))] text-cart-ink font-mono text-[12px] tracking-[0.2em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isPending ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
