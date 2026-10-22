"use client";

/**
 * DesktopLeaguePanel — DesktopSidePanel 의 거울상. 넓은 데스크톱(lg+, ≥1024px)에서
 * 모바일 프레임 왼쪽 빈 공간에 런하우스 리그 앱 체험판(/league)으로 가는 카드를 둔다.
 *
 * 사이트 안 이동이라 같은 탭 Link 로 연다(LABS 카드처럼 새 탭 · UTM 을 붙이지 않는다).
 * 체험판(/league)과 관리자 · 토큰 수정 · 초대 화면에서는 숨긴다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, ArrowRight } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";

// 카드 안 미니 순위표 — 장식용 예시 값.
const PREVIEW_ROWS = [
  { rank: 1, width: "92%" },
  { rank: 2, width: "78%" },
  { rank: 3, width: "64%", ours: true },
];

export function DesktopLeaguePanel() {
  const pathname = usePathname();
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/crew/edit/") ||
    pathname?.startsWith("/join") ||
    pathname?.startsWith("/league")
  ) {
    return null;
  }

  return (
    <aside
      aria-label='런하우스 리그 앱'
      className='hidden lg:flex fixed top-1/2 -translate-y-1/2 z-20 flex-col gap-3 w-[260px] pointer-events-none'
      style={{
        // 50vw 중앙 - 프레임 절반(215px) - 24px 간격. 오른쪽 패널과 대칭.
        right: "calc(50vw + 215px + 24px)",
      }}
    >
      <div className='pointer-events-auto'>
        <KickerLabel tone='lime' className='tracking-[0.22em] mb-2 px-1'>
          ● RUNHOUSE · LEAGUE
        </KickerLabel>
        <p className='text-[11px] text-cart-ink-60 leading-relaxed px-1 mb-3'>
          크루끼리 시즌 순위를 겨루는 러닝 리그 앱이에요.
        </p>
      </div>

      <Link
        href='/league'
        className='pointer-events-auto group block rounded-[4px] border border-cart-rule bg-cart-paper p-3.5 hover:border-[hsl(var(--lime))]/40 hover:bg-[hsl(var(--lime))]/[0.04] transition-colors duration-base ease-apple'
      >
        <div className='flex items-start gap-3'>
          <div className='w-9 h-9 rounded-[4px] bg-background border border-cart-rule flex items-center justify-center text-[hsl(var(--lime))] flex-shrink-0'>
            <Trophy className='w-4 h-4' strokeWidth={1.8} />
          </div>
          <div className='flex-1 min-w-0'>
            <KickerLabel tone='lime' className='tracking-[0.2em] mb-1'>
              · APP · CREW LEAGUE
            </KickerLabel>
            <h3 className='text-[13px] font-semibold text-cart-ink leading-tight'>
              런하우스 리그
            </h3>
          </div>
          <ArrowRight
            className='w-3.5 h-3.5 text-cart-ink-40 group-hover:text-[hsl(var(--lime))] group-hover:translate-x-0.5 transition-transform duration-base ease-apple flex-shrink-0'
            strokeWidth={2}
          />
        </div>

        <div className='mt-3 flex flex-col gap-1.5' aria-hidden>
          {PREVIEW_ROWS.map((r) => (
            <div key={r.rank} className='flex items-center gap-2'>
              <span className='w-3 font-mono text-[9px] text-cart-ink-40 tabular-nums'>
                {r.rank}
              </span>
              <div className='flex-1 h-[6px] rounded-[2px] bg-background'>
                <div
                  className={
                    r.ours
                      ? "h-full rounded-[2px] bg-[hsl(var(--lime))] transition-[width] duration-slow ease-apple group-hover:!w-[96%]"
                      : "h-full rounded-[2px] bg-cart-ink-40/40"
                  }
                  style={{ width: r.width }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className='text-[11px] text-cart-ink-60 leading-relaxed mt-3'>
          출석부터 크루 순위까지, 스크롤하며 앱이 어떻게 돌아가는지 볼 수 있어요.
        </p>

        <div className='mt-3 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] uppercase font-semibold text-[hsl(var(--lime))]'>
          리그 알아보기 →
        </div>
      </Link>
    </aside>
  );
}
