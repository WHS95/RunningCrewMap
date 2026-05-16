"use client";

import { CSS_VARIABLES } from "@/lib/constants";
import { usePageTransition } from "@/lib/hooks/usePageTransition";
import { NoticeBanner } from "@/components/home/NoticeBanner";
import {
  Footprints,
  Medal,
  BookOpen,
  Timer,
  Clock,
  BarChart3,
  HeartPulse,
  ChevronRight,
} from "lucide-react";
import {
  KickerLabel,
  SectionTitle,
} from "@/components/design/cartographic";

// Fallback banners — used only if the DB has no active rows (e.g. before
// the migration is applied). Once /admin/events has entries, those win.
const FALLBACK_BANNERS = [
  {
    id: 1,
    link: "/notice/event/3",
    imageUrl: "/runhousecapThumnail.png",
    title: "러닝 모자 제작 오픈",
    description: "등록 크루 한정 특가 - 러닝 최적화 모자",
    variant: "cap" as const,
    code: "0312",
    cta: "RUNHOUSE →",
  },
  {
    id: 2,
    link: "/notice/event/1",
    imageUrl: "/event5.webp",
    title: "크루 깃발 무료 제작",
    description: "보아델와 런하우스 협업 프로모션",
    variant: "flag" as const,
    code: "0420",
    cta: "신청하기 →",
  },
];

interface InfoCardProps {
  icon: "running" | "marathon" | "mbti";
  title: string;
  en: string;
  meta: string;
  count: string | number;
  href: string;
  index: number;
}

const InfoCard = ({ icon, title, en, meta, count, href, index }: InfoCardProps) => {
  const { navigate } = usePageTransition();

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3.5 bg-cart-paper border border-cart-rule rounded-[4px] cursor-pointer card-press animate-fade-in-up stagger-${index + 1}`}
      style={{ opacity: 0 }}
      onClick={() => navigate(href)}
    >
      <div className="flex justify-center items-center w-[42px] h-[42px] rounded-[4px] bg-background border border-cart-rule flex-shrink-0">
        {icon === "running" && <Footprints size={18} strokeWidth={1.6} className="text-[hsl(var(--lime))]" />}
        {icon === "marathon" && <Medal size={18} strokeWidth={1.6} className="text-[hsl(var(--lime))]" />}
        {icon === "mbti" && <BookOpen size={18} strokeWidth={1.6} className="text-[hsl(var(--lime))]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-cart-ink">{title}</span>
          <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-[hsl(var(--lime))]">
            · {en}
          </span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 mt-1">
          {meta}
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-0.5">
        <div className="font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink leading-none">
          {count}
        </div>
        <ChevronRight size={12} className="text-cart-ink-60" />
      </div>
    </div>
  );
};

interface CalcMenuCardProps {
  icon: "pace" | "heart-rate" | "split-time" | "prediction";
  title: string;
  en: string;
  unit: string;
  ord: string;
  href: string;
  accent?: boolean;
  index: number;
}

const CalcMenuCard = ({
  icon,
  title,
  en,
  unit,
  ord,
  href,
  accent = false,
  index,
}: CalcMenuCardProps) => {
  const { navigate } = usePageTransition();

  const IconEl =
    icon === "pace"
      ? Clock
      : icon === "heart-rate"
      ? HeartPulse
      : icon === "split-time"
      ? Timer
      : BarChart3;

  // Pressable card: paper rest state → lime on hover/focus, scale-down on press.
  // Heart Rate (accent=true) starts on lime and only darkens slightly on press.
  return (
    <div
      onClick={() => navigate(href)}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(href);
        }
      }}
      className={`group relative aspect-[1.25/1] rounded-[4px] p-3 border flex flex-col justify-between cursor-pointer animate-fade-in-up stagger-${index + 1}
        transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out
        hover:-translate-y-0.5
        active:translate-y-0 active:scale-[0.96] active:duration-75 active:shadow-inner
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lime))]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${
          accent
            ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))] " +
              "hover:shadow-[0_8px_22px_-6px_hsl(var(--lime)/0.55)] " +
              "active:bg-[hsl(var(--lime))]/85 active:border-[hsl(var(--lime))]/85"
            : "bg-cart-paper text-cart-ink border-cart-rule " +
              "hover:bg-[hsl(var(--lime))] hover:text-[hsl(var(--lime-foreground))] hover:border-[hsl(var(--lime))] " +
              "hover:shadow-[0_8px_22px_-6px_hsl(var(--lime)/0.45)] " +
              "active:bg-[hsl(var(--lime))]/90 active:text-[hsl(var(--lime-foreground))] active:border-[hsl(var(--lime))]"
        }`}
      style={{ opacity: 0 }}
    >
      <div className="flex justify-between items-start">
        <span
          className={`font-mono text-[9px] font-bold tracking-[0.18em] transition-colors duration-200 ${
            accent
              ? "opacity-80"
              : "text-cart-ink-60 group-hover:text-[hsl(var(--lime-foreground))]/75"
          }`}
        >
          {ord}
        </span>
        <IconEl
          size={16}
          strokeWidth={1.6}
          className={`transition-colors duration-200 ${
            accent
              ? "text-[hsl(var(--lime-foreground))]"
              : "text-[hsl(var(--lime))] group-hover:text-[hsl(var(--lime-foreground))]"
          }`}
        />
      </div>
      <div>
        <div className="text-[15px] font-bold leading-[1.1]">{title}</div>
        <div
          className={`font-mono text-[8px] font-semibold tracking-[0.18em] mt-1 transition-colors duration-200 ${
            accent
              ? "opacity-75"
              : "text-cart-ink-60 group-hover:text-[hsl(var(--lime-foreground))]/75"
          }`}
        >
          {en} · {unit}
        </div>
      </div>
    </div>
  );
};

interface DynamicBanner {
  id: number;
  link: string;
  imageUrl: string;
  title?: string;
  description?: string;
  variant?: "cap" | "flag";
  code?: string;
  cta?: string;
  bgColor?: string;
}

interface HomeContentProps {
  registeredCrews: number;
  marathonsThisMonth: number;
  banners?: DynamicBanner[];
}

export function HomeContent({
  registeredCrews,
  marathonsThisMonth,
  banners,
}: HomeContentProps) {
  const items =
    banners && banners.length > 0 ? banners : FALLBACK_BANNERS;
  return (
    <div
      className="flex flex-col min-h-screen bg-background"
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING,
      }}
    >
      {/* Notice banner */}
      <section className="pb-2">
        <NoticeBanner items={items} />
      </section>

      {/* Info cards */}
      <section className="px-[18px] mb-6 space-y-2">
        <InfoCard
          icon="running"
          title="러닝 크루"
          en="CREWS"
          meta={`${registeredCrews}개의 크루와 함께 합니다`}
          count={registeredCrews}
          href="/"
          index={0}
        />
        <InfoCard
          icon="marathon"
          title="마라톤 대회"
          en="RACES"
          meta={`이번달 ${marathonsThisMonth}개의 대회가 있습니다`}
          count={marathonsThisMonth}
          href="/events"
          index={1}
        />
        <InfoCard
          icon="mbti"
          title="러닝 MBTI 테스트"
          en="R-MBTI"
          meta="나의 러닝 스타일을 알아보세요"
          count="12"
          href="/mbti"
          index={2}
        />
      </section>

      {/* Calculators */}
      <section className="px-[18px]">
        <SectionTitle
          kicker="CALCULATORS"
          title="러닝 계산기"
          meta="04 TOOLS"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <CalcMenuCard
            icon="pace"
            title="페이스"
            en="PACE"
            unit="min/km"
            ord="01"
            href="/calculator/pace"
            index={1}
          />
          <CalcMenuCard
            icon="heart-rate"
            title="심박수"
            en="HEART RATE"
            unit="bpm"
            ord="02"
            href="/calculator/heart-rate"
            accent
            index={2}
          />
          <CalcMenuCard
            icon="split-time"
            title="스플릿 타임"
            en="SPLIT"
            unit="sec"
            ord="03"
            href="/calculator/split-time"
            index={3}
          />
          <CalcMenuCard
            icon="prediction"
            title="완주시간 예측"
            en="FORECAST"
            unit="hh:mm"
            ord="04"
            href="/calculator/prediction"
            index={4}
          />
        </div>
        <KickerLabel tone="muted" className="text-center mt-4 tracking-[0.2em]">
          · 04 TOOLS · MEASURED ·
        </KickerLabel>
      </section>
    </div>
  );
}
