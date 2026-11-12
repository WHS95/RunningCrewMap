"use client";

// 후원 결제창에서 돌아온 직후. 웹훅이 늦을 수 있어 몇 초간 다시 조회한다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { getSupportPaymentStatus } from "@/app/actions/record";
import { SUPPORT_SESSION_KEY } from "@/components/record/SupportClient";

type Ctx = { supportId: string; entryId: string | null; token: string | null };

export function SupportThanksClient() {
  const [ctx, setCtx] = useState<Ctx | null | undefined>(undefined);
  const [status, setStatus] = useState<"checking" | "paid" | "unpaid" | "error">("checking");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SUPPORT_SESSION_KEY);
      setCtx(raw ? (JSON.parse(raw) as Ctx) : null);
    } catch {
      setCtx(null);
    }
  }, []);

  useEffect(() => {
    if (!ctx) return;
    let tries = 0;
    let stop = false;
    const tick = async () => {
      const res = await getSupportPaymentStatus(ctx.supportId);
      if (stop) return;
      if (!res.success) return setStatus("error");
      if (res.paymentStatus === "paid") return setStatus("paid");
      if (++tries >= 10) return setStatus("unpaid");
      setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [ctx]);

  if (ctx === undefined) return null;

  const backHref = ctx?.entryId && ctx.token ? `/record/r/${ctx.entryId}?token=${ctx.token}` : "/record";
  const paidOrUnknown = ctx === null || status === "paid";

  return (
    <div className="px-[22px] pt-6 flex flex-col gap-4">
      <KickerLabel tone="lime" className="text-[10px]">● COFFEE CHAT</KickerLabel>
      {status === "checking" && ctx !== null ? (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--lime))]" /> 결제를 확인하고 있어요
          </h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">몇 초면 돼요. 이 화면을 닫아도 후원은 그대로 반영돼요.</p>
        </>
      ) : paidOrUnknown ? (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink flex items-center gap-2">
            <Check className="w-6 h-6 text-[hsl(var(--lime))]" /> 커피 고마워요
          </h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">
            러너 한 명이 만드는 런하우스에 큰 힘이 돼요. 감사 DM은 곧 보낼게요.
            {ctx?.entryId && " 기록장 이름 옆에 SUPPORTER 표시가 붙었어요."}
          </p>
        </>
      ) : status === "unpaid" ? (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink">아직 결제 확인 전이에요</h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">결제가 끝났다면 잠시 뒤 반영돼요. 결제를 안 했다면 다시 시도해 주세요.</p>
        </>
      ) : (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink">후원을 찾지 못했어요</h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">인스타그램 DM으로 알려 주시면 확인해 드릴게요.</p>
        </>
      )}
      <Link href={backHref} className="h-12 inline-flex items-center justify-center rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] text-[14px] font-bold">
        {ctx?.entryId ? "내 기록 페이지로" : "역대 기록장으로"}
      </Link>
    </div>
  );
}
