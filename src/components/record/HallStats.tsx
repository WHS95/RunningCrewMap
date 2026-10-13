"use client";

// 랜딩 VERIFIED RUNNERS 블록 — 시안(01)처럼 ALL · SUB-3 · SINGLE 3칸 + REPLAY.
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { CountUp } from "@/components/record/CountUp";
import type { HallStats as Stats } from "@/lib/types/record";
import { cn } from "@/lib/utils";

export function HallStats({ stats }: { stats: Stats }) {
  // key 를 바꿔 CountUp 을 다시 마운트하면 0 부터 다시 올라간다.
  const [round, setRound] = useState(0);
  const cells = [
    { label: "ALL", value: stats.total, lime: false },
    { label: "SUB-3", value: stats.byTier.sub3, lime: true },
    { label: "SINGLE", value: stats.byTier.single, lime: false },
  ];
  return (
    <section className="px-[22px] pt-[22px] flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <KickerLabel tone="muted" className="text-[10px]">VERIFIED RUNNERS</KickerLabel>
        <button
          type="button"
          onClick={() => setRound((r) => r + 1)}
          aria-label="카운트업 다시 재생"
          className="h-7 px-2.5 inline-flex items-center gap-1 rounded-[2px] border border-cart-rule font-mono text-[10px] tracking-[0.14em] text-cart-ink-60 hover:text-cart-ink transition-colors duration-fast ease-apple"
        >
          <RotateCcw className="w-3 h-3" /> REPLAY
        </button>
      </div>
      <div className="grid grid-cols-3 gap-px bg-cart-rule border border-cart-rule rounded-[4px] overflow-hidden">
        {cells.map((c) => (
          <div key={c.label} className="bg-cart-paper px-3.5 py-4 flex flex-col gap-1.5">
            <span
              className={cn(
                "font-mono text-[26px] font-bold leading-none",
                c.lime ? "text-[hsl(var(--lime))]" : "text-cart-ink"
              )}
            >
              <CountUp key={round} to={c.value} />
            </span>
            <KickerLabel tone="muted" className="text-[10px]">{c.label}</KickerLabel>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-cart-ink-40">
        SUB-4 {stats.byTier.sub4.toLocaleString("en-US")} · SUB-5 {stats.byTier.sub5.toLocaleString("en-US")}
      </p>
    </section>
  );
}
