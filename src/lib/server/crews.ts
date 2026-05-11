import "server-only";
import { serverSupabase } from "./supabase";
import { cache } from "react";
import type { Crew } from "@/lib/types/crew";

// Supabase DB row types (mirrored from crew.service.ts)
interface DbCrew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  founded_date: string;
  created_at: string;
  updated_at: string;
  crew_locations: Array<{
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  }>;
  crew_activity_days: Array<{
    day_of_week: string;
  }>;
  crew_age_ranges: Array<{
    min_age: number;
    max_age: number;
  }>;
  crew_activity_locations?: Array<{
    location_name: string;
  }>;
  crew_photos?: Array<{
    photo_url: string;
    display_order: number;
  }>;
}

interface DbJoinMethod {
  crew_id: string;
  method_type: "instagram_dm" | "open_chat" | "other";
  link_url?: string;
  description?: string;
}

/**
 * Transform raw DB crew rows + join methods into the Crew type
 * used by the frontend. This replicates the logic from
 * CrewService.getCrews() in crew.service.ts.
 */
function transformCrews(
  rows: DbCrew[],
  joinMethodsData: DbJoinMethod[]
): Crew[] {
  return rows.map((crew) => {
    // Activity days -> formatted string
    const activityDays = crew.crew_activity_days.map((d) => d.day_of_week);
    const activityDay =
      activityDays.length > 1
        ? `매주 ${activityDays.join(", ")}`
        : activityDays.length === 1
          ? `매주 ${activityDays[0]}`
          : undefined;

    // Age range -> formatted string
    const ageRange = crew.crew_age_ranges[0]
      ? `${crew.crew_age_ranges[0].min_age}~${crew.crew_age_ranges[0].max_age}대`
      : "전 연령대";

    // Activity locations
    const activityLocations = crew.crew_activity_locations
      ? crew.crew_activity_locations.map((loc) => loc.location_name)
      : [];

    // Photos sorted by display_order
    const photos = crew.crew_photos
      ? crew.crew_photos
          .sort((a, b) => a.display_order - b.display_order)
          .map((photo) => photo.photo_url)
      : [];

    // Join methods for this crew
    const crewJoinMethods =
      joinMethodsData
        ?.filter((method) => method.crew_id === crew.id)
        .map((method) => ({
          method_type: method.method_type,
          link_url: method.link_url,
          description: method.description,
        })) || [];

    // Instagram DM flag
    const useInstagramDm = !!crewJoinMethods.find(
      (method) => method.method_type === "instagram_dm"
    );

    // Open chat link
    const openChatMethod = crewJoinMethods.find(
      (method) =>
        method.method_type === "open_chat" || method.method_type === "other"
    );
    const openChatLink = openChatMethod?.link_url || undefined;

    return {
      id: crew.id,
      name: crew.name,
      description: crew.description.replace(/\\n/g, "\n"),
      location: {
        lat: crew.crew_locations[0].latitude,
        lng: crew.crew_locations[0].longitude,
        address:
          crew.crew_locations[0].detail_address ||
          crew.crew_locations[0].main_address,
        main_address: crew.crew_locations[0].main_address,
      },
      instagram: crew.instagram,
      logo_image: crew.logo_image_url,
      created_at: crew.created_at,
      founded_date: crew.founded_date,
      activity_day: activityDay,
      age_range: ageRange,
      activity_locations: activityLocations,
      photos,
      join_methods: crewJoinMethods,
      use_instagram_dm: useInstagramDm,
      open_chat_link: openChatLink,
    };
  });
}

/**
 * Fetch all visible crews with their related data.
 * Wrapped with React.cache() so the result is deduplicated
 * within a single server render pass.
 */
export const getCrews = cache(async (): Promise<Crew[]> => {
  const [crewsResult, joinMethodsResult] = await Promise.all([
    serverSupabase
      .from("crews")
      .select(
        `
        *,
        crew_locations (*),
        crew_activity_days (day_of_week),
        crew_age_ranges (*),
        crew_activity_locations (location_name),
        crew_photos (
          photo_url,
          display_order
        )
      `
      )
      .eq("is_visible", true)
      .order("name"),
    serverSupabase.from("crew_join_methods").select("*"),
  ]);

  if (crewsResult.error) throw crewsResult.error;
  if (joinMethodsResult.error) throw joinMethodsResult.error;

  return transformCrews(
    crewsResult.data as DbCrew[],
    joinMethodsResult.data as DbJoinMethod[]
  );
});

/**
 * Fetch only the count of visible crews (head-only query).
 * Used on the home page for the stats display.
 */
export const getCrewCount = cache(async (): Promise<number> => {
  const { count, error } = await serverSupabase
    .from("crews")
    .select("*", { count: "exact", head: true })
    .eq("is_visible", true);

  if (error) throw error;
  return count ?? 0;
});
