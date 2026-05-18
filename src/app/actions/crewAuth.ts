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

// 다음 태스크에서 추가:
// - loginWithPin (Task 6)
// - setCrewPinWithToken (Task 7)
// - clearCrewPinAdmin (Task 8)
// - changeCrewPin (Task 9)
