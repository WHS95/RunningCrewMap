"use client";

import Link from "next/link";
import { MapPinned, Trophy, Menu } from "lucide-react";
// import { EXTERNAL_LINKS } from "@/lib/constants";
import { useState } from "react";
import { RunningEventList } from "@/components/events/RunningEventList";
// import { MenuList } from "@/components/menu/MenuList";
// import { useState } from "react";

export function MobileNav({}) {
  const [isEventListOpen, setIsEventListOpen] = useState(false);

  return (
    <>
      <nav className='md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-[9999]'>
        <div className='flex items-center justify-around h-16'>
          <Link
            href='/'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <MapPinned className='w-5 h-5' />
            <span className='text-xs'>크루</span>
          </Link>
          <Link
            href='/events'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <Trophy className='w-5 h-5' />
            <span className='text-xs'>대회일정</span>
          </Link>
          <Link
            href='/menu'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <Menu className='w-5 h-5' />
            <span className='text-xs'>메뉴</span>
          </Link>
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
