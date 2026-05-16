"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BannerItem {
  id: number;
  link: string;
  imageUrl: string;
  bgColor?: string;
  title?: string;
  description?: string;
  /**
   * Optional design variant.
   * - "cap":    Cartographic Dark lime card with cap SVG silhouette (e.g. 러닝 모자 제작 오픈)
   * - "flag":   Cartographic Dark paper card with flag silhouette (e.g. 크루 깃발 무료 제작)
   * - undefined: legacy image-only banner
   */
  variant?: "cap" | "flag";
  /** Optional small mono code shown in the kicker (e.g. "0312") */
  code?: string;
  /** CTA hint text (e.g. "RUNHOUSE →") */
  cta?: string;
}

interface NoticeBannerProps {
  items: BannerItem[];
  autoSlideInterval?: number;
}

// ── Cartographic banner card — lime bg with cap SVG (matches DarkHome prototype) ─
function CapBannerCard({
  item,
  onClick,
}: {
  item: BannerItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className='w-full h-full bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] border border-[hsl(var(--lime))] flex items-center cursor-pointer active:scale-[0.99] transition-transform relative overflow-hidden'
    >
      {/* Left text block */}
      <div className='flex-1 px-4 py-4 relative'>
        <div className='font-mono text-[9px] tracking-[0.22em] font-bold leading-none'>
          · LIMITED {item.code ? `· ${item.code}` : ""}
        </div>
        <div className='font-display text-[22px] font-extrabold tracking-[-0.02em] leading-[1.05] mt-1.5'>
          {item.title ? (
            // Split first space → break into two lines visually like the prototype
            item.title.split(" ").length > 1 ? (
              <>
                {item.title.split(" ")[0]}
                <br />
                {item.title.split(" ").slice(1).join(" ")}
              </>
            ) : (
              item.title
            )
          ) : (
            <>
              러닝 모자
              <br />
              제작 오픈
            </>
          )}
        </div>
        <div className='inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 bg-[hsl(var(--lime-foreground))] text-[hsl(var(--lime))] rounded-[2px] font-mono text-[9px] font-bold tracking-[0.18em]'>
          {item.cta || "RUNHOUSE →"}
        </div>
      </div>

      {/* Right cap silhouette */}
      <div className='relative w-[130px] h-full flex items-center justify-center pointer-events-none flex-shrink-0'>
        <svg viewBox='0 0 140 100' width='130' height='96' aria-hidden>
          <ellipse cx='70' cy='72' rx='55' ry='10' fill='hsl(var(--lime-foreground))' opacity='0.18' />
          <path
            d='M30 60 Q 30 30, 80 30 Q 110 30, 116 50 L 134 56 Q 138 60, 132 64 L 28 64 Q 24 60, 30 60 Z'
            fill='hsl(var(--lime-foreground))'
          />
          <path
            d='M30 60 Q 30 38, 70 35'
            fill='none'
            stroke='hsl(var(--lime))'
            strokeWidth='1.5'
            opacity='0.3'
          />
        </svg>
      </div>
    </div>
  );
}

// ── Cartographic flag/promo card — paper surface w/ lime accent ─
function FlagBannerCard({
  item,
  onClick,
}: {
  item: BannerItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className='w-full h-full bg-cart-paper text-cart-ink rounded-[4px] border border-cart-rule flex items-center cursor-pointer active:scale-[0.99] transition-transform relative overflow-hidden'
    >
      <div className='flex-1 px-4 py-4'>
        <div className='font-mono text-[9px] tracking-[0.22em] font-bold text-[hsl(var(--lime))] leading-none'>
          · 콜라보 {item.code ? `· ${item.code}` : ""}
        </div>
        <div className='font-display text-[22px] font-extrabold tracking-[-0.02em] leading-[1.05] mt-1.5 text-cart-ink'>
          {item.title ? (
            item.title.split(" ").length > 1 ? (
              <>
                {item.title.split(" ")[0]}
                <br />
                {item.title.split(" ").slice(1).join(" ")}
              </>
            ) : (
              item.title
            )
          ) : (
            <>
              크루 깃발
              <br />
              무료 제작
            </>
          )}
        </div>
        <div className='inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[2px] font-mono text-[9px] font-bold tracking-[0.18em]'>
          {item.cta || "신청하기 →"}
        </div>
      </div>

      {/* Flag silhouette */}
      <div className='relative w-[120px] h-full flex items-center justify-center pointer-events-none flex-shrink-0'>
        <svg viewBox='0 0 120 100' width='110' height='90' aria-hidden>
          {/* Pole */}
          <rect x='22' y='10' width='3' height='80' fill='hsl(var(--cart-ink))' opacity='0.55' />
          {/* Flag */}
          <path
            d='M25 14 L 100 14 L 84 30 L 100 46 L 25 46 Z'
            fill='hsl(var(--lime))'
            stroke='hsl(var(--cart-ink))'
            strokeWidth='1'
            opacity='0.95'
          />
          {/* base shadow */}
          <ellipse cx='25' cy='92' rx='18' ry='3' fill='hsl(var(--cart-ink))' opacity='0.15' />
        </svg>
      </div>
    </div>
  );
}

export const NoticeBanner = memo(
  ({ items, autoSlideInterval = 5000 }: NoticeBannerProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    const goToNext = useCallback(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === items.length - 1 ? 0 : prevIndex + 1
      );
    }, [items.length]);

    const goToPrev = useCallback(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? items.length - 1 : prevIndex - 1
      );
    }, [items.length]);

    const goToSlide = useCallback((index: number) => {
      setCurrentIndex(index);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    }, []);

    const handleTouchEnd = useCallback(() => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      if (distance > 50) goToNext();
      if (distance < -50) goToPrev();
      setTouchEnd(null);
      setTouchStart(null);
    }, [touchStart, touchEnd, goToNext, goToPrev]);

    const handleBannerClick = useCallback(
      (link: string) => {
        router.push(link);
      },
      [router]
    );

    useEffect(() => {
      if (items.length <= 1) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => goToNext(), autoSlideInterval);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [currentIndex, items.length, autoSlideInterval, goToNext]);

    if (items.length === 0) return null;

    const currentItem = items[currentIndex];

    return (
      <div className='overflow-hidden relative p-0 m-0 w-full'>
        <div
          className='relative w-full h-[140px] px-[18px]'
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {currentItem.variant === "cap" ? (
            <CapBannerCard
              item={currentItem}
              onClick={() => handleBannerClick(currentItem.link)}
            />
          ) : currentItem.variant === "flag" ? (
            <FlagBannerCard
              item={currentItem}
              onClick={() => handleBannerClick(currentItem.link)}
            />
          ) : (
            // Legacy image banner (fallback)
            <div
              className={`w-full h-full flex items-center justify-center overflow-hidden rounded-[4px] border border-cart-rule ${
                currentItem.bgColor || "bg-cart-paper"
              } transition-all duration-300`}
              onClick={() => handleBannerClick(currentItem.link)}
            >
              <div className='relative w-full h-full'>
                <Image
                  src={currentItem.imageUrl}
                  alt='배너 이미지'
                  fill
                  priority
                  sizes='100vw'
                  className='object-cover'
                  style={{ objectPosition: "center" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cartographic indicators */}
        {items.length > 1 && (
          <div className='flex gap-1 justify-center mt-2.5'>
            {items.map((_, index) => (
              <button
                key={index}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-3.5 bg-[hsl(var(--lime))]"
                    : "w-1 bg-cart-rule"
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

NoticeBanner.displayName = "NoticeBanner";
