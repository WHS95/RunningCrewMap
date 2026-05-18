import Link from "next/link";
import { KickerLabel } from "@/components/design/cartographic";
import type { RegionSummary } from "@/lib/server/regions";

export function RegionIndexList({ rows }: { rows: ReadonlyArray<RegionSummary> }) {
  return (
    <ul className="divide-y divide-cart-rule border-t border-b border-cart-rule">
      {rows.map((row, idx) => (
        <li key={row.code}>
          <Link
            href={`/regions/${row.code}`}
            className="flex items-center gap-3 px-[18px] py-3.5 active:bg-white/[0.02] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[hsl(var(--lime))] focus-visible:-outline-offset-1"
          >
            <div className="w-8 font-mono text-[11px] tracking-[0.05em] text-cart-ink-60 tabular-nums">
              {String(idx + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-cart-ink truncate">
                {row.name}
              </div>
              <div className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate mt-0.5">
                {row.blurb}
              </div>
            </div>
            <KickerLabel tone={row.count > 0 ? "lime" : "muted"} className="tabular-nums">
              {String(row.count).padStart(2, "0")} 곳
            </KickerLabel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
