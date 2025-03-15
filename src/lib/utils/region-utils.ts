import type { Crew } from "@/lib/types/crew";

/**
 * 지역 관련 상수 및 유틸리티 함수들
 */

// 광역 지역 카테고리 맵핑
export const REGION_MAP: Record<string, string> = {
  // 서울
  서울: "서울",
  서울특별시: "서울",
  서울시: "서울",

  // 경기
  경기: "경기",
  경기도: "경기",
  인천: "경기",
  인천광역시: "경기",
  인천시: "경기",
  "경기도 광주시": "경기",
  "경기 광주시": "경기",
  "경기 광주": "경기",

  // 강원
  강원: "강원",
  강원도: "강원",

  // 경상
  경상: "경상",
  경상남도: "경상",
  경상북도: "경상",
  경남: "경상",
  경북: "경상",
  부산: "경상",
  부산광역시: "경상",
  부산시: "경상",
  대구: "경상",
  대구광역시: "경상",
  대구시: "경상",
  울산: "경상",
  울산광역시: "경상",
  울산시: "경상",

  // 전라
  전라: "전라",
  전라남도: "전라",
  전라북도: "전라",
  전남: "전라",
  전북: "전라",
  광주광역시: "전라",
  광주시: "전라",
  광주: "전라",

  // 충청
  충청: "충청",
  충청남도: "충청",
  충청북도: "충청",
  충남: "충청",
  충북: "충청",
  대전: "충청",
  대전광역시: "충청",
  대전시: "충청",
  세종: "충청",
  세종특별자치시: "충청",
  세종시: "충청",

  // 제주
  제주: "제주",
  제주특별자치도: "제주",
  제주도: "제주",
  제주시: "제주",
};

// 표시 이름 맵핑
export const DISPLAY_NAMES: Record<string, string> = {
  서울: "서울",
  경기: "경기",
  강원: "강원",
  경상: "경상도",
  전라: "전라도",
  충청: "충청도",
  제주: "제주도",
  기타: "기타 지역",
};

// 지역별 키워드 매핑 (필터링용)
export const REGION_KEYWORDS: Record<string, string[]> = {
  seoul: ["서울특별시", "서울시", "서울"],
  gyeonggi: ["경기도", "경기", "인천광역시", "인천시", "인천"],
  gangwon: ["강원도", "강원"],
  gyeongsang: [
    "경상남도",
    "경상북도",
    "경남",
    "경북",
    "부산광역시",
    "부산",
    "부산시",
    "대구광역시",
    "대구",
    "대구시",
    "울산광역시",
    "울산",
    "울산시",
  ],
  jeolla: ["전라남도", "전라북도", "전남", "전북", "광주광역시", "광주"],
  chungcheong: [
    "충청남도",
    "충청북도",
    "충남",
    "충북",
    "대전광역시",
    "대전",
    "세종특별자치시",
    "세종",
  ],
  jeju: ["제주특별자치도", "제주도", "제주"],
};

/**
 * 주소를 기반으로 지역을 결정하는 함수
 * @param address 크루 주소
 * @returns 결정된 지역 코드 (서울, 경기, 강원 등)
 */
export function determineRegion(address: string): string {
  const addressParts = address.split(" ");
  const firstPart = addressParts[0] || "";

  // 광주시/광주광역시 특별 처리
  if (firstPart === "광주시" || firstPart === "광주") {
    // 경기도 광주시인 경우
    if (address.includes("경기도") || address.includes("경기")) {
      return "경기";
    }
    // 광주광역시인 경우
    return "전라";
  }

  // 지역 맵핑에서 찾기
  if (REGION_MAP[firstPart]) {
    return REGION_MAP[firstPart];
  }

  // 포함 여부로 더 넓게 검색
  for (const [key, value] of Object.entries(REGION_MAP)) {
    if (firstPart.includes(key)) {
      return value;
    }
  }

  return "기타";
}

/**
 * 크루를 지역별로 그룹화하는 함수
 * @param crews 크루 배열
 * @returns 지역별로 그룹화된 크루 배열
 */
export function groupCrewsByRegion(crews: Crew[]) {
  const grouped: Record<string, Crew[]> = {};

  crews.forEach((crew) => {
    const address =
      crew.location.address || crew.location.main_address || "기타";
    const region = determineRegion(address);

    if (!grouped[region]) {
      grouped[region] = [];
    }
    grouped[region].push(crew);
  });

  // 지역명 기준으로 정렬하되, 보여지는 이름 사용
  return Object.entries(grouped)
    .sort(([a], [b]) => {
      // "기타"는 항상 마지막에
      if (a === "기타") return 1;
      if (b === "기타") return -1;
      return a.localeCompare(b);
    })
    .map(([location, crews]) => ({
      location: DISPLAY_NAMES[location] || location,
      crews,
    }));
}

/**
 * 선택된 지역 코드에 따라 크루를 필터링하는 함수
 * @param crews 크루 배열
 * @param selectedRegion 선택된 지역 코드
 * @returns 필터링된 크루 배열
 */
export function filterCrewsByRegion(
  crews: Crew[],
  selectedRegion: string
): Crew[] {
  if (selectedRegion === "all") {
    return crews;
  }

  return crews.filter((crew) => {
    const address = crew.location.address || crew.location.main_address || "";

    // 주소의 첫 부분을 확인 (시/도 단위)
    const addressParts = address.split(" ");
    const firstPart = addressParts[0] || "";

    // 광주시/광주광역시 특별 처리
    if (firstPart === "광주시" || firstPart === "광주") {
      // 주소에 "경기" 또는 "경기도"가 포함되어 있으면 경기도 광주시로 간주
      if (address.includes("경기도") || address.includes("경기")) {
        return selectedRegion === "gyeonggi";
      }
      // 그 외에는 광주광역시로 간주
      return selectedRegion === "jeolla";
    }

    // 선택된 지역의 키워드에 주소의 첫 부분이 포함되는지 확인
    return (
      REGION_KEYWORDS[selectedRegion]?.some((keyword) =>
        firstPart.includes(keyword)
      ) || false
    );
  });
}

/**
 * 지역별 크루 수를 계산하는 함수
 * @param crews 크루 배열
 * @returns 지역별 크루 수 객체
 */
export function countCrewsByRegion(crews: Crew[]) {
  const regionCounts: Record<
    string,
    { id: string; name: string; count: number }
  > = {
    seoul: { id: "seoul", name: "서울", count: 0 },
    gyeonggi: { id: "gyeonggi", name: "경기", count: 0 },
    gangwon: { id: "gangwon", name: "강원", count: 0 },
    gyeongsang: { id: "gyeongsang", name: "경상", count: 0 },
    jeolla: { id: "jeolla", name: "전라", count: 0 },
    chungcheong: { id: "chungcheong", name: "충청", count: 0 },
    jeju: { id: "jeju", name: "제주", count: 0 },
  };

  // 각 크루 카운팅
  crews.forEach((crew) => {
    // 이 크루를 각 지역별 필터에 적용해보고 매칭되는 지역의 카운트 증가
    for (const regionId of Object.keys(regionCounts)) {
      if (filterCrewsByRegion([crew], regionId).length > 0) {
        regionCounts[regionId].count++;
        break; // 첫 번째 매칭되는 지역에만 카운트
      }
    }
  });

  return regionCounts;
}
