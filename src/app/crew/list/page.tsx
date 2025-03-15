"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { crewService } from "@/lib/services/crew.service";
import type { Crew } from "@/lib/types/crew";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";
import { toast } from "sonner";
import { ErrorCode, AppError } from "@/lib/types/error";
import dynamic from "next/dynamic";
import { MapPin, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import {
  filterCrewsByRegion,
  groupCrewsByRegion,
} from "@/lib/utils/region-utils";

// CrewDetailView를 동적으로 로드하여 코드 스플리팅 강화
const CrewDetailView = dynamic(
  () =>
    import("@/components/map/CrewDetailView").then((mod) => mod.CrewDetailView),
  {
    loading: () => <LoadingSpinner message='로딩 중' />,
  }
);

// 크루 데이터를 저장할 전역 캐시
let crewsCache: Crew[] | null = null;

// 초기 로드할 아이템 수
const INITIAL_ITEMS_COUNT = 20;
// 추가로 로드할 아이템 수
const LOAD_MORE_COUNT = 20;

export default function CrewListPage() {
  const searchParams = useSearchParams();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [filteredCrews, setFilteredCrews] = useState<Crew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleItemsCount, setVisibleItemsCount] =
    useState(INITIAL_ITEMS_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(
    searchParams.get("region") || "all"
  );
  const [detailState, setDetailState] = useState<{
    crew: Crew | null;
    isOpen: boolean;
  }>({
    crew: null,
    isOpen: false,
  });

  // 무한 스크롤을 위한 참조값
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 캐시 무효화 이벤트 리스너 등록
  useEffect(() => {
    const handleInvalidateCache = () => {
      crewsCache = null;
      loadCrews();
    };

    eventEmitter.on(EVENTS.INVALIDATE_CREWS_CACHE, handleInvalidateCache);

    return () => {
      eventEmitter.off(EVENTS.INVALIDATE_CREWS_CACHE, handleInvalidateCache);
    };
  }, []);

  // 크루 데이터 가져오기 (캐시 활용)
  const loadCrews = async () => {
    try {
      setIsLoading(true);

      if (crewsCache) {
        setCrews(crewsCache);
        setIsLoading(false);
        return;
      }

      const data = await crewService.getCrews();
      setCrews(data);
      crewsCache = data;
    } catch (err: unknown) {
      console.error("크루 데이터 로딩 실패:", err);

      // 에러 타입에 따른 사용자 피드백
      const error = err as Error;
      const appError = err as AppError;

      if ("code" in error) {
        switch (appError.code) {
          case ErrorCode.NETWORK_ERROR:
            toast.error("네트워크 연결을 확인해주세요.");
            break;
          case ErrorCode.SERVER_ERROR:
            toast.error(
              "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
            );
            break;
          default:
            toast.error(
              "크루 정보를 불러오는데 실패했습니다. 다시 시도해주세요."
            );
        }
      } else {
        toast.error(
          "알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해주세요."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 지역에 따른 크루 필터링
  const filterCrewsByRegionCallback = useCallback(() => {
    const filtered = filterCrewsByRegion(crews, selectedRegion);
    setFilteredCrews(filtered);
    // 필터링 변경 시 보이는 아이템 수 초기화
    setVisibleItemsCount(INITIAL_ITEMS_COUNT);
  }, [crews, selectedRegion]);

  // 지역 변경 핸들러
  const handleRegionChange = useCallback((region: string) => {
    setSelectedRegion(region);
  }, []);

  // 상세 정보 열기 핸들러
  const handleCrewSelect = useCallback((crew: Crew) => {
    setDetailState({
      crew,
      isOpen: true,
    });
  }, []);

  // 상세 정보 닫기 핸들러
  const handleDetailClose = useCallback(() => {
    setDetailState({
      crew: null,
      isOpen: false,
    });
  }, []);

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

  // URL 쿼리 파라미터로부터 초기 지역 설정
  useEffect(() => {
    const region = searchParams.get("region");
    if (region) {
      setSelectedRegion(region);
    }
  }, [searchParams]);

  // 초기 데이터 로딩
  useEffect(() => {
    loadCrews();
  }, []);

  // 크루 필터링 적용
  useEffect(() => {
    filterCrewsByRegionCallback();
  }, [selectedRegion, crews, filterCrewsByRegionCallback]);

  // 보이는 항목 수 계산
  const hasMoreItems = filteredCrews.length > visibleItemsCount;

  // 현재 보이는 크루 데이터 (레이지 로딩 적용)
  const visibleCrews = filteredCrews.slice(0, visibleItemsCount);

  // 그룹화된 크루 데이터
  const groupedCrews = useMemo(
    () => groupCrewsByRegion(visibleCrews),
    [visibleCrews]
  );

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

  if (isLoading) {
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
      className='relative flex flex-col'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT,
      }}
    >
      {/* 헤더 영역 */}
      <div
        style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING, marginTop: "-1px" }}
      >
        <HomeHeader
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
          crews={crews}
        />
      </div>

      {/* 리스트 컨테이너 */}
      <div
        ref={listContainerRef}
        className='flex-1 h-full overflow-auto text-black bg-white'
      >
        {filteredCrews.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-40 text-center'>
            <p className='text-gray-500'>
              {selectedRegion === "all"
                ? "등록된 크루가 없습니다."
                : "선택한 지역에 등록된 크루가 없습니다."}
            </p>
          </div>
        ) : (
          <div className='pb-24'>
            {groupedCrews.map(({ location, crews }) => (
              <div key={location} className='mb-4'>
                <div className='sticky top-0 z-10 flex items-center px-4 py-2 bg-white/95 backdrop-blur-sm'>
                  <MapPin className='w-4 h-4 mr-2 text-blue-500' />
                  <h3 className='text-sm font-medium text-gray-800'>
                    {location}
                  </h3>
                  <span className='ml-2 text-xs text-gray-500'>
                    ({crews.length})
                  </span>
                </div>

                <div>
                  {crews.map((crew) => (
                    <div
                      key={crew.id}
                      className='flex items-start px-4 py-3 border-b border-gray-200 hover:bg-gray-50'
                      onClick={() => handleCrewSelect(crew)}
                    >
                      {crew.logo_image ? (
                        <div className='relative flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 overflow-hidden border border-gray-200 rounded-full'>
                          <Image
                            src={crew.logo_image}
                            alt={crew.name}
                            width={40}
                            height={40}
                            className='object-cover w-full h-full'
                            sizes='40px'
                          />
                        </div>
                      ) : (
                        <div className='flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 text-base font-medium text-gray-600 bg-gray-100 rounded-full'>
                          {crew.name.charAt(0)}
                        </div>
                      )}

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between'>
                          <h3 className='font-medium text-gray-900'>
                            {crew.name}
                          </h3>
                        </div>
                        <p className='text-sm text-gray-600 line-clamp-1'>
                          {crew.description}
                        </p>
                        {(crew.location.address ||
                          crew.location.main_address) && (
                          <p className='flex items-center mt-1 text-xs text-gray-500 line-clamp-1'>
                            <MapPin className='flex-shrink-0 w-3 h-3 mr-1' />
                            {crew.location.address ||
                              crew.location.main_address}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 더 보기 버튼 */}
            {hasMoreItems && (
              <div ref={loadMoreRef} className='flex justify-center py-4'>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className='flex items-center gap-2 px-4 py-2 transition-colors bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50'
                >
                  {loadingMore ? (
                    <>
                      <LoadingSpinner size='sm' className='h-4' />
                      <span>로딩 중...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className='w-4 h-4' />
                      <span>더 보기</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 상단 스크롤 버튼 */}
        <button
          onClick={scrollToTop}
          className='fixed bottom-24 right-4 z-[100] flex items-center justify-center w-11 h-11 bg-gray-400 rounded-full shadow-lg focus:outline-none hover:bg-gray-500 active:bg-gray-600 active:scale-95 transition-all duration-200'
          aria-label='맨 위로 스크롤'
        >
          <ChevronUp className='w-6 h-6 text-white' />
        </button>
      </div>

      {/* 크루 상세 정보 */}
      <CrewDetailView
        crew={detailState.crew}
        isOpen={detailState.isOpen}
        onClose={handleDetailClose}
      />
    </div>
  );
}
