"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface PullToRefreshOptions {
  threshold?: number;
  onRefresh?: () => void | Promise<void>;
}

export function usePullToRefresh({ threshold = 80, onRefresh }: PullToRefreshOptions = {}) {
  const router = useRouter();
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      router.refresh();
    }
  }, [onRefresh, router]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger at the top of the page
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY > 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && !pulling.current) {
        pulling.current = true;
        setIsPulling(true);
      }

      if (pulling.current) {
        // Apply resistance (pull distance is dampened)
        const dampened = Math.min(diff * 0.4, threshold * 1.5);
        setPullDistance(dampened);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;

      if (pullDistance >= threshold) {
        await handleRefresh();
      }

      pulling.current = false;
      setIsPulling(false);
      setPullDistance(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, threshold, handleRefresh]);

  return { isPulling, pullDistance, isTriggered: pullDistance >= threshold };
}
