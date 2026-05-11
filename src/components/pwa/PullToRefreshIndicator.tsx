"use client";

import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { RefreshCw } from "lucide-react";

export function PullToRefreshIndicator() {
  const { isPulling, pullDistance, isTriggered } = usePullToRefresh();

  if (!isPulling) return null;

  return (
    <div
      className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[9997] transition-opacity duration-200"
      style={{
        opacity: Math.min(pullDistance / 60, 1),
        transform: `translateX(-50%) translateY(${pullDistance * 0.3}px)`,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-[hsl(220,14%,12%)] border border-white/[0.08] flex items-center justify-center shadow-lg">
        <RefreshCw
          className={`w-5 h-5 text-[hsl(72,100%,50%)] transition-transform duration-200 ${
            isTriggered ? "animate-spin" : ""
          }`}
          style={{ transform: `rotate(${pullDistance * 3}deg)` }}
        />
      </div>
    </div>
  );
}
