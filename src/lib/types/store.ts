// src/lib/types/store.ts
// 매장 도메인 frontend 타입. DB row -> 변환 후 형태.

export const STORE_CATEGORIES = ["cafe", "restaurant", "pub", "other"] as const;
export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  cafe: "카페",
  restaurant: "식당",
  pub: "주점",
  other: "기타",
};

export interface StoreLocation {
  lat: number;
  lng: number;
  address: string; // 표시용 (detail || main)
  main_address: string;
}

export interface Store {
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
  logo_url?: string; // 매장 로고 (선택). 없으면 지도 마커는 카테고리 색 글자 원으로 fallback.
  location: StoreLocation;
  photos: string[]; // display_order 정렬된 URL 배열
  created_at: string;
}

// 어드민/편집 화면용. is_visible 포함.
export interface StoreAdmin extends Store {
  is_visible: boolean;
}
