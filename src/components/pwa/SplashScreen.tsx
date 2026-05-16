"use client";

import { useState, useEffect } from "react";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if this is a PWA standalone launch
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // Only show splash on standalone PWA launches
    if (!isStandalone) {
      setIsVisible(false);
      return;
    }

    // Check if already shown in this session
    const shown = sessionStorage.getItem("splash-shown");
    if (shown) {
      setIsVisible(false);
      return;
    }

    sessionStorage.setItem("splash-shown", "true");

    // Start fade-out after 1.5 seconds
    const timer = setTimeout(() => {
      setIsAnimating(true);
      // Remove from DOM after animation
      setTimeout(() => setIsVisible(false), 400);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0a0b0f] transition-opacity duration-400 ${
        isAnimating ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-bold tracking-[0.2em] text-white uppercase" style={{ fontFamily: 'var(--font-outfit)' }}>
          Run House
        </span>
        <span className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase bg-[hsl(72,100%,50%)] text-cart-ink rounded">
          Club
        </span>
      </div>

      {/* Tagline */}
      <p className="text-sm text-cart-ink-60 mb-8">전국 러닝크루 지도</p>

      {/* Loading indicator */}
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(72,100%,50%)] animate-pulse" />
        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(72,100%,50%)] animate-pulse animation-delay-300" />
        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(72,100%,50%)] animate-pulse animation-delay-600" />
      </div>
    </div>
  );
}
