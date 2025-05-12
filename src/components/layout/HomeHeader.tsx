"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Crew } from "@/lib/types/crew";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { countCrewsByRegion } from "@/lib/utils/region-utils";

export type ViewMode = "map" | "list";

// 기본 지역 목록 (정적 부분)
const BASE_REGIONS = [{ id: "all", name: "전체", count: 0 }];

// 기본 탭 아이템
const TAB_ITEMS = [
  {
    mode: "map" as ViewMode,
    label: "지도",
    href: "/",
  },
  {
    mode: "list" as ViewMode,
    label: "리스트",
    href: "/crew/list",
  },
];

// 기본 공통 헤더 컴포넌트 (탭만 포함)
interface BaseHeaderProps {
  currentView: ViewMode;
}

const BaseHeader = ({ currentView }: BaseHeaderProps) => {
  return (
    <div className='grid grid-cols-2 border-b border-gray-800'>
      {TAB_ITEMS.map((item) => (
        <Link
          key={item.mode}
          href={item.href}
          className={cn(
            "py-3 text-center relative text-sm font-medium",
            "transition-all duration-150",
            "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px]",
            currentView === item.mode
              ? "text-white after:bg-white"
              : "text-gray-400 after:bg-transparent",
            "active:bg-gray-900/70 active:scale-[0.98]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

// 지도 페이지용 헤더
export const MapHeader = () => {
  return (
    <div className='sticky top-0 z-30 w-full bg-black'>
      <BaseHeader currentView='map' />
    </div>
  );
};

// 리스트 페이지용 헤더 (탭 + 지역 필터)
interface ListHeaderProps {
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
  crews?: Crew[];
}

export const ListHeader = ({
  selectedRegion = "all",
  onRegionChange,
  crews = [],
}: ListHeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 지역별 크루 수를 계산하고 정렬
  const regions = useMemo(() => {
    // 지역별 크루 수 계산
    const regionCounts = countCrewsByRegion(crews);

    // 크루 수 기준으로 내림차순 정렬된 지역 목록
    const sortedRegions = Object.values(regionCounts)
      .filter((region) => region.count > 0) // 크루가 있는 지역만 표시
      .sort((a, b) => b.count - a.count);

    // "전체" 항목에 전체 크루 수 설정
    const allRegion = { ...BASE_REGIONS[0], count: crews.length };

    // "전체" 항목을 맨 앞에 추가하고 반환
    return [allRegion, ...sortedRegions];
  }, [crews]);

  // 지역 변경 시 URL 쿼리스트링도 업데이트하는 함수
  const handleRegionChange = (region: string) => {
    if (onRegionChange) {
      onRegionChange(region);
    } else {
      // 리스트 페이지에서는 URL 쿼리스트링 업데이트
      const params = new URLSearchParams(searchParams);
      params.set("region", region);
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className='sticky top-0 z-30 w-full bg-black'>
      {/* 탭 바 */}
      <BaseHeader currentView='list' />

      {/* 지역 필터 - 항상 표시 */}
      <div className='overflow-x-auto border-b border-gray-800 scrollbar-hide'>
        <div className='flex min-w-max'>
          {regions.map((region) => (
            <button
              key={region.id}
              className={cn(
                "px-4 py-3 text-center relative whitespace-nowrap",
                "transition-all duration-150",
                selectedRegion === region.id
                  ? "text-white font-medium border-b-2 border-white"
                  : "text-gray-500",
                "active:bg-gray-900 active:scale-[0.98] hover:bg-gray-900/50"
              )}
              onClick={() => handleRegionChange(region.id)}
            >
              {region.name}
              {region.count > 0 && (
                <span className='ml-1 text-xs text-gray-400'>
                  ({region.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 하위 호환성을 위한 레거시 컴포넌트
interface HomeHeaderProps {
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
  crews?: Crew[];
}

export const HomeHeader = (props: HomeHeaderProps) => {
  const pathname = usePathname();
  const isListPage = pathname.includes("/crew/list");

  // 페이지에 따라 적절한 헤더 컴포넌트 렌더링
  if (isListPage) {
    return <ListHeader {...props} />;
  }

  return <MapHeader />;
};
