"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { crewService } from "@/lib/services";
import type { Crew } from "@/lib/types/crew";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
// import { CrewList } from "@/components/crew/CrewList";
import { eventEmitter, EVENTS } from "@/lib/events";
import { CSS_VARIABLES } from "@/lib/constants";
import { toast } from "sonner";
import { ErrorCode, AppError } from "@/lib/types/error";

const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
  loading: () => <LoadingSpinner message='로딩 중' />,
});

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
      if (crewsCache) {
        setCrews(crewsCache);
        return;
      }

      const data = await crewService.getAllCrews();
      crewsCache = data;
      setCrews(data);
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
      timeout: 1500, // 타임아웃 시간 증가
      maximumAge: 0,
      enableHighAccuracy: false,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          // lat: 37.5666805,
          // lng: 126.9784147,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      () => {
        console.log("위치 정보를 가져올 수 없어 기본 위치를 사용합니다.");
        setCenter(DEFAULT_CENTER);
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
          initialZoom={10} // 초기 줌 레벨 조정
          crews={crews}
        />
      </div>
    </div>
  );
}
