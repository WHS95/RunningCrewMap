// src/lib/server/stores.ts
import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { serverSupabase } from "./supabase";
import type { Store, StoreCategory } from "@/lib/types/store";

export const STORES_CACHE_TAG = "stores";
const STORES_CACHE_TTL_SECS = 60;

interface DbStoreRow {
  id: string;
  name: string;
  category: StoreCategory;
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
  created_at: string;
  store_locations: Array<{
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  }>;
  store_photos?: Array<{
    photo_url: string;
    display_order: number;
  }>;
}

function transformStore(row: DbStoreRow): Store {
  const loc = row.store_locations[0];
  const photos = (row.store_photos ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((p) => p.photo_url);

  return {
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
    location: {
      lat: loc.latitude,
      lng: loc.longitude,
      address: loc.detail_address || loc.main_address,
      main_address: loc.main_address,
    },
    photos,
    created_at: row.created_at,
  };
}

async function fetchStoresFromDb(): Promise<Store[]> {
  const { data, error } = await serverSupabase
    .from("stores")
    .select(
      `
      id, name, category, description, verification_method,
      reward_description, owner_message, business_hours, contact,
      instagram, naver_map_url, event_post_url, main_image_url,
      created_at,
      store_locations (*),
      store_photos ( photo_url, display_order )
      `
    )
    .eq("is_visible", true)
    .order("name");

  if (error) throw error;
  return (data as DbStoreRow[]).map(transformStore);
}

const fetchStoresCached = unstable_cache(
  fetchStoresFromDb,
  ["server-stores-v1"],
  { revalidate: STORES_CACHE_TTL_SECS, tags: [STORES_CACHE_TAG] }
);

export const getVisibleStores = cache(async (): Promise<Store[]> => {
  return fetchStoresCached();
});

export const getStoreCount = cache(async (): Promise<number> => {
  const { count, error } = await serverSupabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("is_visible", true);
  if (error) throw error;
  return count ?? 0;
});

/**
 * 어드민 + 토큰 수정 진입용. is_visible 무관 단건 조회.
 * 캐시 태깅 안 함 (소량 단건, 항상 fresh).
 */
export const getStoreByIdAdmin = cache(
  async (id: string): Promise<(Store & { is_visible: boolean }) | null> => {
    const { data, error } = await serverSupabase
      .from("stores")
      .select(
        `
        id, name, category, description, verification_method,
        reward_description, owner_message, business_hours, contact,
        instagram, naver_map_url, event_post_url, main_image_url,
        is_visible, created_at,
        store_locations (*),
        store_photos ( photo_url, display_order )
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const row = data as DbStoreRow & { is_visible: boolean };
    return { ...transformStore(row), is_visible: row.is_visible };
  }
);
