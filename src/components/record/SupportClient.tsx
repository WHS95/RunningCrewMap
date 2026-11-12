"use client";

// 커피챗 후원 — 이름·한마디(선택)만 받고 그로블 결제창으로 넘긴다. 배송·개인정보 폼은 없다.
import { useState, useTransition } from "react";
import { Coffee, Loader2 } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { createSupport } from "@/app/actions/record";
import { DEFAULT_SUPPORT_OPTION, SUPPORT_OPTIONS, type SupportOptionId } from "@/lib/record/tier";
import { cn } from "@/lib/utils";

export const SUPPORT_SESSION_KEY = "rh_record_support";

const inputClass =
  "w-full h-11 px-3.5 rounded-[4px] bg-cart-paper border border-cart-rule text-[14px] text-cart-ink placeholder:text-cart-ink-40 outline-none focus:border-[hsl(var(--lime))]/60 transition-colors duration-fast ease-apple";

export function SupportClient({
  paidCount,
  linked,
}: {
  paidCount: number;
  linked: { id: string; token: string; runnerName: string } | null;
}) {
  const [optionId, setOptionId] = useState<SupportOptionId>(DEFAULT_SUPPORT_OPTION);
  const option = SUPPORT_OPTIONS.find((o) => o.id === optionId) ?? SUPPORT_OPTIONS[1];
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createSupport({
        optionId,
        entryId: linked?.id,
        token: linked?.token,
        supporterName: name,
        message,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      try {
        sessionStorage.setItem(
          SUPPORT_SESSION_KEY,
          JSON.stringify({ supportId: res.supportId, entryId: linked?.id ?? null, token: linked?.token ?? null })
        );
      } catch {
        // 비공개 모드 등 — /record/support/thanks 가 일반 감사 문구로 대신한다.
      }
      window.location.href = res.paymentUrl;
    });
  };

  return (
    <div className="px-[22px] pt-7 flex flex-col gap-5">
      <div className="flex flex-col gap-3.5">
        <KickerLabel tone="lime" className="text-[10px]">● COFFEE CHAT</KickerLabel>
        <h1 className="text-[34px] leading-[1.12] font-black tracking-[-0.03em] text-cart-ink">
          커피 한 잔으로
          <br />
          런하우스를 응원해요.
        </h1>
        <p className="text-[14px] leading-[1.7] text-cart-ink-60">
          크루 지도부터 기록장까지, 런하우스는 러너 한 사람이 만들고 있어요.
          <br />
          별도 제공물은 없어요. 감사 DM과 기록장 SUPPORTER 표시로 답할게요.
        </p>
      </div>

      <div role="radiogroup" aria-label="후원 금액" className="grid grid-cols-3 gap-2">
        {SUPPORT_OPTIONS.map((o) => {
          const on = o.id === optionId;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setOptionId(o.id)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-[4px] border px-3 py-3.5 text-left transition-colors duration-fast ease-apple active:scale-[0.98]",
                on ? "border-[hsl(var(--lime))] bg-[hsl(var(--lime))]/[0.06]" : "border-cart-rule"
              )}
            >
              <Coffee className={cn("w-4 h-4", on ? "text-[hsl(var(--lime))]" : "text-cart-ink-40")} />
              <span className={cn("text-[13px] font-semibold leading-tight", on ? "text-cart-ink" : "text-cart-ink-60")}>
                {o.cup}
                <br />
                <span className="text-[11px] font-normal text-cart-ink-60">한 잔</span>
              </span>
              <span className={cn("font-mono text-[14px] font-bold tabular-nums", on ? "text-cart-ink" : "text-cart-ink-60")}>
                {o.price.toLocaleString("ko-KR")}원
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between">
        <KickerLabel tone="muted" className="text-[10px]">SUPPORTERS</KickerLabel>
        <span className="font-mono text-[13px] text-cart-ink tabular-nums">
          {paidCount.toLocaleString("ko-KR")}<span className="text-cart-ink-60 ml-1">잔</span>
        </span>
      </div>

      {linked ? (
        <div className="rounded-[4px] border border-[hsl(var(--lime))]/40 px-4 py-3 text-[12px] leading-relaxed text-cart-ink">
          <span className="font-semibold">{linked.runnerName}</span> 님의 기록에 연결돼요. 결제가 끝나면 역대 기록장 이름 옆에{" "}
          <span className="font-mono text-[10px] font-bold tracking-[0.1em] px-1 py-0.5 rounded-[2px] border border-cart-ink-40 text-cart-ink-60">SUPPORTER</span>{" "}
          표시가 붙어요.
        </div>
      ) : (
        <p className="text-[12px] leading-relaxed text-cart-ink-60">
          인증한 기록이 있다면 내 결과 링크의 &ldquo;커피 한 잔&rdquo; 버튼으로 들어오면 기록장에 SUPPORTER 표시가 붙어요. 없어도 후원은 똑같이 고마워요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-cart-ink">이름 또는 닉네임 <span className="text-cart-ink-40 font-normal">(선택)</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="감사 DM에 부를 이름" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-cart-ink">한마디 <span className="text-cart-ink-40 font-normal">(선택)</span></span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} rows={3} placeholder="응원 한 줄, 바라는 기능 등" className={cn(inputClass, "h-auto py-3 resize-none")} />
        </label>
      </div>

      {error && <p className="text-[12px] text-[#FF6B6B]">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full flex items-center justify-between px-5 h-[54px] rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] active:scale-[0.98] transition-transform duration-fast ease-apple disabled:opacity-70"
      >
        <span className="text-[15px] font-extrabold flex items-center gap-2">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {option.cup} 한 잔 후원하기
        </span>
        <span className="font-mono text-[11px] tracking-[0.18em]">{option.price.toLocaleString("ko-KR")} KRW →</span>
      </button>
      <p className="text-[11px] leading-relaxed text-cart-ink-40">
        결제는 그로블 결제창에서 진행돼요. 후원은 실물·디지털 제공물이 없는 응원이며, 결제 후 7일 이내 그로블 주문 조회에서 취소할 수 있어요.
      </p>
    </div>
  );
}
