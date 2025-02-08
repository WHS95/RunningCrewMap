// 시간 문자열을 초로 변환
export function timeToSeconds(
  hours: number,
  minutes: number,
  seconds: number
): number {
  return hours * 3600 + minutes * 60 + seconds;
}

// 초를 시간 문자열로 변환 (00:00:00 형식)
export function secondsToTimeString(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// 스플릿 타임 계산
export function calculateSplitTimes(
  targetDistance: number,
  targetTimeSeconds: number,
  splits: number[] = [5, 10, 21.1, 30, 42.195]
): { distance: number; time: string }[] {
  const pacePerKm = targetTimeSeconds / targetDistance; // km당 초

  return splits
    .filter((split) => split <= targetDistance)
    .map((split) => ({
      distance: split,
      time: secondsToTimeString(Math.round(split * pacePerKm)),
    }));
}

// 입력값 검증
export function validateTimeInputs(
  hours: number,
  minutes: number,
  seconds: number
): boolean {
  return (
    hours >= 0 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60
  );
}

// Riegel's Formula를 사용한 완주 시간 예측
export function predictFinishTime(
  recordedDistance: number, // 기록한 거리 (km)
  recordedTimeSeconds: number, // 기록한 시간 (초)
  targetDistance: number // 목표 거리 (km)
): number {
  // T2 = T1 * (D2/D1)^1.06
  const predictedSeconds =
    recordedTimeSeconds * Math.pow(targetDistance / recordedDistance, 1.06);
  return Math.round(predictedSeconds);
}

// 페이스(km당 시간) 계산
export function calculatePace(distanceKm: number, timeSeconds: number): string {
  const secondsPerKm = timeSeconds / distanceKm;
  const paceMinutes = Math.floor(secondsPerKm / 60);
  const paceSeconds = Math.floor(secondsPerKm % 60);
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, "0")}/km`;
}

// 기본 거리 옵션
export const COMMON_DISTANCES = [
  { value: 5, label: "5K" },
  { value: 10, label: "10K" },
  { value: 21.1, label: "하프마라톤" },
  { value: 42.195, label: "풀코스" },
] as const;

// 최대 심박수 계산 (나이 기반)
export function calculateMaxHeartRate(age: number): number {
  return 220 - age;
}

// 심박수 존 계산
export interface HeartRateZone {
  zone: number;
  name: string;
  min: number;
  max: number;
  description: string;
}

export function calculateHeartRateZones(age: number): HeartRateZone[] {
  const maxHR = calculateMaxHeartRate(age);

  return [
    {
      zone: 1,
      name: "회복",
      min: Math.round(maxHR * 0.5),
      max: Math.round(maxHR * 0.6),
      description: "매우 가벼운 운동, 워밍업과 쿨다운에 적합",
    },
    {
      zone: 2,
      name: "기초 지구력",
      min: Math.round(maxHR * 0.6),
      max: Math.round(maxHR * 0.7),
      description: "편안한 페이스, 장거리 러닝의 기본",
    },
    {
      zone: 3,
      name: "유산소",
      min: Math.round(maxHR * 0.7),
      max: Math.round(maxHR * 0.8),
      description: "중간 강도, 유산소 능력 향상",
    },
    {
      zone: 4,
      name: "젖산 역치",
      min: Math.round(maxHR * 0.8),
      max: Math.round(maxHR * 0.9),
      description: "고강도, 젖산 역치 향상",
    },
    {
      zone: 5,
      name: "최대 산소 섭취량",
      min: Math.round(maxHR * 0.9),
      max: maxHR,
      description: "최대 강도, 단시간 운동에 적합",
    },
  ];
}
