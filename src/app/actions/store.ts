// src/app/actions/store.ts
"use server";

import crypto from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { serverSupabase } from "@/lib/server/supabase";
import { STORES_CACHE_TAG } from "@/lib/server/stores";
import {
  createStoreSessionToken,
  setStoreSessionCookie,
  clearStoreSessionCookie,
  getStoreSession,
} from "@/lib/server/storeSession";

// ----- 캐시 무효화 -----
export async function revalidateStoresCache() {
  revalidateTag(STORES_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/store");
  revalidatePath("/sitemap.xml");
}

// ----- 등록 알림 + is_visible=false 강제 + PIN 해싱 + Discord -----
export async function notifyStoreRegistration(
  store: {
    id: string;
    name: string;
    category: string;
    mainAddress?: string | null;
    lat?: number | null;
    lng?: number | null;
    description?: string | null;
    instagram?: string | null;
  },
  options?: { pin?: string }
): Promise<{ success: boolean; error?: string }> {
  // 1. is_visible=false 강제 + edit_token 회수
  let editToken: string | null = null;
  try {
    const { data, error } = await serverSupabase
      .from("stores")
      .update({ is_visible: false })
      .eq("id", store.id)
      .select("edit_token")
      .single();
    if (error) console.error("[store] mark is_visible=false failed:", error);
    editToken = (data as { edit_token?: string } | null)?.edit_token ?? null;
    revalidateTag(STORES_CACHE_TAG);
  } catch (e) {
    console.error("[store] unexpected is_visible=false err:", e);
  }

  // 2. PIN 해싱 (선택)
  if (options?.pin && /^\d{4}$/.test(options.pin)) {
    try {
      const { isWeakPin, hashPin } = await import("@/lib/server/pin");
      if (!isWeakPin(options.pin)) {
        const hash = await hashPin(options.pin);
        await serverSupabase
          .from("stores")
          .update({
            pin_hash: hash,
            pin_set_at: new Date().toISOString(),
            failed_pin_attempts: 0,
            pin_locked_until: null,
          })
          .eq("id", store.id);
      } else {
        console.warn("[store] weak PIN; skip save");
      }
    } catch (e) {
      console.error("[store] PIN hash failed:", e);
    }
  }

  // 3. Discord (fire-and-forget)
  const webhookUrl =
    process.env.DISCORD_STORE_WEBHOOK_URL ||
    process.env.DISCORD_REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[store] DISCORD_STORE_WEBHOOK_URL/DISCORD_REGISTRATION_WEBHOOK_URL not set"
    );
    return { success: false, error: "webhook URL not configured" };
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://runhouse.kr";
  const editUrl = editToken
    ? `${base}/store/edit/${store.id}?token=${editToken}`
    : null;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "이름", value: store.name, inline: true },
    { name: "카테고리", value: store.category, inline: true },
  ];
  if (store.instagram)
    fields.push({ name: "Instagram", value: store.instagram, inline: true });
  if (store.mainAddress)
    fields.push({ name: "주소", value: store.mainAddress });
  if (store.lat != null && store.lng != null)
    fields.push({
      name: "좌표",
      value: `${store.lat}, ${store.lng}`,
      inline: true,
    });
  if (store.description)
    fields.push({
      name: "소개",
      value: store.description.slice(0, 800),
    });
  if (editUrl) fields.push({ name: "자가 수정 URL", value: editUrl });

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "🆕 새 매장 등록 — 승인 대기",
            color: 0xd4b896,
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    return { success: true };
  } catch (e) {
    console.error("[store] discord webhook failed:", e);
    return { success: false, error: "webhook delivery failed" };
  }
}

// ----- 토큰/세션 기반 편집 데이터 조회 -----
export async function getStoreForEdit(
  storeId: string,
  token?: string
): Promise<
  | {
      success: true;
      store: {
        id: string;
        name: string;
        category: string;
        description?: string;
        verification_method?: string;
        reward_description?: string;
        owner_message?: string;
        business_hours?: string;
        contact?: string;
        instagram?: string;
        naver_map_url?: string;
        event_post_url?: string;
        main_image_url?: string;
        location: {
          main_address: string;
          detail_address?: string;
          latitude: number;
          longitude: number;
        };
        photos: Array<{ photo_url: string; display_order: number }>;
        is_visible: boolean;
      };
    }
  | { success: false; error: string }
> {
  // 1. 세션 또는 토큰 검증
  const session = await getStoreSession();
  let authorized = false;
  if (session && session.storeId === storeId) authorized = true;
  if (!authorized && token) {
    const { data } = await serverSupabase
      .from("stores")
      .select("edit_token")
      .eq("id", storeId)
      .maybeSingle();
    if (
      data &&
      (data as { edit_token?: string }).edit_token === token &&
      token.length > 0
    ) {
      authorized = true;
    }
  }
  if (!authorized) return { success: false, error: "unauthorized" };

  const { data, error } = await serverSupabase
    .from("stores")
    .select(
      `
      id, name, category, description, verification_method, reward_description,
      owner_message, business_hours, contact, instagram, naver_map_url,
      event_post_url, main_image_url, is_visible,
      store_locations (*),
      store_photos ( photo_url, display_order )
    `
    )
    .eq("id", storeId)
    .maybeSingle();
  if (error || !data) return { success: false, error: "not found" };

  const row = data as {
    id: string;
    name: string;
    category: string;
    description?: string;
    verification_method?: string;
    reward_description?: string;
    owner_message?: string;
    business_hours?: string;
    contact?: string;
    instagram?: string;
    naver_map_url?: string;
    event_post_url?: string;
    main_image_url?: string;
    is_visible: boolean;
    store_locations: Array<{
      main_address: string;
      detail_address?: string;
      latitude: number;
      longitude: number;
    }>;
    store_photos?: Array<{ photo_url: string; display_order: number }>;
  };

  return {
    success: true,
    store: {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      verification_method: row.verification_method,
      reward_description: row.reward_description,
      owner_message: row.owner_message,
      business_hours: row.business_hours,
      contact: row.contact,
      instagram: row.instagram,
      naver_map_url: row.naver_map_url,
      event_post_url: row.event_post_url,
      main_image_url: row.main_image_url,
      location: row.store_locations[0],
      photos: (row.store_photos ?? []).sort(
        (a, b) => a.display_order - b.display_order
      ),
      is_visible: row.is_visible,
    },
  };
}

// ----- 자가 수정 -----
export async function updateStoreByToken(
  storeId: string,
  token: string | null,
  patch: {
    name?: string;
    category?: string;
    description?: string;
    verification_method?: string;
    reward_description?: string;
    owner_message?: string;
    business_hours?: string;
    contact?: string;
    instagram?: string;
    naver_map_url?: string;
    event_post_url?: string;
    location?: {
      main_address: string;
      detail_address?: string;
      latitude: number;
      longitude: number;
    };
  }
): Promise<{ success: boolean; resetVisibility?: boolean; error?: string }> {
  // 권한
  const session = await getStoreSession();
  let authorized = false;
  if (session && session.storeId === storeId) authorized = true;
  if (!authorized && token) {
    const { data } = await serverSupabase
      .from("stores")
      .select("edit_token")
      .eq("id", storeId)
      .maybeSingle();
    if (
      data &&
      (data as { edit_token?: string }).edit_token === token &&
      token.length > 0
    )
      authorized = true;
  }
  if (!authorized) return { success: false, error: "unauthorized" };

  // 좌표/주소 변경 감지 → is_visible=false 재트리거
  let resetVisibility = false;
  if (patch.location) {
    const { data: cur } = await serverSupabase
      .from("store_locations")
      .select("main_address, latitude, longitude")
      .eq("store_id", storeId)
      .maybeSingle();
    if (cur) {
      const old = cur as {
        main_address: string;
        latitude: number;
        longitude: number;
      };
      if (
        old.main_address !== patch.location.main_address ||
        old.latitude !== patch.location.latitude ||
        old.longitude !== patch.location.longitude
      ) {
        resetVisibility = true;
      }
    }
  }

  // stores 컬럼 패치 + (필요 시) is_visible=false
  const colPatch: Record<string, unknown> = {};
  for (const k of [
    "name",
    "category",
    "description",
    "verification_method",
    "reward_description",
    "owner_message",
    "business_hours",
    "contact",
    "instagram",
    "naver_map_url",
    "event_post_url",
  ] as const) {
    if (patch[k] !== undefined) colPatch[k] = patch[k];
  }
  if (resetVisibility) colPatch.is_visible = false;
  if (Object.keys(colPatch).length > 0) {
    const { error } = await serverSupabase
      .from("stores")
      .update(colPatch)
      .eq("id", storeId);
    if (error) return { success: false, error: error.message };
  }
  if (patch.location) {
    const { error } = await serverSupabase
      .from("store_locations")
      .update({
        main_address: patch.location.main_address,
        detail_address: patch.location.detail_address ?? null,
        latitude: patch.location.latitude,
        longitude: patch.location.longitude,
      })
      .eq("store_id", storeId);
    if (error) return { success: false, error: error.message };
  }

  await revalidateStoresCache();

  // Discord 수정 알림 (fire-and-forget; 좌표 변경 시 재승인 강조)
  void notifyStoreEdit(storeId, resetVisibility);

  return { success: true, resetVisibility };
}

async function notifyStoreEdit(storeId: string, resetVisibility: boolean) {
  const webhookUrl =
    process.env.DISCORD_STORE_WEBHOOK_URL ||
    process.env.DISCORD_REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: resetVisibility
              ? "⚠️ 매장 수정 — 재승인 필요"
              : "✏️ 매장 수정 알림",
            color: resetVisibility ? 0xd4b896 : 0x6b8e5a,
            description: `store id: ${storeId}`,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (e) {
    console.warn("[store] edit webhook failed:", e);
  }
}

// ----- 어드민: 가시성 토글 -----
export async function updateStoreVisibility(
  storeId: string,
  isVisible: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await serverSupabase
    .from("stores")
    .update({ is_visible: isVisible })
    .eq("id", storeId);
  if (error) return { success: false, error: error.message };
  await revalidateStoresCache();
  return { success: true };
}

// ----- 어드민: 토큰 재발급 -----
export async function rotateStoreEditToken(
  storeId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const newToken = crypto.randomUUID();
  const { error } = await serverSupabase
    .from("stores")
    .update({ edit_token: newToken })
    .eq("id", storeId);
  if (error) return { success: false, error: error.message };
  return { success: true, token: newToken };
}

// ----- 어드민: PIN 초기화 -----
export async function clearStorePinAdmin(
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await serverSupabase
    .from("stores")
    .update({
      pin_hash: null,
      pin_set_at: new Date().toISOString(), // 세션 무효화 트리거
      failed_pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", storeId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ----- 어드민: 삭제 -----
export async function deleteStoreAction(
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  // 사진 파일 정리는 클라이언트 사이드 storeService.deleteStore가 처리.
  // 어드민 페이지에서는 서비스 메서드 호출 후 이 액션으로 캐시만 무효화하거나,
  // service-role로 직접 stores DELETE 후 storage cleanup이 best-effort.
  const { error } = await serverSupabase
    .from("stores")
    .delete()
    .eq("id", storeId);
  if (error) return { success: false, error: error.message };
  await revalidateStoresCache();
  return { success: true };
}

// ----- PIN 로그인 -----
export async function loginStoreWithPin(
  storeName: string,
  pin: string
): Promise<{ success: boolean; storeId?: string; error?: string }> {
  if (!/^\d{4}$/.test(pin))
    return { success: false, error: "PIN은 4자리 숫자입니다." };

  const { data, error } = await serverSupabase
    .from("stores")
    .select(
      "id, pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until"
    )
    .eq("name", storeName)
    .maybeSingle();
  if (error || !data) return { success: false, error: "매장을 찾을 수 없습니다." };
  const row = data as {
    id: string;
    pin_hash: string | null;
    pin_set_at: string | null;
    failed_pin_attempts: number;
    pin_locked_until: string | null;
  };
  if (!row.pin_hash)
    return {
      success: false,
      error: "PIN이 아직 설정되지 않았습니다. 자가수정 링크로 먼저 설정하세요.",
    };
  if (
    row.pin_locked_until &&
    new Date(row.pin_locked_until).getTime() > Date.now()
  )
    return { success: false, error: "잠시 후 다시 시도해 주세요. (5회 실패 잠금)" };

  const { verifyPin } = await import("@/lib/server/pin");
  const ok = await verifyPin(pin, row.pin_hash);
  if (!ok) {
    const next = row.failed_pin_attempts + 1;
    const lockUntil =
      next >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;
    await serverSupabase
      .from("stores")
      .update({
        failed_pin_attempts: next,
        pin_locked_until: lockUntil,
      })
      .eq("id", row.id);
    return { success: false, error: "PIN이 올바르지 않습니다." };
  }

  // 성공 — 카운터 리셋 + 세션 발급
  await serverSupabase
    .from("stores")
    .update({ failed_pin_attempts: 0, pin_locked_until: null })
    .eq("id", row.id);
  const tok = createStoreSessionToken(row.id, row.pin_set_at ?? "");
  await setStoreSessionCookie(tok);
  return { success: true, storeId: row.id };
}

export async function setStorePin(
  storeId: string,
  token: string | null,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}$/.test(pin))
    return { success: false, error: "PIN은 4자리 숫자입니다." };

  // 권한
  const session = await getStoreSession();
  let authorized = false;
  if (session && session.storeId === storeId) authorized = true;
  if (!authorized && token) {
    const { data } = await serverSupabase
      .from("stores")
      .select("edit_token")
      .eq("id", storeId)
      .maybeSingle();
    if (
      data &&
      (data as { edit_token?: string }).edit_token === token &&
      token.length > 0
    )
      authorized = true;
  }
  if (!authorized) return { success: false, error: "unauthorized" };

  const { isWeakPin, hashPin } = await import("@/lib/server/pin");
  if (isWeakPin(pin))
    return { success: false, error: "단순한 PIN은 사용할 수 없습니다." };

  const hash = await hashPin(pin);
  const pinSetAt = new Date().toISOString();
  const { error } = await serverSupabase
    .from("stores")
    .update({
      pin_hash: hash,
      pin_set_at: pinSetAt,
      failed_pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", storeId);
  if (error) return { success: false, error: error.message };

  const tok = createStoreSessionToken(storeId, pinSetAt);
  await setStoreSessionCookie(tok);
  return { success: true };
}

export async function logoutStore() {
  await clearStoreSessionCookie();
}
