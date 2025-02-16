import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
