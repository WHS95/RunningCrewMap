"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { crewService } from "@/lib/services";
import type { Crew } from "@/lib/types/crew";
import { MobileNav } from "@/components/layout/MobileNav";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
  loading: () => <LoadingSpinner message='로딩 중' />,
});

// 서울시청 좌표 (기본값)
const DEFAULT_CENTER = {
  lat: 37.5666805,
  lng: 126.9784147,
};

function CrewList({ crews }: { crews: Crew[] }) {
  return (
    <div className='h-full overflow-auto p-4'>
      <div className='mb-4'>
        <h2 className='text-lg font-semibold'>러닝 크루 목록</h2>
        <p className='text-sm text-muted-foreground'>
          총 {crews.length}개의 크루
        </p>
      </div>
      <div className='space-y-4'>
        {crews.map((crew) => (
          <div
            key={crew.id}
            className='p-4 rounded-lg border hover:bg-accent cursor-pointer'
          >
            <h3 className='font-semibold'>{crew.name}</h3>
            <p className='text-sm text-muted-foreground line-clamp-2'>
              {crew.description}
            </p>
            {crew.instagram && (
              <p className='text-sm text-blue-600 mt-2'>{crew.instagram}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 위치 정보 가져오기
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    const geoOptions = {
      timeout: 1000, // 1초 timeout
      maximumAge: 0, // 캐시된 위치 정보를 사용하지 않음
      enableHighAccuracy: false, // 높은 정확도가 필요하지 않음
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
        // 위치 정보 가져오기 실패 또는 timeout 시 기본값 사용
        console.log(
          "위치 정보를 가져올 수 없어 기본 위치(서울시청)를 사용합니다."
        );
        setIsLoading(false);
      },
      geoOptions
    );
  }, []);

  // 크루 데이터 가져오기
  useEffect(() => {
    const loadCrews = async () => {
      try {
        const data = await crewService.getAllCrews();
        console.log("data", data);
        setCrews(data);
      } catch (error) {
        console.error("Failed to load crews:", error);
      }
    };

    loadCrews();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message='위치 정보를 불러오는 중' />;
  }

  return (
    <div className='relative flex flex-col md:flex-row h-[calc(100vh-3.5rem)]'>
      {/* 데스크톱: 왼쪽 사이드바 */}
      <div className='hidden md:block w-80 border-r'>
        <CrewList crews={crews} />
      </div>

      {/* 지도 */}
      <div className='flex-1 h-[calc(100vh-3.5rem-4rem)] md:h-full'>
        <NaverMap
          width='100%'
          height='100%'
          initialCenter={center}
          initialZoom={14}
          crews={crews}
        />
      </div>

      {/* 모바일: 하단 네비게이션 */}
      <MobileNav>
        <CrewList crews={crews} />
      </MobileNav>
    </div>
  );
}
