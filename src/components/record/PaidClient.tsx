"use client";

// 결제창에서 돌아온 직후. 웹훅이 결제 완료를 적기 전에 도착할 수 있어 몇 초간 다시 조회한다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { getOrderPaymentStatus } from "@/app/actions/record";
import { PAID_SESSION_KEY } from "@/components/record/ShopClient";

type Ctx = { orderId: string; entryId: string; token: string };

export function PaidClient() {
  const [ctx, setCtx] = useState<Ctx | null | undefined>(undefined);
  const [status, setStatus] = useState<"checking" | "paid" | "unpaid" | "error">("checking");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PAID_SESSION_KEY);
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
      const res = await getOrderPaymentStatus(ctx.orderId, ctx.entryId, ctx.token);
      if (stop) return;
      if (!res.success) {
        setStatus("error");
        return;
      }
      if (res.paymentStatus === "paid") {
        setStatus("paid");
        return;
      }
      if (++tries >= 10) {
        setStatus("unpaid");
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [ctx]);

  const resultHref = ctx ? `/record/r/${ctx.entryId}?token=${ctx.token}` : "/record";

  if (ctx === undefined) return null;

  if (ctx === null) {
    return (
      <div className="px-[22px] pt-6 flex flex-col gap-4">
        <KickerLabel tone="lime" className="text-[10px]">● PAYMENT</KickerLabel>
        <h1 className="text-[26px] font-bold leading-tight text-cart-ink">결제가 끝났어요.</h1>
        <p className="text-[13px] leading-relaxed text-cart-ink-60">
          결제 확인과 제작 진행 상황은 인증할 때 받은 내 결과 링크에서 볼 수 있어요. 링크를 잃어버렸다면 인스타그램 DM으로 알려 주세요.
        </p>
        <Link href="/record" className="h-12 inline-flex items-center justify-center rounded-[4px] border border-cart-rule text-[14px] font-semibold text-cart-ink">
          역대 기록장으로
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[22px] pt-6 flex flex-col gap-4">
      <KickerLabel tone="lime" className="text-[10px]">● PAYMENT</KickerLabel>
      {status === "checking" && (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--lime))]" /> 결제를 확인하고 있어요
          </h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">몇 초면 돼요. 이 화면을 닫아도 결제는 그대로 반영돼요.</p>
        </>
      )}
      {status === "paid" && (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink flex items-center gap-2">
            <Check className="w-6 h-6 text-[hsl(var(--lime))]" /> 주문이 완료됐어요
          </h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">
            각인 제작에 들어가요. 발송되면 입력한 연락처로 알려 드릴게요. 기록장에는 ENGRAVED 마크가 붙어요.
          </p>
        </>
      )}
      {status === "unpaid" && (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink">아직 결제 확인 전이에요</h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">
            결제가 끝났다면 잠시 뒤 내 결과 링크에서 확인할 수 있어요. 결제를 안 했다면 다시 시도해 주세요.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-[26px] font-bold leading-tight text-cart-ink">주문을 찾지 못했어요</h1>
          <p className="text-[13px] leading-relaxed text-cart-ink-60">내 결과 링크에서 다시 확인해 주세요.</p>
        </>
      )}
      <Link href={resultHref} className="h-12 inline-flex items-center justify-center rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] text-[14px] font-bold">
        내 기록 페이지로
      </Link>
    </div>
  );
}
