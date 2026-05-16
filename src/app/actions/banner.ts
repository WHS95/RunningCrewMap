"use server";

import { serverSupabase } from "@/lib/server/supabase";
import { revalidatePath } from "next/cache";

/**
 * Promo banner CRUD for the /home carousel.
 *
 * The /home page fetches `listActiveBanners()` server-side and feeds the
 * results into NoticeBanner. Admin manages the rows from /admin/events.
 *
 * Schema: see migrations/2026-05-16-add-promo-banners.sql.
 */

export interface PromoBannerRow {
  id: string;
  title: string;
  description: string | null;
  link: string;
  image_url: string | null;
  variant: "cap" | "flag" | null;
  code: string | null;
  cta: string | null;
  bg_color: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// All fields optional — updates partially patch; create defaults missing
// title/link to placeholders since they're required at the row level.
export interface BannerInput {
  title?: string;
  description?: string | null;
  link?: string;
  image_url?: string | null;
  variant?: "cap" | "flag" | null;
  code?: string | null;
  cta?: string | null;
  bg_color?: string | null;
  is_active?: boolean;
  display_order?: number;
}

const TABLE = "promo_banners";

// Supabase / Postgrest error objects often use non-enumerable getters, so a
// bare `console.error(error)` renders as `{}` in the Next.js dev overlay even
// when there's plenty of info inside. This helper introspects every available
// channel — own keys, getOwnPropertyNames, toString, JSON.stringify with an
// explicit key list — so SOMETHING actionable always lands in the log.
function describeSupabaseError(
  prefix: string,
  err: unknown
): {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  /** True if the table itself doesn't exist (migration not applied). */
  isMissingTable: boolean;
} {
  // Best-effort field extraction. Supabase returns PostgrestError which has
  // these getters; non-Supabase errors (DOMException, fetch failure, env-
  // misconfig throws) may have only `.message` or none of these.
  const e = (err ?? {}) as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    name?: string;
  };
  const message = e.message ?? String(err);
  const code = e.code;
  const details = e.details;
  const hint = e.hint;
  const isMissingTable =
    code === "42P01" ||
    /relation .* does not exist/i.test(message) ||
    /Could not find the table/i.test(message);

  // Known "table doesn't exist" is a soft condition — the UI surfaces a
  // migration banner that tells the admin exactly what to do.
  if (isMissingTable) {
    console.warn(
      `${prefix} table missing — run migrations/2026-05-16-add-promo-banners.sql`
    );
    return { message, code, details, hint, isMissingTable };
  }

  // Pull every introspectable channel so the overlay can render at least one.
  let ownKeys: string[] = [];
  let stringified = "";
  try {
    if (err && typeof err === "object") {
      ownKeys = Object.getOwnPropertyNames(err);
      stringified = JSON.stringify(err, ownKeys);
    } else {
      stringified = String(err);
    }
  } catch {
    stringified = "<unstringifiable>";
  }

  // Banner errors are non-fatal — the page already shows a graceful
  // empty-state with a migration hint. Use console.warn so the Next.js
  // dev overlay doesn't pop on every page visit. Real fatal errors
  // (which never originate here) would use console.error elsewhere.
  console.warn(`${prefix} raw:`, err);
  console.warn(`${prefix} string:`, stringified || "(empty)");
  console.warn(`${prefix} parsed:`, {
    message: message || "(empty)",
    code: code || "(none)",
    details: details || "(none)",
    hint: hint || "(none)",
    name: e.name || "(none)",
    ownKeys: ownKeys.length > 0 ? ownKeys : "(none)",
    constructor:
      err && typeof err === "object"
        ? err.constructor?.name ?? "(anonymous)"
        : typeof err,
    isMissingTable,
  });

  return { message, code, details, hint, isMissingTable };
}

// Sentinel result so callers (e.g. admin UI) can tell "DB not migrated" apart
// from "empty list".
export interface BannerListResult {
  banners: PromoBannerRow[];
  migrationMissing: boolean;
  errorMessage: string | null;
}

// List active banners in display order — used by /home (server fetch).
// Returns just the array for simplicity; /home doesn't need to distinguish
// "no banners yet" from "table missing" — both fall back to the hardcoded
// FALLBACK_BANNERS in HomeContent.
export async function listActiveBanners(): Promise<PromoBannerRow[]> {
  try {
    const { data, error } = await serverSupabase
      .from(TABLE)
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      describeSupabaseError("listActiveBanners:", error);
      return [];
    }
    return (data as PromoBannerRow[]) ?? [];
  } catch (e) {
    describeSupabaseError("listActiveBanners unexpected:", e);
    return [];
  }
}

// List all banners (active + inactive) — used by /admin/events.
// Returns a richer result so the admin UI can surface a "run the migration"
// hint instead of silently showing an empty list.
export async function listAllBanners(): Promise<BannerListResult> {
  try {
    const { data, error } = await serverSupabase
      .from(TABLE)
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      const desc = describeSupabaseError("listAllBanners:", error);
      return {
        banners: [],
        migrationMissing: desc.isMissingTable,
        errorMessage: desc.message,
      };
    }
    return {
      banners: (data as PromoBannerRow[]) ?? [],
      migrationMissing: false,
      errorMessage: null,
    };
  } catch (e) {
    const desc = describeSupabaseError("listAllBanners unexpected:", e);
    return {
      banners: [],
      migrationMissing: desc.isMissingTable,
      errorMessage: desc.message,
    };
  }
}

export async function createBanner(
  input: BannerInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await serverSupabase
      .from(TABLE)
      .insert({
        title: input.title || "새 이벤트",
        description: input.description ?? null,
        link: input.link || "/",
        image_url: input.image_url ?? null,
        variant: input.variant ?? null,
        code: input.code ?? null,
        cta: input.cta ?? null,
        bg_color: input.bg_color ?? null,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/home");
    revalidatePath("/admin/events");
    return { success: true, id: (data as { id: string }).id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

export async function updateBanner(
  id: string,
  input: BannerInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined)
      patch.description = input.description ?? null;
    if (input.link !== undefined) patch.link = input.link;
    if (input.image_url !== undefined) patch.image_url = input.image_url ?? null;
    if (input.variant !== undefined) patch.variant = input.variant ?? null;
    if (input.code !== undefined) patch.code = input.code ?? null;
    if (input.cta !== undefined) patch.cta = input.cta ?? null;
    if (input.bg_color !== undefined) patch.bg_color = input.bg_color ?? null;
    if (input.is_active !== undefined) patch.is_active = input.is_active;
    if (input.display_order !== undefined)
      patch.display_order = input.display_order;

    if (Object.keys(patch).length === 0) {
      return { success: true };
    }

    const { error } = await serverSupabase
      .from(TABLE)
      .update(patch)
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/home");
    revalidatePath("/admin/events");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

export async function deleteBanner(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await serverSupabase.from(TABLE).delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/home");
    revalidatePath("/admin/events");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

// Move a banner up or down in display order — small UX helper for admin.
export async function reorderBanner(
  id: string,
  direction: "up" | "down"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { banners } = await listAllBanners();
    const idx = banners.findIndex((b) => b.id === id);
    if (idx < 0) return { success: false, error: "not-found" };

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) {
      return { success: true }; // already at edge
    }

    const a = banners[idx];
    const b = banners[swapIdx];
    // Swap their display_order values.
    const { error: e1 } = await serverSupabase
      .from(TABLE)
      .update({ display_order: b.display_order })
      .eq("id", a.id);
    if (e1) return { success: false, error: e1.message };
    const { error: e2 } = await serverSupabase
      .from(TABLE)
      .update({ display_order: a.display_order })
      .eq("id", b.id);
    if (e2) return { success: false, error: e2.message };

    revalidatePath("/home");
    revalidatePath("/admin/events");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
