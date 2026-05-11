"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
    };

    // Check initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-0 right-0 z-[9998] px-4 py-2 bg-amber-500/90 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4 text-black" />
        <span className="text-xs font-medium text-black">오프라인 모드 - 일부 기능이 제한됩니다</span>
      </div>
    </div>
  );
}
