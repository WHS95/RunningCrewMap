"use client";

import Link from "next/link";
import { UsersRound, Trophy, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
            <UsersRound className='h-5 w-5' />
            <span className='text-xs'>크루</span>
          </Link>
          <Link
            href='/competitions'
            className='flex flex-col items-center justify-center space-y-1'
          >
            <Trophy className='h-5 w-5' />
            <span className='text-xs'>대회</span>
          </Link>
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
