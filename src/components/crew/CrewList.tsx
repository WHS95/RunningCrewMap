"use client";

import { useMemo } from "react";
import { Crew } from "@/lib/types/crew";
import { ArrowUpRight, MapPin } from "lucide-react";

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
  // 지역별로 그룹화된 크루 목록 메모이제이션
  const groupedCrews = useMemo(() => groupCrewsByProvince(crews), [crews]);

  return (
    <div className='h-full overflow-auto text-black bg-white'>
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
                {crews.map((crew) => (
                  <div
                    key={crew.id}
                    className='flex items-start px-4 py-3 border-b border-gray-200 hover:bg-gray-50'
                    onClick={() => onSelect?.(crew)}
                  >
                    {crew.logo_image ? (
                      <div className='flex-shrink-0 w-10 h-10 mr-3 overflow-hidden border border-gray-200 rounded-full'>
                        <img
                          src={crew.logo_image}
                          alt={crew.name}
                          className='object-cover w-full h-full'
                        />
                      </div>
                    ) : (
                      <div className='flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 text-base font-medium text-gray-600 bg-gray-100 rounded-full'>
                        {crew.name.charAt(0)}
                      </div>
                    )}

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <h3 className='font-medium text-gray-900'>
                          {crew.name}
                        </h3>
                        <ArrowUpRight className='w-4 h-4 text-gray-500' />
                      </div>
                      <p className='text-sm text-gray-600 line-clamp-1'>
                        {crew.description}
                      </p>
                      {(crew.location.address ||
                        crew.location.main_address) && (
                        <p className='flex items-center mt-1 text-xs text-gray-500 line-clamp-1'>
                          <MapPin className='flex-shrink-0 w-3 h-3 mr-1' />
                          {crew.location.address || crew.location.main_address}
                        </p>
                      )}
                      {/* {crew.instagram && (
                        <p className='mt-1 text-xs text-blue-600'>
                          {crew.instagram}
                        </p>
                      )} */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
