// src/app/record/page.tsx — 01 역대 기록장 랜딩 (캔버스 시안 Hall.dc.html)
import Link from "next/link";
import { KickerLabel } from "@/components/design/cartographic";
import { RecordShell } from "@/components/record/RecordShell";
import { ScrollVelocityRow } from "@/components/record/ScrollVelocity";
import { HallStats } from "@/components/record/HallStats";
import { getHallEntries, getHallStats } from "@/lib/server/records";
import { TIERS, TIER_BY_ID, formatSeconds, type RecordTier } from "@/lib/record/tier";
import { cn } from "@/lib/utils";

// 라임은 최상위 SUB-3 에만, SINGLE 은 흰색, 나머지는 흐리게.
function tierTone(t: RecordTier) {
  return t === "sub3" ? "text-[hsl(var(--lime))]" : t === "single" ? "text-cart-ink" : "text-cart-ink-60";
}

export default async function RecordLandingPage() {
  const [entries, stats] = await Promise.all([getHallEntries(), getHallStats()]);

  // 등재 기록이 적을 때는 티어 기준 자체를 흘려 보낸다(빈 화면 방지).
  const useEntries = entries.length >= 4;
  const timeItems = useEntries
    ? entries.slice(0, 12).map((e) => ({ key: e.id, tier: e.tier, time: formatSeconds(e.seconds) }))
    : TIERS.map((t) => ({ key: t.id, tier: t.id, time: t.limitLabel }));
  const metaItems = useEntries
    ? entries.slice(0, 12).map((e) => ({
        key: e.id,
        name: e.displayName,
        race: e.raceName,
        date: e.raceDate.replaceAll("-", "."),
      }))
    : TIERS.map((t) => ({ key: t.id, name: t.name, race: `풀코스 ${t.limitLabel} 이내`, date: t.finish }));

  const recent = entries.slice(0, 3);

  return (
    <RecordShell>
      <section className="px-[22px] pt-7 pb-[22px] flex flex-col gap-3.5">
        <KickerLabel tone="lime" className="text-[10px]">● HALL OF RECORDS</KickerLabel>
        <h1 className="text-[40px] leading-[1.12] font-black tracking-[-0.03em] text-cart-ink">
          기록은
          <br />
          각인됩니다.
        </h1>
        <p className="text-[14px] leading-[1.7] text-cart-ink-60">
          서브3 · 싱글 · 서브4 · 서브5. 인증한 러너의 기록만
          <br />
          런하우스 역대 기록장에 남습니다.
        </p>
      </section>

      <section aria-label="인증 기록 흐름" className="flex flex-col gap-2.5 py-[18px] border-y border-cart-rule">
        <ScrollVelocityRow baseVelocity={-3}>
          {timeItems.map((it) => (
            <span key={it.key} className="flex items-baseline gap-2.5 pr-[30px]">
              <span className={cn("font-mono text-[11px] font-bold tracking-[0.1em]", tierTone(it.tier))}>
                {TIER_BY_ID[it.tier].label}
              </span>
              <span className="font-mono text-[30px] font-bold tracking-[-0.02em] text-cart-ink tabular-nums">
                {it.time}
              </span>
            </span>
          ))}
        </ScrollVelocityRow>
        <ScrollVelocityRow baseVelocity={2}>
          {metaItems.map((it) => (
            <span key={it.key} className="flex items-center gap-2.5 pr-[26px] text-[13px] text-cart-ink-60">
              <span>{it.name}</span>
              <span className="font-mono text-[11px] text-cart-ink-40">·</span>
              <span>{it.race}</span>
              <span className="font-mono text-[11px]">{it.date}</span>
            </span>
          ))}
        </ScrollVelocityRow>
      </section>

      <HallStats stats={stats} />

      <section className="px-[22px] pt-6">
        <div className="flex items-baseline justify-between pb-2.5">
          <KickerLabel tone="muted" className="text-[10px]">RECENTLY ENGRAVED</KickerLabel>
          <Link href="/record/hall" className="font-mono text-[10px] tracking-[0.16em] text-[hsl(var(--lime))] py-2">
            전체 기록장 →
          </Link>
        </div>
        {recent.length > 0 ? (
          recent.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-[13px] border-t border-cart-rule">
              <span className={cn("w-[52px] font-mono text-[10px] font-bold", tierTone(e.tier))}>
                {TIER_BY_ID[e.tier].label}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                <span className="text-[14px] font-semibold text-cart-ink truncate">
                  {e.displayName}
                  {e.crewName ? ` · ${e.crewName}` : ""}
                </span>
                <span className="text-[11px] text-cart-ink-60 truncate">
                  {e.raceName} · {e.raceDate.replaceAll("-", ".")}
                </span>
              </div>
              <span className="font-mono text-[16px] font-bold text-cart-ink tabular-nums">
                {formatSeconds(e.seconds)}
              </span>
            </div>
          ))
        ) : (
          <div className="border-t border-cart-rule py-6 text-[13px] text-cart-ink-60 leading-relaxed">
            아직 새겨진 기록이 없어요.
            <br />첫 번째 이름을 새겨 보세요.
          </div>
        )}
      </section>

      <section className="px-[22px] pt-[18px] flex flex-col gap-3">
        <Link
          href="/record/verify"
          className="w-full flex items-center justify-between px-5 h-[54px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform duration-fast ease-apple"
        >
          <span className="text-[15px] font-extrabold">내 기록 인증하기</span>
          <span className="font-mono text-[11px] tracking-[0.18em]">VERIFY →</span>
        </Link>
        <Link
          href="/record/collection"
          className="w-full flex items-center justify-between px-5 h-12 rounded-[4px] border border-cart-rule text-cart-ink active:scale-[0.98] transition-transform duration-fast ease-apple"
        >
          <span className="text-[14px] font-semibold">각인 액세서리 둘러보기</span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-cart-ink-60">3D · 360° →</span>
        </Link>
      </section>
    </RecordShell>
  );
}
