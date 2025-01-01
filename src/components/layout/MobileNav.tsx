"use client";

import Link from "next/link";
import { MapPinned, Trophy, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { EXTERNAL_LINKS } from "@/lib/constants";

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  return (
    <>
      <nav className='md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-[9999]'>
        <div className='flex items-center justify-around h-16'>
          <Link
            href='/'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <MapPinned className='h-5 w-5' />
            <span className='text-xs'>크루</span>
          </Link>
          <a
            href={EXTERNAL_LINKS.RUNNING_EVENTS}
            target='_blank'
            rel='noopener noreferrer'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <Trophy className='h-5 w-5' />
            <span className='text-xs'>대회일정</span>
          </a>
          <Sheet>
            <SheetTrigger className='flex flex-col items-center justify-center space-y-1'>
              <Menu className='h-5 w-5' />
              <span className='text-xs'>메뉴</span>
            </SheetTrigger>
            <SheetContent side='bottom' className='h-[80vh] z-[9998]'>
              {children}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
