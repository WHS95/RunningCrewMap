"use client";

import Link from "next/link";
import { MapPinned, Trophy, Menu, Home } from "lucide-react";
// import { EXTERNAL_LINKS } from "@/lib/constants";
import { useState } from "react";
import { RunningEventList } from "@/components/events/RunningEventList";
// import { MenuList } from "@/components/menu/MenuList";
// import { useState } from "react";
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
        className='fixed bottom-0 left-0 right-0 border-t bg-black z-[9999]'
        style={{ height: LAYOUT.MOBILE_NAV_HEIGHT }} // 높이 조정: LAYOUT.MOBILE_NAV_HEIGHT 값을 변경하거나 직접 px 값 지정
      >
        <div className='flex justify-around items-start h-full'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1",
                "transition-all duration-150",
                "active:bg-gray-900/70 active:scale-[0.95] px-4 py-3 rounded-md" // 패딩 조정: py-2를 py-3 또는 py-4로 변경하여 높이 증가
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5", // 아이콘 크기 조정: w-6 h-6 또는 w-7 h-7로 변경
                  item.isActive ? "text-white" : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-xs", // 텍스트 크기 조정: text-sm 또는 text-base로 변경
                  item.isActive ? "text-white" : "text-gray-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* 대회 일정 시트 */}
      <RunningEventList
        isOpen={isEventListOpen}
        onClose={() => setIsEventListOpen(false)}
      />
    </>
  );
}
