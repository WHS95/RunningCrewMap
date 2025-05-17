import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  // YYYY-MM-DD 형식인지 확인 (RunningEvent의 startDate 형식)
  if (dateString.includes('-')) {
    const date = new Date(dateString);
    // 날짜 변환
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }
  
  // 이미 포맷된 문자열이면 그대로 반환 (마라톤 데이터의 date 형식: "5/17 (토)")
  return dateString;
}

export function formatTime(time: string) {
  // mm:ss 형식의 시간을 검증하고 포맷팅
  const timeRegex = /^([0-5]?[0-9]):([0-5][0-9])$/;
  if (!timeRegex.test(time)) return time;
  return time;
}

export function formatPace(pace: string) {
  // mm:ss 형식의 페이스를 검증하고 포맷팅
  const paceRegex = /^([0-5]?[0-9]):([0-5][0-9])$/;
  if (!paceRegex.test(pace)) return pace;
  return pace;
}

export function getCourseTypes(courses: string): string[] {
  if (!courses) return [];
  return courses.split(',').map(course => course.trim());
}

export function parseRegistrationFee(fee: string): { [key: string]: string } {
  if (!fee) return {};
  
  const result: { [key: string]: string } = {};
  const parts = fee.split('/').map(part => part.trim());
  
  for (const part of parts) {
    // 정규표현식으로 코스와 금액 분리
    const match = part.match(/(\d+,*\d*원)\s*\((.*?)\)/);
    if (match) {
      const amount = match[1];
      const course = match[2];
      result[course] = amount;
    } else {
      // 단순 금액만 있는 경우
      result['기본'] = part;
    }
  }
  
  return result;
}
