import Link from "next/link";
import type { Metadata } from "next";
import {
  KickerLabel,
  CoordPair,
} from "@/components/design/cartographic";
import { CSS_VARIABLES } from "@/lib/constants";
import { Home, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "404 · 페이지를 찾을 수 없습니다 | 런하우스",
  robots: { index: false, follow: false },
};

/**
 * Cartographic 404.
 *
 * Visual idea: the user is "off-map". A faint dotted grid backs a tiny
 * teardrop pin that's drifted out of bounds, mirroring the Naver map
 * pin used everywhere else in the app — keeps the brand grammar even
 * on error states.
 */
export default function NotFound() {
  return (
    <main
      className='flex flex-col items-center justify-center min-h-screen bg-background px-6 relative overflow-hidden'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING,
      }}
    >
      {/* Cartographic backdrop: faint dotted grid + crosshair lines */}
      <div
        aria-hidden
        className='absolute inset-0 pointer-events-none opacity-30'
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--cart-ink-40)) 1px, transparent 1.2px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div
        aria-hidden
        className='absolute inset-x-0 top-1/2 h-px bg-cart-rule pointer-events-none'
      />
      <div
        aria-hidden
        className='absolute inset-y-0 left-1/2 w-px bg-cart-rule pointer-events-none'
      />

      {/* Content card */}
      <div className='relative z-10 w-full max-w-sm bg-cart-paper/80 backdrop-blur-md border border-cart-rule rounded-[4px] p-6 text-center'>
        {/* Top kicker */}
        <KickerLabel tone='lime' className='mb-2 tracking-[0.25em]'>
          ● ERROR · ROUTE NOT FOUND
        </KickerLabel>

        {/* Giant 404 — display font, slightly negative track */}
        <div
          className='font-display font-bold text-cart-ink leading-[0.85] tracking-[-0.06em]'
          style={{ fontSize: 88 }}
        >
          404
        </div>

        {/* Drifting pin illustration */}
        <div className='my-5 flex items-center justify-center gap-3 text-cart-ink-40'>
          <span className='font-mono text-[10px] tracking-[0.22em]'>· OFF-MAP ·</span>
          <MapPin
            className='w-4 h-4 text-[hsl(var(--lime))] -rotate-12'
            strokeWidth={1.6}
          />
          <span className='font-mono text-[10px] tracking-[0.22em]'>· OFF-MAP ·</span>
        </div>

        <h1 className='font-display text-[22px] font-bold tracking-[-0.025em] text-cart-ink mb-1.5'>
          지도 밖입니다
        </h1>
        <p className='text-[12px] text-cart-ink-60 leading-relaxed'>
          요청하신 경로를 찾을 수 없습니다.
          <br />
          URL이 변경되었거나 페이지가 사라졌을 수 있어요.
        </p>

        {/* Fake coord pair — winks at the cartographic theme */}
        <div className='mt-4 flex justify-center'>
          <CoordPair lat='??.????' lng='???.????' />
        </div>

        {/* CTAs */}
        <div className='mt-6 flex flex-col gap-2'>
          <Link
            href='/'
            className='w-full py-3 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[14px] font-bold tracking-[-0.01em] active:scale-[0.98] transition-transform hover:bg-[hsl(var(--lime))]/90 flex items-center justify-center gap-2'
          >
            <MapPin className='w-4 h-4' strokeWidth={2} />
            <span>지도로 돌아가기</span>
            <span className='font-mono text-[10px] font-semibold tracking-[0.12em]'>
              MAP →
            </span>
          </Link>
          <Link
            href='/home'
            className='w-full py-2.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2'
          >
            <Home className='w-3.5 h-3.5' />
            <span>홈 화면</span>
          </Link>
        </div>
      </div>

      {/* Bottom system line — gives the page that "telemetry" feel */}
      <div className='relative z-10 mt-6'>
        <KickerLabel tone='muted' className='tracking-[0.22em]'>
          · STATUS · 404 · LOCATION-UNKNOWN
        </KickerLabel>
      </div>
    </main>
  );
}
