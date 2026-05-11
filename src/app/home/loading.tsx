import { InfoCardSkeleton, CalcCardSkeleton } from "@/components/ui/skeleton-cards";
import { CSS_VARIABLES } from "@/lib/constants";

export default function HomeLoading() {
  return (
    <div
      className="flex flex-col min-h-screen bg-[hsl(220,15%,4%)]"
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING,
      }}
    >
      <section className="pb-2 px-4">
        <div className="w-full h-36 rounded-2xl bg-white/[0.06] shimmer" />
      </section>
      <section className="px-4 mb-5 space-y-2.5">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </section>
      <section className="px-4">
        <div className="w-28 h-6 mb-3 rounded bg-white/[0.08] shimmer" />
        <div className="grid grid-cols-2 gap-3">
          <CalcCardSkeleton />
          <CalcCardSkeleton />
          <CalcCardSkeleton />
          <CalcCardSkeleton />
        </div>
      </section>
    </div>
  );
}
