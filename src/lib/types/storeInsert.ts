// src/lib/types/storeInsert.ts
// 등록·수정 입력 타입과 raw DB row 타입.

import type { StoreCategory } from "./store";

// DB row 형태 (snake_case)
export interface StoreRow {
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
  logo_url: string | null; // 매장 로고 (nullable)
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreLocationRow {
  id: string;
  store_id: string;
  main_address: string;
  detail_address?: string;
  latitude: number;
  longitude: number;
}

export interface StorePhotoRow {
  id: string;
  store_id: string;
  photo_url: string;
  display_order: number;
}

// 등록 입력
export interface CreateStoreInput {
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
  location: {
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  };
  main_image?: File;     // 등록 시 필수
  logo?: File;            // 매장 로고 (선택). 1:1 정사각 JPEG.
  photos?: File[];        // 추가 사진 (최대 6장)
  pin?: string;           // 4자리. 서버에서 해싱.
}

// 수정 입력 (자가 수정 + 어드민)
export interface UpdateStoreInput {
  name?: string;
  category?: StoreCategory;
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
  main_image?: File;       // 신규 업로드 시
  remove_main_image?: boolean;
  logo?: File;             // 매장 로고 신규 업로드 시
  remove_logo?: boolean;   // 로고 제거 시 (logo 없을 때만 적용)
  new_photos?: File[];
  removed_photo_urls?: string[]; // 기존 사진 중 삭제할 URL 목록
}

// 어드민·검색용 필터
export interface StoreFilterOptions {
  category?: StoreCategory;
  visibilityFilter?: "all" | "live" | "pending";
}
