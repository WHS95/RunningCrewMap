// src/lib/record/tier.ts
// 기록 각인(RECORD) 티어 규칙 — 서버·클라이언트 공용. 판정은 항상 서버에서 다시 한다.

export type RecordTier = "sub3" | "single" | "sub4" | "sub5";

export interface TierInfo {
  id: RecordTier;
  /** 화면 표기 (SUB-3 등) */
  label: string;
  /** 한국어 이름 */
  name: string;
  /** 이 시간(초) "미만"이면 해당 티어 */
  underSeconds: number;
  /** 기준 기록 표기 */
  limitLabel: string;
  /** 각인 마감(가안) */
  finish: string;
}

// 빠른 티어부터. getTier 는 위에서부터 첫 번째로 맞는 티어를 고른다.
export const TIERS: TierInfo[] = [
  {
    id: "sub3",
    label: "SUB-3",
    name: "서브3",
    underSeconds: 3 * 3600,
    limitLabel: "2:59:59",
    finish: "블랙 PVD · 라임 에나멜",
  },
  {
    id: "single",
    label: "SINGLE",
    name: "싱글",
    underSeconds: 3 * 3600 + 10 * 60,
    limitLabel: "3:09:59",
    finish: "건메탈 PVD",
  },
  {
    id: "sub4",
    label: "SUB-4",
    name: "서브4",
    underSeconds: 4 * 3600,
    limitLabel: "3:59:59",
    finish: "브러시드 스틸",
  },
  {
    id: "sub5",
    label: "SUB-5",
    name: "서브5",
    underSeconds: 5 * 3600,
    limitLabel: "4:59:59",
    finish: "무광 스틸",
  },
];

export const TIER_BY_ID: Record<RecordTier, TierInfo> = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
) as Record<RecordTier, TierInfo>;

export function isRecordTier(v: unknown): v is RecordTier {
  return typeof v === "string" && v in TIER_BY_ID;
}

/** 풀코스 넷 타임(초) → 티어. 5시간 이상이면 null (인증 대상 아님). */
export function getTier(totalSeconds: number): RecordTier | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  for (const t of TIERS) {
    if (totalSeconds < t.underSeconds) return t.id;
  }
  return null;
}

/** H:MM:SS 각 자리 → 초. 형식이 틀리면 null. 분·초는 0~59 만 허용. */
export function toSeconds(h: number, m: number, s: number): number | null {
  if (![h, m, s].every((v) => Number.isInteger(v) && v >= 0)) return null;
  if (m > 59 || s > 59 || h > 9) return null;
  return h * 3600 + m * 60 + s;
}

/** 초 → "2:58:41" */
export function formatSeconds(totalSeconds: number): string {
  const t = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Postgres interval 문자열("02:58:41", "2:58:41") → 초 */
export function intervalToSeconds(interval: string): number {
  const m = /^(\d+):(\d{1,2}):(\d{1,2})/.exec(interval.trim());
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** 기록장 공개용 이름 마스킹: 홍길동 → 홍*동, 김현 → 김*, 영문은 앞 글자만 남긴다. */
export function maskName(name: string): string {
  const n = name.trim();
  const chars = Array.from(n);
  if (chars.length <= 1) return n;
  if (chars.length === 2) return `${chars[0]}*`;
  if (/^[A-Za-z\s.'-]+$/.test(n)) return `${chars[0]}${"*".repeat(Math.min(4, chars.length - 1))}`;
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/** 각인 상품 SKU — 1차는 아크릴 키링 1종. tag/lace/plate 는 시안 단계 값(DB 허용만 유지). */
export type RecordSku = "keyring" | "tag" | "lace" | "plate";

export const SKUS: Array<{ id: RecordSku; label: string; name: string; desc: string }> = [
  { id: "keyring", label: "RECORD KEYRING", name: "레코드 키링", desc: "아크릴 각인 키링 · NFC 내장" },
];

export function isRecordSku(v: unknown): v is RecordSku {
  return v === "keyring" || v === "tag" || v === "lace" || v === "plate";
}

/** 판매 조건 — 배송비 포함 가격, 한정 수량 */
export const RECORD_PRICE_KRW = 20000;
export const RECORD_LIMIT_QTY = 30;

/** 티어 → 3D 뷰어 마감 키 */
// 1차 아크릴 키링은 티어와 무관하게 같은 마감(검정 패널 + 라임 인쇄). 글자(SUB3/SINGLE/SUB4/SUB5)로 구분한다.
export const TIER_FINISH: Record<RecordTier, "acrylic"> = {
  sub3: "acrylic",
  single: "acrylic",
  sub4: "acrylic",
  sub5: "acrylic",
};

/**
 * 커피챗 후원 — 그로블 결제창은 상품당 가격이 하나라 잔마다 상품이 따로 있다.
 * price 는 그로블 상품 가격과 같아야 한다. 커피 이름은 가격 비유일 뿐 브랜드와 무관하다.
 */
export const SUPPORT_OPTIONS = [
  { id: "mega", cup: "메가커피", price: 1500, grobleProductId: "QS9tnF" },
  { id: "cafe", cup: "동네 카페", price: 3000, grobleProductId: "k6PbFx" },
  { id: "starbucks", cup: "스타벅스", price: 5000, grobleProductId: "EkNZVv" },
] as const;

export type SupportOptionId = (typeof SUPPORT_OPTIONS)[number]["id"];
export const DEFAULT_SUPPORT_OPTION: SupportOptionId = "cafe";

export function getSupportOption(id: unknown) {
  return SUPPORT_OPTIONS.find((o) => o.id === id) ?? null;
}
