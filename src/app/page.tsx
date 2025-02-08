"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { crewService } from "@/lib/services";
import type { Crew } from "@/lib/types/crew";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
// import { CrewList } from "@/components/crew/CrewList";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";

const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
  loading: () => <LoadingSpinner message='로딩 중' />,
});

// 서울시청 좌표 (기본값)
const DEFAULT_CENTER = {
  lat: 37.5666805,
  lng: 126.9784147,
};

// 크루 데이터를 저장할 전역 캐시
let crewsCache: Crew[] | null = null;

export default function Home() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [isLoading, setIsLoading] = useState(true);
  // const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);

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
      // 캐시된 데이터가 있으면 사용
      if (crewsCache) {
        setCrews(crewsCache);
        return;
      }

      const data = await crewService.getAllCrews();
      crewsCache = data; // 데이터를 캐시에 저장
      setCrews(data);
    } catch (error) {
      console.error("Failed to load crews:", error);
    }
  };

  // 사용자 위치 정보 가져오기
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    const geoOptions = {
      timeout: 1000,
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
        console.log(
          "위치 정보를 가져올 수 없어 기본 위치(서울시청)를 사용합니다."
        );
        setIsLoading(false);
      },
      geoOptions
    );
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    loadCrews();
  }, []);

  // const handleCrewSelect = (crew: Crew) => {
  //   setSelectedCrew(crew);
  // };

  // 크루 목록 컴포넌트 메모이제이션
  // const crewListComponent = useMemo(
  //   () => <CrewList crews={crews} onSelect={handleCrewSelect} />,
  //   [crews]
  // );

  if (isLoading) {
    return (
      <div style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}>
        <LoadingSpinner message='위치 정보를 불러오는 중' />
      </div>
    );
  }

  return (
    <div
      className='relative flex flex-col md:flex-row'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 데스크톱: 왼쪽 사이드바 */}
      {/* <div className='hidden border-r md:block w-80'>{crewListComponent}</div> */}

      {/* 지도 */}
      <div
        className='flex-1'
        style={{ height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE }}
      >
        <NaverMap
          width='100%'
          height='100%'
          initialCenter={center}
          initialZoom={14}
          crews={crews}
        />
      </div>
    </div>
  );
}
