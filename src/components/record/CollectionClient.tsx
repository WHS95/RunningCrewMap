"use client";

// 07 3D 턴테이블 쇼케이스 — 세 제품을 티어별 마감으로 돌려 본다. 각인 문구는 예시다.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { Engrave3D, type EngraveFinish, type EngraveText } from "@/components/record/Engrave3D";
import { RECORD_LIMIT_QTY, RECORD_PRICE_KRW, TIER_BY_ID, type RecordSku } from "@/lib/record/tier";
import { cn } from "@/lib/utils";

const ITEMS: Array<{
  sku: RecordSku;
  label: string;
  desc: string;
  finish: EngraveFinish;
  scale?: number;
  text: EngraveText;
}> = [
  {
    sku: "keyring",
    label: "RECORD KEYRING · SUB-3",
    desc: "아크릴 각인 키링 · NFC 내장",
    finish: "acrylic",
    text: { runnerName: "HONG GIL DONG", raceName: "RACE NAME", raceDate: "2026.03.15", time: "02:58:36", tier: "sub3", certNo: "RH-REC-00000" },
  },
  {
    sku: "keyring",
    label: "RECORD KEYRING · SUB-4",
    desc: "아크릴 각인 키링 · NFC 내장",
    finish: "acrylic",
    text: { runnerName: "HONG GIL DONG", raceName: "RACE NAME", raceDate: "2026.02.22", time: "03:41:05", tier: "sub4", certNo: "RH-REC-00000" },
  },
];

export function CollectionClient() {
  return (
    <div>
      <section className="px-[22px] pt-6 pb-5 flex flex-col gap-3">
        <KickerLabel tone="lime" className="text-[10px]">● RECORD · 3D TURNTABLE</KickerLabel>
        <h1 className="text-[30px] leading-[1.15] font-black tracking-[-0.03em] text-cart-ink">
          드래그해서
          <br />
          360° 돌려보세요
        </h1>
        <p className="text-[12px] leading-relaxed text-cart-ink-40">
          투명 아크릴에 검정 패널, 라임 UV 인쇄. 뒷면 NFC 에 폰을 대면 내 기록 페이지가 열려요. 각인 문구는 예시예요.
        </p>
      </section>

      <div className="px-[22px] flex flex-col gap-4">
        {ITEMS.map((it) => {
          const tier = it.text.tier ? TIER_BY_ID[it.text.tier] : null;
          return (
            <article key={it.label} className="border border-cart-rule rounded-[4px] overflow-hidden">
              <Engrave3D sku={it.sku} finish={it.finish} text={it.text} height={340} scale={it.scale} />
              <div className="px-5 py-[18px] flex items-baseline justify-between gap-3 border-t border-cart-rule">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[17px] font-bold text-cart-ink">{it.label}</span>
                  <span className="text-[12px] text-cart-ink-60">
                    <span
                      className={cn(
                        "font-mono font-bold mr-1.5",
                        it.text.tier === "sub3" ? "text-[hsl(var(--lime))]" : "text-cart-ink"
                      )}
                    >
                      {tier?.label}
                    </span>
                    {it.desc}
                  </span>
                </div>
                <span className="font-mono text-[13px] font-bold text-[hsl(var(--lime))] shrink-0 tabular-nums">{RECORD_PRICE_KRW.toLocaleString("ko-KR")}원</span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="px-[22px] pt-6 flex flex-col gap-3">
        <Link
          href="/record/verify"
          className="w-full flex items-center justify-between px-5 h-[54px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform duration-fast ease-apple"
        >
          <span className="text-[15px] font-extrabold">내 기록 인증하고 각인하기</span>
          <span className="flex items-center gap-1 font-mono text-[11px] tracking-[0.16em]">
            VERIFY <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
        <p className="text-[11px] leading-relaxed text-cart-ink-40">
          SUB-5(4:59:59) 이내 인증 러너만 주문할 수 있어요. 배송비 포함 {RECORD_PRICE_KRW.toLocaleString("ko-KR")}원 · 한정 {RECORD_LIMIT_QTY}개 · 결제 후 14일 내 발송.
        </p>
      </section>
    </div>
  );
}
