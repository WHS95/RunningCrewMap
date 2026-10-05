// src/lib/types/record.ts
import type { RecordSku, RecordTier } from "@/lib/record/tier";

export type VerificationStatus = "pending" | "approved" | "rejected";

/** 역대 기록장 공개 행 — 개인정보(기록증·배번·토큰)는 담지 않는다. */
export interface HallEntry {
  id: string;
  displayName: string;
  crewName: string | null;
  raceName: string;
  raceDate: string; // YYYY-MM-DD
  seconds: number;
  tier: RecordTier;
  certNo: string | null;
  engraved: boolean;
}

export interface HallStats {
  total: number;
  byTier: Record<RecordTier, number>;
}

/** 본인(토큰 보유자)에게 보여주는 인증 결과 */
export interface OwnerEntry {
  id: string;
  runnerName: string;
  crewName: string | null;
  raceName: string;
  raceDate: string;
  seconds: number;
  tier: RecordTier | null;
  status: VerificationStatus;
  rejectedReason: string | null;
  verifiedAt: string | null;
  certNo: string | null;
  hallPublic: boolean;
  nameMasked: boolean;
  createdAt: string;
}

/** 각인 문구 스냅샷 — 승인된 행에서 서버가 만든다. */
export interface EngravingSnapshot {
  runnerName: string;
  raceName: string;
  raceDate: string; // YYYY.MM.DD
  time: string; // H:MM:SS
  tier: RecordTier;
  certNo: string;
}

export type OrderStatus =
  | "requested"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "cancelled";

export interface AdminRecordRow {
  id: string;
  runnerName: string;
  runnerInstagram: string | null;
  crewName: string | null;
  raceName: string;
  raceDate: string;
  seconds: number;
  tier: RecordTier | null;
  bibNumber: string | null;
  status: VerificationStatus;
  rejectedReason: string | null;
  certNo: string | null;
  hallPublic: boolean;
  certificatePath: string;
  purchaseToken: string;
  createdAt: string;
}

export interface AdminOrderRow {
  id: string;
  entryId: string;
  sku: RecordSku;
  engraving: EngravingSnapshot;
  contactInstagram: string;
  memo: string | null;
  status: OrderStatus;
  createdAt: string;
}
