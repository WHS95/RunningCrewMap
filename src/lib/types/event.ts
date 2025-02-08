export interface RunningEvent {
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string; // 시/도 단위 필터링을 위한 필드
}

// 시/도 단위 상수
export const CITIES = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "경기도",
  "경상북도",
  "경상남도",
] as const;

export type City = (typeof CITIES)[number];
