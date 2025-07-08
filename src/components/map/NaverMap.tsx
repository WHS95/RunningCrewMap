"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Crew } from "@/lib/types/crew";
// import { CrewDetailSheet } from "@/components/map/CrewDetailSheet";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { VisibleCrewList } from "@/components/map/VisibleCrewList";
import { SearchBox } from "@/components/search/SearchBox";
import { ListFilter } from "lucide-react";
import { crewService } from "@/lib/services/crew.service";

// Window 인터페이스 확장 - 네이버 지도 API 인증 실패 함수용
declare global {
  interface Window {
    navermap_authFailure?: () => void;
  }
}

interface NaverMapProps {
  width: string;
  height: string;
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  crews: Crew[];
  selectedCrew?: Crew | null;
  onMapLoad?: () => void;
  onCrewSelect?: (crew: Crew) => void;
}

export default function NaverMap({
  width,
  height,
  initialCenter,
  initialZoom,
  crews,
  selectedCrew: externalSelectedCrew,
  onMapLoad,
  onCrewSelect,
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
  // 이미지 캐시 상태 저장용 ref 추가
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // 이미지 프리로딩 개선
  useEffect(() => {
    // 이전에 로드된 이미지 제거
    if (Object.keys(imageCache.current).length > 0) {
      Object.keys(imageCache.current).forEach((key) => {
        if (imageCache.current[key]) {
          imageCache.current[key].src = "";
        }
      });
      imageCache.current = {};
    }

    // 화면에 보이는 이미지만 우선적으로 프리로드
    const preloadImagesInViewport = () => {
      if (!mapInstanceRef.current || typeof window === "undefined") return;

      const bounds = mapInstanceRef.current.getBounds();
      if (!bounds) return;

      const priorityCrews = crews
        .filter((crew) => {
          if (!crew.logo_image) return false;

          const position = new window.naver.maps.LatLng(
            crew.location.lat,
            crew.location.lng
          );
          return (bounds as naver.maps.LatLngBounds).hasLatLng(position);
        })
        .slice(0, 10); // 화면에 보이는 이미지 중 최대 10개만 즉시 로드

      // 화면 내 크루 이미지 즉시 로드
      priorityCrews.forEach((crew) => {
        if (crew.logo_image && !imageCache.current[crew.id]) {
          const img = new Image();
          img.src = crew.logo_image;
          img.decoding = "async";
          imageCache.current[crew.id] = img;
        }
      });

      // 나머지 이미지는 지연 로드
      setTimeout(() => {
        const remainingCrews = crews
          .filter((crew) => crew.logo_image && !imageCache.current[crew.id])
          .slice(0, 20); // 최대 20개만 추가 로드

        remainingCrews.forEach((crew) => {
          if (crew.logo_image) {
            const img = new Image();
            img.src = crew.logo_image;
            img.decoding = "async";
            img.loading = "lazy";
            imageCache.current[crew.id] = img;
          }
        });
      }, 1000);
    };

    if (isMapReady) {
      preloadImagesInViewport();
    }

    // 컴포넌트가 언마운트될 때 캐시 정리
    return () => {
      Object.keys(imageCache.current).forEach((key) => {
        if (imageCache.current[key]) {
          imageCache.current[key].src = "";
        }
      });
      imageCache.current = {};
    };
  }, [crews, isMapReady]);

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
    // 이미지 URL에 사이즈 파라미터 추가 (CDN이 지원하는 경우)
    const optimizedLogoUrl = crew.logo_image.includes("?")
      ? `${crew.logo_image}&width=${size * 2}`
      : `${crew.logo_image}?width=${size * 2}`;

    return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; overflow: hidden; border: 2px solid white; background-color: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <img 
        src="${optimizedLogoUrl}" 
        width="${size}" 
        height="${size}" 
        alt="${crew.name}" 
        style="object-fit: cover; width: 100%; height: 100%;"
        loading="lazy"
        decoding="async"
        onerror="this.style.display='none'; this.parentElement.innerHTML='${crew.name.charAt(
          0
        )}'"
      />
    </div>`;
  }, []);

  // 최적화된 마커 생성 함수 - 배치 처리 방식
  const createMarkersInBatches = useCallback(
    (markerCrews: Crew[], batchSize = 20, delayMs = 100) => {
      // 안전성 검사 강화
      if (
        !mapInstanceRef.current ||
        typeof window === "undefined" ||
        !window.naver ||
        !window.naver.maps ||
        !window.naver.maps.Marker
      ) {
        console.warn(
          "네이버 지도 API가 완전히 로드되지 않았습니다. 마커 생성을 건너뜁니다."
        );
        return [];
      }

      let createdMarkers: naver.maps.Marker[] = [];
      let currentIndex = 0;

      const createNextBatch = () => {
        // 배치 생성 중에도 API 상태 재확인
        if (
          currentIndex >= markerCrews.length ||
          !mapInstanceRef.current ||
          !window.naver ||
          !window.naver.maps ||
          !window.naver.maps.Marker
        ) {
          return;
        }

        const endIndex = Math.min(currentIndex + batchSize, markerCrews.length);
        const currentBatch = markerCrews.slice(currentIndex, endIndex);

        try {
          const batchMarkers = currentBatch.map((crew) => {
            // 각 마커 생성 시에도 안전성 검사
            if (!window.naver?.maps?.Marker) {
              throw new Error(
                "네이버 지도 Marker 클래스에 접근할 수 없습니다."
              );
            }

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

                // 외부 핸들러에도 알림
                if (onCrewSelect) {
                  onCrewSelect(detailedCrew || crew);
                }
              } catch (error) {
                console.error("크루 상세 정보 조회 실패:", error);
                setSelectedCrew(crew); // 에러 발생 시 기본 정보 사용

                // 에러 발생 시에도 외부 핸들러 호출
                if (onCrewSelect) {
                  onCrewSelect(crew);
                }
              }
              setIsDetailOpen(true);
            });

            return marker;
          });

          createdMarkers = [...createdMarkers, ...batchMarkers];
          currentIndex = endIndex;

          // 다음 배치 생성
          if (currentIndex < markerCrews.length) {
            setTimeout(createNextBatch, delayMs);
          }
        } catch (error) {
          console.error("마커 배치 생성 중 오류 발생:", error);
          // 오류 발생 시 다음 배치로 넘어가지 않고 종료
          return;
        }
      };

      // 첫 번째 배치 생성 시작
      createNextBatch();

      return createdMarkers;
    },
    [createMarkerContent, onCrewSelect, setSelectedCrew, setIsDetailOpen]
  );

  // 마커 초기화 - 한 번만 실행되도록 함
  const initializeMarkers = useCallback(() => {
    if (
      !mapInstanceRef.current ||
      typeof window === "undefined" ||
      markersCreatedRef.current
    )
      return;

    // 화면에 보이는 마커만 우선 생성하고 나머지는 지연 생성
    const bounds = mapInstanceRef.current.getBounds();

    // 마커 생성 우선순위 결정 (화면에 보이는 것 먼저)
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

    // 최적화된 배치 마커 생성 사용
    markersRef.current = createMarkersInBatches(sortedCrews, 20, 100);
    markersCreatedRef.current = true;

    // 초기 보이는 크루 설정
    updateVisibleCrews();

    // 마커 초기화가 완료되면 반드시 onMapLoad 호출
    if (onMapLoad) {
      console.log("Markers initialized, calling onMapLoad");
      // 짧은 지연 후 호출하여 마커가 실제로 렌더링될 시간 확보
      setTimeout(onMapLoad, 100);
    }
  }, [crews, updateVisibleCrews, createMarkersInBatches, onMapLoad]);

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

    // 환경변수 검증
    const clientId = process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID;
    console.log("clientId33333333", clientId);
    if (!clientId) {
      console.error(
        "❌ NEXT_PUBLIC_RUN_NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다."
      );
      console.error("📝 .env.local 파일에 다음과 같이 추가해주세요:");
      console.error("NEXT_PUBLIC_RUN_NAVER_CLIENT_ID=your_naver_client_id");

      if (onMapLoad) {
        onMapLoad();
      }
      return;
    }

    console.log("🗺️ 네이버 지도 초기화 시작 - Client ID:", clientId);

    let script: HTMLScriptElement | null = null;

    // 네이버 지도 API 인증 실패 처리 함수 등록
    if (typeof window !== "undefined") {
      window.navermap_authFailure = function () {
        console.error("네이버 지도 API 인증 실패");

        // 구체적인 오류 정보 제공
        const errorMessage = `
네이버 지도 서비스 인증 실패

다음 사항을 확인해주세요:
1. 네이버 클라우드 플랫폼에서 Maps API 서비스가 활성화되어 있는지 확인
2. 클라이언트 ID가 올바른지 확인 (현재: ${clientId})
3. 도메인 설정에 ${window.location.origin}이 포함되어 있는지 확인
4. 개발용 도메인: localhost:3000, 127.0.0.1:3000 등록 확인

해결 방법:
- HTTPS 사용 권장 (npm run dev:https)
- 네이버 클라우드 플랫폼 콘솔에서 설정 확인
        `.trim();

        console.error(errorMessage);

        // 인증 실패 시에도 로딩 완료 처리하여 무한 로딩 방지
        if (onMapLoad) {
          onMapLoad();
        }

        // 개발 환경에서만 상세 알림 표시
        if (process.env.NODE_ENV === "development") {
          alert("지도 서비스 인증에 실패했습니다. 콘솔을 확인해주세요.");
        }
      };
    }

    const initializeMap = () => {
      if (!window.naver || !window.naver.maps) {
        console.error("네이버 지도 API가 로드되지 않았습니다.");
        return;
      }

      // 개선된 지도 옵션 설정
      const mapOptions = {
        center: new window.naver.maps.LatLng(
          initialCenter.lat,
          initialCenter.lng
        ),
        zoom: initialZoom,
        minZoom: 7,
        maxZoom: 21,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
        // 지도 스타일 최적화
        mapTypeId: window.naver.maps.MapTypeId.NORMAL,
      };

      const mapDiv = mapRef.current;
      if (!mapDiv) {
        console.error("지도 컨테이너 요소를 찾을 수 없습니다.");
        return;
      }

      let mapInstance;
      try {
        mapInstance = new window.naver.maps.Map(mapDiv, mapOptions);
        mapInstanceRef.current = mapInstance;

        console.log("네이버 지도가 성공적으로 초기화되었습니다.");
      } catch (error) {
        console.error("지도 초기화 중 오류 발생:", error);
        // 지도 초기화 실패 시에도 onMapLoad 호출
        if (onMapLoad) {
          onMapLoad();
        }
        return;
      }

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

    // 스크립트 로딩 재시도 로직
    let retryCount = 0;
    const maxRetries = 3;

    const loadMapScript = () => {
      if (window.naver && window.naver.maps) {
        initializeMap();
        return;
      }

      script = document.createElement("script");
      // HTTPS 강제 사용 및 네이버 클라우드 플랫폼 통합 방식
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log("네이버 지도 스크립트 로딩 성공");
        initializeMap();
      };

      script.onerror = () => {
        console.error(
          `네이버 지도 스크립트 로딩 실패 (시도 ${
            retryCount + 1
          }/${maxRetries})`
        );

        // 재시도 로직
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`${retryCount * 2}초 후 재시도...`);

          // 실패한 스크립트 제거
          if (script && script.parentNode) {
            script.parentNode.removeChild(script);
          }

          // 지연 후 재시도
          setTimeout(loadMapScript, retryCount * 2000);
        } else {
          console.error("네이버 지도 스크립트 로딩 최종 실패");
          console.error("다음 사항을 확인해주세요:");
          console.error("1. 인터넷 연결 상태");
          console.error("2. 네이버 클라우드 플랫폼 서비스 상태");
          console.error("3. 클라이언트 ID 및 도메인 설정");

          // 최종 실패 시에도 onMapLoad 호출하여 무한 로딩 방지
          if (onMapLoad) {
            onMapLoad();
          }
        }
      };

      document.head.appendChild(script);
    };

    // 스크립트 로딩 시작
    loadMapScript();

    // 언마운트 시 모든 리소스 해제 - 개선된 메모리 관리
    return () => {
      // 스크립트 제거
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }

      // 전역 인증 실패 함수 정리
      if (typeof window !== "undefined" && window.navermap_authFailure) {
        delete window.navermap_authFailure;
      }

      // 마커 제거
      if (markersRef.current.length > 0) {
        markersRef.current.forEach((marker) => {
          if (marker) {
            marker.setMap(null);
            // 이벤트 리스너 제거
            if (window.naver && window.naver.maps) {
              window.naver.maps.Event.clearInstanceListeners(marker);
            }
          }
        });
        markersRef.current = [];
      }

      // 지도 인스턴스 정리
      if (mapInstanceRef.current && window.naver && window.naver.maps) {
        // 지도에 연결된 이벤트 리스너 정리
        window.naver.maps.Event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }

      // 상태 초기화
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
          if (onCrewSelect) {
            onCrewSelect(crew);
          }
        }}
      />
    </div>
  );
}
