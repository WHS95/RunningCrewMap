"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Crew } from "@/lib/types/crew";
import { ArrowUpRight, MapPin, ChevronUp } from "lucide-react";
import Image from "next/image";

interface CrewListProps {
  crews: Crew[];
  onSelect?: (crew: Crew) => void;
}

// 도 단위로 크루를 그룹화하는 함수
const groupCrewsByProvince = (crews: Crew[]) => {
  const grouped: Record<string, Crew[]> = {};

  crews.forEach((crew) => {
    // 주소에서 도 단위를 추출 (경기도, 강원도, 서울특별시, 경상남도 등)
    const address =
      crew.location.address || crew.location.main_address || "기타";
    const addressParts = address.split(" ");

    // 도/시 추출 로직
    let province = "기타";
    if (addressParts.length > 0) {
      const firstPart = addressParts[0];
      // 특별시/광역시는 그대로 사용
      if (firstPart.includes("특별시") || firstPart.includes("광역시")) {
        province = firstPart;
      }
      // 일반 시는 도 단위로 그룹화
      else if (addressParts.length > 1 && firstPart.includes("도")) {
        province = firstPart;
      }
      // 기타 경우 (예: '서울', '부산' 등)
      else if (firstPart === "서울") {
        province = "서울특별시";
      } else if (firstPart === "부산") {
        province = "부산광역시";
      } else if (firstPart === "대구") {
        province = "대구광역시";
      } else if (firstPart === "인천") {
        province = "인천광역시";
      } else if (firstPart === "광주") {
        province = "광주광역시";
      } else if (firstPart === "대전") {
        province = "대전광역시";
      } else if (firstPart === "울산") {
        province = "울산광역시";
      } else if (firstPart === "세종") {
        province = "세종특별자치시";
      } else if (firstPart === "경기") {
        province = "경기도";
      } else if (firstPart === "강원") {
        province = "강원도";
      } else if (firstPart === "충북") {
        province = "충청북도";
      } else if (firstPart === "충남") {
        province = "충청남도";
      } else if (firstPart === "전북") {
        province = "전라북도";
      } else if (firstPart === "전남") {
        province = "전라남도";
      } else if (firstPart === "경북") {
        province = "경상북도";
      } else if (firstPart === "경남") {
        province = "경상남도";
      } else if (firstPart === "제주") {
        province = "제주특별자치도";
      }
    }

    if (!grouped[province]) {
      grouped[province] = [];
    }

    grouped[province].push(crew);
  });

  // 지역명 기준으로 정렬된 결과 반환
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([location, crews]) => ({
      location,
      crews,
    }));
};

export const CrewList = ({ crews, onSelect }: CrewListProps) => {
  // 리스트 컨테이너에 대한 ref
  const listContainerRef = useRef<HTMLDivElement>(null);
  // 각 크루 아이템의 관찰 상태를 저장
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
  // 옵저버 인스턴스 참조
  const observerRef = useRef<IntersectionObserver | null>(null);
  // 모든 크루 아이템 참조를 저장
  const crewRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 상단으로 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 지역별로 그룹화된 크루 목록 메모이제이션
  const groupedCrews = useMemo(() => groupCrewsByProvince(crews), [crews]);

  // 인터섹션 옵저버 설정
  const setupObserver = useCallback(() => {
    if (typeof IntersectionObserver === "undefined") return;

    // 이전 옵저버 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 새 옵저버 생성
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-crew-id");
          if (id) {
            setVisibleItems((prev) => ({
              ...prev,
              [id]: entry.isIntersecting,
            }));
          }
        });
      },
      {
        root: listContainerRef.current,
        rootMargin: "100px 0px",
        threshold: 0.1,
      }
    );

    // 모든 크루 아이템 관찰
    Object.values(crewRefs.current).forEach((ref) => {
      if (ref) {
        observerRef.current?.observe(ref);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // 크루 아이템 참조 설정 및 초기 가시성 설정
  const setItemRef = useCallback(
    (id: string, element: HTMLDivElement | null) => {
      if (element) {
        crewRefs.current[id] = element;
        // 초기 모든 아이템을 보이지 않는 것으로 설정
        if (!visibleItems[id]) {
          setVisibleItems((prev) => ({ ...prev, [id]: false }));
        }
      }
    },
    [visibleItems]
  );

  // 크루 항목이 변경되면 옵저버 재설정
  useEffect(() => {
    const cleanup = setupObserver();

    // 컴포넌트 언마운트 시 옵저버 정리
    return () => {
      cleanup?.();
      observerRef.current?.disconnect();
    };
  }, [crews, setupObserver]);

  // 크루 렌더링을 최적화하는 함수
  const renderCrewItem = useCallback(
    (crew: Crew, index: number) => {
      // 이미지 최적화 설정
      const isVisible = visibleItems[crew.id] !== false; // 초기에는 모든 아이템 표시
      const shouldRenderFull = isVisible;

      return (
        <div
          key={crew.id}
          data-crew-id={crew.id}
          ref={(el) => setItemRef(crew.id, el)}
          className='flex items-start px-4 py-3 border-b border-gray-200 hover:bg-gray-50'
          onClick={() => onSelect?.(crew)}
        >
          {shouldRenderFull ? (
            <>
              {crew.logo_image ? (
                <div className='relative flex-shrink-0 w-10 h-10 mr-3 overflow-hidden border border-gray-200 rounded-full'>
                  <Image
                    src={crew.logo_image}
                    alt={crew.name}
                    width={40}
                    height={40}
                    className='object-cover'
                    priority={index === 0}
                    loading={index < 10 ? "eager" : "lazy"}
                    quality={40}
                    sizes='40px'
                  />
                </div>
              ) : (
                <div className='flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 text-base font-medium text-gray-600 bg-gray-100 rounded-full'>
                  {crew.name.charAt(0)}
                </div>
              )}

              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-medium text-gray-900'>{crew.name}</h3>
                  <ArrowUpRight className='w-4 h-4 text-gray-500' />
                </div>
                <p className='text-sm text-gray-600 line-clamp-1'>
                  {crew.description}
                </p>
                {(crew.location.address || crew.location.main_address) && (
                  <p className='flex items-center mt-1 text-xs text-gray-500 line-clamp-1'>
                    <MapPin className='flex-shrink-0 w-3 h-3 mr-1' />
                    {crew.location.address || crew.location.main_address}
                  </p>
                )}
              </div>
            </>
          ) : (
            // 화면에 보이지 않는 아이템은 최소한의 내용만 표시
            <div className='w-full h-[84px] bg-gray-50 animate-pulse'></div>
          )}
        </div>
      );
    },
    [visibleItems, onSelect, setItemRef]
  );

  return (
    <div
      ref={listContainerRef}
      className='relative h-full overflow-auto text-black bg-white'
    >
      <div className='px-4 pt-4 pb-2'>
        <p className='text-sm text-gray-600'>총 {crews.length}개의 크루</p>
      </div>

      {groupedCrews.length === 0 ? (
        <div className='flex flex-col items-center justify-center h-40 text-center'>
          <p className='text-gray-500'>등록된 크루가 없습니다.</p>
        </div>
      ) : (
        <div className='pb-24'>
          {groupedCrews.map(({ location, crews }) => (
            <div key={location} className='mb-4'>
              <div className='sticky top-0 z-10 flex items-center px-4 py-2 bg-white/95 backdrop-blur-sm'>
                <MapPin className='w-4 h-4 mr-2 text-blue-500' />
                <h3 className='text-sm font-medium text-gray-800'>
                  {location}
                </h3>
                <span className='ml-2 text-xs text-gray-500'>
                  ({crews.length})
                </span>
              </div>

              <div>
                {crews.map((crew, index) => renderCrewItem(crew, index))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 항상 표시되는 스크롤 상단 이동 버튼 */}
      <button
        onClick={scrollToTop}
        className='fixed bottom-24 right-4 z-[100] flex items-center justify-center w-11 h-11 bg-gray-400 rounded-full shadow-lg focus:outline-none hover:bg-gray-500 active:bg-gray-600 active:scale-95 transition-all duration-200'
        aria-label='맨 위로 스크롤'
      >
        <ChevronUp className='w-6 h-6 text-white' />
      </button>
    </div>
  );
};
