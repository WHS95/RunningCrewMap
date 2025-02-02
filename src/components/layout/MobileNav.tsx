"use client";

import Link from "next/link";
import { MapPinned, Trophy, Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { EXTERNAL_LINKS } from "@/lib/constants";
// import { MenuList } from "@/components/menu/MenuList";
// import { useState } from "react";

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  // const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <a
            href={EXTERNAL_LINKS.RUNNING_EVENTS}
            target='_blank'
            rel='noopener noreferrer'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <Trophy className='w-5 h-5' />
            <span className='text-xs'>대회일정</span>
          </a>
          <Link
            href='/menu'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <Menu className='w-5 h-5' />
            <span className='text-xs'>메뉴</span>
          </Link>
        </div>
      </nav>

      {/* 크루 목록 시트 */}
      <Sheet>
        <SheetContent side='bottom' className='h-[80vh]'>
          {children}
        </SheetContent>
      </Sheet>
    </>
  );
}
