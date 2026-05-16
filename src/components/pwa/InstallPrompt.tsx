"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 30 seconds of usage
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 z-[9998] animate-fade-in-up">
      <div className="flex items-center gap-3 p-4 rounded-[4px] bg-[hsl(220,14%,9%)] border border-white/[0.08] shadow-2xl">
        <div className="flex-shrink-0 w-10 h-10 rounded-[4px] bg-[hsl(72,100%,50%)] flex items-center justify-center">
          <Download className="w-5 h-5 text-cart-ink" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">앱으로 설치하기</p>
          <p className="text-xs text-cart-ink-40 truncate">홈 화면에 추가하면 더 빠르게!</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 text-xs font-bold rounded-[4px] bg-[hsl(72,100%,50%)] text-cart-ink active:scale-95 transition-transform"
        >
          설치
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-[4px] hover:bg-cart-paper/[0.06] transition-colors"
        >
          <X className="w-4 h-4 text-cart-ink-60" />
        </button>
      </div>
    </div>
  );
}
