import { EventItemSkeleton } from "@/components/ui/skeleton-cards";
import { CSS_VARIABLES, LAYOUT } from "@/lib/constants";

export default function EventsLoading() {
  return (
    <div
      className="flex flex-col min-h-screen bg-[hsl(220,15%,4%)]"
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING,
      }}
    >
      <div className="sticky z-20 border-b border-white/[0.06]" style={{ top: LAYOUT.HEADER_HEIGHT }}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
        <div className="relative flex gap-1.5 p-3 overflow-x-auto scrollbar-hide">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-14 h-8 rounded-full bg-white/[0.06] shimmer flex-shrink-0" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
