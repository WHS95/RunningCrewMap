"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCrewPinWithToken } from "@/app/actions/crewAuth";

// 클라이언트 약한 PIN 목록 — server/pin.ts의 WEAK_PINS와 동기화 유지
const WEAK_PINS_CLIENT = new Set([
  "0000","1111","2222","3333","4444","5555","6666","7777","8888","9999",
  "0123","1234","2345","3456","4567","5678","6789",
  "9876","8765","7654","6543","5432","4321","3210",
  // 8자리
  "00000000","11111111","22222222","33333333","44444444",
  "55555555","66666666","77777777","88888888","99999999",
  "01234567","12345678","23456789","98765432","87654321","76543210",
  "00001111","11112222","12341234","11223344",
  "12121212","01010101",
]);

export default function SetPinForm({
  crewId,
  token,
}: {
  crewId: string;
  token: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // 신규 PIN 설정: 정확히 8자리 숫자
    if (!/^\d{8}$/.test(pin)) {
      setError("8자리 숫자를 입력해주세요.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("PIN이 일치하지 않습니다.");
      return;
    }
    if (WEAK_PINS_CLIENT.has(pin)) {
      setError("너무 쉬운 PIN입니다. 다른 숫자로 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await setCrewPinWithToken(crewId, token, pin);
      if (res.ok) {
        // 세션 쿠키가 set됐으므로 token 없는 URL로 navigate
        router.replace(`/crew/edit/${crewId}`);
        router.refresh();
        return;
      }
      if (res.reason === "weak-pin") {
        setError("너무 쉬운 PIN입니다. 다른 숫자로 입력해주세요.");
      } else if (res.reason === "bad-format") {
        setError("8자리 숫자를 입력해주세요.");
      } else {
        setError(
          "수정 권한을 확인할 수 없어요. 등록 시 받으신 링크를 다시 확인해주세요."
        );
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6"
      >
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[hsl(var(--lime))] mb-2">
          · PIN · SETUP
        </div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink mb-2">
          수정 PIN 설정
        </h1>
        <p className="text-[12px] text-cart-ink-60 leading-relaxed mb-5">
          다음부터는 인스타그램 아이디와 이 PIN으로 로그인할 수 있어요.
          보안을 위해 <span className="text-cart-ink font-semibold">8자리</span>로 설정해주세요.
        </p>

        <label className="block text-[11px] text-cart-ink-60 mb-1.5 font-mono tracking-[0.1em] uppercase">
          새 PIN (8자리)
        </label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoComplete="new-password"
          placeholder="8자리 숫자"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8))
          }
          className="w-full font-mono text-[16px] tracking-[0.4em] text-center bg-background border border-cart-rule rounded-[4px] px-3 py-2.5 mb-3"
        />

        <label className="block text-[11px] text-cart-ink-60 mb-1.5 font-mono tracking-[0.1em] uppercase">
          한 번 더
        </label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoComplete="new-password"
          placeholder="다시 입력"
          value={pinConfirm}
          onChange={(e) =>
            setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))
          }
          className="w-full font-mono text-[16px] tracking-[0.4em] text-center bg-background border border-cart-rule rounded-[4px] px-3 py-2.5 mb-4"
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
          {isPending ? "저장 중…" : "PIN 설정"}
        </button>
      </form>
    </div>
  );
}
