"use server";

import { serverSupabase } from "@/lib/server/supabase";
import {
  hashPin,
  isValidPinFormat,
  isWeakPin,
  normalizeInstagramHandle,
  verifyPin,
} from "@/lib/server/pin";
import {
  clearCrewSessionCookie,
  getCrewSession,
  setCrewSessionCookie,
} from "@/lib/server/crewSession";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15분

export async function logoutCrew(): Promise<void> {
  await clearCrewSessionCookie();
}

type LoginResult =
  | { ok: true; crewId: string }
  | { ok: false; reason: "invalid" | "locked" | "no-pin"; unlocksAt?: string };

/**
 * Escape SQL LIKE wildcards in the handle so ilike performs an exact
 * case-insensitive match (Instagram handles can contain '_').
 */
function escapeLikePattern(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

export async function loginWithPin(
  instagramInput: string,
  pin: string
): Promise<LoginResult> {
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
    .select(
      "id, pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until"
    )
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
      return {
        ok: false,
        reason: "locked",
        unlocksAt: row.pin_locked_until,
      };
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
      .update({
        failed_pin_attempts: 0,
        pin_locked_until: null,
      })
      .eq("id", row.id);
    await setCrewSessionCookie(row.id, row.pin_set_at);
    return { ok: true, crewId: row.id };
  }

  // 실패 카운트 증가
  const nextAttempts = row.failed_pin_attempts + 1;
  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
    await serverSupabase
      .from("crews")
      .update({
        failed_pin_attempts: 0,
        pin_locked_until: lockUntil,
      })
      .eq("id", row.id);
    return { ok: false, reason: "locked", unlocksAt: lockUntil };
  } else {
    await serverSupabase
      .from("crews")
      .update({ failed_pin_attempts: nextAttempts })
      .eq("id", row.id);
    return { ok: false, reason: "invalid" };
  }
}

type SetPinResult =
  | { ok: true }
  | { ok: false; reason: "invalid-token" | "weak-pin" | "bad-format" };

export async function setCrewPinWithToken(
  crewId: string,
  token: string,
  pin: string
): Promise<SetPinResult> {
  if (!isValidPinFormat(pin)) return { ok: false, reason: "bad-format" };
  if (isWeakPin(pin)) return { ok: false, reason: "weak-pin" };
  if (!crewId || !token) return { ok: false, reason: "invalid-token" };

  const { data, error } = await serverSupabase
    .from("crews")
    .select("id, edit_token")
    .eq("id", crewId)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "invalid-token" };
  const row = data as { id: string; edit_token: string };
  if (row.edit_token !== token) return { ok: false, reason: "invalid-token" };

  const hash = await hashPin(pin);
  const pinSetAt = new Date().toISOString();
  const { error: upErr } = await serverSupabase
    .from("crews")
    .update({
      pin_hash: hash,
      pin_set_at: pinSetAt,
      failed_pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", crewId);
  if (upErr) return { ok: false, reason: "invalid-token" };

  await setCrewSessionCookie(crewId, pinSetAt);
  return { ok: true };
}

// 다음 태스크에서 추가:
// - clearCrewPinAdmin (Task 8)
// - changeCrewPin (Task 9)
