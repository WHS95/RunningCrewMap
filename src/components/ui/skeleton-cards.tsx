export function InfoCardSkeleton() {
  return (
    <div className="flex items-center justify-between w-full p-4 bg-black/90 rounded-2xl border border-white/[0.06]">
      <div className="flex gap-3.5 items-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.08] shimmer" />
        <div>
          <div className="w-24 h-4 rounded bg-white/[0.08] shimmer" />
          <div className="w-40 h-3 mt-1.5 rounded bg-white/[0.06] shimmer" />
        </div>
      </div>
      <div className="w-5 h-5 rounded bg-white/[0.06] shimmer" />
    </div>
  );
}

export function CalcCardSkeleton() {
  return (
    <div className="relative overflow-hidden p-4 rounded-2xl h-[120px] bg-white/[0.06] shimmer" />
  );
}

export function EventItemSkeleton() {
  return (
    <div className="p-4">
      <div className="w-3/4 h-5 rounded bg-white/[0.08] shimmer" />
      <div className="mt-2.5 space-y-1.5">
        <div className="w-1/3 h-4 rounded bg-white/[0.06] shimmer" />
        <div className="w-1/2 h-4 rounded bg-white/[0.06] shimmer" />
      </div>
    </div>
  );
}

export function CrewItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
      <div className="w-12 h-12 rounded-full bg-white/[0.08] shimmer" />
      <div className="flex-1">
        <div className="w-24 h-4 rounded bg-white/[0.08] shimmer" />
        <div className="w-48 h-3 mt-1.5 rounded bg-white/[0.06] shimmer" />
      </div>
    </div>
  );
}
