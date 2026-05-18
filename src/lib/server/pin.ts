// src/lib/server/pin.ts
import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

/** 너무 단순한 PIN 패턴 (반복/순차/역순차) */
const WEAK_PINS = new Set<string>([
  // 동일 자리 반복
  "0000", "1111", "2222", "3333", "4444",
  "5555", "6666", "7777", "8888", "9999",
  // 오름차순
  "0123", "1234", "2345", "3456",
  "4567", "5678", "6789",
  // 내림차순
  "9876", "8765", "7654", "6543",
  "5432", "4321", "3210",
]);

export function isWeakPin(pin: string): boolean {
  return WEAK_PINS.has(pin);
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
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
