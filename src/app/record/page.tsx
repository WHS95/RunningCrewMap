// src/app/record/page.tsx — 역대 기록장 랜딩
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { RecordShell } from "@/components/record/RecordShell";
import { ScrollVelocityRow } from "@/components/record/ScrollVelocity";
import { CountUp } from "@/components/record/CountUp";
import { HallRow } from "@/components/record/HallRow";
import { getHallEntries, getHallStats } from "@/lib/server/records";
import { TIERS, TIER_BY_ID, formatSeconds } from "@/lib/record/tier";
import { cn } from "@/lib/utils";

export default async function RecordLandingPage() {
  const [entries, stats] = await Promise.all([getHallEntries(), getHallStats()]);

  // 등재 기록이 적을 때는 티어 기준 자체를 흘려 보낸다(빈 화면 방지).
  const useEntries = entries.length >= 4;
  const timeItems = useEntries
    ? entries.slice(0, 12).map((e) => ({
        key: e.id,
        tier: TIER_BY_ID[e.tier].label,
        top: e.tier === "sub3",
        time: formatSeconds(e.seconds),
      }))
    : TIERS.map((t) => ({ key: t.id, tier: t.label, top: t.id === "sub3", time: t.limitLabel }));
  const metaItems = useEntries
    ? entries.slice(0, 12).map((e) => ({
        key: e.id,
        text: `${e.displayName} · ${e.raceName} · ${e.raceDate.replaceAll("-", ".")}`,
      }))
    : TIERS.map((t) => ({ key: t.id, text: `${t.name} · 풀코스 ${t.limitLabel} 이내 · ${t.finish}` }));

  const recent = entries.slice(0, 5);

  return (
    <RecordShell>
      <section className="px-[22px] pt-7 pb-6 flex flex-col gap-3.5">
        <KickerLabel tone="lime">● HALL OF RECORDS · 역대 기록장</KickerLabel>
        <h1 className="font-display text-[40px] leading-[1.1] font-black tracking-[-0.03em] text-cart-ink">
          기록은
          <br />
          각인됩니다.
        </h1>
        <p className="text-[14px] leading-relaxed text-cart-ink-60">
          서브3 · 싱글 · 서브4 · 서브5.
          <br />
          인증을 마친 러너의 기록만 런하우스 역대 기록장에 남습니다.
        </p>
      </section>

      <section aria-label="인증 기록 흐름" className="flex flex-col gap-2.5 py-4 border-y border-cart-rule">
        <ScrollVelocityRow baseVelocity={-3}>
          {timeItems.map((it) => (
            <span key={it.key} className="flex items-baseline gap-2.5 pr-8">
              <span
                className={cn(
                  "font-mono text-[11px] font-bold tracking-[0.1em]",
                  it.top ? "text-[hsl(var(--lime))]" : "text-cart-ink-60"
                )}
              >
                {it.tier}
              </span>
              <span className="font-mono text-[30px] font-bold tracking-[-0.02em] text-cart-ink tabular-nums">
                {it.time}
              </span>
            </span>
          ))}
        </ScrollVelocityRow>
        <ScrollVelocityRow baseVelocity={2}>
          {metaItems.map((it) => (
            <span key={it.key} className="pr-7 text-[13px] text-cart-ink-60">
              {it.text}
            </span>
          ))}
        </ScrollVelocityRow>
      </section>

      <section className="px-[22px] pt-6 flex flex-col gap-3">
        <KickerLabel tone="muted">VERIFIED RUNNERS · 인증 러너</KickerLabel>
        <div className="font-mono text-[44px] font-bold leading-none tracking-[-0.03em] text-cart-ink">
          <CountUp to={stats.total} />
        </div>
        <div className="grid grid-cols-4 border border-cart-rule rounded-[4px] overflow-hidden">
          {TIERS.map((t, i) => (
            <div
              key={t.id}
              className={cn("bg-cart-paper px-3 py-3 flex flex-col gap-1", i > 0 && "border-l border-cart-rule")}
            >
              <span
                className={cn(
                  "font-mono text-[20px] font-bold",
                  t.id === "sub3" ? "text-[hsl(var(--lime))]" : "text-cart-ink"
                )}
              >
                <CountUp to={stats.byTier[t.id]} duration={1.2} />
              </span>
              <span className="font-mono text-[9px] tracking-[0.16em] text-cart-ink-40">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[22px] pt-8">
        <div className="flex items-baseline justify-between pb-2">
          <KickerLabel tone="muted">TIERS · 인증 기준 (풀코스 넷 타임)</KickerLabel>
        </div>
        {TIERS.map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-3 border-t border-cart-rule">
            <span
              className={cn(
                "w-14 font-mono text-[10px] font-bold tracking-[0.08em]",
                t.id === "sub3" ? "text-[hsl(var(--lime))]" : "text-cart-ink"
              )}
            >
              {t.label}
            </span>
            <span className="flex-1 text-[12px] text-cart-ink-60">{t.finish}</span>
            <span className="font-mono text-[15px] font-bold text-cart-ink tabular-nums">≤ {t.limitLabel}</span>
          </div>
        ))}
      </section>

      <section className="px-[22px] pt-8">
        <div className="flex items-baseline justify-between pb-2">
          <KickerLabel tone="muted">FASTEST · 기록장</KickerLabel>
          <Link
            href="/record/hall"
            className="font-mono text-[10px] tracking-[0.16em] text-[hsl(var(--lime))] py-2"
          >
            전체 기록장 →
          </Link>
        </div>
        {recent.length > 0 ? (
          recent.map((e, i) => <HallRow key={e.id} entry={e} rank={i + 1} />)
        ) : (
          <div className="border-t border-cart-rule py-6 text-[13px] text-cart-ink-60 leading-relaxed">
            아직 새겨진 기록이 없어요.
            <br />첫 번째 이름을 새겨 보세요.
          </div>
        )}
      </section>

      <section className="px-[22px] pt-8">
        <Link
          href="/record/verify"
          className="w-full flex items-center justify-between px-5 h-14 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform duration-fast ease-apple"
        >
          <span className="font-display text-[15px] font-bold">내 기록 인증하기</span>
          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold tracking-[0.12em]">
            VERIFY <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
        <p className="mt-3 text-[11px] leading-relaxed text-cart-ink-40">
          인증을 마친 러너만 기록 각인 액세서리를 신청할 수 있어요.
        </p>
      </section>
    </RecordShell>
  );
}
