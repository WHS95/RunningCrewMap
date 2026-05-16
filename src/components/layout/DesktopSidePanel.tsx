"use client";

/**
 * DesktopSidePanel — fixed right-side panel visible only on wide
 * desktops (lg+, ≥1024px). The app's mobile-frame layout leaves
 * generous gutters on desktop; this panel parks promotional links
 * to sibling RunHouse services there so they're discoverable without
 * cluttering the mobile UI.
 *
 * Hidden on admin and token-edit routes — those are full-focus modes.
 */

import { usePathname } from "next/navigation";
import { KickerLabel } from "@/components/design/cartographic";
import { Award, ShoppingBag, ArrowUpRight } from "lucide-react";

interface ServiceLink {
  /** Lucide icon component */
  Icon: typeof Award;
  /** Lime mono kicker */
  kicker: string;
  title: string;
  description: string;
  href: string;
  /** Optional CTA label override */
  ctaLabel?: string;
}

const SERVICES: ServiceLink[] = [
  {
    Icon: Award,
    kicker: "· LABS · CERTIFICATION",
    title: "크루 전용 마라톤 기록증",
    description:
      "완주 기록을 크루 브랜드로 디자인해서 만들어드립니다. 인쇄용 PDF 출력 지원.",
    href: "https://running-crew-certification-maker.vercel.app/",
    ctaLabel: "기록증 만들러 가기",
  },
  {
    Icon: ShoppingBag,
    kicker: "· LABS · CUSTOM",
    title: "커스텀 러닝 제품 제작",
    description:
      "크루 로고가 들어간 모자 · 깃발 · 의류 등을 직접 제작 의뢰하세요.",
    href: "https://runhouse-custom.vercel.app/",
    ctaLabel: "커스텀 주문하기",
  },
];

export function DesktopSidePanel() {
  const pathname = usePathname();
  // Hide on focus-mode routes — admin console and the crew self-edit
  // page should fill the user's attention without external CTAs.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/crew/edit/")
  ) {
    return null;
  }

  return (
    <aside
      aria-label='런하우스 부가 서비스'
      className='hidden lg:flex fixed top-1/2 -translate-y-1/2 z-20 flex-col gap-3 w-[260px] pointer-events-none'
      style={{
        // Pin to viewport right of the centred mobile frame.
        // 50vw centre + 215px (half of 430 frame) + 24px gap.
        left: "calc(50vw + 215px + 24px)",
      }}
    >
      <div className='pointer-events-auto'>
        <KickerLabel tone='lime' className='tracking-[0.22em] mb-2 px-1'>
          ● RUNHOUSE · LABS
        </KickerLabel>
        <p className='text-[11px] text-cart-ink-60 leading-relaxed px-1 mb-3'>
          크루를 위한 부가 서비스 — 새 탭에서 열립니다.
        </p>
      </div>

      <div className='pointer-events-auto flex flex-col gap-2.5'>
        {SERVICES.map((s) => (
          <ServiceCard key={s.href} service={s} />
        ))}
      </div>
    </aside>
  );
}

function ServiceCard({ service }: { service: ServiceLink }) {
  const { Icon, kicker, title, description, href, ctaLabel } = service;
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='group block rounded-[4px] border border-cart-rule bg-cart-paper p-3.5 hover:border-[hsl(var(--lime))]/40 hover:bg-[hsl(var(--lime))]/[0.04] transition-colors'
    >
      <div className='flex items-start gap-3'>
        <div className='w-9 h-9 rounded-[4px] bg-background border border-cart-rule flex items-center justify-center text-[hsl(var(--lime))] flex-shrink-0'>
          <Icon className='w-4 h-4' strokeWidth={1.8} />
        </div>
        <div className='flex-1 min-w-0'>
          <KickerLabel tone='lime' className='tracking-[0.2em] mb-1'>
            {kicker}
          </KickerLabel>
          <h3 className='text-[13px] font-semibold text-cart-ink leading-tight'>
            {title}
          </h3>
        </div>
        <ArrowUpRight
          className='w-3.5 h-3.5 text-cart-ink-40 group-hover:text-[hsl(var(--lime))] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all flex-shrink-0'
          strokeWidth={2}
        />
      </div>

      <p className='text-[11px] text-cart-ink-60 leading-relaxed mt-2.5'>
        {description}
      </p>

      <div className='mt-3 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] uppercase font-semibold text-[hsl(var(--lime))]'>
        {ctaLabel ?? "바로가기"} →
      </div>
    </a>
  );
}
