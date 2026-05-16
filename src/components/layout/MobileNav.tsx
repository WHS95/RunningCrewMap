"use client";

import { MapPinned, Trophy, Menu, Home } from "lucide-react";
import { useState } from "react";
import { RunningEventList } from "@/components/events/RunningEventList";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/constants";
import { usePageTransition } from "@/lib/hooks/usePageTransition";
import { useHaptic } from "@/lib/hooks/useHaptic";

export function MobileNav() {
  const [isEventListOpen, setIsEventListOpen] = useState(false);
  const pathname = usePathname();
  const { navigate } = usePageTransition();
  const { trigger: haptic } = useHaptic();

  // Admin and token-edit routes have their own navigation surface — the
  // user-facing bottom nav (홈/크루/대회일정/메뉴) doesn't belong there.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/crew/edit/")
  ) {
    return null;
  }

  const navItems = [
    {
      href: "/home",
      icon: Home,
      label: "홈",
      isActive: pathname === "/home",
    },
    {
      href: "/",
      icon: MapPinned,
      label: "크루",
      isActive: pathname === "/",
    },
    {
      href: "/events",
      icon: Trophy,
      label: "대회일정",
      isActive: pathname === "/events",
    },
    {
      href: "/menu",
      icon: Menu,
      label: "메뉴",
      isActive: pathname === "/menu",
    },
  ];

  return (
    <>
      <nav
        className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[9999] border-t border-cart-rule'
        style={{
          height: `calc(${LAYOUT.MOBILE_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className='absolute inset-0 bg-background/85 backdrop-blur-2xl' />
        <div className='relative flex justify-around items-start h-full pt-2'>
          {navItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                if (!item.isActive) {
                  haptic("light");
                  navigate(item.href);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "transition-all duration-200 ease-out",
                "px-5 py-2 rounded-[4px]",
                "active:scale-[0.92]",
              )}
            >
              <div className='relative'>
                <item.icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    item.isActive ? "text-[hsl(var(--lime))]" : "text-cart-ink-40"
                  )}
                  strokeWidth={item.isActive ? 2 : 1.6}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-[-0.01em] transition-colors duration-200",
                  item.isActive
                    ? "text-[hsl(var(--lime))] font-semibold"
                    : "text-cart-ink-40 font-medium"
                )}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <RunningEventList
        isOpen={isEventListOpen}
        onClose={() => setIsEventListOpen(false)}
      />
    </>
  );
}
