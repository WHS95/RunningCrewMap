import Image from "next/image";
import Link from "next/link";
import type { Crew } from "@/lib/types/crew";
import type { RegionCode } from "@/lib/server/regions";

export function RegionCrewRow({
  crew,
  rank,
  regionCode,
}: {
  crew: Crew;
  rank: number;
  regionCode: RegionCode;
}) {
  const area =
    crew.location.main_address?.split(" ").slice(0, 2).join(" ") ||
    crew.location.address?.split(" ").slice(0, 2).join(" ") ||
    "—";
  return (
    <Link
      // Week 2에 /crew/[id] 단독 페이지가 생기면 그곳으로 교체.
      // ?region= 쿼리로 list 페이지가 같은 region에 필터된 상태로 열리도록.
      href={`/crew/list?region=${regionCode}#crew-${crew.id}`}
      className="flex items-center gap-3 py-3.5 px-[18px] border-t border-cart-rule first:border-t-0 active:bg-white/[0.02] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[hsl(var(--lime))] focus-visible:-outline-offset-1"
    >
      <div className="w-8 font-mono text-[11px] tracking-[0.05em] text-cart-ink-60 tabular-nums">
        {String(rank).padStart(2, "0")}
      </div>
      {crew.logo_image ? (
        <div className="relative flex-shrink-0 w-9 h-9 rounded-[4px] overflow-hidden border border-cart-rule bg-cart-paper">
          <Image
            src={crew.logo_image}
            alt={crew.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            sizes="36px"
          />
        </div>
      ) : (
        <div className="flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-[4px] bg-cart-paper border border-cart-rule font-display text-[14px] font-semibold text-[hsl(var(--lime))]">
          {crew.name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-cart-ink truncate">{crew.name}</div>
        <div className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate mt-0.5">
          {area}
        </div>
      </div>
    </Link>
  );
}
