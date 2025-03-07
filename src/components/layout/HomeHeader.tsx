"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Crew } from "@/lib/types/crew";

export type ViewMode = "map" | "list";

// 기본 지역 목록 (정적 부분)
const BASE_REGIONS = [{ id: "all", name: "전체", count: 0 }];

interface HomeHeaderProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
  crews?: Crew[]; // 크루 목록 데이터를 받아 지역별 카운트를 계산하기 위함
}

export const HomeHeader = ({
  activeView,
  onViewChange,
  selectedRegion = "all",
  onRegionChange,
  crews = [],
}: HomeHeaderProps) => {
  const tabItems = [
    {
      mode: "map" as ViewMode,
      label: "지도",
    },
    {
      mode: "list" as ViewMode,
      label: "리스트",
    },
  ];

  // 지역별 크루 수를 계산하고 정렬
  const regions = useMemo(() => {
    // 기본 지역 카운트
    const regionCounts: Record<
      string,
      { id: string; name: string; count: number }
    > = {
      seoul: { id: "seoul", name: "서울", count: 0 },
      gyeonggi: { id: "gyeonggi", name: "경기도", count: 0 },
      gangwon: { id: "gangwon", name: "강원도", count: 0 },
      gyeongsang: { id: "gyeongsang", name: "경상도", count: 0 },
      jeolla: { id: "jeolla", name: "전라도", count: 0 },
      chungcheong: { id: "chungcheong", name: "충청도", count: 0 },
      jeju: { id: "jeju", name: "제주도", count: 0 },
    };

    // 각 크루의 주소를 분석하여 지역 카운트 증가
    crews.forEach((crew) => {
      const address = crew.location.address || crew.location.main_address || "";
      const addressLower = address.toLowerCase();

      if (addressLower.includes("서울")) regionCounts.seoul.count++;
      else if (addressLower.includes("경기")) regionCounts.gyeonggi.count++;
      else if (addressLower.includes("강원")) regionCounts.gangwon.count++;
      else if (
        addressLower.includes("경상") ||
        addressLower.includes("경북") ||
        addressLower.includes("경남")
      )
        regionCounts.gyeongsang.count++;
      else if (
        addressLower.includes("전라") ||
        addressLower.includes("전북") ||
        addressLower.includes("전남")
      )
        regionCounts.jeolla.count++;
      else if (
        addressLower.includes("충청") ||
        addressLower.includes("충북") ||
        addressLower.includes("충남")
      )
        regionCounts.chungcheong.count++;
      else if (addressLower.includes("제주")) regionCounts.jeju.count++;
    });

    // 크루 수 기준으로 내림차순 정렬된 지역 목록
    const sortedRegions = Object.values(regionCounts)
      .filter((region) => region.count > 0) // 크루가 있는 지역만 표시
      .sort((a, b) => b.count - a.count);

    // "전체" 항목을 맨 앞에 추가하고 반환
    return [...BASE_REGIONS, ...sortedRegions];
  }, [crews]);

  return (
    <div className='sticky top-0 z-30 w-full bg-black'>
      {/* 탭 바 */}
      <div className='grid grid-cols-2 border-b border-gray-800'>
        {tabItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onViewChange(item.mode)}
            className={cn(
              "py-3 text-center relative text-sm font-medium",
              "transition-colors duration-200",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px]",
              activeView === item.mode
                ? "text-white after:bg-white"
                : "text-gray-400 after:bg-transparent"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 리스트 뷰에서만 필터 표시 */}
      {activeView === "list" && onRegionChange && (
        <div className='overflow-x-auto border-b border-gray-800'>
          <div className='flex min-w-max'>
            {regions.map((region) => (
              <button
                key={region.id}
                className={cn(
                  "px-4 py-3 text-center relative whitespace-nowrap",
                  "transition-colors duration-200",
                  selectedRegion === region.id
                    ? "text-white font-medium border-b-2 border-white"
                    : "text-gray-500"
                )}
                onClick={() => onRegionChange(region.id)}
              >
                {region.name}
                {region.id !== "all" && region.count > 0 && (
                  <span className='ml-1 text-xs text-gray-400'>
                    ({region.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
