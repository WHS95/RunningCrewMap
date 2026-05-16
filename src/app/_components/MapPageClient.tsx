"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";
import { MapHeader } from "@/components/layout/HomeHeader";
import { useCrewStore } from "@/lib/store/crewStore";
import { KickerLabel } from "@/components/design/cartographic";
import type { Crew } from "@/lib/types/crew";

const NAVER_MAPS_SDK_URL = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID}&submodules=geocoder`;

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
  },
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

interface MapPageClientProps {
  initialCrews: Crew[];
}

export default function MapPageClient({ initialCrews }: MapPageClientProps) {
  // Zustand 스토어에서 크루 데이터 및 상태 가져오기
  const {
    filteredCrews,
    isLoading: isCrewsLoading,
    hydrateCrews,
    loadCrews,
    invalidateCache,
    selectedCrew,
    isDetailOpen,
    setSelectedCrew,
    closeDetail,
  } = useCrewStore();

  // The Zustand store's filteredCrews starts at [] and only fills after
  // hydrateCrews() runs inside a useEffect — so the first paint after
  // navigating to / would briefly hand an empty array to NaverMap,
  // leading to a "no markers" flash that users (especially those landing
  // from Google) read as "site is broken". Fall back to the SSR-provided
  // initialCrews whenever the store hasn't populated yet so markers
  // render on the very first render.
  const mapCrews = filteredCrews.length > 0 ? filteredCrews : initialCrews;

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  // preloadedMapUrl을 useMemo로 파생 (렌더 중 계산, useEffect + setState 제거)
  const preloadedMapUrl = useMemo(() => {
    return `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=640&h=640&center=${center.lng},${center.lat}&level=13&format=png&scale=2&markers=type:d|size:mid|pos:${center.lng} ${center.lat}`;
  }, [center]);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 서버에서 미리 가져온 크루 데이터로 스토어 hydrate
  useEffect(() => {
    if (initialCrews.length > 0) {
      hydrateCrews(initialCrews);
    } else {
      // 서버에서 데이터를 가져오지 못한 경우 클라이언트에서 fallback 로드
      loadCrews();
    }
  }, [initialCrews, hydrateCrews, loadCrews]);

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
          JSON.stringify(locationData),
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
        geoOptions,
      );
    } else {
      // 위치 정보 사용 불가능한 경우
      setCenter(DEFAULT_CENTER);
      setIsLocationLoading(false);
    }
  }, []);

  // Loading-overlay safety net. NaverMap should call onMapLoad once its
  // tile layer initializes (~300-800ms on a warm connection). If that
  // somehow never fires we still drop the overlay after 600ms so the
  // real map and any rendered markers become visible — never let the
  // user stare at a blank page for over half a second.
  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      if (!mapLoaded) {
        setMapLoaded(true);
      }
      if (isLocationLoading) {
        setIsLocationLoading(false);
      }
    }, 600);

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

  // 지도가 로드될 때까지 로딩 표시
  const showLoading = !mapLoaded || isLocationLoading || isCrewsLoading;

  return (
    <>
      {/* Naver Maps SDK — `afterInteractive` starts the download right
          after hydration. This used to be a dynamic <script> injected by
          NaverMap.tsx on mount, which added one extra serial wait. Now
          the SDK download overlaps with React hydration. */}
      <Script
        src={NAVER_MAPS_SDK_URL}
        strategy='afterInteractive'
      />
      <main
        className='flex relative flex-col'
        style={{
          height: CSS_VARIABLES.CONTENT_HEIGHT,
        }}
      >
        {/* Header is rendered immediately so the first paint shows the
            real chrome (MAP / LIST tabs) instead of an empty page. */}
        <div
          style={{
            paddingTop: CSS_VARIABLES.HEADER_PADDING,
            marginTop: "-1px",
          }}
        >
          <MapHeader />
        </div>

        {/* Map container — always rendered. The skeleton overlay only
            paints on top while loading, so the underlying NaverMap can
            initialize concurrently and we avoid a re-mount when loading
            flips to false. */}
        <div
          className='flex-1 relative'
          style={{ height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE }}
        >
          <NaverMap
            width='100%'
            height='100%'
            initialCenter={center}
            initialZoom={13}
            crews={mapCrews}
            selectedCrew={selectedCrew}
            onMapLoad={handleMapLoad}
            onCrewSelect={setSelectedCrew}
          />

          {/* Empty-state HUD — visible only after loading clears AND we
              genuinely have zero crews. Prevents the "is this broken?"
              read when a first-time visitor lands on an empty database
              (e.g. fresh deploy, all crews pending admin approval, or
              a server-side getCrews failure that swallowed the data). */}
          {!showLoading && mapCrews.length === 0 && (
            <div className='pointer-events-none absolute inset-x-4 top-20 z-[10] flex justify-center'>
              <div className='pointer-events-auto bg-background/90 backdrop-blur-md border border-cart-rule rounded-[4px] px-4 py-3 text-center max-w-[320px]'>
                <KickerLabel tone='lime' className='mb-1.5 tracking-[0.22em]'>
                  · NO CREWS · YET
                </KickerLabel>
                <p className='text-[12px] text-cart-ink-60 leading-relaxed'>
                  표시할 크루가 아직 없습니다.
                  <br />
                  크루를 가장 먼저 등록해보세요.
                </p>
                <a
                  href='/register'
                  className='inline-flex items-center justify-center gap-1.5 mt-3 px-3 py-1.5 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform'
                >
                  크루 등록 →
                </a>
              </div>
            </div>
          )}

          {/* Skeleton overlay — cartographic dotted backdrop + spinner.
              Replaces the old full-page LoadingSpinner which forced a
              re-mount of NaverMap once loading completed. */}
          {showLoading && (
            <div
              className='absolute inset-0 z-[200] bg-background flex flex-col items-center justify-center'
              aria-live='polite'
            >
              <div
                aria-hidden
                className='absolute inset-0 opacity-40'
                style={{
                  backgroundImage:
                    "radial-gradient(circle, hsl(var(--cart-ink-40)) 1px, transparent 1.2px)",
                  backgroundSize: "26px 26px",
                }}
              />
              <div className='relative z-10 text-center'>
                <LoadingSpinner />
                <KickerLabel
                  tone='lime'
                  className='mt-3 tracking-[0.22em]'
                >
                  ●{" "}
                  {isLocationLoading
                    ? "LOCATING…"
                    : isCrewsLoading
                    ? "LOADING CREWS…"
                    : "RENDERING MAP…"}
                </KickerLabel>
                {/* Reserve the preloaded static-map URL via a no-op ref
                    so the optimizer doesn't drop the useMemo. */}
                <div className='hidden' data-url={preloadedMapUrl} />
              </div>
            </div>
          )}
        </div>

        {/* 크루 상세 정보 */}
        <CrewDetailView
          crew={selectedCrew}
          isOpen={isDetailOpen}
          onClose={closeDetail}
        />
      </main>
    </>
  );
}
