"use client";

// 07 3D 턴테이블 쇼케이스 — 세 제품을 티어별 마감으로 돌려 본다. 각인 문구는 예시다.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { Engrave3D, type EngraveFinish, type EngraveText } from "@/components/record/Engrave3D";
import { TIER_BY_ID, type RecordSku } from "@/lib/record/tier";
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
    sku: "tag",
    label: "RECORD TAG",
    desc: "도그태그 펜던트 · 키링",
    finish: "black",
    text: { runnerName: "RUNNER NAME", raceName: "RACE NAME", raceDate: "2026.03.15", time: "2:58:41", tier: "sub3", certNo: "RH-REC-00000" },
  },
  {
    sku: "lace",
    label: "LACE TAG",
    desc: "레이싱화 슈 태그",
    finish: "steel",
    scale: 1.5,
    text: { runnerName: "RUNNER NAME", raceName: "RACE NAME", raceDate: "2026.02.22", time: "3:41:05", tier: "sub4", certNo: "RH-REC-00000" },
  },
  {
    sku: "plate",
    label: "RECORD PLATE",
    desc: "데스크 · 메달 플레이트",
    finish: "gunmetal",
    text: { runnerName: "RUNNER NAME", raceName: "RACE NAME", raceDate: "2025.10.18", time: "3:06:20", tier: "single", certNo: "RH-REC-00000" },
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
          각인 문구는 예시예요. 실제 제품에는 인증된 내 기록이 새겨져요. 소재가 정해지면 실사 렌더로 바꿀 거예요.
        </p>
      </section>

      <div className="px-[22px] flex flex-col gap-4">
        {ITEMS.map((it) => {
          const tier = it.text.tier ? TIER_BY_ID[it.text.tier] : null;
          return (
            <article key={it.sku} className="border border-cart-rule rounded-[4px] overflow-hidden">
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
                    {tier?.finish} · {it.desc}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-cart-ink-60 shrink-0">가격 · DM 안내</span>
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
          SUB-5(4:59:59) 이내 인증 러너만 신청할 수 있어요. 마감은 티어에 따라 정해져요 — SUB-3 블랙 PVD · SINGLE 건메탈 · SUB-4 브러시드 스틸 · SUB-5 무광 스틸.
        </p>
      </section>
    </div>
  );
}
