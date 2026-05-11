"use server";

import { serverSupabase } from "@/lib/server/supabase";
import { revalidatePath } from "next/cache";

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

    revalidatePath("/");
    revalidatePath("/home");
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

    revalidatePath("/");
    revalidatePath("/home");
    return { success: true };
  } catch (err) {
    console.error("크루 삭제 실패:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    };
  }
}
