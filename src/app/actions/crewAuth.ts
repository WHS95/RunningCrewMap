"use server";

import { serverSupabase } from "@/lib/server/supabase";
import {
  generateRandomPin,
  hashPin,
  isValidNewPinFormat,
  isWeakPin,
  verifyPin,
} from "@/lib/server/pin";
import { verifyCrewPin } from "@/lib/server/pin-auth";
import {
  clearCrewSessionCookie,
  getCrewSession,
  setCrewSessionCookie,
} from "@/lib/server/crewSession";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function logoutCrew(): Promise<void> {
  await clearCrewSessionCookie();
}

type LoginResult =
  | { ok: true; crewId: string }
  | { ok: false; reason: "invalid" | "locked" | "no-pin"; unlocksAt?: string };

/**
 * PIN 로그인 (redirect 경로용). 검증·잠금 코어는 verifyCrewPin으로 단일 소스화하고,
 * 여기서는 성공 시 세션 쿠키만 굽는다.
 */
export async function loginWithPin(
  instagramInput: string,
  pin: string
): Promise<LoginResult> {
  const result = await verifyCrewPin(instagramInput, pin);
  if (!result.ok) {
    return result;
  }
  // 검증 성공 — 세션 쿠키 발급 (백채널 경로에는 없는, 이 함수 고유의 동작)
  await setCrewSessionCookie(result.crewId, result.pinSetAt);
  return { ok: true, crewId: result.crewId };
}

type SetPinResult =
  | { ok: true }
  | { ok: false; reason: "invalid-token" | "weak-pin" | "bad-format" };

export async function setCrewPinWithToken(
  crewId: string,
  token: string,
  pin: string
): Promise<SetPinResult> {
  // 신규 PIN 설정은 정확히 8자리 강제
  if (!isValidNewPinFormat(pin)) return { ok: false, reason: "bad-format" };
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

async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("auth")?.value === "true";
}

/**
 * Admin-only: 크루 PIN을 임시 PIN으로 재발급.
 *
 * 예전에는 pin_hash를 null로 비우고 수정 링크만 새로 발급했지만,
 * 관리자가 크루장에게 바로 전달할 수 있도록 8자리 임시 PIN을 생성해
 * 설정하고 평문을 딱 한 번 반환한다 (DB에는 해시만 저장).
 * edit_token도 함께 회전시켜 유출된 예전 링크를 무효화한다.
 */
export async function clearCrewPinAdmin(
  crewId: string
): Promise<
  | { ok: true; newEditToken: string; tempPin: string }
  | { ok: false; reason: "unauthorized" | "not-found" }
> {
  if (!(await requireAdmin())) return { ok: false, reason: "unauthorized" };
  if (!crewId) return { ok: false, reason: "not-found" };

  const newToken = crypto.randomUUID();
  const newPinSetAt = new Date().toISOString();
  const tempPin = generateRandomPin();
  const tempPinHash = await hashPin(tempPin);

  const { data, error } = await serverSupabase
    .from("crews")
    .update({
      pin_hash: tempPinHash,
      pin_set_at: newPinSetAt, // 기존 세션 즉시 무효화
      failed_pin_attempts: 0,
      pin_locked_until: null,
      edit_token: newToken,
    })
    .eq("id", crewId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "not-found" };
  return { ok: true, newEditToken: newToken, tempPin };
}

export async function changeCrewPin(
  currentPin: string,
  newPin: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "wrong-pin" | "weak-pin" | "bad-format" }
> {
  const session = await getCrewSession();
  if (!session) return { ok: false, reason: "unauthenticated" };
  // PIN 변경도 새 PIN은 정확히 8자리 강제
  if (!isValidNewPinFormat(newPin)) return { ok: false, reason: "bad-format" };
  if (isWeakPin(newPin)) return { ok: false, reason: "weak-pin" };

  const { data, error } = await serverSupabase
    .from("crews")
    .select("pin_hash")
    .eq("id", session.crewId)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "unauthenticated" };
  const row = data as { pin_hash: string | null };
  if (!row.pin_hash) return { ok: false, reason: "unauthenticated" };

  const ok = await verifyPin(currentPin, row.pin_hash);
  if (!ok) return { ok: false, reason: "wrong-pin" };

  const hash = await hashPin(newPin);
  const newPinSetAt = new Date().toISOString();
  await serverSupabase
    .from("crews")
    .update({ pin_hash: hash, pin_set_at: newPinSetAt })
    .eq("id", session.crewId);

  // 새 세션 발급 — 사용자의 현재 세션이 끊기지 않게
  await setCrewSessionCookie(session.crewId, newPinSetAt);
  return { ok: true };
}
