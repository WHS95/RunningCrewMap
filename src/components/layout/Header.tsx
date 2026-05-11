"use client";

import { LAYOUT } from "@/lib/constants";

export function Header() {
  return (
    <nav
      className='fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]'
      style={{
        height: `calc(${LAYOUT.HEADER_HEIGHT} + env(safe-area-inset-top, 0px))`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className='absolute inset-0 bg-black/80 backdrop-blur-xl' />
      <div className='relative flex items-center justify-between h-full px-5'>
        <div className='w-6 h-6' />
        <a href='/home' className='flex items-center gap-2'>
          <span className='text-[15px] font-display font-bold tracking-[0.2em] text-white uppercase'>
            Run House
          </span>
          <span className='px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-[hsl(72,100%,50%)] text-black rounded'>
            Club
          </span>
        </a>
        <div className='w-6 h-6' />
      </div>
    </nav>
  );
}
