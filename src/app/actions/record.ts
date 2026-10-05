// src/app/actions/record.ts
"use server";

import crypto from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { serverSupabase } from "@/lib/server/supabase";
import { isSignedAdmin } from "@/lib/server/adminSession";
import {
  RECORDS_CACHE_TAG,
  RECORD_CERT_BUCKET,
  buildEngraving,
  getOwnerEntry,
  isUuid,
} from "@/lib/server/records";
import {
  TIER_BY_ID,
  formatSeconds,
  getTier,
  intervalToSeconds,
  isRecordSku,
  isRecordTier,
  toSeconds,
  SKUS,
} from "@/lib/record/tier";
import type {
  AdminOrderRow,
  AdminRecordRow,
  EngravingSnapshot,
  OrderStatus,
  VerificationStatus,
} from "@/lib/types/record";

type ActionResult<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

// 기록증·배번 등 개인정보를 다루므로 서명 없는 auth=true 만으로는 통과시키지 않는다.
// 로그인 때 함께 발급되는 서명 쿠키(admin_sig)까지 확인한다.
async function isAdminRequest(): Promise<boolean> {
  return isSignedAdmin();
}

// ----- 캐시 무효화 -----
async function revalidateRecordsCache() {
  revalidateTag(RECORDS_CACHE_TAG);
  revalidatePath("/record");
  revalidatePath("/record/hall");
}

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.runhouse.club"
  );
}

// ----- Discord (fire-and-forget: 실패해도 사용자 흐름은 계속) -----
async function notifyDiscord(embed: {
  title: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
}) {
  const webhookUrl =
    process.env.DISCORD_RECORD_WEBHOOK_URL ||
    process.env.DISCORD_REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[record] DISCORD_RECORD_WEBHOOK_URL/DISCORD_REGISTRATION_WEBHOOK_URL not set"
    );
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{ ...embed, timestamp: new Date().toISOString() }],
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error("[record] discord webhook failed:", e);
  }
}

// ----- 입력 정리 -----
function str(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function normalizeInstagram(v: string): string {
  return v.replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_CERT_BYTES = 5 * 1024 * 1024;

// ===========================================================================
// 1. 인증 신청 (공개)
// ===========================================================================
export async function submitRecordVerification(
  formData: FormData
): Promise<ActionResult<{ id: string; token: string }>> {
  // 봇이 채우는 숨김 필드
  if (str(formData, "website", 100)) {
    return { success: false, error: "요청을 처리할 수 없습니다." };
  }

  const runnerName = str(formData, "runnerName", 20);
  const crewName = str(formData, "crewName", 40) || null;
  const runnerInstagram =
    normalizeInstagram(str(formData, "runnerInstagram", 40)) || null;
  const raceName = str(formData, "raceName", 60);
  const raceDate = str(formData, "raceDate", 10);
  const bibNumber = str(formData, "bibNumber", 12);
  const hallPublic = formData.get("hallPublic") === "on";

  if (runnerName.length < 2) return { success: false, error: "이름을 입력해 주세요." };
  if (raceName.length < 2) return { success: false, error: "대회명을 입력해 주세요." };
  if (!bibNumber) return { success: false, error: "배번을 입력해 주세요." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) {
    return { success: false, error: "대회일을 확인해 주세요." };
  }
  const date = new Date(`${raceDate}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() || date.getFullYear() < 1990) {
    return { success: false, error: "대회일을 확인해 주세요." };
  }

  const seconds = toSeconds(
    Number(formData.get("h")),
    Number(formData.get("m")),
    Number(formData.get("s"))
  );
  if (seconds === null) return { success: false, error: "기록을 H:MM:SS 형식으로 입력해 주세요." };
  // 티어는 서버에서 다시 판정한다.
  const tier = getTier(seconds);
  if (!tier) {
    return {
      success: false,
      error: "풀코스 4:59:59(SUB-5) 이내 기록부터 인증할 수 있어요.",
    };
  }

  const file = formData.get("certificate");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "기록증 이미지를 첨부해 주세요." };
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) return { success: false, error: "JPG · PNG · WebP 이미지만 올릴 수 있어요." };
  if (file.size > MAX_CERT_BYTES) return { success: false, error: "이미지는 5MB 이하만 가능해요." };

  // id 를 먼저 만들어 기록증 경로와 행을 같은 id 로 묶는다.
  const id = crypto.randomUUID();
  const path = `${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await serverSupabase.storage
    .from(RECORD_CERT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[record] certificate upload failed:", uploadError);
    return { success: false, error: "기록증 업로드에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const { data, error } = await serverSupabase
    .from("hall_of_fame_entries")
    .insert({
      id,
      runner_name: runnerName,
      crew_name: crewName,
      runner_instagram: runnerInstagram,
      race_name: raceName,
      race_date: raceDate,
      race_time: formatSeconds(seconds),
      race_certificate_image_url: path,
      tier,
      bib_number: bibNumber,
      verification_status: "pending",
      hall_public: hallPublic,
      name_masked: true,
      is_visible: false,
    })
    .select("purchase_token")
    .single();

  if (error || !data) {
    console.error("[record] insert failed:", error);
    await serverSupabase.storage.from(RECORD_CERT_BUCKET).remove([path]);
    return { success: false, error: "신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  const token = (data as { purchase_token: string }).purchase_token;

  await notifyDiscord({
    title: "🏅 기록 인증 신청 — 검수 대기",
    color: 0xc7ff00,
    fields: [
      { name: "러너", value: runnerName, inline: true },
      { name: "티어(자동)", value: TIER_BY_ID[tier].label, inline: true },
      { name: "기록", value: formatSeconds(seconds), inline: true },
      { name: "대회", value: `${raceName} · ${raceDate}` },
      ...(runnerInstagram
        ? [{ name: "Instagram", value: `@${runnerInstagram}`, inline: true }]
        : []),
      ...(crewName ? [{ name: "크루", value: crewName, inline: true }] : []),
      { name: "검수", value: `${siteBase()}/admin/record` },
      { name: "본인 결과 링크 (DM 전달용)", value: `${siteBase()}/record/r/${id}?token=${token}` },
    ],
  });

  return { success: true, id, token };
}

// ===========================================================================
// 2. 기록장 공개 설정 (본인 토큰)
// ===========================================================================
export async function setHallVisibility(
  id: string,
  token: string,
  options: { hallPublic: boolean; nameMasked: boolean }
): Promise<ActionResult> {
  if (!isUuid(id) || !isUuid(token)) return { success: false, error: "잘못된 링크입니다." };
  const { data, error } = await serverSupabase
    .from("hall_of_fame_entries")
    .update({
      hall_public: options.hallPublic,
      name_masked: options.nameMasked,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("purchase_token", token)
    .select("id");
  if (error || !data?.length) {
    console.error("[record] visibility update failed:", error);
    return { success: false, error: "설정을 저장하지 못했어요." };
  }
  await revalidateRecordsCache();
  return { success: true };
}

// ===========================================================================
// 3. 각인 주문 신청 (본인 토큰 · 승인된 기록만)
// ===========================================================================
export async function createRecordOrder(input: {
  id: string;
  token: string;
  sku: string;
  contactInstagram: string;
  memo?: string;
  consent: boolean;
}): Promise<ActionResult<{ orderId: string }>> {
  if (!input.consent) {
    return { success: false, error: "개인정보 수집·이용에 동의해 주세요." };
  }
  if (!isRecordSku(input.sku)) return { success: false, error: "상품을 선택해 주세요." };
  const contact = normalizeInstagram(input.contactInstagram ?? "");
  if (contact.length < 2) return { success: false, error: "연락받을 인스타그램 아이디를 입력해 주세요." };

  const entry = await getOwnerEntry(input.id, input.token);
  if (!entry) return { success: false, error: "잘못된 링크입니다." };
  // 각인 문구는 승인된 DB 행에서만 만든다. 클라이언트가 보낸 문구는 받지 않는다.
  const engraving = buildEngraving(entry);
  if (!engraving) return { success: false, error: "인증이 완료된 기록만 주문할 수 있어요." };

  // 같은 기록으로 열린 신청이 너무 많으면 막는다(중복 클릭·스팸).
  const { count } = await serverSupabase
    .from("record_orders")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", entry.id)
    .eq("status", "requested");
  if ((count ?? 0) >= 3) {
    return { success: false, error: "이미 접수된 신청이 있어요. 안내 DM을 기다려 주세요." };
  }

  const { data, error } = await serverSupabase
    .from("record_orders")
    .insert({
      entry_id: entry.id,
      sku: input.sku,
      engraving,
      contact_instagram: contact,
      memo: (input.memo ?? "").trim().slice(0, 300) || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[record] order insert failed:", error);
    return { success: false, error: "주문 신청을 저장하지 못했어요." };
  }

  const skuInfo = SKUS.find((s) => s.id === input.sku);
  await notifyDiscord({
    title: "🛒 각인 주문 신청",
    color: 0xf2f2ee,
    fields: [
      { name: "상품", value: skuInfo?.label ?? input.sku, inline: true },
      { name: "연락처", value: `@${contact}`, inline: true },
      {
        name: "각인",
        value: `${engraving.runnerName} · ${engraving.time} · ${TIER_BY_ID[engraving.tier].label}\n${engraving.raceName} · ${engraving.raceDate} · ${engraving.certNo}`,
      },
      ...(input.memo ? [{ name: "메모", value: input.memo.slice(0, 300) }] : []),
      { name: "관리", value: `${siteBase()}/admin/record` },
    ],
  });

  return { success: true, orderId: (data as { id: string }).id };
}

// ===========================================================================
// 4. 어드민
// ===========================================================================
interface DbAdminRow {
  id: string;
  runner_name: string;
  runner_instagram: string | null;
  crew_name: string | null;
  race_name: string;
  race_date: string;
  race_time: string;
  tier: string | null;
  bib_number: string | null;
  verification_status: VerificationStatus;
  rejected_reason: string | null;
  cert_no: string | null;
  hall_public: boolean;
  race_certificate_image_url: string;
  purchase_token: string;
  created_at: string;
}

export async function listRecordsAdmin(): Promise<
  ActionResult<{ records: AdminRecordRow[]; orders: AdminOrderRow[] }>
> {
  if (!(await isAdminRequest())) return { success: false, error: "권한이 없습니다." };

  const [recordsRes, ordersRes] = await Promise.all([
    serverSupabase
      .from("hall_of_fame_entries")
      .select(
        "id, runner_name, runner_instagram, crew_name, race_name, race_date, race_time, tier, bib_number, verification_status, rejected_reason, cert_no, hall_public, race_certificate_image_url, purchase_token, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(300),
    serverSupabase
      .from("record_orders")
      .select("id, entry_id, sku, engraving, contact_instagram, memo, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (recordsRes.error || ordersRes.error) {
    console.error("[record] admin list failed:", recordsRes.error ?? ordersRes.error);
    return { success: false, error: "목록을 불러오지 못했습니다." };
  }

  const records: AdminRecordRow[] = ((recordsRes.data ?? []) as DbAdminRow[]).map((r) => ({
    id: r.id,
    runnerName: r.runner_name,
    runnerInstagram: r.runner_instagram,
    crewName: r.crew_name,
    raceName: r.race_name,
    raceDate: r.race_date,
    seconds: intervalToSeconds(r.race_time),
    tier: isRecordTier(r.tier) ? r.tier : null,
    bibNumber: r.bib_number,
    status: r.verification_status,
    rejectedReason: r.rejected_reason,
    certNo: r.cert_no,
    hallPublic: r.hall_public,
    certificatePath: r.race_certificate_image_url,
    purchaseToken: r.purchase_token,
    createdAt: r.created_at,
  }));

  const orders: AdminOrderRow[] = (
    (ordersRes.data ?? []) as Array<{
      id: string;
      entry_id: string;
      sku: string;
      engraving: EngravingSnapshot;
      contact_instagram: string;
      memo: string | null;
      status: OrderStatus;
      created_at: string;
    }>
  )
    .filter((o) => isRecordSku(o.sku))
    .map((o) => ({
      id: o.id,
      entryId: o.entry_id,
      sku: o.sku as AdminOrderRow["sku"],
      engraving: o.engraving,
      contactInstagram: o.contact_instagram,
      memo: o.memo,
      status: o.status,
      createdAt: o.created_at,
    }));

  return { success: true, records, orders };
}

/** 관리자만 기록증을 본다 — 10분짜리 signed URL. */
export async function getCertificateUrl(
  id: string
): Promise<ActionResult<{ url: string }>> {
  if (!(await isAdminRequest())) return { success: false, error: "권한이 없습니다." };
  if (!isUuid(id)) return { success: false, error: "잘못된 요청입니다." };
  const { data: row } = await serverSupabase
    .from("hall_of_fame_entries")
    .select("race_certificate_image_url")
    .eq("id", id)
    .maybeSingle();
  const path = (row as { race_certificate_image_url?: string } | null)
    ?.race_certificate_image_url;
  if (!path) return { success: false, error: "기록증이 없습니다." };
  const { data, error } = await serverSupabase.storage
    .from(RECORD_CERT_BUCKET)
    .createSignedUrl(path, 600);
  if (error || !data) {
    console.error("[record] signed url failed:", error);
    return { success: false, error: "기록증을 열 수 없습니다." };
  }
  return { success: true, url: data.signedUrl };
}

export async function approveRecord(
  id: string
): Promise<ActionResult<{ certNo: string }>> {
  if (!(await isAdminRequest())) return { success: false, error: "권한이 없습니다." };
  if (!isUuid(id)) return { success: false, error: "잘못된 요청입니다." };

  const { data: row } = await serverSupabase
    .from("hall_of_fame_entries")
    .select("tier")
    .eq("id", id)
    .maybeSingle();
  if (!isRecordTier((row as { tier?: string } | null)?.tier)) {
    return { success: false, error: "티어가 없는 기록은 승인할 수 없습니다." };
  }

  const { error } = await serverSupabase
    .from("hall_of_fame_entries")
    .update({
      verification_status: "approved",
      verified_at: new Date().toISOString(),
      rejected_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[record] approve failed:", error);
    return { success: false, error: "승인에 실패했습니다." };
  }

  const { data: certNo, error: rpcError } = await serverSupabase.rpc(
    "assign_record_cert_no",
    { entry_id: id }
  );
  if (rpcError || typeof certNo !== "string") {
    console.error("[record] cert no failed:", rpcError);
    return { success: false, error: "인증번호 발급에 실패했습니다." };
  }

  await revalidateRecordsCache();
  return { success: true, certNo };
}

export async function rejectRecord(id: string, reason: string): Promise<ActionResult> {
  if (!(await isAdminRequest())) return { success: false, error: "권한이 없습니다." };
  if (!isUuid(id)) return { success: false, error: "잘못된 요청입니다." };
  const { error } = await serverSupabase
    .from("hall_of_fame_entries")
    .update({
      verification_status: "rejected",
      rejected_reason: reason.trim().slice(0, 200) || "기록 확인 불가",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[record] reject failed:", error);
    return { success: false, error: "반려에 실패했습니다." };
  }
  await revalidateRecordsCache();
  return { success: true };
}

const ORDER_STATUSES: OrderStatus[] = [
  "requested",
  "confirmed",
  "in_production",
  "shipped",
  "cancelled",
];

export async function updateRecordOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  if (!(await isAdminRequest())) return { success: false, error: "권한이 없습니다." };
  if (!isUuid(orderId) || !ORDER_STATUSES.includes(status)) {
    return { success: false, error: "잘못된 요청입니다." };
  }
  const { error } = await serverSupabase
    .from("record_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) {
    console.error("[record] order status failed:", error);
    return { success: false, error: "상태 변경에 실패했습니다." };
  }
  // ENGRAVED 마크가 주문 상태에 따라 바뀐다.
  await revalidateRecordsCache();
  return { success: true };
}
