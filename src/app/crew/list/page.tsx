"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { HomeHeader, ListHeader } from "@/components/layout/HomeHeader";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";
import dynamic from "next/dynamic";
import { ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useCrewStore } from "@/lib/store/crewStore";
import { groupCrewsByRegion } from "@/lib/utils/region-utils";
import { KickerLabel } from "@/components/design/cartographic";
import type { Crew } from "@/lib/types/crew";

// Cartographic crew row — mono rank, paper avatar, name + city, mono members metric.
function CrewRow({
  crew,
  rank,
  onClick,
  isFirst = false,
}: {
  crew: Crew;
  rank: number;
  onClick: () => void;
  isFirst?: boolean;
}) {
  const area =
    crew.location.main_address ||
    crew.location.address?.split(" ").slice(0, 2).join(" ") ||
    "—";
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 py-3.5 cursor-pointer active:bg-white/[0.02] ${
        isFirst ? "" : "border-t border-cart-rule"
      }`}
    >
      <div className="w-8 font-mono text-[11px] tracking-[0.05em] text-cart-ink-60 tabular-nums">
        {String(rank).padStart(2, "0")}
      </div>
      {crew.logo_image ? (
        <div className="relative flex-shrink-0 w-9 h-9 rounded-[4px] overflow-hidden border border-cart-rule bg-cart-paper">
          <Image
            src={crew.logo_image}
            alt={crew.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            sizes="36px"
          />
        </div>
      ) : (
        <div className="flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-[4px] bg-cart-paper border border-cart-rule font-display text-[14px] font-semibold text-[hsl(var(--lime))]">
          {crew.name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-cart-ink truncate">
          {crew.name}
        </div>
        <div className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate mt-0.5">
          {area}
        </div>
      </div>
    </div>
  );
}

// CrewDetailView를 동적으로 로드하여 코드 스플리팅 강화
const CrewDetailView = dynamic(
  () =>
    import("@/components/map/CrewDetailView").then((mod) => mod.CrewDetailView),
  {
    loading: () => <LoadingSpinner message='상세 정보 로딩 중' />,
  }
);

// 초기 로드할 아이템 수
const INITIAL_ITEMS_COUNT = 20;
// 추가로 로드할 아이템 수
const LOAD_MORE_COUNT = 20;

// 검색 파라미터를 사용하는 컴포넌트
function CrewListWithParams() {
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get("region") || "all";

  return <CrewListContent initialRegion={initialRegion} />;
}

// 메인 컨텐츠 컴포넌트
function CrewListContent({ initialRegion }: { initialRegion: string }) {
  // Zustand 스토어에서 크루 데이터 및 상태 가져오기
  const {
    crews,
    filteredCrews,
    isLoading: isCrewsLoading,
    loadCrews,
    invalidateCache,
    selectedCrew,
    isDetailOpen,
    setSelectedCrew,
    closeDetail,
    filterCrewsByRegion,
  } = useCrewStore();

  const [visibleItemsCount, setVisibleItemsCount] =
    useState(INITIAL_ITEMS_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(initialRegion);

  // 무한 스크롤을 위한 참조값
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 캐시 무효화 이벤트 리스너 등록
  useEffect(() => {
    const handleInvalidateCache = () => {
      invalidateCache();
    };

    eventEmitter.on(EVENTS.INVALIDATE_CREWS_CACHE, handleInvalidateCache);

    return () => {
      eventEmitter.off(EVENTS.INVALIDATE_CREWS_CACHE, handleInvalidateCache);
    };
  }, [invalidateCache]);

  // 초기 데이터 로딩
  useEffect(() => {
    loadCrews();
  }, [loadCrews]);

  // 지역 변경 핸들러
  const handleRegionChange = useCallback(
    (region: string) => {
      setSelectedRegion(region);
      filterCrewsByRegion(region);
    },
    [filterCrewsByRegion]
  );

  // 더 불러오기 핸들러
  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;

    setLoadingMore(true);

    // 잠시 딜레이를 주어 로딩 상태를 보여줌
    setTimeout(() => {
      setVisibleItemsCount((prev) => prev + LOAD_MORE_COUNT);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore]);

  // 상단으로 스크롤하는 함수
  const scrollToTop = () => {
    listContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 초기 지역 필터링 적용
  useEffect(() => {
    filterCrewsByRegion(selectedRegion);
  }, [selectedRegion, filterCrewsByRegion]);

  // 전체 지역인지 확인하는 플래그
  const isShowingAllRegions = selectedRegion === "all";

  // 보이는 항목 수 계산
  const hasMoreItems = filteredCrews.length > visibleItemsCount;

  // 전체 지역일 때는 평면 리스트
  const flatCrewList = useMemo(() => {
    return isShowingAllRegions ? filteredCrews.slice(0, visibleItemsCount) : [];
  }, [isShowingAllRegions, filteredCrews, visibleItemsCount]);

  // 특정 지역일 때는 그룹화된 리스트
  const groupedCrewList = useMemo(() => {
    if (isShowingAllRegions) return [];

    const allGroupedCrews = groupCrewsByRegion(filteredCrews);
    let remainingItemsCount = visibleItemsCount;

    return allGroupedCrews
      .map((group) => {
        const availableSlots = Math.min(
          group.crews.length,
          remainingItemsCount
        );
        remainingItemsCount -= availableSlots;

        return {
          ...group,
          crews: group.crews.slice(0, availableSlots),
        };
      })
      .filter((group) => group.crews.length > 0);
  }, [isShowingAllRegions, filteredCrews, visibleItemsCount]);

  // 무한 스크롤 구현
  useEffect(() => {
    // 더 로드할 항목이 없다면 옵저버 설정하지 않음
    if (!hasMoreItems || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // loadMoreRef가 화면에 보이면 더 많은 크루 로드
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: listContainerRef.current,
        rootMargin: "100px 0px",
        threshold: 0.1,
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
      observer.disconnect();
    };
  }, [hasMoreItems, loadingMore, handleLoadMore]);

  if (isCrewsLoading) {
    return (
      <div style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}>
        <HomeHeader
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
          crews={crews}
        />
        <LoadingSpinner message='크루 정보를 불러오는 중' />
      </div>
    );
  }

  return (
    <div
      className='flex relative flex-col'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT,
      }}
    >
      {/* 헤더 영역에 맞추어 상단 패딩, 간격 없이 바로 연결 */}
      <div
        style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING, marginTop: "-1px" }}
      >
        {/* 리스트 전용 헤더 */}
        <ListHeader
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
          crews={crews}
        />
      </div>

      {/* 리스트 컨테이너 */}
      <div
        ref={listContainerRef}
        className='overflow-auto flex-1 h-full bg-background scrollbar-hide'
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Cartographic column headers */}
        <div className="flex items-center gap-3 px-[22px] py-2 sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-cart-rule">
          <div className="w-8 font-mono text-[9px] tracking-[0.15em] text-cart-ink-40">#</div>
          <div className="flex-1 font-mono text-[9px] tracking-[0.15em] text-cart-ink-40">
            NAME · AREA
          </div>
          <KickerLabel tone="muted" className="tracking-[0.18em]">
            TOTAL · {filteredCrews.length.toString().padStart(3, "0")}
          </KickerLabel>
        </div>

        {filteredCrews.length === 0 ? (
          <div className='flex flex-col justify-center items-center h-40 text-center'>
            <p className='text-cart-ink-60 font-mono text-[11px] tracking-[0.1em]'>
              {selectedRegion === "all"
                ? "· NO CREWS REGISTERED ·"
                : "· NO CREWS IN THIS AREA ·"}
            </p>
          </div>
        ) : (
          <div className='pb-24 px-[22px]'>
            {isShowingAllRegions
              ? flatCrewList.map((crew, idx) => (
                  <CrewRow
                    key={crew.id}
                    crew={crew}
                    rank={idx + 1}
                    onClick={() => setSelectedCrew(crew)}
                    isFirst={idx === 0}
                  />
                ))
              : groupedCrewList.map(({ location, crews }) => (
                  <div key={location} className='mb-5'>
                    <div className="flex items-center gap-2 sticky top-[34px] z-[5] py-3 bg-background/85 backdrop-blur-md">
                      <span className="size-1.5 rounded-full bg-[hsl(var(--lime))] shadow-[0_0_0_3px_hsl(var(--lime)/0.2)]" />
                      <KickerLabel tone="lime" className="tracking-[0.2em]">
                        {location.toUpperCase()} · {crews.length.toString().padStart(2, "0")}
                      </KickerLabel>
                    </div>

                    <div>
                      {crews.map((crew, idx) => (
                        <CrewRow
                          key={crew.id}
                          crew={crew}
                          rank={idx + 1}
                          onClick={() => setSelectedCrew(crew)}
                          isFirst={idx === 0}
                        />
                      ))}
                    </div>
                  </div>
                ))}

            {/* 더 보기 버튼 */}
            {hasMoreItems && (
              <div ref={loadMoreRef} className='flex justify-center py-6'>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className='inline-flex gap-2 items-center px-4 py-2 bg-cart-paper border border-cart-rule rounded-[4px] font-mono text-[10px] tracking-[0.18em] text-cart-ink uppercase transition-transform active:scale-95 disabled:opacity-50'
                >
                  {loadingMore ? (
                    <>
                      <LoadingSpinner size='sm' className='h-4' />
                      <span>LOADING…</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className='w-3 h-3' />
                      <span>LOAD MORE</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={scrollToTop}
          className='fixed bottom-24 right-4 z-[100] flex items-center justify-center w-11 h-11 bg-cart-paper border border-cart-rule rounded-[4px] focus:outline-none active:scale-95 transition-transform'
          aria-label='맨 위로 스크롤'
        >
          <ChevronUp className='w-5 h-5 text-[hsl(var(--lime))]' />
        </button>
      </div>

      {/* 크루 상세 정보 */}
      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={closeDetail}
      />
    </div>
  );
}

// 메인 컴포넌트 - Suspense로 useSearchParams()를 사용하는 부분을 감싼다
export default function CrewListPage() {
  return (
    <Suspense fallback={<LoadingSpinner message='페이지 로딩 중' />}>
      <CrewListWithParams />
    </Suspense>
  );
}
