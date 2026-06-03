// src/lib/server/pin-auth.ts
// 쿠키-프리 PIN 인증 코어 — bcrypt 검증 + 5회 실패 잠금.
// loginWithPin(쿠키 설정)과 백채널 verify-pin(쿠키 없음)이 SINGLE-SOURCE로 공유.
// 이 모듈은 next/headers 쿠키를 절대 건드리지 않는다.
import "server-only";
import { serverSupabase } from "@/lib/server/supabase";
import { isValidPinFormat, normalizeInstagramHandle, verifyPin } from "@/lib/server/pin";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15분

export type VerifyCrewPinResult =
  | { ok: true; crewId: string; pinSetAt: string }
  | { ok: false; reason: "invalid" | "locked" | "no-pin"; unlocksAt?: string };

/**
 * Escape SQL LIKE wildcards in the handle so ilike performs an exact
 * case-insensitive match (Instagram handles can contain '_').
 */
function escapeLikePattern(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

/**
 * PIN 검증 + 잠금 처리의 단일 소스.
 * 쿠키를 설정하지 않으며, 성공 시 crewId와 pin_set_at(세션 발급 재료)을 반환한다.
 * loginWithPin은 이 결과로 쿠키를 굽고, 백채널은 토큰을 발급한다.
 */
export async function verifyCrewPin(
  instagramInput: string,
  pin: string
): Promise<VerifyCrewPinResult> {
  if (!isValidPinFormat(pin)) {
    return { ok: false, reason: "invalid" };
  }
  const handle = normalizeInstagramHandle(instagramInput);
  if (!handle) {
    return { ok: false, reason: "invalid" };
  }

  // ilike with escaped wildcards = case-insensitive exact match.
  // The crews_instagram_lower_unique_idx index guarantees ≤1 row.
  const { data, error } = await serverSupabase
    .from("crews")
    .select("id, pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until")
    .ilike("instagram", escapeLikePattern(handle))
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "invalid" };
  }

  const row = data as {
    id: string;
    pin_hash: string | null;
    pin_set_at: string | null;
    failed_pin_attempts: number;
    pin_locked_until: string | null;
  };

  // 잠금 확인
  if (row.pin_locked_until) {
    const unlock = new Date(row.pin_locked_until).getTime();
    if (unlock > Date.now()) {
      return { ok: false, reason: "locked", unlocksAt: row.pin_locked_until };
    }
  }

  // PIN 미설정
  if (!row.pin_hash || !row.pin_set_at) {
    return { ok: false, reason: "no-pin" };
  }

  const ok = await verifyPin(pin, row.pin_hash);
  if (ok) {
    // 카운터 리셋
    await serverSupabase
      .from("crews")
      .update({ failed_pin_attempts: 0, pin_locked_until: null })
      .eq("id", row.id);
    return { ok: true, crewId: row.id, pinSetAt: row.pin_set_at };
  }

  // 실패 카운트 증가 — 단일 SQL UPDATE ... RETURNING으로 원자적 read-modify-write.
  // 동시 실패 요청이 카운터를 갉아먹던 비원자성 경쟁을 닫는다.
  const { data: incData, error: incErr } = await serverSupabase
    .from("crews")
    .update({ failed_pin_attempts: row.failed_pin_attempts + 1 })
    .eq("id", row.id)
    // 동시성 가드: 우리가 읽은 값 그대로일 때만 증가 (lost-update 방지).
    // 경합으로 빗나가면 incData가 비고, 아래 폴백이 처리한다.
    .eq("failed_pin_attempts", row.failed_pin_attempts)
    .select("failed_pin_attempts")
    .maybeSingle();

  let nextAttempts: number;
  if (incErr || !incData) {
    // CAS 빗나감(경합) — 안전하게 최신값 재조회. 실패 시 보수적으로 +1.
    const { data: reread } = await serverSupabase
      .from("crews")
      .select("failed_pin_attempts")
      .eq("id", row.id)
      .maybeSingle();
    nextAttempts = (reread as { failed_pin_attempts: number } | null)
      ? (reread as { failed_pin_attempts: number }).failed_pin_attempts
      : row.failed_pin_attempts + 1;
  } else {
    nextAttempts = (incData as { failed_pin_attempts: number }).failed_pin_attempts;
  }

  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
    await serverSupabase
      .from("crews")
      .update({ failed_pin_attempts: 0, pin_locked_until: lockUntil })
      .eq("id", row.id);
    return { ok: false, reason: "locked", unlocksAt: lockUntil };
  }

  return { ok: false, reason: "invalid" };
}
