// src/lib/server/records.ts
// 기록 각인(RECORD) 서버 데이터 레이어. hall_of_fame_entries / record_orders 는
// RLS(정책 없음)로 막혀 있어 service role 클라이언트로만 읽는다.
import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { serverSupabase } from "./supabase";
import {
  TIERS,
  intervalToSeconds,
  isRecordTier,
  maskName,
  type RecordTier,
} from "@/lib/record/tier";
import type {
  EngravingSnapshot,
  HallEntry,
  HallStats,
  OwnerEntry,
  VerificationStatus,
} from "@/lib/types/record";

export const RECORDS_CACHE_TAG = "records";
const RECORDS_CACHE_TTL_SECS = 60;

export const RECORD_CERT_BUCKET = "recordCertificates";

const ENGRAVED_ORDER_STATUSES = ["confirmed", "in_production", "shipped"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

interface DbHallRow {
  id: string;
  runner_name: string;
  name_masked: boolean;
  crew_name: string | null;
  race_name: string;
  race_date: string;
  race_time: string;
  tier: string | null;
  cert_no: string | null;
  record_orders?: Array<{ status: string }>;
}

async function fetchHallEntries(): Promise<HallEntry[]> {
  const { data, error } = await serverSupabase
    .from("hall_of_fame_entries")
    .select(
      "id, runner_name, name_masked, crew_name, race_name, race_date, race_time, tier, cert_no, record_orders(status)"
    )
    .eq("verification_status", "approved")
    .eq("hall_public", true)
    .order("race_time", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[records] hall fetch failed:", error);
    return [];
  }

  return ((data ?? []) as DbHallRow[])
    .filter((r) => isRecordTier(r.tier))
    .map((r) => ({
      id: r.id,
      displayName: r.name_masked ? maskName(r.runner_name) : r.runner_name,
      crewName: r.crew_name,
      raceName: r.race_name,
      raceDate: r.race_date,
      seconds: intervalToSeconds(r.race_time),
      tier: r.tier as RecordTier,
      certNo: r.cert_no,
      // 관리자가 결제를 확인(confirmed)한 주문부터 ENGRAVED 로 본다.
      engraved: (r.record_orders ?? []).some((o) =>
        ENGRAVED_ORDER_STATUSES.includes(o.status)
      ),
    }));
}

const getHallEntriesCached = unstable_cache(fetchHallEntries, ["record-hall"], {
  revalidate: RECORDS_CACHE_TTL_SECS,
  tags: [RECORDS_CACHE_TAG],
});

/** 공개 동의 + 승인된 기록 (빠른 순). */
export const getHallEntries = cache(() => getHallEntriesCached());

async function fetchHallStats(): Promise<HallStats> {
  const byTier = Object.fromEntries(TIERS.map((t) => [t.id, 0])) as Record<
    RecordTier,
    number
  >;
  const { data, error } = await serverSupabase
    .from("hall_of_fame_entries")
    .select("tier")
    .eq("verification_status", "approved");
  if (error) {
    console.error("[records] stats fetch failed:", error);
    return { total: 0, byTier };
  }
  for (const row of (data ?? []) as Array<{ tier: string | null }>) {
    if (isRecordTier(row.tier)) byTier[row.tier] += 1;
  }
  const total = Object.values(byTier).reduce((a, b) => a + b, 0);
  return { total, byTier };
}

const getHallStatsCached = unstable_cache(fetchHallStats, ["record-stats"], {
  revalidate: RECORDS_CACHE_TTL_SECS,
  tags: [RECORDS_CACHE_TAG],
});

/** 승인된 인증 수 (비공개 포함 — 숫자만 노출). */
export const getHallStats = cache(() => getHallStatsCached());

interface DbOwnerRow {
  id: string;
  runner_name: string;
  crew_name: string | null;
  race_name: string;
  race_date: string;
  race_time: string;
  tier: string | null;
  verification_status: VerificationStatus;
  rejected_reason: string | null;
  verified_at: string | null;
  cert_no: string | null;
  hall_public: boolean;
  name_masked: boolean;
  created_at: string;
}

/** 본인 결과 페이지 — id 와 purchase_token 이 함께 맞아야 반환. 캐시하지 않는다. */
export async function getOwnerEntry(
  id: string,
  token: string
): Promise<OwnerEntry | null> {
  if (!isUuid(id) || !isUuid(token)) return null;
  const { data, error } = await serverSupabase
    .from("hall_of_fame_entries")
    .select(
      "id, runner_name, crew_name, race_name, race_date, race_time, tier, verification_status, rejected_reason, verified_at, cert_no, hall_public, name_masked, created_at"
    )
    .eq("id", id)
    .eq("purchase_token", token)
    .maybeSingle();
  if (error) {
    console.error("[records] owner fetch failed:", error);
    return null;
  }
  if (!data) return null;
  const r = data as DbOwnerRow;
  return {
    id: r.id,
    runnerName: r.runner_name,
    crewName: r.crew_name,
    raceName: r.race_name,
    raceDate: r.race_date,
    seconds: intervalToSeconds(r.race_time),
    tier: isRecordTier(r.tier) ? r.tier : null,
    status: r.verification_status,
    rejectedReason: r.rejected_reason,
    verifiedAt: r.verified_at,
    certNo: r.cert_no,
    hallPublic: r.hall_public,
    nameMasked: r.name_masked,
    createdAt: r.created_at,
  };
}

/** 승인된 기록에서 각인 문구를 만든다. 상품 미리보기와 주문 스냅샷이 같은 함수를 쓴다. */
export function buildEngraving(entry: OwnerEntry): EngravingSnapshot | null {
  if (entry.status !== "approved" || !entry.tier || !entry.certNo) return null;
  const h = Math.floor(entry.seconds / 3600);
  const m = Math.floor((entry.seconds % 3600) / 60);
  const s = entry.seconds % 60;
  return {
    runnerName: entry.runnerName,
    raceName: entry.raceName,
    raceDate: entry.raceDate.replaceAll("-", "."),
    time: `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    tier: entry.tier,
    certNo: entry.certNo,
  };
}
