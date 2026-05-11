"use client";

import Link from "next/link";
import { MapPinned, Trophy, Menu, Home } from "lucide-react";
import { useState } from "react";
import { RunningEventList } from "@/components/events/RunningEventList";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/constants";

export function MobileNav() {
  const [isEventListOpen, setIsEventListOpen] = useState(false);
  const pathname = usePathname();

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
        className='fixed bottom-0 left-0 right-0 z-[9999] border-t border-white/[0.06]'
        style={{
          height: `calc(${LAYOUT.MOBILE_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className='absolute inset-0 bg-black/85 backdrop-blur-2xl' />
        <div className='relative flex justify-around items-start h-full pt-2'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "transition-all duration-200 ease-out",
                "px-5 py-2 rounded-xl",
                "active:scale-[0.92]",
              )}
            >
              <div className='relative'>
                <item.icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors duration-200",
                    item.isActive ? "text-[hsl(72,100%,50%)]" : "text-gray-500"
                  )}
                  strokeWidth={item.isActive ? 2.2 : 1.8}
                />
                {item.isActive && (
                  <div className='absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[hsl(72,100%,50%)] nav-active-dot' />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-tight transition-colors duration-200",
                  item.isActive ? "text-[hsl(72,100%,50%)]" : "text-gray-500"
                )}
              >
                {item.label}
              </span>
            </Link>
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
