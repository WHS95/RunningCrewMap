"use client";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";
import { MapHeader } from "@/components/layout/HomeHeader";
import { useCrewStore } from "@/lib/store/crewStore";

const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
  loading: () => <LoadingSpinner message='로딩 중' />,
});

// CrewDetailView를 동적으로 로드하여 코드 스플리팅 강화
const CrewDetailView = dynamic(
  () =>
    import("@/components/map/CrewDetailView").then((mod) => mod.CrewDetailView),
  {
    loading: () => <LoadingSpinner message='로딩 중' />,
  }
);

// 서울시청 좌표 (기본값)
const DEFAULT_CENTER = {
  lat: 37.513,
  lng: 127.0598,
};

// 위치 정보 로컬 스토리지 키
const LOCATION_STORAGE_KEY = "user_location";
// 위치 정보 만료 시간 (7일, 밀리초 단위)
const LOCATION_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000;

// 메인 홈페이지 컴포넌트
function HomePage() {
  // Zustand 스토어에서 크루 데이터 및 상태 가져오기
  const {
    filteredCrews,
    isLoading: isCrewsLoading,
    loadCrews,
    invalidateCache,
    selectedCrew,
    isDetailOpen,
    setSelectedCrew,
    closeDetail,
  } = useCrewStore();

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [preloadedMapUrl, setPreloadedMapUrl] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 사용자 위치 정보 가져오기
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLocationLoading(false);
      return;
    }

    // 로컬 스토리지에서 저장된 위치 정보 확인
    const getSavedLocation = () => {
      try {
        const savedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);

        if (savedLocationData) {
          const savedLocation = JSON.parse(savedLocationData);

          // 만료 시간 확인
          if (savedLocation.expiry && savedLocation.expiry > Date.now()) {
            return {
              lat: savedLocation.lat,
              lng: savedLocation.lng,
            };
          }
        }
      } catch (error) {
        console.error("저장된 위치 정보를 불러오는데 실패했습니다:", error);
      }

      return null;
    };

    // 위치 정보 저장 함수
    const saveLocation = (location: { lat: number; lng: number }) => {
      try {
        const locationData = {
          ...location,
          expiry: Date.now() + LOCATION_EXPIRY_TIME,
        };
        localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(locationData)
        );
      } catch (error) {
        console.error("위치 정보 저장에 실패했습니다:", error);
      }
    };

    // 저장된 위치 정보 확인
    const savedLocation = getSavedLocation();

    if (savedLocation) {
      // 저장된 위치 정보가 있으면 사용
      setCenter(savedLocation);
      setIsLocationLoading(false);
    } else if (navigator.geolocation) {
      // 저장된 위치 정보가 없으면 새로 요청
      const geoOptions = {
        timeout: 1500,
        maximumAge: 0,
        enableHighAccuracy: false,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newLocation);
          // 위치 정보 로컬 스토리지에 저장
          saveLocation(newLocation);
          setIsLocationLoading(false);
        },
        () => {
          setCenter(DEFAULT_CENTER);
          setIsLocationLoading(false);
        },
        geoOptions
      );
    } else {
      // 위치 정보 사용 불가능한 경우
      setCenter(DEFAULT_CENTER);
      setIsLocationLoading(false);
    }
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    loadCrews();
  }, [loadCrews]);

  // 로딩 타임아웃 설정 (안전장치)
  useEffect(() => {
    // 1초 이상 로딩이 지속되면 강제로 로딩 완료 처리
    loadingTimeoutRef.current = setTimeout(() => {
      if (!mapLoaded) {
        console.log("Loading timeout - force completing");
        setMapLoaded(true);
      }
      if (isLocationLoading) {
        setIsLocationLoading(false);
      }
    }, 1000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [mapLoaded, isLocationLoading]);

  // 지도 로딩 완료 핸들러
  const handleMapLoad = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setMapLoaded(true);
  }, []);

  // 네이버 지도 초기 로딩 시 정적 이미지로 교체
  useEffect(() => {
    // 서버에서 위치 정보를 가져올 때 미리 지도 이미지 URL 생성
    // 참고: Static Map API는 별도의 API이므로 기존 엔드포인트 유지
    const mapCenter = center;
    const mapImageUrl = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=640&h=640&center=${mapCenter.lng},${mapCenter.lat}&level=13&format=png&scale=2&markers=type:d|size:mid|pos:${mapCenter.lng} ${mapCenter.lat}`;

    setPreloadedMapUrl(mapImageUrl);
  }, [center]);

  // 지도가 로드될 때까지 로딩 표시
  const showLoading = !mapLoaded || isLocationLoading || isCrewsLoading;

  if (showLoading) {
    return (
      <div style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}>
        {/* 지도 미리보기 이미지 표시 (네이버 지도 로딩 중일 때) - Next.js Image 컴포넌트로 최적화 */}
        {preloadedMapUrl && !isLocationLoading ? (
          <div className='relative h-[80vh]'>
            <div className='absolute top-0 right-0 left-0 p-4 text-center'>
              <LoadingSpinner />
            </div>
          </div>
        ) : (
          <LoadingSpinner
            message={
              isLocationLoading
                ? "위치 정보를 불러오는 중"
                : "지도를 불러오는 중"
            }
          />
        )}
      </div>
    );
  }

  return (
    <main
      className='flex relative flex-col'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT,
      }}
    >
      {/* 헤더 영역 */}
      <div
        style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING, marginTop: "-1px" }}
      >
        {/* 지도 전용 헤더 */}
        <MapHeader />
      </div>

      {/* 지도 컨테이너 */}
      <div
        className='flex-1'
        style={{ height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE }}
      >
        <NaverMap
          width='100%'
          height='100%'
          initialCenter={center}
          initialZoom={13} // 초기 줌 레벨 조정 (값을 높이면 더 가까이, 낮추면 더 멀리 보임)
          crews={filteredCrews}
          selectedCrew={selectedCrew}
          onMapLoad={handleMapLoad}
          onCrewSelect={setSelectedCrew}
        />
      </div>

      {/* 크루 상세 정보 */}
      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={closeDetail}
      />
    </main>
  );
}

// 메인 export 함수 - Suspense 사용
export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner message='페이지 로딩 중' />}>
      <HomePage />
    </Suspense>
  );
}
