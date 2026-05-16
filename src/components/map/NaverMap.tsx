"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Crew } from "@/lib/types/crew";
// import { CrewDetailSheet } from "@/components/map/CrewDetailSheet";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { VisibleCrewList } from "@/components/map/VisibleCrewList";
import { SearchBox } from "@/components/search/SearchBox";
import { ListFilter, Target, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { crewService } from "@/lib/services/crew.service";

// ======================================
// 마커 클러스터링 설정 (수정 가능한 기준들)
// ======================================
// Cartographic Dark cluster + pin colors.
// Marker background is white (#FFFFFF) per request — works with any
// logo color without clashing with the lime brand accent. The dark
// stroke keeps the pin visible on the inverted-dark map tiles.
const CART_LIME = "#C7FF00"; // kept for reference; no longer used in marker fill
const CART_INK = "#0B0C0A";
const MARKER_BG = "#FFFFFF";
// Counter-filter to cancel the map container's dark inversion on marker HTML.
const MARKER_COUNTER_FILTER =
  "invert(1) hue-rotate(180deg) saturate(1.8) brightness(1.05) contrast(1.05)";

void CART_LIME; // suppress "declared but never read" — retained for future tweaks

const CLUSTERING_CONFIG = {
  // 클러스터링을 시작할 최대 줌 레벨 (이 값보다 낮으면 클러스터링 적용)
  MAX_ZOOM_FOR_CLUSTERING: 20,

  // 클러스터링 거리 (픽셀 단위) - 이 거리 내의 마커들을 하나로 묶음
  CLUSTER_DISTANCE: 80,

  // 클러스터를 형성하기 위한 최소 마커 개수
  MIN_CLUSTER_SIZE: 3,

  // 클러스터 마커 크기 — bumped from 36 to 42 alongside individual-pin size
  // increase so crew leaders can spot their crew at a glance.
  CLUSTER_SIZE: 42,

  CLUSTER_STYLES: {
    backgroundColor: MARKER_BG,
    textColor: CART_INK,
    borderColor: CART_INK,
    borderWidth: 1,
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const markersCreatedRef = useRef(false);
  // 이미지 캐시 상태 저장용 ref 추가
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshZoomRef = useRef<number | null>(null);
  const lastRefreshBoundsRef = useRef<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);
  // 현재 위치 관련 상태
  const [isLocating, setIsLocating] = useState(false);

  // ======================================
  // 현재 위치 이동 함수
  // ======================================

  // 현재 위치로 지도 이동
  const moveToCurrentLocation = useCallback(async () => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    setIsLocating(true);

    try {
      // Geolocation API 지원 확인
      if (!navigator.geolocation) {
        alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
        return;
      }

      // 현재 위치 가져오기
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, // 높은 정확도 요청
            timeout: 10000, // 10초 타임아웃
            maximumAge: 300000, // 5분간 캐시된 위치 사용 가능
          });
        }
      );

      const { latitude, longitude } = position.coords;

      // 지도 중심을 현재 위치로 이동
      const currentPosition = new window.naver.maps.LatLng(latitude, longitude);
      mapInstanceRef.current.setCenter(currentPosition);
      mapInstanceRef.current.setZoom(16); // 적절한 줌 레벨 설정

      // 지도 이동 후 마커 새로고침
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 200);
    } catch (error) {
      // 에러 처리
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert(
              "위치 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            alert(
              "현재 위치를 찾을 수 없습니다. 위치 서비스가 활성화되어 있는지 확인해주세요."
            );
            break;
          case error.TIMEOUT:
            alert("위치 요청이 시간 초과되었습니다. 다시 시도해주세요.");
            break;
          default:
            alert("위치를 가져오는 중 오류가 발생했습니다.");
        }
      } else {
        console.error("위치 가져오기 실패:", error);
        alert("위치를 가져오는 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLocating(false);
    }
  }, []);

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

  // Cartographic Dark cluster stamp — lime square with mono count, counter-filtered
  // so the map container's dark inversion doesn't flip its color.
  const createClusterContent = useCallback((clusterData: ClusterMarker) => {
    const size = CLUSTERING_CONFIG.CLUSTER_SIZE;
    const styles = CLUSTERING_CONFIG.CLUSTER_STYLES;
    const fontSize = clusterData.crews.length > 99 ? 11 : 13;

    return `<div style="
      filter: ${MARKER_COUNTER_FILTER};
      width: ${size}px;
      height: ${size}px;
    ">
      <div style="
        width: 100%;
        height: 100%;
        border-radius: 3px;
        background-color: ${styles.backgroundColor};
        border: ${styles.borderWidth}px solid ${styles.borderColor};
        color: ${styles.textColor};
        font-weight: 700;
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;
        letter-spacing: 0.04em;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        cursor: pointer;
      ">${clusterData.crews.length}</div>
    </div>`;
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
    mapInstanceRef.current.setZoom(17);

    // 지도 이동 후 마커 새로고침 트리거
    setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 200);

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

  // Cartographic Dark crew pin — lime teardrop with dark stroke + center logo.
  // Bumped from 36×42 → 48×58 (≈33% larger) per crew-leader feedback: the pin
  // is the proudest moment for a crew so it should be visible without
  // squinting. The teardrop path keeps its original 36×42 viewBox and just
  // scales up — design proportions remain identical to the prototype.
  const createMarkerContent = useCallback((crew: Crew) => {
    const width = 48;
    const height = 58;
    const logoSize = 32; // inner logo edge length
    const wellSize = logoSize + 2; // lime circular well around the logo

    // Logo or initial inside the teardrop head
    let innerContent = "";
    if (crew.logo_image) {
      const optimizedLogoUrl = crew.logo_image.includes("?")
        ? `${crew.logo_image}&width=${logoSize * 2}`
        : `${crew.logo_image}?width=${logoSize * 2}`;
      innerContent = `
        <img
          src="${optimizedLogoUrl}"
          width="${logoSize}"
          height="${logoSize}"
          alt="${crew.name}"
          style="object-fit: cover; width: ${logoSize}px; height: ${logoSize}px; border-radius: 50%; display:block;"
          loading="lazy"
          decoding="async"
          onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=&quot;font-family:Inter,sans-serif;font-weight:700;font-size:18px;color:${CART_INK}&quot;>${crew.name.charAt(0)}</span>'"
        />
      `;
    } else {
      innerContent = `<span style="font-family:Inter,sans-serif;font-weight:700;font-size:18px;color:${CART_INK};line-height:1;">${crew.name.charAt(0)}</span>`;
    }

    return `<div style="
      filter: ${MARKER_COUNTER_FILTER};
      width: ${width}px;
      height: ${height}px;
      position: relative;
      cursor: pointer;
    ">
      <svg width="${width}" height="${height}" viewBox="0 0 36 42" style="position:absolute;inset:0;display:block;">
        <path
          d="M18 41 C 18 28, 35 28, 35 16 a 17 17 0 1 0 -34 0 c 0 12, 17 12, 17 25 z"
          fill="${MARKER_BG}"
          stroke="${CART_INK}"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
      </svg>
      <div style="
        position: absolute;
        top: 5px;
        left: 50%;
        transform: translateX(-50%);
        width: ${wellSize}px;
        height: ${wellSize}px;
        background: ${MARKER_BG};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      ">${innerContent}</div>
    </div>`;
  }, []);

  // 클러스터링을 적용한 마커 생성 함수
  const createMarkersWithClustering = useCallback(
    (markerData: MarkerData[], batchSize = 50, delayMs = 30) => {
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
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE : 48,
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE : 58
                ),
                // Teardrop pin: anchor at the tip (bottom center) so pin points to the location.
                anchor: new window.naver.maps.Point(
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE / 2 : 24,
                  data.isCluster ? CLUSTERING_CONFIG.CLUSTER_SIZE / 2 : 58
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

    const currentZoom = mapInstanceRef.current.getZoom();
    const bounds = mapInstanceRef.current.getBounds() as
      | naver.maps.LatLngBounds
      | null;

    let currentBoundsBox: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    } | null = null;

    if (bounds) {
      const sw = bounds.getSW();
      const ne = bounds.getNE();
      currentBoundsBox = {
        minLat: sw.lat(),
        maxLat: ne.lat(),
        minLng: sw.lng(),
        maxLng: ne.lng(),
      };

      // 줌이 동일하고 bounds 가 95% 이상 겹치면 재계산 스킵 (작은 드래그 무시)
      if (
        lastRefreshZoomRef.current === currentZoom &&
        lastRefreshBoundsRef.current
      ) {
        const prev = lastRefreshBoundsRef.current;
        const curr = currentBoundsBox;
        const interMinLat = Math.max(prev.minLat, curr.minLat);
        const interMaxLat = Math.min(prev.maxLat, curr.maxLat);
        const interMinLng = Math.max(prev.minLng, curr.minLng);
        const interMaxLng = Math.min(prev.maxLng, curr.maxLng);
        const interLat = Math.max(0, interMaxLat - interMinLat);
        const interLng = Math.max(0, interMaxLng - interMinLng);
        const interArea = interLat * interLng;
        const prevArea =
          (prev.maxLat - prev.minLat) * (prev.maxLng - prev.minLng);
        const currArea =
          (curr.maxLat - curr.minLat) * (curr.maxLng - curr.minLng);
        const unionArea = prevArea + currArea - interArea;
        const overlap = unionArea > 0 ? interArea / unionArea : 0;
        if (overlap > 0.95) {
          return;
        }
      }
    }

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 화면에 보이는 크루만 필터링
    const visibleCrewsForClustering = bounds
      ? crews.filter((crew) => {
          const position = new window.naver.maps.LatLng(
            crew.location.lat,
            crew.location.lng
          );
          return bounds.hasLatLng(position);
        })
      : crews;

    // 클러스터링 적용
    const markerData = clusterCrews(visibleCrewsForClustering);

    // 새 마커 생성
    markersRef.current = createMarkersWithClustering(markerData, 50, 30);

    // 보이는 크루 목록 업데이트
    updateVisibleCrews();

    lastRefreshZoomRef.current = currentZoom;
    lastRefreshBoundsRef.current = currentBoundsBox;
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
    if (!clientId) {
      console.error(
        "❌ NEXT_PUBLIC_RUN_NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다."
      );
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
        if (refreshDebounceRef.current) {
          clearTimeout(refreshDebounceRef.current);
        }
        refreshDebounceRef.current = setTimeout(() => {
          refreshMarkers();
          setIsZooming(false);
          refreshDebounceRef.current = null;
        }, 350);
      });

      // 드래그 시작 시 마커 숨김
      window.naver.maps.Event.addListener(mapInstance, "dragstart", () => {
        // toggleMarkers(false); // 마커 숨김
      });

      // 드래그 종료 후 클러스터링 다시 적용
      window.naver.maps.Event.addListener(mapInstance, "dragend", () => {
        if (refreshDebounceRef.current) {
          clearTimeout(refreshDebounceRef.current);
        }
        refreshDebounceRef.current = setTimeout(() => {
          refreshMarkers();
          refreshDebounceRef.current = null;
        }, 350);
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
      // 디바운스 타이머 정리
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }

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

  // refreshTrigger 상태 변화 시 마커 새로고침
  useEffect(() => {
    if (refreshTrigger > 0 && typeof refreshMarkers === "function") {
      refreshMarkers();
    }
  }, [refreshTrigger, refreshMarkers]);

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
        mapInstanceRef.current.setZoom(17);

        // 지도 이동 후 마커 새로고침
        setTimeout(() => {
          if (typeof refreshMarkers === "function") {
            refreshMarkers();
          }
        }, 200);
      }
    }
  }, [externalSelectedCrew, refreshMarkers]);

  return (
    <div style={{ width, height }} className='relative'>
      {/* 검색창 */}
      <div className='absolute top-4 left-0 right-0 z-[200]'>
        <SearchBox crews={crews} onSelect={handleCrewSelect} />
      </div>

      <div
        ref={mapRef}
        className="cartographic-map"
        style={{
          width: "100%",
          height: "100%",
          // Cartographic dark inversion. Markers counter-filter inline below.
          filter:
            "invert(0.92) hue-rotate(180deg) saturate(0.55) brightness(0.95) contrast(0.95)",
        }}
      />

      {/* Primary action FAB — go register a crew. Same 48×48 size and
          shadow as the location / list-filter utility buttons below
          it, but lime-filled so the color alone signals "this is the
          primary action" without breaking the visual rhythm of the
          right-side button stack. */}
      <Link
        href='/register'
        aria-label='크루 등록'
        title='크루 등록'
        className='absolute bottom-52 right-4 z-[101] w-12 h-12 rounded-full bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] shadow-lg flex items-center justify-center active:scale-95 hover:bg-[hsl(var(--lime))]/90 transition-transform'
      >
        <Plus className='w-5 h-5' strokeWidth={2.4} />
      </Link>

      {/* 현재 위치로 이동 버튼 */}
      <button
        onClick={moveToCurrentLocation}
        disabled={isLocating}
        className='absolute bottom-36 right-4 bg-cart-paper rounded-full w-12 h-12 shadow-lg z-[100] hover:bg-background flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
        title='현재 위치로 이동'
      >
        {isLocating ? (
          <Loader2 className='w-5 h-5 animate-spin' />
        ) : (
          <Target className='w-5 h-5' />
        )}
      </button>

      {/* 현재 화면에 보이는 크루 목록 버튼 */}
      <button
        onClick={() => setIsListOpen(true)}
        className='absolute bottom-20 right-4 bg-cart-paper rounded-full w-12 h-12 shadow-lg z-[100] hover:bg-background flex flex-col items-center justify-center'
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
