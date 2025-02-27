"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Crew } from "@/lib/types/crew";
// import { CrewDetailSheet } from "@/components/map/CrewDetailSheet";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { VisibleCrewList } from "@/components/map/VisibleCrewList";
import { SearchBox } from "@/components/search/SearchBox";
import { ListFilter } from "lucide-react";

interface NaverMapProps {
  width: string;
  height: string;
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  crews: Crew[];
}

export default function NaverMap({
  width,
  height,
  initialCenter,
  initialZoom,
  crews,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [visibleCrews, setVisibleCrews] = useState<Crew[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // 이미지 프리로딩
  useEffect(() => {
    crews.forEach((crew) => {
      if (crew.logo_image) {
        const img = new global.Image();
        img.src = crew.logo_image;
      }
    });
  }, [crews]);

  // 지도에 보이는 크루 필터링
  const updateVisibleCrews = useCallback(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    const bounds = mapInstanceRef.current.getBounds();
    const filtered = crews.filter((crew) => {
      const position = new window.naver.maps.LatLng(
        crew.location.lat,
        crew.location.lng
      );
      return (bounds as naver.maps.LatLngBounds).hasLatLng(position);
    });
    setVisibleCrews(filtered);
  }, [crews]);

  // 크루 선택 시 지도 이동
  const handleCrewSelect = useCallback((crew: Crew) => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    const position = new window.naver.maps.LatLng(
      crew.location.lat,
      crew.location.lng
    );

    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);

    setSelectedCrew(crew);
    setIsDetailOpen(true);
  }, []);

  // 마커 생성 함수
  const createMarkerContent = useCallback((crew: Crew) => {
    const size = 40; // 마커 크기 최적화
    return crew.logo_image
      ? `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; overflow: hidden; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); background-color: #f1f5f9;">
          <img src="${crew.logo_image}" 
               alt="${crew.name}" 
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.style.display='none'; this.parentElement.innerHTML='${crew.name.charAt(
                 0
               )}'"
          >
        </div>`
      : `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: #f1f5f9; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-weight: 500; color: #64748b;">
          ${crew.name.charAt(0)}
        </div>`;
  }, []);

  const initializeMarkers = useCallback(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 새로운 마커 생성
    crews.forEach((crew) => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(
          crew.location.lat,
          crew.location.lng
        ),
        map: mapInstanceRef.current!,
        icon: {
          content: createMarkerContent(crew),
          size: new window.naver.maps.Size(40, 40),
          anchor: new window.naver.maps.Point(20, 20),
        },
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, "click", () => {
        setSelectedCrew(crew);
        setIsDetailOpen(true);
      });

      markersRef.current.push(marker);
    });

    // 초기 보이는 크루 설정
    updateVisibleCrews();
  }, [crews, updateVisibleCrews, createMarkerContent]);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const initializeMap = () => {
      if (!window.naver) return;

      const mapOptions = {
        center: new window.naver.maps.LatLng(
          initialCenter.lat,
          initialCenter.lng
        ),
        zoom: initialZoom,
        minZoom: 9,
        maxZoom: 21,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
      };

      const mapDiv = mapRef.current;
      if (!mapDiv) return;

      const mapInstance = new window.naver.maps.Map(mapDiv, mapOptions);
      mapInstanceRef.current = mapInstance;

      // 지도 이동 이벤트 리스너 추가
      window.naver.maps.Event.addListener(
        mapInstance,
        "idle",
        updateVisibleCrews
      );

      setIsMapReady(true);
    };

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}`;
    script.onload = initializeMap;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      setIsMapReady(false);
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, updateVisibleCrews]);

  // 지도가 준비되면 마커 초기화
  useEffect(() => {
    if (isMapReady) {
      initializeMarkers();
    }
  }, [isMapReady, initializeMarkers]);

  return (
    <div style={{ width, height }} className='relative'>
      {/* 검색창 */}
      <div className='absolute top-4 left-0 right-0 z-[200]'>
        <SearchBox crews={crews} onSelect={handleCrewSelect} />
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* 현재 화면에 보이는 크루 목록 버튼 */}
      <button
        onClick={() => setIsListOpen(true)}
        className='absolute bottom-20 right-4 bg-white rounded-full w-12 h-12 shadow-lg z-[100] hover:bg-gray-50 flex flex-col items-center justify-center'
      >
        <ListFilter className='w-5 h-5' />
        <span className='mt-1 text-xs'>{visibleCrews.length}</span>
      </button>

      {/* 크루 상세 정보 */}
      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCrew(null);
        }}
      />

      {/* <CrewDetailSheet
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCrew(null);
        }}
      /> */}

      {/* 현재 화면에 보이는 크루 목록 */}
      <VisibleCrewList
        crews={visibleCrews}
        isOpen={isListOpen}
        onClose={() => setIsListOpen(false)}
        onSelect={(crew) => {
          setSelectedCrew(crew);
          setIsDetailOpen(true);
          setIsListOpen(false);
        }}
      />
    </div>
  );
}
