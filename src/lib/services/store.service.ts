// src/lib/services/store.service.ts
import { supabase } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import type {
  Store,
  StoreAdmin,
  StoreCategory,
} from "@/lib/types/store";
import type {
  CreateStoreInput,
  UpdateStoreInput,
  StoreFilterOptions,
} from "@/lib/types/storeInsert";

class StoreService {
  private BUCKET = "storePhotos";
  private MAX_BYTES = 2 * 1024 * 1024;
  private ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;

  // ---------- 이미지 ----------
  private validateImage(file: File) {
    if (file.size > this.MAX_BYTES)
      throw new Error("이미지는 2MB 이하여야 합니다.");
    if (!this.ALLOWED.includes(file.type as (typeof this.ALLOWED)[number]))
      throw new Error("JPG, PNG, WebP만 업로드 가능합니다.");
  }

  private async compressToWebp(file: File): Promise<File> {
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    });
    return new File([compressed], file.name.replace(/\.[^.]+$/, ".webp"), {
      type: "image/webp",
    });
  }

  private async uploadOne(storeId: string, file: File): Promise<string> {
    this.validateImage(file);
    const webp = await this.compressToWebp(file);
    const name = `${storeId}_${Date.now()}.webp`;
    const { error } = await supabase.storage
      .from(this.BUCKET)
      .upload(name, webp, { upsert: true, contentType: "image/webp" });
    if (error) throw error;
    const { data } = supabase.storage.from(this.BUCKET).getPublicUrl(name);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  private async removeByPublicUrl(url: string): Promise<void> {
    // 파일명만 추출해 remove
    const last = url.split("?")[0].split("/").pop();
    if (!last) return;
    const { error } = await supabase.storage.from(this.BUCKET).remove([last]);
    if (error) console.warn("storePhotos remove failed:", error);
  }
  // ---------- ↑ 이미지 ↑ ----------

  async createStore(input: CreateStoreInput): Promise<{ id: string }> {
    // 1. 메인 사진 먼저 업로드(없으면 등록 거부)
    if (!input.main_image) throw new Error("대표 사진은 필수입니다.");

    // 2. stores insert (main_image_url은 일단 placeholder. 업로드 후 패치)
    const { data: created, error } = await supabase
      .from("stores")
      .insert({
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        verification_method: input.verification_method ?? null,
        reward_description: input.reward_description ?? null,
        owner_message: input.owner_message ?? null,
        business_hours: input.business_hours ?? null,
        contact: input.contact ?? null,
        instagram: input.instagram ?? null,
        naver_map_url: input.naver_map_url ?? null,
        event_post_url: input.event_post_url ?? null,
        is_visible: false, // 안전망: 서버 액션에서도 다시 false 강제
      })
      .select("id")
      .single();
    if (error) throw error;

    const storeId = (created as { id: string }).id;

    // 3. 메인 사진 업로드 + URL 패치
    const mainUrl = await this.uploadOne(storeId, input.main_image);
    await supabase
      .from("stores")
      .update({ main_image_url: mainUrl })
      .eq("id", storeId);

    // 4. location 1:1 insert
    const { error: locErr } = await supabase.from("store_locations").insert({
      store_id: storeId,
      main_address: input.location.main_address,
      detail_address: input.location.detail_address ?? null,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
    });
    if (locErr) throw locErr;

    // 5. 추가 사진 (선택)
    if (input.photos && input.photos.length > 0) {
      const limited = input.photos.slice(0, 6);
      const rows = [] as Array<{
        store_id: string;
        photo_url: string;
        display_order: number;
      }>;
      for (let i = 0; i < limited.length; i++) {
        const url = await this.uploadOne(storeId, limited[i]);
        rows.push({ store_id: storeId, photo_url: url, display_order: i });
      }
      const { error: phErr } = await supabase
        .from("store_photos")
        .insert(rows);
      if (phErr) throw phErr;
    }

    return { id: storeId };
  }

  async getStoreList(options?: StoreFilterOptions): Promise<Store[]> {
    let q = supabase
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
      .order("name");

    if (options?.visibilityFilter === "live") q = q.eq("is_visible", true);
    else if (options?.visibilityFilter === "pending")
      q = q.eq("is_visible", false);

    if (options?.category) q = q.eq("category", options.category);

    const { data, error } = await q;
    if (error) throw error;
    // transform: server/stores.ts와 동일 로직(필요시 공통 유틸로 추출하지만
    // 일단은 인라인). 결과 타입에 is_visible 포함시키지 않음.
    return ((data ?? []) as unknown as Array<{
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
      store_photos?: Array<{ photo_url: string; display_order: number }>;
    }>).map((r) => {
      const loc = r.store_locations[0];
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        description: r.description,
        verification_method: r.verification_method,
        reward_description: r.reward_description,
        owner_message: r.owner_message,
        business_hours: r.business_hours,
        contact: r.contact,
        instagram: r.instagram,
        naver_map_url: r.naver_map_url,
        event_post_url: r.event_post_url,
        main_image_url: r.main_image_url,
        location: {
          lat: loc.latitude,
          lng: loc.longitude,
          address: loc.detail_address || loc.main_address,
          main_address: loc.main_address,
        },
        photos: (r.store_photos ?? [])
          .slice()
          .sort((a, b) => a.display_order - b.display_order)
          .map((p) => p.photo_url),
        created_at: r.created_at,
      };
    });
  }

  async getStoreById(id: string): Promise<Store | null> {
    const list = await this.getStoreList();
    return list.find((s) => s.id === id) ?? null;
  }

  // 어드민 전용: is_visible을 보존한 채 매장 목록을 반환.
  // /admin/store 페이지가 가시성 토글 / PENDING 필터에 쓰임. 미들웨어 가드
  // 통과를 권한 증명으로 사용 (RLS SELECT 공개 정책 + service-key 불필요).
  async getStoreListAdmin(options?: StoreFilterOptions): Promise<StoreAdmin[]> {
    let q = supabase
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
      .order("created_at", { ascending: false });

    if (options?.visibilityFilter === "live") q = q.eq("is_visible", true);
    else if (options?.visibilityFilter === "pending")
      q = q.eq("is_visible", false);

    if (options?.category) q = q.eq("category", options.category);

    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as unknown as Array<{
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
      is_visible: boolean;
      created_at: string;
      store_locations: Array<{
        main_address: string;
        detail_address?: string;
        latitude: number;
        longitude: number;
      }>;
      store_photos?: Array<{ photo_url: string; display_order: number }>;
    }>).map((r) => {
      const loc = r.store_locations[0];
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        description: r.description,
        verification_method: r.verification_method,
        reward_description: r.reward_description,
        owner_message: r.owner_message,
        business_hours: r.business_hours,
        contact: r.contact,
        instagram: r.instagram,
        naver_map_url: r.naver_map_url,
        event_post_url: r.event_post_url,
        main_image_url: r.main_image_url,
        is_visible: r.is_visible,
        location: {
          lat: loc?.latitude ?? 0,
          lng: loc?.longitude ?? 0,
          address: loc?.detail_address || loc?.main_address || "",
          main_address: loc?.main_address ?? "",
        },
        photos: (r.store_photos ?? [])
          .slice()
          .sort((a, b) => a.display_order - b.display_order)
          .map((p) => p.photo_url),
        created_at: r.created_at,
      };
    });
  }

  async updateStore(id: string, input: UpdateStoreInput): Promise<void> {
    // 메인 stores 컬럼 패치
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.category !== undefined) patch.category = input.category;
    if (input.description !== undefined) patch.description = input.description;
    if (input.verification_method !== undefined)
      patch.verification_method = input.verification_method;
    if (input.reward_description !== undefined)
      patch.reward_description = input.reward_description;
    if (input.owner_message !== undefined)
      patch.owner_message = input.owner_message;
    if (input.business_hours !== undefined)
      patch.business_hours = input.business_hours;
    if (input.contact !== undefined) patch.contact = input.contact;
    if (input.instagram !== undefined) patch.instagram = input.instagram;
    if (input.naver_map_url !== undefined)
      patch.naver_map_url = input.naver_map_url;
    if (input.event_post_url !== undefined)
      patch.event_post_url = input.event_post_url;

    // 메인 이미지 교체
    if (input.main_image) {
      // 기존 URL 가져와 삭제
      const { data: prev } = await supabase
        .from("stores")
        .select("main_image_url")
        .eq("id", id)
        .single();
      const newUrl = await this.uploadOne(id, input.main_image);
      patch.main_image_url = newUrl;
      const prevUrl = (prev as { main_image_url?: string } | null)
        ?.main_image_url;
      if (prevUrl) await this.removeByPublicUrl(prevUrl);
    } else if (input.remove_main_image) {
      const { data: prev } = await supabase
        .from("stores")
        .select("main_image_url")
        .eq("id", id)
        .single();
      const prevUrl = (prev as { main_image_url?: string } | null)
        ?.main_image_url;
      if (prevUrl) await this.removeByPublicUrl(prevUrl);
      patch.main_image_url = null;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from("stores")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    }

    // location 업데이트
    if (input.location) {
      const { error } = await supabase
        .from("store_locations")
        .update({
          main_address: input.location.main_address,
          detail_address: input.location.detail_address ?? null,
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        })
        .eq("store_id", id);
      if (error) throw error;
    }

    // 사진 제거
    if (input.removed_photo_urls && input.removed_photo_urls.length > 0) {
      const { error } = await supabase
        .from("store_photos")
        .delete()
        .in("photo_url", input.removed_photo_urls)
        .eq("store_id", id);
      if (error) throw error;
      for (const u of input.removed_photo_urls) await this.removeByPublicUrl(u);
    }

    // 신규 사진 추가
    if (input.new_photos && input.new_photos.length > 0) {
      // 현재 max display_order 조회
      const { data: cur } = await supabase
        .from("store_photos")
        .select("display_order")
        .eq("store_id", id)
        .order("display_order", { ascending: false })
        .limit(1);
      const base =
        ((cur as Array<{ display_order: number }> | null)?.[0]?.display_order ??
          -1) + 1;
      const rows: Array<{
        store_id: string;
        photo_url: string;
        display_order: number;
      }> = [];
      for (let i = 0; i < input.new_photos.length; i++) {
        const url = await this.uploadOne(id, input.new_photos[i]);
        rows.push({ store_id: id, photo_url: url, display_order: base + i });
      }
      const { error } = await supabase.from("store_photos").insert(rows);
      if (error) throw error;
    }
  }

  async deleteStore(id: string): Promise<void> {
    // 사진 파일들 정리 (실패해도 DB 삭제는 진행)
    const { data: photos } = await supabase
      .from("store_photos")
      .select("photo_url")
      .eq("store_id", id);
    const { data: store } = await supabase
      .from("stores")
      .select("main_image_url")
      .eq("id", id)
      .single();

    for (const p of (photos ?? []) as Array<{ photo_url: string }>) {
      await this.removeByPublicUrl(p.photo_url);
    }
    const main = (store as { main_image_url?: string } | null)?.main_image_url;
    if (main) await this.removeByPublicUrl(main);

    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) throw error;
  }
}

export const storeService = new StoreService();
