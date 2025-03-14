"use client";
//서버 조정을 잘하자./...
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
// import { crewService } from "@/lib/services";
import { crewService } from "@/lib/services/crew.service";
import type { Crew } from "@/lib/types/crew";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CrewList } from "@/components/crew/CrewList";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";
import { toast } from "sonner";
import { ErrorCode, AppError } from "@/lib/types/error";
import { HomeHeader, ViewMode } from "@/components/layout/HomeHeader";
// import { CrewDetailView } from "@/components/map/CrewDetailView";

const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
  loading: () => <LoadingSpinner message='로딩 중' />,
});

// CrewDetailView를 동적으로 로드하여 코드 스플리팅 강화
const CrewDetailView = dynamic(
  () =>
    import("@/components/map/CrewDetailView").then((mod) => mod.CrewDetailView),
  {
    loading: () => <LoadingSpinner message='상세 정보 로딩 중' />,
  }
);

// 서울시청 좌표 (기본값)
const DEFAULT_CENTER = {
  lat: 37.513,
  lng: 127.0598,
};

// 크루 데이터를 저장할 전역 캐시
let crewsCache: Crew[] | null = null;

export default function Home() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [detailState, setDetailState] = useState<{
    crew: Crew | null;
    isOpen: boolean;
  }>({
    crew: null,
    isOpen: false,
  });
  const [activeView, setActiveView] = useState<ViewMode>("map");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [filteredCrews, setFilteredCrews] = useState<Crew[]>([]);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [preloadedMapUrl, setPreloadedMapUrl] = useState<string | null>(null);

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

  // 크루 데이터 가져오기 (캐시 활용) - 최적화
  const loadCrews = async () => {
    try {
      if (crewsCache) {
        setCrews(crewsCache);
        return;
      }

      // 최적화: 데이터 한 번만 로드
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
          case ErrorCode.STORAGE_ERROR:
            toast.error(
              "이미지 저장소에 접근할 수 없습니다. 잠시 후 다시 시도해주세요."
            );
            break;
          case ErrorCode.DUPLICATE_CREW_NAME:
            toast.error(
              "이미 등록된 크루 이름입니다. 다른 이름을 사용해주세요."
            );
            break;
          case ErrorCode.INVALID_CREW_NAME:
            toast.error(
              "크루 이름이 올바르지 않습니다. 2자 이상 100자 이하로 입력해주세요."
            );
            break;
          case ErrorCode.INVALID_DESCRIPTION:
            toast.error("크루 소개를 입력해주세요.");
            break;
          case ErrorCode.INVALID_LOCATION:
            toast.error("활동 장소를 입력해주세요.");
            break;
          case ErrorCode.INVALID_ACTIVITY_DAYS:
            toast.error("활동 요일을 선택해주세요.");
            break;
          case ErrorCode.INVALID_AGE_RANGE:
            toast.error("올바른 연령대 범위를 선택해주세요.");
            break;
          case ErrorCode.UPLOAD_FAILED:
            toast.error("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
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

      // 개발자 콘솔에 상세 로그
      console.error("상세 에러 정보:", {
        name: error.name || "Unknown",
        message: error.message || "알 수 없는 오류",
        code: "code" in error ? appError.code : "UNKNOWN_ERROR",
        details: "details" in error ? appError.details : undefined,
      });
    }
  };

  // 사용자 위치 정보 가져오기
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    const geoOptions = {
      timeout: 1500,
      maximumAge: 0,
      enableHighAccuracy: false,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      () => {
        setCenter(DEFAULT_CENTER);
        setIsLoading(false);
      },
      geoOptions
    );
  }, []);

  // 지역에 따른 크루 필터링
  const filterCrewsByRegion = useCallback(() => {
    if (selectedRegion === "all") {
      setFilteredCrews(crews);
      return;
    }

    const filtered = crews.filter((crew) => {
      const address = crew.location.address || crew.location.main_address || "";
      const addressLower = address.toLowerCase();

      // 기본 지역 필터링 로직
      switch (selectedRegion) {
        case "seoul":
          return addressLower.includes("서울");
        case "gyeonggi":
          return addressLower.includes("경기");
        case "gangwon":
          return addressLower.includes("강원");
        case "gyeongsang":
          return (
            addressLower.includes("경상") ||
            addressLower.includes("경북") ||
            addressLower.includes("경남")
          );
        case "jeolla":
          return (
            addressLower.includes("전라") ||
            addressLower.includes("전북") ||
            addressLower.includes("전남")
          );
        case "chungcheong":
          return (
            addressLower.includes("충청") ||
            addressLower.includes("충북") ||
            addressLower.includes("충남")
          );
        case "jeju":
          return addressLower.includes("제주");
        default:
          return true;
      }
    });

    setFilteredCrews(filtered);
  }, [crews, selectedRegion]);

  // 선택된 지역이 변경될 때 크루 필터링
  useEffect(() => {
    filterCrewsByRegion();
  }, [selectedRegion, crews, filterCrewsByRegion]);

  // 초기 데이터 로딩
  useEffect(() => {
    loadCrews();
  }, []);

  // 초기 크루 데이터 설정
  useEffect(() => {
    setFilteredCrews(crews);
  }, [crews]);

  // 크루 선택 핸들러 (리스트 뷰와 지도 뷰 모두에서 사용) - useCallback으로 최적화
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

  // 지역 변경 핸들러
  const handleRegionChange = useCallback((region: string) => {
    setSelectedRegion(region);
  }, []);

  // 뷰 모드 변경 핸들러
  const handleViewChange = useCallback((view: ViewMode) => {
    setActiveView(view);
  }, []);

  // 로딩 타임아웃 설정 (안전장치)
  useEffect(() => {
    // 1초 이상 로딩이 지속되면 강제로 로딩 완료 처리
    loadingTimeoutRef.current = setTimeout(() => {
      if (!mapLoaded) {
        console.log("Loading timeout - force completing");
        setMapLoaded(true);
      }
      if (isLoading) {
        setIsLoading(false);
      }
    }, 1000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [mapLoaded, isLoading]);

  // 지도 로딩 완료 핸들러
  const handleMapLoad = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setMapLoaded(true);
  }, []);

  // 크루 목록 컴포넌트 메모이제이션
  const crewListComponent = useMemo(
    () => <CrewList crews={filteredCrews} onSelect={handleCrewSelect} />,
    [filteredCrews, handleCrewSelect]
  );

  // 뷰 변경 시 로딩 상태 초기화
  useEffect(() => {
    if (activeView === "list") {
      // 리스트 뷰로 변경 시 지도 로딩 상태는 고려하지 않음
      setMapLoaded(true);
    }
  }, [activeView]);

  // 네이버 지도 초기 로딩 시 정적 이미지로 교체
  useEffect(() => {
    // 서버에서 위치 정보를 가져올 때 미리 지도 이미지 URL 생성
    const mapCenter = center;
    const mapImageUrl = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=640&h=640&center=${mapCenter.lng},${mapCenter.lat}&level=13&format=png&scale=2&markers=type:d|size:mid|pos:${mapCenter.lng} ${mapCenter.lat}`;

    setPreloadedMapUrl(mapImageUrl);
  }, [center]);

  // 지도 뷰에서는 지도와 마커 모두 로드될 때까지 로딩 표시
  // 리스트 뷰에서는 위치 정보만 로드되면 표시
  const showLoading =
    (activeView === "map" && (!mapLoaded || isLoading)) ||
    (activeView === "list" && isLoading);

  if (showLoading) {
    return (
      <div style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}>
        {/* 지도 미리보기 이미지 표시 (네이버 지도 로딩 중일 때) - Next.js Image 컴포넌트로 최적화 */}
        {activeView === "map" && preloadedMapUrl && !isLoading ? (
          <div className='relative h-[80vh]'>
            <div className='absolute top-0 left-0 right-0 p-4 text-center'>
              <LoadingSpinner message='지도를 불러오는 중' />
            </div>
          </div>
        ) : (
          <LoadingSpinner
            message={
              isLoading ? "위치 정보를 불러오는 중" : "지도를 불러오는 중"
            }
          />
        )}
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
      {/* 헤더 영역에 맞추어 상단 패딩, 간격 없이 바로 연결 */}
      <div
        style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING, marginTop: "-1px" }}
      >
        {/* 통합 헤더 */}
        <HomeHeader
          activeView={activeView}
          onViewChange={handleViewChange}
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
          crews={crews}
        />
      </div>

      {/* 뷰 컨테이너 */}
      <div className='flex-1'>
        {/* 지도 뷰 */}
        {activeView === "map" && (
          <div
            className='flex-1'
            style={{ height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE }}
          >
            <NaverMap
              width='100%'
              height='100%'
              initialCenter={center}
              initialZoom={13} // 초기 줌 레벨 조정 (값을 높이면 더 가까이, 낮추면 더 멀리 보임)
              crews={crews}
              selectedCrew={detailState.crew}
              onMapLoad={handleMapLoad}
            />
          </div>
        )}

        {/* 리스트 뷰 */}
        {activeView === "list" && (
          <div className='w-full h-full overflow-auto'>{crewListComponent}</div>
        )}
      </div>

      {/* 크루 상세 정보 (리스트 뷰에서 선택했을 때만 표시) */}
      {activeView === "list" && (
        <CrewDetailView
          crew={detailState.crew}
          isOpen={detailState.isOpen}
          onClose={handleDetailClose}
        />
      )}
    </div>
  );
}
