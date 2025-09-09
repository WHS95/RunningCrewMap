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
}

interface NoticeBannerProps {
  items: BannerItem[];
  autoSlideInterval?: number;
}

export const NoticeBanner = memo(
  ({ items, autoSlideInterval = 5000 }: NoticeBannerProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    // 다음 슬라이드로 이동
    const goToNext = useCallback(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === items.length - 1 ? 0 : prevIndex + 1
      );
    }, [items.length]);

    // 이전 슬라이드로 이동
    const goToPrev = useCallback(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? items.length - 1 : prevIndex - 1
      );
    }, [items.length]);

    // 특정 슬라이드로 이동
    const goToSlide = useCallback((index: number) => {
      setCurrentIndex(index);
    }, []);

    // 터치 이벤트 처리
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    }, []);

    const handleTouchEnd = useCallback(() => {
      if (!touchStart || !touchEnd) return;

      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
        goToNext();
      }

      if (isRightSwipe) {
        goToPrev();
      }

      setTouchEnd(null);
      setTouchStart(null);
    }, [touchStart, touchEnd, goToNext, goToPrev]);

    // 배너 클릭 처리
    const handleBannerClick = useCallback(
      (link: string) => {
        router.push(link);
      },
      [router]
    );

    // 자동 슬라이드 설정
    useEffect(() => {
      if (items.length <= 1) return;

      const startTimer = () => {
        // 기존 타이머가 있으면 제거
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          goToNext();
        }, autoSlideInterval);
      };

      startTimer();

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, [currentIndex, items.length, autoSlideInterval, goToNext]);

    // 현재 아이템이 없는 경우 렌더링하지 않음
    if (items.length === 0) return null;

    const currentItem = items[currentIndex];

    return (
      <div className='overflow-hidden relative p-0 m-0 w-full'>
        <div
          className='relative w-full h-40 sm:h-44 md:h-48'
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 배너 아이템 - 이미지만 표시 */}
          <div
            className={`w-full h-full flex items-center justify-center ${
              currentItem.bgColor || "bg-gray-100"
            } transition-all duration-300`}
            onClick={() => handleBannerClick(currentItem.link)}
          >
            {/* 이미지 */}
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
              텍스트 오버레이
              {/* {(currentItem.title || currentItem.description) && (
                <div className='absolute right-0 bottom-0 left-0 p-3 text-white bg-gradient-to-t to-transparent from-black/70'>
                  {currentItem.title && (
                    <h3 className='text-lg font-bold leading-tight'>
                      {currentItem.title}
                    </h3>
                  )}
                  {currentItem.description && (
                    <p className='mt-1 text-sm'>{currentItem.description}</p>
                  )}
                </div>
              )} */}
            </div>
          </div>
        </div>

        {/* 인디케이터 */}
        {items.length > 1 && (
          <div className='flex gap-1 justify-center mt-2'>
            {items.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "bg-black" : "bg-gray-300"
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

// 컴포넌트 디스플레이 이름 설정
NoticeBanner.displayName = "NoticeBanner";
