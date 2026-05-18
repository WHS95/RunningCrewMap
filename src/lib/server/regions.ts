// src/lib/server/regions.ts
import "server-only";
import { cache } from "react";
import { getCrews } from "./crews";
import { REGION_KEYWORDS } from "@/lib/utils/region-utils";
import type { Crew } from "@/lib/types/crew";

export type RegionCode =
  | "seoul"
  | "gyeonggi"
  | "gangwon"
  | "gyeongsang"
  | "jeolla"
  | "chungcheong"
  | "jeju";

export interface RegionDef {
  code: RegionCode;
  /** 한국어 표시명 (예: "서울", "경상도") */
  name: string;
  /** 페이지 타이틀용 한 줄 설명 */
  blurb: string;
  /** 정적 미니맵용 중심 좌표 (Week 2부터 사용) */
  center: { lat: number; lng: number };
}

export const REGION_DEFS: ReadonlyArray<RegionDef> = [
  { code: "seoul",      name: "서울",   blurb: "한강과 도심 러닝 수요가 큰 지역",                       center: { lat: 37.5665, lng: 126.9780 } },
  { code: "gyeonggi",   name: "경기",   blurb: "분당·판교·수원·일산 등 생활권 단위로 분포",            center: { lat: 37.4138, lng: 127.5183 } },
  { code: "gangwon",    name: "강원",   blurb: "강릉·춘천·속초의 자연 러닝 코스",                       center: { lat: 37.8228, lng: 128.1555 } },
  { code: "gyeongsang", name: "경상도", blurb: "부산·대구·울산을 중심으로 한 광역 러닝 씬",              center: { lat: 35.8714, lng: 128.6014 } },
  { code: "jeolla",     name: "전라도", blurb: "광주·전주를 중심으로 한 지역 러닝 커뮤니티",             center: { lat: 35.1595, lng: 126.8526 } },
  { code: "chungcheong",name: "충청도", blurb: "대전·세종·청주 도심형 러닝 크루",                       center: { lat: 36.3504, lng: 127.3845 } },
  { code: "jeju",       name: "제주도", blurb: "여행형 러닝 수요가 큰 지역",                            center: { lat: 33.4996, lng: 126.5312 } },
];

export interface RegionSummary extends RegionDef {
  /** is_visible=true 크루 중 이 지역으로 분류된 개수 */
  count: number;
}

export function getAllRegionCodes(): RegionCode[] {
  return REGION_DEFS.map((d) => d.code);
}

export function getRegionDef(code: string): RegionDef | undefined {
  return REGION_DEFS.find((d) => d.code === code);
}

/** main_address 우선으로 크루 1개의 지역 코드를 결정. 매칭 실패 시 null. */
export function regionCodeForCrew(crew: Crew): RegionCode | null {
  const address = crew.location.main_address || crew.location.address || "";
  if (!address) return null;
  const firstPart = address.split(" ")[0] || "";

  // 광주 동음이의 — "광주시"는 경기, "광주광역시"는 전라
  if (firstPart === "광주시" || firstPart === "광주") {
    if (address.includes("경기")) return "gyeonggi";
    return "jeolla";
  }

  for (const code of getAllRegionCodes()) {
    const keywords = REGION_KEYWORDS[code] ?? [];
    if (keywords.some((kw) => firstPart.includes(kw))) {
      return code;
    }
  }
  return null;
}

export const getRegionSummaries = cache(async (): Promise<RegionSummary[]> => {
  const crews = await getCrews();
  const counts = new Map<RegionCode, number>();
  for (const crew of crews) {
    const code = regionCodeForCrew(crew);
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return REGION_DEFS.map((def) => ({ ...def, count: counts.get(def.code) ?? 0 }));
});

export const getCrewsByRegion = cache(async (code: RegionCode): Promise<Crew[]> => {
  const crews = await getCrews();
  return crews.filter((c) => regionCodeForCrew(c) === code);
});
