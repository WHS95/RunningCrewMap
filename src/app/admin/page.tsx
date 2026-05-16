import { Metadata } from "next";
import Link from "next/link";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";
import { Users, ChevronRight, LogOut, CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "관리자 대시보드 | 런하우스",
  description: "관리자 대시보드 페이지",
};

interface AdminMenuItemProps {
  title: string;
  description: string;
  link: string;
  enLabel: string;
  count?: string;
  icon?: React.ReactNode;
}

export default function AdminDashboardPage() {
  return (
    <main className='min-h-screen bg-background pb-16'>
      <div className='flex items-center justify-between px-[22px] pt-6'>
        <KickerLabel tone='lime' className='tracking-[0.22em]'>
          ● ADMIN · CONSOLE
        </KickerLabel>
        <form action='/api/admin/logout' method='POST'>
          <button
            type='submit'
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink-60 hover:text-cart-ink font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-all'
          >
            <LogOut className='w-3 h-3' />
            LOGOUT
          </button>
        </form>
      </div>

      <CartographicHeader
        kicker='2026 SEASON · CONTROLS'
        title='관리자 대시보드'
      />

      <section className='px-[22px] mt-2'>
        <KickerLabel tone='muted' className='py-2 tracking-[0.22em]'>
          MENU · 메뉴
        </KickerLabel>

        <div>
          <AdminMenuItem
            title='크루 관리'
            description='등록된 크루 검토, 정보 수정, 공개 토글'
            link='/admin/crew'
            enLabel='CREWS'
            count='—'
            icon={<Users className='w-4 h-4' />}
          />
          <AdminMenuItem
            title='이벤트 관리'
            description='/home 상단 promo 배너 추가 · 수정 · 노출 토글'
            link='/admin/events'
            enLabel='EVENTS'
            count='—'
            icon={<CalendarDays className='w-4 h-4' />}
          />
        </div>
      </section>
    </main>
  );
}

function AdminMenuItem({
  title,
  description,
  link,
  enLabel,
  count,
  icon,
}: AdminMenuItemProps) {
  return (
    <Link
      href={link}
      className='flex items-center gap-3 py-4 border-t border-cart-rule cursor-pointer active:bg-white/[0.02] transition-colors'
    >
      <div className='w-10 h-10 rounded-[4px] bg-cart-paper border border-cart-rule flex items-center justify-center text-[hsl(var(--lime))] flex-shrink-0'>
        {icon}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-baseline gap-2'>
          <span className='text-[15px] font-semibold text-cart-ink'>
            {title}
          </span>
          <span className='font-mono text-[9px] font-semibold tracking-[0.18em] text-[hsl(var(--lime))]'>
            · {enLabel}
          </span>
        </div>
        <div className='font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 mt-1'>
          {description}
        </div>
      </div>
      {count && (
        <div className='font-display text-[16px] font-bold tracking-[-0.02em] text-cart-ink'>
          {count}
        </div>
      )}
      <ChevronRight className='w-4 h-4 text-cart-ink-40' />
    </Link>
  );
}
