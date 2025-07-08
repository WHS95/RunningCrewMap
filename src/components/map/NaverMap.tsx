"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Crew } from "@/lib/types/crew";
// import { CrewDetailSheet } from "@/components/map/CrewDetailSheet";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { VisibleCrewList } from "@/components/map/VisibleCrewList";
import { SearchBox } from "@/components/search/SearchBox";
import { ListFilter } from "lucide-react";
import { crewService } from "@/lib/services/crew.service";

// ======================================
// 마커 클러스터링 설정 (수정 가능한 기준들)
// ======================================
const CLUSTERING_CONFIG = {
  // 클러스터링을 시작할 최대 줌 레벨 (이 값보다 낮으면 클러스터링 적용)
  MAX_ZOOM_FOR_CLUSTERING: 20,

  // 클러스터링 거리 (픽셀 단위) - 이 거리 내의 마커들을 하나로 묶음
  CLUSTER_DISTANCE: 80,

  // 클러스터를 형성하기 위한 최소 마커 개수
  MIN_CLUSTER_SIZE: 3,

  // 클러스터 마커 크기
  CLUSTER_SIZE: 40,

  // 클러스터 스타일 설정
  CLUSTER_STYLES: {
    backgroundColor: "#000000", // 클러스터 배경색
    textColor: "#ffff00", // 클러스터 텍스트 색상
    borderColor: "#ffffff", // 클러스터 테두리 색상
    borderWidth: 3, // 클러스터 테두리 두께
  },
};

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

// 클러스터 타입 정의
interface ClusterMarker {
  id: string;
  position: { lat: number; lng: number };
  crews: Crew[];
  isCluster: true;
}

interface IndividualMarker {
  id: string;
  position: { lat: number; lng: number };
  crew: Crew;
  isCluster: false;
}

type MarkerData = ClusterMarker | IndividualMarker;

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

  // ======================================
  // 클러스터링 로직
  // ======================================

  // 두 지점 간의 픽셀 거리 계산
  const getPixelDistance = useCallback(
    (
      pos1: { lat: number; lng: number },
      pos2: { lat: number; lng: number }
    ): number => {
      if (!mapInstanceRef.current || typeof window === "undefined") return 0;

      const projection = mapInstanceRef.current.getProjection();
      const point1 = projection.fromCoordToOffset(
        new window.naver.maps.LatLng(pos1.lat, pos1.lng)
      );
      const point2 = projection.fromCoordToOffset(
        new window.naver.maps.LatLng(pos2.lat, pos2.lng)
      );

      const dx = point1.x - point2.x;
      const dy = point1.y - point2.y;

      return Math.sqrt(dx * dx + dy * dy);
    },
    []
  );

  // 크루들을 클러스터링하는 함수
  const clusterCrews = useCallback(
    (crewList: Crew[]): MarkerData[] => {
      if (!mapInstanceRef.current || typeof window === "undefined") return [];

      const currentZoom = mapInstanceRef.current.getZoom();

      // 줌 레벨이 높으면 클러스터링하지 않고 개별 마커로 표시
      if (currentZoom > CLUSTERING_CONFIG.MAX_ZOOM_FOR_CLUSTERING) {
        return crewList.map((crew) => ({
          id: crew.id,
          position: crew.location,
          crew,
          isCluster: false as const,
        }));
      }

      const clusters: MarkerData[] = [];
      const processed = new Set<string>();

      crewList.forEach((crew) => {
        if (processed.has(crew.id)) return;

        // 현재 크루 주변의 다른 크루들 찾기
        const nearbyCrews = crewList.filter((otherCrew) => {
          if (processed.has(otherCrew.id) || crew.id === otherCrew.id)
            return false;

          const distance = getPixelDistance(crew.location, otherCrew.location);
          return distance <= CLUSTERING_CONFIG.CLUSTER_DISTANCE;
        });

        // 클러스터 형성 조건 확인
        if (nearbyCrews.length >= CLUSTERING_CONFIG.MIN_CLUSTER_SIZE - 1) {
          // 클러스터 생성
          const clusterCrews = [crew, ...nearbyCrews];

          // 클러스터 중심점 계산 (평균 위치)
          const centerLat =
            clusterCrews.reduce((sum, c) => sum + c.location.lat, 0) /
            clusterCrews.length;
          const centerLng =
            clusterCrews.reduce((sum, c) => sum + c.location.lng, 0) /
            clusterCrews.length;

          clusters.push({
            id: `cluster-${crew.id}`,
            position: { lat: centerLat, lng: centerLng },
            crews: clusterCrews,
            isCluster: true as const,
          });

          // 처리된 크루들 표시
          clusterCrews.forEach((c) => processed.add(c.id));
        } else {
          // 개별 마커로 표시
          clusters.push({
            id: crew.id,
            position: crew.location,
            crew,
            isCluster: false as const,
          });
          processed.add(crew.id);
        }
      });

      return clusters;
    },
    [getPixelDistance]
  );

  // 클러스터 마커 콘텐츠 생성
  const createClusterContent = useCallback((clusterData: ClusterMarker) => {
    const size = CLUSTERING_CONFIG.CLUSTER_SIZE;
    const styles = CLUSTERING_CONFIG.CLUSTER_STYLES;

    return `<div style="
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50%; 
      background-color: ${styles.backgroundColor}; 
      border: ${styles.borderWidth}px solid ${styles.borderColor}; 
      color: ${styles.textColor}; 
      font-weight: bold; 
      text-align: center; 
      line-height: ${size}px; 
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-size: ${Math.min(16, size / 3)}px;
      cursor: pointer;
    ">${clusterData.crews.length}</div>`;
  }, []);

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

  // 마커 생성 함수 - 로고 이미지 포함하되 최적화 (기존 디자인 유지)
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

  // 클러스터링을 적용한 마커 생성 함수
  const createMarkersWithClustering = useCallback(
    (markerData: MarkerData[], batchSize = 20, delayMs = 100) => {
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
          currentIndex >= markerData.length ||
          !mapInstanceRef.current ||
          !window.naver ||
          !window.naver.maps ||
          !window.naver.maps.Marker
        ) {
          return;
        }

        const endIndex = Math.min(currentIndex + batchSize, markerData.length);
        const currentBatch = markerData.slice(currentIndex, endIndex);

        try {
          const batchMarkers = currentBatch.map((data) => {
            // 각 마커 생성 시에도 안전성 검사
            if (!window.naver?.maps?.Marker) {
              throw new Error(
                "네이버 지도 Marker 클래스에 접근할 수 없습니다."
              );
            }

            const marker = new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(
                data.position.lat,
                data.position.lng
              ),
              map: mapInstanceRef.current!,
              icon: {
                content: data.isCluster
                  ? createClusterContent(data)
                  : createMarkerContent(data.crew),
                size: new window.naver.maps.Size(
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE : 36,
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE : 36
                ),
                anchor: new window.naver.maps.Point(
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE / 2 : 18,
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE / 2 : 18
                ),
              },
            });

            // 마커 클릭 이벤트
            window.naver.maps.Event.addListener(marker, "click", async () => {
              if (data.isCluster) {
                // 클러스터 클릭 시 줌인
                const currentZoom = mapInstanceRef.current!.getZoom();
                const newZoom = Math.min(currentZoom + 2, 21);
                mapInstanceRef.current!.setZoom(newZoom);
                mapInstanceRef.current!.setCenter(
                  new window.naver.maps.LatLng(
                    data.position.lat,
                    data.position.lng
                  )
                );
              } else {
                // 개별 마커 클릭 시 크루 상세 정보 표시
                try {
                  const detailedCrew = await crewService.getCrewDetail(
                    data.crew.id
                  );
                  setSelectedCrew(detailedCrew || data.crew);

                  if (onCrewSelect) {
                    onCrewSelect(detailedCrew || data.crew);
                  }
                } catch (error) {
                  console.error("크루 상세 정보 조회 실패:", error);
                  setSelectedCrew(data.crew);

                  if (onCrewSelect) {
                    onCrewSelect(data.crew);
                  }
                }
                setIsDetailOpen(true);
              }
            });

            return marker;
          });

          createdMarkers = [...createdMarkers, ...batchMarkers];
          currentIndex = endIndex;

          // 다음 배치 생성
          if (currentIndex < markerData.length) {
            setTimeout(createNextBatch, delayMs);
          }
        } catch (error) {
          console.error("마커 배치 생성 중 오류 발생:", error);
          return;
        }
      };

      // 첫 번째 배치 생성 시작
      createNextBatch();

      return createdMarkers;
    },
    [
      createClusterContent,
      createMarkerContent,
      onCrewSelect,
      setSelectedCrew,
      setIsDetailOpen,
    ]
  );

  // 마커 새로 고침 함수 - 클러스터링 적용
  const refreshMarkers = useCallback(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 화면에 보이는 크루만 필터링
    const bounds = mapInstanceRef.current.getBounds();
    const visibleCrewsForClustering = bounds
      ? crews.filter((crew) => {
          const position = new window.naver.maps.LatLng(
            crew.location.lat,
            crew.location.lng
          );
          return (bounds as naver.maps.LatLngBounds).hasLatLng(position);
        })
      : crews;

    // 클러스터링 적용
    const markerData = clusterCrews(visibleCrewsForClustering);

    // 새 마커 생성
    markersRef.current = createMarkersWithClustering(markerData, 20, 50);

    // 보이는 크루 목록 업데이트
    updateVisibleCrews();
  }, [crews, clusterCrews, createMarkersWithClustering, updateVisibleCrews]);

  // 마커 초기화 - 클러스터링 적용
  const initializeMarkers = useCallback(() => {
    if (
      !mapInstanceRef.current ||
      typeof window === "undefined" ||
      markersCreatedRef.current
    )
      return;

    // 클러스터링 적용된 마커 생성
    refreshMarkers();
    markersCreatedRef.current = true;

    // 마커 초기화가 완료되면 반드시 onMapLoad 호출
    if (onMapLoad) {
      console.log("Markers initialized with clustering, calling onMapLoad");
      setTimeout(onMapLoad, 100);
    }
  }, [refreshMarkers, onMapLoad]);

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

      // 줌 시작 시 마커 숨김 (드래그로 인한 줌만)
      window.naver.maps.Event.addListener(mapInstance, "zoom_start", () => {
        setIsZooming(true);
        toggleMarkers(false); // 마커 숨김
      });

      // 모든 줌 변경 시 클러스터링 다시 적용 (클릭 줌인, 드래그 줌, 버튼 줌 등 모든 경우)
      window.naver.maps.Event.addListener(mapInstance, "zoom_changed", () => {
        // 줌 변경 후 클러스터링 다시 적용
        setTimeout(() => {
          refreshMarkers(); // 클러스터링 다시 적용
          setIsZooming(false); // 줌 상태 초기화
        }, 150);
      });

      // 드래그 시작 시 마커 숨김
      window.naver.maps.Event.addListener(mapInstance, "dragstart", () => {
        toggleMarkers(false); // 마커 숨김
      });

      // 드래그 종료 후 클러스터링 다시 적용
      window.naver.maps.Event.addListener(mapInstance, "dragend", () => {
        // 지도 이동 종료 시 클러스터링 다시 적용
        refreshMarkers();
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
    refreshMarkers,
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
