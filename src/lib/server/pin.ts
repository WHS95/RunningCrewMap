// src/lib/server/pin.ts
import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

/** 너무 단순한 PIN 패턴 (반복/순차/역순차) — 4자리 + 8자리 확장 */
const WEAK_PINS = new Set<string>([
  // ── 4자리 ──
  // 동일 자리 반복
  "0000", "1111", "2222", "3333", "4444",
  "5555", "6666", "7777", "8888", "9999",
  // 오름차순
  "0123", "1234", "2345", "3456",
  "4567", "5678", "6789",
  // 내림차순
  "9876", "8765", "7654", "6543",
  "5432", "4321", "3210",

  // ── 8자리 ──
  // 동일 자리 반복
  "00000000", "11111111", "22222222", "33333333", "44444444",
  "55555555", "66666666", "77777777", "88888888", "99999999",
  // 오름차순 연속
  "01234567", "12345678", "23456789",
  // 내림차순 연속
  "98765432", "87654321", "76543210",
  // 절반 반복 패턴
  "00001111", "11112222", "12341234", "11223344",
  "99998888", "12121212", "11111100",
  // 생년월일류 자주 쓰는 패턴 (연도 앞자리 + 000000 등)
  "19000000", "20000000", "19990101", "20000101",
  // 키보드 가로 슬라이드류
  "13579753", "24680864",
  // 순차 2자리씩 반복
  "01010101", "12121212", "23232323", "34343434",
  "45454545", "56565656", "67676767", "78787878", "89898989",
]);

export function isWeakPin(pin: string): boolean {
  if (WEAK_PINS.has(pin)) return true;
  // 8자리: 모든 자리가 동일한 숫자면 약한 PIN
  if (pin.length === 8 && /^(\d)\1{7}$/.test(pin)) return true;
  // 8자리: 완전한 오름차순/내림차순 연속 (예: 01234567~23456789, 98765432~76543210)
  if (pin.length === 8) {
    const ascending = Array.from({ length: 8 }, (_, i) =>
      String((parseInt(pin[0]) + i) % 10)
    ).join("");
    if (pin === ascending) return true;
    const descending = Array.from({ length: 8 }, (_, i) =>
      String(((parseInt(pin[0]) - i) % 10 + 10) % 10)
    ).join("");
    if (pin === descending) return true;
  }
  return false;
}

/** 로그인용: 4~8자리 허용 (기존 4자리 크루 무중단) */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

/** 신규 등록·PIN 변경 전용: 정확히 8자리만 허용 */
export function isValidNewPinFormat(pin: string): boolean {
  return /^\d{8}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_COST);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * 인스타 핸들 정규화 — DB 조회는 LOWER()로 하므로 lowercase로 변환.
 * 앞의 '@', 공백 제거. 빈 문자열은 null 반환 (조회 불가 의미).
 */
export function normalizeInstagramHandle(input: string): string | null {
  const trimmed = input.trim().replace(/^@+/, "").toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}
