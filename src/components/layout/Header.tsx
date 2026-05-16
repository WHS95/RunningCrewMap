"use client";

import { LAYOUT } from "@/lib/constants";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  // Admin and self-service edit routes get their own chrome — the
  // user-facing wordmark header doesn't belong there.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/crew/edit/")
  ) {
    return null;
  }

  return (
    <nav
      className='fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 border-b border-cart-rule'
      style={{
        height: `calc(${LAYOUT.HEADER_HEIGHT} + env(safe-area-inset-top, 0px))`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className='absolute inset-0 bg-background/85 backdrop-blur-xl' />
      <div className='relative flex items-center justify-between h-full px-5'>
        <div className='w-6 h-6' />
        <a href='/home' className='flex items-center gap-2.5'>
          <span className='text-[15px] font-bold tracking-[0.2em] text-cart-ink uppercase'>
            RUN HOUSE
          </span>
          <span className='px-[6px] py-[1px] text-[9px] font-extrabold tracking-[0.15em] uppercase bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px]'>
            CLUB
          </span>
        </a>
        <div className='w-6 h-6' />
      </div>
    </nav>
  );
}
