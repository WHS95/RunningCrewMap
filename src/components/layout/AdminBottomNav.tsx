"use client";

/**
 * AdminBottomNav — admin-only navigation strip.
 *
 * Replaces the user-facing MobileNav on /admin/* routes. Same cartographic
 * tokens as the user nav (lime active state, mono labels) so the visual
 * grammar stays consistent. Logout is a form POST so the auth cookie can
 * be cleared server-side.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/constants";
import { LayoutDashboard, Users, CalendarDays, LogOut } from "lucide-react";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  // True if this nav item should be considered "active" for the given path.
  matches: (path: string | null) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "대시보드",
    matches: (p) => p === "/admin",
  },
  {
    href: "/admin/crew",
    icon: Users,
    label: "크루",
    matches: (p) => !!p && p.startsWith("/admin/crew"),
  },
  {
    href: "/admin/events",
    icon: CalendarDays,
    label: "이벤트",
    matches: (p) => !!p && p.startsWith("/admin/events"),
  },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  // Don't render on the login page — there's no session to navigate with.
  if (pathname?.startsWith("/admin/login")) return null;

  return (
    <nav
      className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[9999] border-t border-cart-rule'
      style={{
        height: `calc(${LAYOUT.MOBILE_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className='absolute inset-0 bg-background/85 backdrop-blur-2xl' />
      <div className='relative flex justify-around items-start h-full pt-2'>
        {NAV_ITEMS.map((item) => {
          const active = item.matches(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "transition-all duration-200 ease-out",
                "px-4 py-2 rounded-[4px]",
                "active:scale-[0.92]"
              )}
            >
              <Icon
                className={cn(
                  "w-[22px] h-[22px] transition-all duration-200",
                  active
                    ? "text-[hsl(var(--lime))]"
                    : "text-cart-ink-40"
                )}
                strokeWidth={active ? 2 : 1.6}
              />
              <span
                className={cn(
                  "font-mono text-[9px] tracking-[0.15em] uppercase transition-colors duration-200",
                  active
                    ? "text-[hsl(var(--lime))] font-bold"
                    : "text-cart-ink-40 font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Logout — POST form clears the auth cookie via /api/admin/logout */}
        <form action='/api/admin/logout' method='POST' className='flex'>
          <button
            type='submit'
            className={cn(
              "flex flex-col items-center justify-center gap-1",
              "transition-all duration-200 ease-out",
              "px-4 py-2 rounded-[4px]",
              "active:scale-[0.92] text-cart-ink-40 hover:text-red-400"
            )}
            aria-label='로그아웃'
          >
            <LogOut className='w-[22px] h-[22px]' strokeWidth={1.6} />
            <span className='font-mono text-[9px] tracking-[0.15em] uppercase font-semibold'>
              로그아웃
            </span>
          </button>
        </form>
      </div>
    </nav>
  );
}
