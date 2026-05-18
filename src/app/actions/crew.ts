"use server";

import { serverSupabase } from "@/lib/server/supabase";
import { revalidatePath, revalidateTag } from "next/cache";
import { CREWS_CACHE_TAG } from "@/lib/server/crews";
import { getCrewSession } from "@/lib/server/crewSession";

/**
 * Notify the admin Discord channel that a new crew registration has arrived.
 *
 * Idempotency: this is fire-and-forget — Discord webhooks can occasionally
 * 429-rate-limit. We don't retry; we just log and return `success: false`
 * so the user's registration flow isn't blocked.
 *
 * Webhook URL is read from `DISCORD_REGISTRATION_WEBHOOK_URL` (server-only).
 */
export async function notifyCrewRegistration(
  crew: {
    id: string;
    name: string;
    instagram?: string | null;
    mainAddress?: string | null;
    lat?: number | null;
    lng?: number | null;
    description?: string | null;
  },
  options?: { pin?: string }
): Promise<{ success: boolean; error?: string }> {
  // Approval-queue enforcement: force is_visible=false via the server-role
  // client. This runs regardless of webhook config so newly-registered crews
  // never go live before admin review, even if Discord notifications are off.
  // We also grab the edit_token in the same round-trip so we can include the
  // self-service edit URL in the Discord embed below.
  let editToken: string | null = null;
  try {
    const { data, error: updateError } = await serverSupabase
      .from("crews")
      .update({ is_visible: false })
      .eq("id", crew.id)
      .select("edit_token")
      .single();
    if (updateError) {
      console.error(
        "Failed to mark new crew as is_visible=false (approval queue):",
        updateError
      );
      // Don't return — still attempt Discord webhook below.
    }
    editToken =
      (data as { edit_token?: string } | null)?.edit_token ?? null;
    // New crew arrives as is_visible=false → not yet in the public list,
    // but tag-invalidate anyway so any in-flight cached read is refreshed
    // when an admin later approves the crew.
    revalidateTag(CREWS_CACHE_TAG);
  } catch (err) {
    console.error("Unexpected error setting is_visible=false:", err);
  }

  // PIN: 등록 폼에서 받은 PIN을 서버에서 해싱하여 저장.
  // 실패해도 등록은 막지 않는다 — 사용자는 첫 편집 시 다시 설정할 수 있다.
  if (options?.pin && /^\d{4}$/.test(options.pin)) {
    try {
      const { isWeakPin, hashPin } = await import("@/lib/server/pin");
      if (!isWeakPin(options.pin)) {
        const hash = await hashPin(options.pin);
        const pinSetAt = new Date().toISOString();
        const { error: pinErr } = await serverSupabase
          .from("crews")
          .update({
            pin_hash: hash,
            pin_set_at: pinSetAt,
            failed_pin_attempts: 0,
            pin_locked_until: null,
          })
          .eq("id", crew.id);
        if (pinErr) {
          console.error("[notifyCrewRegistration] PIN update failed:", pinErr);
        }
      } else {
        console.warn("[notifyCrewRegistration] Weak PIN supplied; skipping save.");
      }
    } catch (e) {
      console.error("[notifyCrewRegistration] PIN hash failed:", e);
    }
  }

  const webhookUrl = process.env.DISCORD_REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "DISCORD_REGISTRATION_WEBHOOK_URL not set — skipping Discord notification."
    );
    return { success: false, error: "webhook URL not configured" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://running-crew-map.vercel.app";
  const adminEditUrl = `${baseUrl}/admin/crew/edit/${crew.id}`;
  const adminListUrl = `${baseUrl}/admin/crew`;
  // User-facing self-edit URL — admin DMs this to the crew leader on Instagram
  // so they can update their own info without creating an account.
  const userEditUrl = editToken
    ? `${baseUrl}/crew/edit/${crew.id}?token=${editToken}`
    : null;

  const coordLine =
    crew.lat != null && crew.lng != null
      ? `${crew.lat.toFixed(5)}, ${crew.lng.toFixed(5)}`
      : "—";
  const naverLink =
    crew.lat != null && crew.lng != null
      ? `[지도에서 보기](https://map.naver.com/v5/?c=${crew.lng},${crew.lat},16,0,0,0,dh)`
      : null;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "인스타그램",
      value: crew.instagram || "—",
      inline: true,
    },
    {
      name: "좌표",
      value: coordLine,
      inline: true,
    },
  ];
  if (crew.mainAddress) {
    fields.push({ name: "주요 주소", value: crew.mainAddress, inline: false });
  }
  if (crew.description) {
    const trimmed =
      crew.description.length > 180
        ? crew.description.slice(0, 177) + "…"
        : crew.description;
    fields.push({ name: "소개", value: trimmed, inline: false });
  }
  fields.push({
    name: "관리자 링크",
    value:
      `🔧 [이 크루 검토 / 편집](${adminEditUrl})` +
      (naverLink ? ` · ${naverLink}` : "") +
      `\n📋 [전체 크루 목록 관리](${adminListUrl})`,
    inline: false,
  });
  // Self-service edit link — admin should DM this to the crew leader's
  // registered Instagram so they can update their own info later.
  if (userEditUrl) {
    fields.push({
      name: "✉️ 크루장 자가-편집 URL (인스타 DM으로 전달)",
      value: `\`${userEditUrl}\``,
      inline: false,
    });
  }

  const payload = {
    username: "런하우스 등록 알림",
    embeds: [
      {
        title: `🏃 새 크루 등록 요청`,
        description: `**${crew.name}** 가 승인 대기 중입니다.`,
        color: 0xc7ff00, // lime
        fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: "is_visible = false · 검토 후 공개로 전환해주세요",
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `Discord webhook returned ${res.status}: ${body.slice(0, 200)}`
      );
      return { success: false, error: `${res.status}` };
    }
    return { success: true };
  } catch (err) {
    console.error("Discord webhook fetch failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Token-gated self-service edit flow
// ──────────────────────────────────────────────────────────────────────
//
// Each crew has an `edit_token` column populated by the DB on insert
// (see migrations/2026-05-16-add-edit-token.sql). The token lets a crew
// leader edit their own info without creating an account — the admin
// shares the token-bearing URL via the Instagram DM that was used at
// registration, which itself serves as identity proof.

// Shape returned to the edit page. We deliberately omit edit_token from
// the response — once validated, the client doesn't need to see it again.
export interface CrewForEdit {
  id: string;
  name: string;
  description: string;
  instagram: string | null;
  founded_date: string | null;
  activity_day: string | null;
  age_range: string | null;
  activity_locations: string[];
  location: {
    main_address: string;
    detail_address: string | null;
    latitude: number;
    longitude: number;
  };
  is_visible: boolean;
}

interface CrewLocationRow {
  main_address: string | null;
  detail_address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CrewActivityLocationRow {
  location_name: string;
}

interface CrewRow {
  id: string;
  name: string;
  description: string;
  instagram: string | null;
  founded_date: string | null;
  activity_day: string | null;
  age_range: string | null;
  is_visible: boolean;
  edit_token: string;
  crew_locations: CrewLocationRow[] | null;
  crew_activity_locations: CrewActivityLocationRow[] | null;
}

/**
 * Token-validated fetch of a crew's editable fields.
 *
 * Returns { crew } on success or { error } if the token is wrong / row
 * doesn't exist. We use a constant-time-ish comparison (string equality
 * is fine here — tokens are UUIDs with high entropy, not user passwords).
 *
 * Session fallback: if token is null/missing, checks getCrewSession() for a
 * matching crewId. Allows crew leaders to edit after PIN auth.
 */
export async function getCrewForEdit(
  crewId: string,
  token: string | null
): Promise<{ crew?: CrewForEdit; error?: string }> {
  if (!crewId) {
    return { error: "missing-credentials" };
  }
  // 세션 fallback: token이 없거나 일치하지 않아도 세션이 같은 crewId면 통과.
  let isSessionAuth = false;
  if (!token) {
    const session = await getCrewSession();
    if (session?.crewId === crewId) {
      isSessionAuth = true;
    } else {
      return { error: "missing-credentials" };
    }
  }
  try {
    const { data, error } = await serverSupabase
      .from("crews")
      .select(
        `
          id, name, description, instagram, founded_date, activity_day,
          age_range, is_visible, edit_token,
          crew_locations ( main_address, detail_address, latitude, longitude ),
          crew_activity_locations ( location_name )
        `
      )
      .eq("id", crewId)
      .maybeSingle();

    if (error) {
      console.error("getCrewForEdit DB error:", error);
      return { error: "db-error" };
    }
    if (!data) {
      return { error: "not-found" };
    }

    const row = data as unknown as CrewRow;
    if (!isSessionAuth && row.edit_token !== token) {
      // Don't leak whether the token was wrong vs the row missing.
      return { error: "invalid-token" };
    }

    const loc = row.crew_locations?.[0] ?? null;
    const activityLocations =
      row.crew_activity_locations?.map((l) => l.location_name) ?? [];

    return {
      crew: {
        id: row.id,
        name: row.name,
        description: row.description,
        instagram: row.instagram,
        founded_date: row.founded_date,
        activity_day: row.activity_day,
        age_range: row.age_range,
        is_visible: row.is_visible,
        activity_locations: activityLocations,
        location: {
          main_address: loc?.main_address ?? "",
          detail_address: loc?.detail_address ?? null,
          latitude: loc?.latitude ?? 0,
          longitude: loc?.longitude ?? 0,
        },
      },
    };
  } catch (err) {
    console.error("getCrewForEdit unexpected:", err);
    return { error: "exception" };
  }
}

/**
 * Updates the user-editable fields on a crew, gated by edit token.
 *
 * Editing the geo coordinates flips `is_visible` back to false so an
 * approved crew can't have its pin secretly relocated. Activity locations
 * use a delete-and-reinsert pattern (the simpler alternative to diffing).
 *
 * Returns the list of changed top-level field names so the caller can
 * notify the admin via Discord with a clean diff.
 */
export interface CrewEditPayload {
  name?: string;
  description?: string;
  instagram?: string | null;
  activity_day?: string | null;
  age_range?: string | null;
  activity_locations?: string[];
  location?: {
    main_address?: string;
    detail_address?: string | null;
    latitude?: number;
    longitude?: number;
  };
}

export async function updateCrewByToken(
  crewId: string,
  token: string | null,
  payload: CrewEditPayload
): Promise<{
  success: boolean;
  error?: string;
  changedFields?: string[];
  visibilityReset?: boolean;
}> {
  // 1. Re-validate the token + fetch current state for the diff.
  const current = await getCrewForEdit(crewId, token);
  if (current.error || !current.crew) {
    return { success: false, error: current.error || "not-found" };
  }
  const prev = current.crew;

  const changedFields: string[] = [];

  // 2. Build the `crews` row update only with fields that actually changed.
  const crewUpdate: Record<string, unknown> = {};
  if (payload.name != null && payload.name !== prev.name) {
    crewUpdate.name = payload.name;
    changedFields.push("크루명");
  }
  if (
    payload.description != null &&
    payload.description !== prev.description
  ) {
    crewUpdate.description = payload.description;
    changedFields.push("소개");
  }
  if (
    payload.instagram !== undefined &&
    (payload.instagram || null) !== prev.instagram
  ) {
    crewUpdate.instagram = payload.instagram || null;
    changedFields.push("인스타그램");
  }
  if (
    payload.activity_day !== undefined &&
    (payload.activity_day || null) !== prev.activity_day
  ) {
    crewUpdate.activity_day = payload.activity_day || null;
    changedFields.push("활동 요일");
  }
  if (
    payload.age_range !== undefined &&
    (payload.age_range || null) !== prev.age_range
  ) {
    crewUpdate.age_range = payload.age_range || null;
    changedFields.push("연령대");
  }

  // 3. Detect location coordinate change — if so, force re-approval.
  let visibilityReset = false;
  let locationChanged = false;
  if (payload.location) {
    const { latitude, longitude, main_address, detail_address } = payload.location;
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      (latitude !== prev.location.latitude ||
        longitude !== prev.location.longitude)
    ) {
      locationChanged = true;
      changedFields.push("지도 위치 (좌표)");
    }
    if (
      typeof main_address === "string" &&
      main_address !== prev.location.main_address
    ) {
      locationChanged = true;
      if (!changedFields.includes("지도 위치 (좌표)")) {
        changedFields.push("주소");
      }
    }
    if (
      detail_address !== undefined &&
      (detail_address || null) !== prev.location.detail_address
    ) {
      locationChanged = true;
    }
  }

  // 4. Activity locations diff (set comparison)
  let activityLocationsChanged = false;
  if (Array.isArray(payload.activity_locations)) {
    const next = [...payload.activity_locations].sort();
    const before = [...prev.activity_locations].sort();
    if (
      next.length !== before.length ||
      next.some((v, i) => v !== before[i])
    ) {
      activityLocationsChanged = true;
      changedFields.push("활동 장소");
    }
  }

  if (
    Object.keys(crewUpdate).length === 0 &&
    !locationChanged &&
    !activityLocationsChanged
  ) {
    return { success: true, changedFields: [] };
  }

  // 5. Apply crews row update + visibility reset if location moved.
  if (locationChanged && prev.is_visible) {
    crewUpdate.is_visible = false;
    visibilityReset = true;
  }
  if (Object.keys(crewUpdate).length > 0) {
    const { error } = await serverSupabase
      .from("crews")
      .update(crewUpdate)
      .eq("id", crewId);
    if (error) {
      console.error("updateCrewByToken crews update error:", error);
      return { success: false, error: "db-crews" };
    }
  }

  // 6. crew_locations is a separate row; one-per-crew so update by crew_id.
  if (locationChanged && payload.location) {
    const locUpdate: Record<string, unknown> = {};
    if (typeof payload.location.main_address === "string")
      locUpdate.main_address = payload.location.main_address;
    if (payload.location.detail_address !== undefined)
      locUpdate.detail_address = payload.location.detail_address;
    if (typeof payload.location.latitude === "number")
      locUpdate.latitude = payload.location.latitude;
    if (typeof payload.location.longitude === "number")
      locUpdate.longitude = payload.location.longitude;
    const { error } = await serverSupabase
      .from("crew_locations")
      .update(locUpdate)
      .eq("crew_id", crewId);
    if (error) {
      console.error("updateCrewByToken crew_locations error:", error);
      return { success: false, error: "db-location" };
    }
  }

  // 7. Activity locations: simplest pattern is delete-and-reinsert.
  if (activityLocationsChanged && payload.activity_locations) {
    const { error: delErr } = await serverSupabase
      .from("crew_activity_locations")
      .delete()
      .eq("crew_id", crewId);
    if (delErr) {
      console.error("updateCrewByToken activity delete error:", delErr);
      return { success: false, error: "db-activity-locations" };
    }
    if (payload.activity_locations.length > 0) {
      const rows = payload.activity_locations.map((name) => ({
        crew_id: crewId,
        location_name: name,
      }));
      const { error: insErr } = await serverSupabase
        .from("crew_activity_locations")
        .insert(rows);
      if (insErr) {
        console.error("updateCrewByToken activity insert error:", insErr);
        return { success: false, error: "db-activity-locations-insert" };
      }
    }
  }

  // 8. Cache invalidation — map page and home rely on this data. The tag
  // invalidates the `unstable_cache`-wrapped getCrews data layer; the path
  // calls bust the per-route render cache for navigation freshness.
  revalidateTag(CREWS_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/crew/list");
  revalidatePath(`/crew/edit/${crewId}`);

  // 9. Discord notification with diff. Fire-and-forget.
  notifyCrewEdit({
    crewId,
    crewName: payload.name || prev.name,
    changedFields,
    visibilityReset,
  }).catch((err) => console.error("notifyCrewEdit failed:", err));

  return { success: true, changedFields, visibilityReset };
}

/**
 * Posts a Discord embed describing a user-initiated edit so the admin
 * can spot abuse or just stay informed. Returns silently on failure.
 */
async function notifyCrewEdit(p: {
  crewId: string;
  crewName: string;
  changedFields: string[];
  visibilityReset: boolean;
}): Promise<void> {
  const webhookUrl = process.env.DISCORD_REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) return;
  if (p.changedFields.length === 0) return;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://running-crew-map.vercel.app";
  const adminEditUrl = `${baseUrl}/admin/crew/edit/${p.crewId}`;

  const payload = {
    username: "런하우스 수정 알림",
    embeds: [
      {
        title: p.visibilityReset
          ? "🔄 크루 정보 수정됨 · 좌표 변경 → 재승인 필요"
          : "✏️ 크루 정보 수정됨",
        description: `**${p.crewName}** 가 정보를 수정했습니다.`,
        color: p.visibilityReset ? 0xff8800 : 0xc7ff00,
        fields: [
          {
            name: "변경된 필드",
            value: p.changedFields.map((f) => `· ${f}`).join("\n"),
            inline: false,
          },
          {
            name: "관리자 링크",
            value: `🔧 [이 크루 확인 / 편집](${adminEditUrl})`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: p.visibilityReset
          ? { text: "is_visible = false 로 자동 전환 · 재검토 후 다시 공개해주세요" }
          : { text: "사용자 자가-편집 (edit_token)" },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `notifyCrewEdit webhook ${res.status}: ${body.slice(0, 200)}`
      );
    }
  } catch (err) {
    console.error("notifyCrewEdit fetch failed:", err);
  }
}

/**
 * Admin-only: rotate a crew's edit token so any previously-shared URL
 * stops working. Called from the admin edit page when a link is leaked.
 */
export async function rotateCrewEditToken(
  crewId: string
): Promise<{ success: boolean; newToken?: string; error?: string }> {
  try {
    // Use Postgres' gen_random_uuid() default by sending an empty UPDATE
    // that triggers the column default — simpler than UUID-in-app.
    const newToken = crypto.randomUUID();
    const { error } = await serverSupabase
      .from("crews")
      .update({ edit_token: newToken })
      .eq("id", crewId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, newToken };
  } catch (err) {
    console.error("rotateCrewEditToken failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Update the visibility (is_visible) of a crew.
 * Used by admin pages to approve or hide crews.
 */
export async function updateCrewVisibility(
  crewId: string,
  isVisible: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await serverSupabase
      .from("crews")
      .update({ is_visible: isVisible })
      .eq("id", crewId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag(CREWS_CACHE_TAG);
    revalidatePath("/");
    revalidatePath("/map");
    return { success: true };
  } catch (err) {
    console.error("크루 가시성 업데이트 실패:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    };
  }
}

/**
 * Invalidate the public crew cache after a client-side admin mutation.
 *
 * The admin edit page (`/admin/crew/edit/[id]`) writes through the browser
 * Supabase client (`crewService.updateCrew` etc.), which bypasses Next's
 * data cache. Call this from the client right after a successful save so
 * `/`, `/map`, and `/crew/list` (wrapped in `unstable_cache` with the
 * `CREWS_CACHE_TAG` tag) don't serve stale data for up to 60s.
 */
export async function revalidateCrewsCache(
  crewId?: string
): Promise<{ success: boolean }> {
  revalidateTag(CREWS_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/crew/list");
  if (crewId) {
    revalidatePath(`/crew/${crewId}`);
    revalidatePath(`/crew/edit/${crewId}`);
  }
  return { success: true };
}

/**
 * Delete a crew and its associated storage assets.
 * ON DELETE CASCADE in the DB handles related table cleanup.
 */
export async function deleteCrew(
  crewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch crew to get logo URL before deletion
    const { data: crew, error: getError } = await serverSupabase
      .from("crews")
      .select("logo_image_url")
      .eq("id", crewId)
      .single();

    if (getError) {
      return { success: false, error: getError.message };
    }

    // Delete logo image from storage if it exists
    if (crew?.logo_image_url) {
      try {
        const url = new URL(crew.logo_image_url);
        const pathParts = url.pathname.split("/");
        const fileName = pathParts[pathParts.length - 1].split("?")[0];

        await serverSupabase.storage.from("crewLogos").remove([fileName]);
      } catch (imageError) {
        // Log but continue with crew deletion
        console.error("크루 로고 이미지 삭제 중 오류:", imageError);
      }
    }

    // Delete crew (CASCADE handles related rows)
    const { error: deleteError } = await serverSupabase
      .from("crews")
      .delete()
      .eq("id", crewId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidateTag(CREWS_CACHE_TAG);
    revalidatePath("/");
    revalidatePath("/map");
    return { success: true };
  } catch (err) {
    console.error("크루 삭제 실패:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    };
  }
}
