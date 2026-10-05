// src/components/record/HallRow.tsx
import { TIER_BY_ID, formatSeconds } from "@/lib/record/tier";
import type { HallEntry } from "@/lib/types/record";
import { cn } from "@/lib/utils";

export function HallRow({ entry, rank }: { entry: HallEntry; rank: number }) {
  const tier = TIER_BY_ID[entry.tier];
  return (
    <div className="flex items-center gap-3 py-3 border-t border-cart-rule">
      <span className="w-6 font-mono text-[11px] text-cart-ink-40 tabular-nums">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] font-semibold text-cart-ink truncate">{entry.displayName}</span>
          <span
            className={cn(
              "font-mono text-[9px] font-bold tracking-[0.08em] shrink-0",
              entry.tier === "sub3" ? "text-[hsl(var(--lime))]" : "text-cart-ink-60"
            )}
          >
            {tier.label}
          </span>
          {entry.engraved && (
            <span className="shrink-0 font-mono text-[8.5px] font-bold tracking-[0.1em] px-1.5 py-0.5 rounded-[2px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]">
              ENGRAVED
            </span>
          )}
        </div>
        <span className="text-[11px] text-cart-ink-60 truncate">
          {entry.crewName ? `${entry.crewName} · ` : ""}
          {entry.raceName} · <span className="font-mono">{entry.raceDate.replaceAll("-", ".")}</span>
        </span>
      </div>
      <span className="font-mono text-[17px] font-bold text-cart-ink tabular-nums">
        {formatSeconds(entry.seconds)}
      </span>
    </div>
  );
}
