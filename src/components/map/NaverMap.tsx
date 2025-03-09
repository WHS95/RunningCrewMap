"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Crew } from "@/lib/types/crew";
// import { CrewDetailSheet } from "@/components/map/CrewDetailSheet";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { VisibleCrewList } from "@/components/map/VisibleCrewList";
import { SearchBox } from "@/components/search/SearchBox";
import { ListFilter } from "lucide-react";
import { crewService } from "@/lib/services/crew.service";

interface NaverMapProps {
  width: string;
  height: string;
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  crews: Crew[];
  selectedCrew?: Crew | null;
  onMapLoad?: () => void;
}

export default function NaverMap({
  width,
  height,
  initialCenter,
  initialZoom,
  crews,
  selectedCrew: externalSelectedCrew,
  onMapLoad,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(
    externalSelectedCrew || null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(!!externalSelectedCrew);
  const [visibleCrews, setVisibleCrews] = useState<Crew[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const markersCreatedRef = useRef(false);

  // 이미지 프리로딩 개선
  useEffect(() => {
    // 최적화된 이미지 사이즈로 프리로딩
    const imageCache: { [key: string]: HTMLImageElement } = {};
    crews.forEach((crew) => {
      if (crew.logo_image && !imageCache[crew.id]) {
        const img = new global.Image();
        // 이미지 URL에 크기 제한 파라미터 추가 (CDN이 지원하는 경우)
        // 예: logo.jpg?width=40&height=40 또는 w=40&h=40 등
        // 아래는 예시이므로 실제 CDN 설정에 맞게 수정 필요
        const sizeParams = crew.logo_image.includes("?")
          ? "&w=40&h=40"
          : "?w=40&h=40";
        img.src = `${crew.logo_image}${sizeParams}`;

        imageCache[crew.id] = img;
      }
    });
  }, [crews]);

  // 지도에 보이는 크루 필터링 - 마커 생성/제거 없이 단순히 목록만 업데이트
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
  const handleCrewSelect = useCallback(async (crew: Crew) => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    const position = new window.naver.maps.LatLng(
      crew.location.lat,
      crew.location.lng
    );

    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);

    try {
      // crewService를 사용하여 상세 정보 가져오기
      const detailedCrew = await crewService.getCrewDetail(crew.id);

      console.log("detailedCrew", detailedCrew);
      setSelectedCrew(detailedCrew || crew); // 실패 시 기존 데이터 사용
    } catch (error) {
      console.error("크루 상세 정보 조회 실패:", error);
      setSelectedCrew(crew); // 에러 발생 시 기본 정보 사용
    }

    setIsDetailOpen(true);
  }, []);

  // 마커 생성 함수 - 로고 이미지 포함하되 최적화
  const createMarkerContent = useCallback((crew: Crew) => {
    const size = 40; // 크기 최적화

    if (!crew.logo_image) {
      // 로고 이미지가 없는 경우 기본 마커
      return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: #f1f5f9; border: 2px solid white; color: #64748b; font-weight: bold; text-align: center; line-height: ${size}px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${crew.name.charAt(
        0
      )}</div>`;
    }

    // 로고 이미지가 있는 경우 - 최적화된 이미지 사용
    // background-image 대신 img 태그를 사용하되 최적화된 방식 적용
    // fetchpriority="low"와 loading="lazy" 속성 추가로 로딩 최적화
    return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; overflow: hidden; border: 2px solid white; background-color: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <img 
        src="${crew.logo_image}" 
        width="${size}" 
        height="${size}" 
        alt="${crew.name}" 
        style="object-fit: cover; width: 100%; height: 100%;"
        onerror="this.style.display='none'; this.parentElement.innerHTML='${crew.name.charAt(
          0
        )}'"
      />
    </div>`;
  }, []);

  // 마커 초기화 - 한 번만 실행되도록 함
  const initializeMarkers = useCallback(() => {
    if (
      !mapInstanceRef.current ||
      typeof window === "undefined" ||
      markersCreatedRef.current
    )
      return;

    // 모든 마커를 한 번만 생성하되, 현재 화면에 보이는 영역만 우선 처리
    const bounds = mapInstanceRef.current.getBounds();

    // 화면에 보이는 크루 우선 정렬
    const sortedCrews = [...crews].sort((a, b) => {
      const posA = new window.naver.maps.LatLng(a.location.lat, a.location.lng);
      const posB = new window.naver.maps.LatLng(b.location.lat, b.location.lng);
      const isAVisible = bounds
        ? (bounds as naver.maps.LatLngBounds).hasLatLng(posA)
        : false;
      const isBVisible = bounds
        ? (bounds as naver.maps.LatLngBounds).hasLatLng(posB)
        : false;

      if (isAVisible && !isBVisible) return -1;
      if (!isAVisible && isBVisible) return 1;
      return 0;
    });

    // 최대 마커 생성 수를 화면에 보이는 크루 + 일부 여유분으로 제한
    const markers = sortedCrews.map((crew) => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(
          crew.location.lat,
          crew.location.lng
        ),
        map: mapInstanceRef.current!,
        icon: {
          content: createMarkerContent(crew),
          size: new window.naver.maps.Size(36, 36),
          anchor: new window.naver.maps.Point(18, 18),
        },
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, "click", async () => {
        try {
          // crewService를 사용하여 상세 정보 가져오기
          const detailedCrew = await crewService.getCrewDetail(crew.id);
          setSelectedCrew(detailedCrew || crew); // 실패 시 기존 데이터 사용
        } catch (error) {
          console.error("크루 상세 정보 조회 실패:", error);
          setSelectedCrew(crew); // 에러 발생 시 기본 정보 사용
        }
        setIsDetailOpen(true);
      });

      return marker;
    });

    markersRef.current = markers;
    markersCreatedRef.current = true;

    // 초기 보이는 크루 설정
    updateVisibleCrews();

    // 마커 초기화가 완료되면 반드시 onMapLoad 호출
    if (onMapLoad) {
      console.log("Markers initialized, calling onMapLoad");
      // 짧은 지연 후 호출하여 마커가 실제로 렌더링될 시간 확보
      setTimeout(onMapLoad, 100);
    }
  }, [crews, updateVisibleCrews, createMarkerContent, onMapLoad]);

  // 마커 표시/숨김 토글 - 줌 이벤트 발생 시
  const toggleMarkers = useCallback((visible: boolean) => {
    if (markersRef.current.length === 0) return;

    markersRef.current.forEach((marker) => {
      // 단순히 마커의 가시성만 설정
      marker.setVisible(visible);
    });
  }, []);

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
        zoomControl: false,
      };

      const mapDiv = mapRef.current;
      if (!mapDiv) return;

      const mapInstance = new window.naver.maps.Map(mapDiv, mapOptions);
      mapInstanceRef.current = mapInstance;

      // 안전장치: 지도가 로드된 후 5초 내에 마커 초기화가 완료되지 않으면 강제로 로드 완료 처리
      const mapLoadTimer = setTimeout(() => {
        if (onMapLoad && !markersCreatedRef.current) {
          console.log("Map load timeout - force completing");
          onMapLoad();
        }
      }, 5000);

      // 줌 시작 시 마커 숨김
      window.naver.maps.Event.addListener(mapInstance, "zoom_start", () => {
        setIsZooming(true);
        toggleMarkers(false); // 마커 숨김
      });

      // 줌 종료 후 마커 표시
      window.naver.maps.Event.addListener(mapInstance, "zoom_changed", () => {
        if (isZooming) {
          // 줌 변경 후 약간의 지연 시간을 두고 마커 다시 표시
          setTimeout(() => {
            toggleMarkers(true); // 마커 다시 표시
            setIsZooming(false);
          }, 100);
        }
      });

      // 드래그 시작 시 마커 숨김
      window.naver.maps.Event.addListener(mapInstance, "dragstart", () => {
        toggleMarkers(false); // 마커 숨김
      });

      // 드래그 종료 후 마커 표시
      window.naver.maps.Event.addListener(mapInstance, "dragend", () => {
        toggleMarkers(true); // 마커 다시 표시
        // 지도 이동 종료 시 보이는 크루 업데이트
        updateVisibleCrews();
      });

      setIsMapReady(true);

      return () => {
        clearTimeout(mapLoadTimer);
      };
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
      markersCreatedRef.current = false;
    };
  }, [
    initialCenter.lat,
    initialCenter.lng,
    initialZoom,
    updateVisibleCrews,
    toggleMarkers,
    isZooming,
    onMapLoad,
  ]);

  // 지도가 준비되면 마커 초기화 (한 번만)
  useEffect(() => {
    if (isMapReady && !markersCreatedRef.current) {
      try {
        initializeMarkers();
      } catch (error) {
        console.error("Error initializing markers:", error);
        // 마커 초기화 실패해도 지도 로드는 완료된 것으로 처리
        if (onMapLoad) {
          onMapLoad();
        }
      }
    } else if (isMapReady && onMapLoad && !markersCreatedRef.current) {
      // 추가 안전장치: 마커를 생성하지 못했어도 지도가 준비되었다면 로드 완료 처리
      onMapLoad();
    }
  }, [isMapReady, initializeMarkers, onMapLoad]);

  // 외부에서 선택된 크루가 변경될 경우 상태 업데이트
  useEffect(() => {
    if (externalSelectedCrew) {
      setSelectedCrew(externalSelectedCrew);
      setIsDetailOpen(true);

      // 지도가 로드된 경우 해당 크루 위치로 이동
      if (mapInstanceRef.current && typeof window !== "undefined") {
        const position = new window.naver.maps.LatLng(
          externalSelectedCrew.location.lat,
          externalSelectedCrew.location.lng
        );
        mapInstanceRef.current.setCenter(position);
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [externalSelectedCrew]);

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
