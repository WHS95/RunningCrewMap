# 러닝 인증 매장(Store) 도메인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 런하우스에 매장(러닝 인증 카페·식당·주점) 도메인을 추가한다. 사장님 자가 등록 → 어드민 승인 큐 → `edit_token` + PIN 자가 수정. `/map`은 크루와 매장을 같은 지도에 통합 (상단 토글 필터).

**Architecture:** 크루 도메인의 운영·자가수정·캐시·웹훅 패턴을 1:1 미러. `stores` + `store_locations`(1:1) + `store_photos`(1:N). `STORES_CACHE_TAG="stores"`로 크루와 독립된 캐시. PIN 인증·세션·디스코드 웹훅은 기존 `lib/server/pin.ts`, `lib/server/crewSession.ts` 패턴을 그대로 차용(매장용 별도 모듈).

**Tech Stack:** Next.js 15 App Router (Server Actions), TypeScript strict, Supabase (service-role + anon), bcryptjs (PIN), Node `crypto` (HMAC 세션), Naver Maps, lucide-react 아이콘, browser-image-compression, Zod.

**Spec:** `docs/superpowers/specs/2026-05-22-running-cert-stores-design.md`

**⚠️ 환경 — 테스트 러너 없음:** 프로젝트에 jest/vitest 등 테스트 러너가 없음 (`CLAUDE.md` 명시). 검증은 다음으로 한다:
- 타입: `npx tsc --noEmit`
- 린트: `npm run lint`
- 빌드: `npm run build`
- 런타임 스모크: `npm run dev` + 수동 브라우저 흐름

**⚠️ 중요 패턴:**
- `serverSupabase`는 **인스턴스 export** (함수 아님). `serverSupabase.from(...)`. 괄호 없음.
- 한국어 커밋 메시지 (CLAUDE.md). 예: `feat(store): ...`, `fix(store): ...`.
- 매 server mutation 후 `revalidateTag(STORES_CACHE_TAG)` + 관련 경로 `revalidatePath` 필수.
- 좌표·주소 변경 시 `is_visible=false`로 강제 리셋(어드민 재승인 트리거) — 의도적 anti-abuse, 절대 제거 금지.

**⚠️ 파일 무시 규칙:** `.gitignore`가 `/docs/`와 `*.md`를 차단. 본 plan 파일 및 추후 추가 `결정.md`/`CLAUDE.md` 수정은 `git add -f` 또는 이미 추적 중인 파일 수정으로 처리.

---

## 병렬 실행 웨이브 (Wave map)

플랜 실행 시 다음 웨이브로 묶어 병렬 디스패치 가능:

- **Wave 1 (parallel):** Task 1 (Migration), Task 2 (Types), Task 13 (Docs)
- **Wave 2 (parallel, depends on 1+2):** Task 3 (Server data), Task 4 (Client service), Task 6 (UI components)
- **Wave 3 (depends on 1+2+3):** Task 5 (Server actions)
- **Wave 4 (parallel, depends on 4+5+6):** Task 7 (Register), Task 8 (Public list/detail), Task 9 (PIN edit), Task 10 (Admin), Task 11 (Map integration), Task 12 (Menu + sitemap)
- **Wave 5 (sequential):** Task 14 (Final verification + branch commit)

---

## Task 1: DB 마이그레이션 + Storage 버킷 + 환경변수

**Files:**
- Create: `migrations/2026-05-22-create-stores.sql`
- Modify (안내만, 사용자 수동): `.env.local`, `.env`
- Storage 버킷(Supabase 콘솔 수동): `storePhotos`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- migrations/2026-05-22-create-stores.sql
-- =====================================================================
-- 2026-05-22: Create stores domain (러닝 인증 매장).
-- =====================================================================
--
-- Why: 사장님 자가 등록 + 어드민 승인 + PIN 자가 수정 패턴으로
-- 러닝 인증 매장(카페·식당·주점) 도메인을 추가. 크루 도메인과 동일한
-- 운영 모델·캐시 패턴·anti-abuse 규칙(좌표 변경 시 is_visible 리셋).
--
-- 보안 모델:
--   - edit_token: 서버 생성, anon에서 SELECT 불가
--   - pin_hash: bcrypt(cost 12), 5회 실패/15분 잠금
--   - is_visible: 기본 false (어드민 승인 명시)
--
-- 적용: Supabase SQL editor에 통째로 붙여넣고 1회 실행. 멱등.
-- 롤백: 파일 끝 ROLLBACK 블록 참조.
-- =====================================================================

-- 1. stores 메인 테이블
CREATE TABLE IF NOT EXISTS public.stores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) UNIQUE NOT NULL,
  category              VARCHAR(20) NOT NULL
                          CHECK (category IN ('cafe','restaurant','pub','other')),
  description           TEXT,
  verification_method   TEXT,
  reward_description    TEXT,
  owner_message         TEXT,
  business_hours        TEXT,
  contact               VARCHAR(50),
  instagram             VARCHAR(100),
  naver_map_url         TEXT,
  event_post_url        TEXT,
  main_image_url        TEXT,
  is_visible            BOOLEAN NOT NULL DEFAULT false,
  edit_token            TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  pin_hash              TEXT,
  pin_set_at            TIMESTAMPTZ,
  failed_pin_attempts   INT NOT NULL DEFAULT 0,
  pin_locked_until      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_visible  ON public.stores (is_visible);
CREATE INDEX IF NOT EXISTS idx_stores_category ON public.stores (category);
CREATE UNIQUE INDEX IF NOT EXISTS stores_edit_token_unique_idx
  ON public.stores (edit_token);
CREATE UNIQUE INDEX IF NOT EXISTS stores_instagram_lower_unique_idx
  ON public.stores (LOWER(instagram))
  WHERE instagram IS NOT NULL AND instagram <> '';

-- 2. store_locations (1:1)
CREATE TABLE IF NOT EXISTS public.store_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  main_address    VARCHAR(200) NOT NULL,
  detail_address  TEXT,
  latitude        NUMERIC(10,8) NOT NULL,
  longitude       NUMERIC(11,8) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_locations_store
  ON public.store_locations (store_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_geo
  ON public.store_locations (latitude, longitude);

-- 3. store_photos (1:N)
CREATE TABLE IF NOT EXISTS public.store_photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  photo_url      TEXT NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_photos_store
  ON public.store_photos (store_id, display_order);

-- 4. RLS: SELECT 공개, 쓰기는 service-role bypass에 위임 (크루와 동일)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "stores select public"
  ON public.stores FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY IF NOT EXISTS "store_locations select public"
  ON public.store_locations FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY IF NOT EXISTS "store_photos select public"
  ON public.store_photos FOR SELECT
  TO anon, authenticated USING (true);

-- 5. 민감 컬럼은 anon에서 SELECT 불가
REVOKE SELECT (edit_token, pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until)
  ON public.stores FROM anon;
REVOKE SELECT (edit_token, pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until)
  ON public.stores FROM authenticated;

-- =====================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.store_photos CASCADE;
--   DROP TABLE IF EXISTS public.store_locations CASCADE;
--   DROP TABLE IF EXISTS public.stores CASCADE;
-- =====================================================================
```

- [ ] **Step 2: Storage 버킷 안내 (사용자 콘솔 수동)**

사용자에게 다음 메시지 전달:

> Supabase 대시보드 → Storage → "New bucket" → 이름 `storePhotos`, Public bucket 체크. RLS는 anon `INSERT`, `SELECT`, `UPDATE`, `DELETE` 모두 허용(`crewLogos`/`crewActivePicture`와 동일).

- [ ] **Step 3: 환경변수 안내 (사용자 수동)**

`.env.local`과 `.env`에 추가 (둘 다 — 프로젝트는 둘 다 사용):

```
DISCORD_STORE_WEBHOOK_URL=
```

미설정 시 `DISCORD_REGISTRATION_WEBHOOK_URL`로 fallback(설계서 7장). 별도 채널 운영 시에만 채움.

- [ ] **Step 4: 마이그레이션 적용 확인**

사용자가 Supabase SQL editor에서 실행 후 다음 쿼리로 확인:

```sql
SELECT to_regclass('public.stores'),
       to_regclass('public.store_locations'),
       to_regclass('public.store_photos');
```

3개 모두 NOT NULL이면 성공.

- [ ] **Step 5: 커밋**

```bash
git add migrations/2026-05-22-create-stores.sql
git commit -m "feat(store): add stores/store_locations/store_photos schema"
```

---

## Task 2: 타입 정의

**Files:**
- Create: `src/lib/types/store.ts`
- Create: `src/lib/types/storeInsert.ts`

- [ ] **Step 1: `src/lib/types/store.ts` 작성**

```ts
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
  location: StoreLocation;
  photos: string[]; // display_order 정렬된 URL 배열
  created_at: string;
}

// 어드민/편집 화면용. is_visible 포함.
export interface StoreAdmin extends Store {
  is_visible: boolean;
}
```

- [ ] **Step 2: `src/lib/types/storeInsert.ts` 작성**

```ts
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
  new_photos?: File[];
  removed_photo_urls?: string[]; // 기존 사진 중 삭제할 URL 목록
}

// 어드민·검색용 필터
export interface StoreFilterOptions {
  category?: StoreCategory;
  visibilityFilter?: "all" | "live" | "pending";
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 0 error (다른 파일에서 아직 import 안 함).

- [ ] **Step 4: 커밋**

```bash
git add src/lib/types/store.ts src/lib/types/storeInsert.ts
git commit -m "feat(store): add Store types"
```

---

## Task 3: 서버 데이터 레이어 (`src/lib/server/stores.ts`)

**의존:** Task 1, 2 완료

**Files:**
- Create: `src/lib/server/stores.ts`

- [ ] **Step 1: 파일 작성**

```ts
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
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 0 error.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/server/stores.ts
git commit -m "feat(store): add server data layer with STORES_CACHE_TAG"
```

---

## Task 4: 클라이언트 서비스 (`src/lib/services/store.service.ts`)

**의존:** Task 1, 2 완료

**Files:**
- Create: `src/lib/services/store.service.ts`

크루 `crew.service.ts`를 1:1 미러하되 활동요일/연령대/조인메서드 자식 테이블은 없음. 사진은 `storePhotos` 버킷 사용.

- [ ] **Step 1: 파일 작성 — 골격과 이미지 업로드**

먼저 `src/lib/services/crew.service.ts`의 다음 영역을 그대로 차용한다:
- `validateImage()` 헬퍼 (2MB, jpeg/png/webp)
- `uploadImage()` 헬퍼 (timestamp 파일명 + cache-busting URL)
- `getPublicUrl()` 헬퍼
- 로고/사진 압축은 `browser-image-compression` + WebP 변환

```ts
// src/lib/services/store.service.ts
import { supabase } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import type {
  Store,
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
```

- [ ] **Step 2: CRUD 메서드 추가 (같은 파일 계속)**

```ts
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
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 0 error.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/services/store.service.ts
git commit -m "feat(store): add client-side StoreService (CRUD + storePhotos bucket)"
```

---

## Task 5: 서버 액션 (`src/app/actions/store.ts`)

**의존:** Task 1, 2, 3 완료

**Files:**
- Create: `src/app/actions/store.ts`
- Create: `src/lib/server/storeSession.ts` (HMAC 세션 헬퍼)

크루 `crew.ts` 액션의 다음 흐름을 미러:
1. `notifyStoreRegistration` — 등록 후 `is_visible=false` 강제 + PIN 해싱 + Discord
2. `getStoreForEdit` — 토큰 또는 세션 검증
3. `updateStoreByToken` — 좌표·주소 변경 시 `is_visible=false` 재트리거
4. `updateStoreVisibility` — 어드민 승인
5. `rotateStoreEditToken` — 어드민 토큰 재발급
6. `clearStorePinAdmin` — 어드민 PIN 초기화
7. `deleteStore` — 어드민 삭제
8. `loginStoreWithPin` — Instagram + PIN 로그인 (세션 쿠키 발급)
9. `setStorePin` — 자가 PIN 설정/변경
10. `logoutStore` — 세션 쿠키 삭제
11. `revalidateStoresCache` — 캐시 무효화 헬퍼

- [ ] **Step 1: 세션 헬퍼 — `src/lib/server/storeSession.ts`**

크루의 `src/lib/server/crewSession.ts`와 동일 구조. 단 쿠키명을 `store_session`, 페이로드 키를 `storeId`로 바꿈.

```ts
// src/lib/server/storeSession.ts
import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "store_session";
const MAX_AGE_SECS = 60 * 60 * 24 * 30; // 30일

interface StoreSessionPayload {
  storeId: string;
  pinSetAt: string; // ISO. DB의 pin_set_at과 일치해야 유효.
  iat: number;
}

function getSecret(): string {
  const s = process.env.STORE_SESSION_SECRET || process.env.CREW_SESSION_SECRET;
  if (!s)
    throw new Error(
      "STORE_SESSION_SECRET (or CREW_SESSION_SECRET fallback) is not set"
    );
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createStoreSessionToken(storeId: string, pinSetAt: string) {
  const payload: StoreSessionPayload = {
    storeId,
    pinSetAt,
    iat: Math.floor(Date.now() / 1000),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = sign(body);
  return `${body}.${sig}`;
}

export async function setStoreSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECS,
  });
}

export async function clearStoreSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getStoreSession(): Promise<StoreSessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  if (sign(body) !== sig) return null;
  try {
    return JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as StoreSessionPayload;
  } catch {
    return null;
  }
}
```

`STORE_SESSION_SECRET` 미설정 시 `CREW_SESSION_SECRET`로 fallback(작은 운영 부담 줄임).

- [ ] **Step 2: 서버 액션 파일 작성 — `src/app/actions/store.ts`**

```ts
// src/app/actions/store.ts
"use server";

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
```

(파일 상단에 `import crypto from "crypto";` 추가 필요 — `rotateStoreEditToken`이 `crypto.randomUUID()` 사용)

- [ ] **Step 3: 타입 체크 + 린트**

```bash
npx tsc --noEmit && npm run lint
```

기대: 0 error.

- [ ] **Step 4: 커밋**

```bash
git add src/app/actions/store.ts src/lib/server/storeSession.ts
git commit -m "feat(store): add server actions (register/edit/PIN/admin)"
```

---

## Task 6: UI 컴포넌트 (`src/components/store/*`)

**의존:** Task 2 완료

**Files:**
- Create: `src/components/store/StoreCard.tsx`
- Create: `src/components/store/StoreList.tsx`
- Create: `src/components/store/StoreDetailView.tsx`
- Create: `src/components/store/StoreRegisterForm.tsx` (편집과 mode prop 공유)
- Create: `src/components/store/StoreEditForm.tsx`
- Create: `src/components/store/StorePhotosUpload.tsx`
- Create: `src/components/store/StoreLocationPickerMap.tsx`
- Create: `src/components/store/StoreCategoryChip.tsx`
- Create: `src/components/store/StoreCategoryIcon.tsx`

디자인 시스템: `src/components/design/cartographic.tsx`의 `CartographicHeader`, `HairlineRow` 등 사용 (`CLAUDE.md`).
아이콘: lucide-react `Coffee` / `UtensilsCrossed` / `Beer` / `Store`.

- [ ] **Step 1: `StoreCategoryIcon.tsx` + `StoreCategoryChip.tsx`**

```tsx
// src/components/store/StoreCategoryIcon.tsx
import { Coffee, UtensilsCrossed, Beer, Store as StoreIcon } from "lucide-react";
import type { StoreCategory } from "@/lib/types/store";

export function StoreCategoryIcon({
  category,
  className,
}: {
  category: StoreCategory;
  className?: string;
}) {
  switch (category) {
    case "cafe":
      return <Coffee className={className} aria-hidden />;
    case "restaurant":
      return <UtensilsCrossed className={className} aria-hidden />;
    case "pub":
      return <Beer className={className} aria-hidden />;
    case "other":
    default:
      return <StoreIcon className={className} aria-hidden />;
  }
}
```

```tsx
// src/components/store/StoreCategoryChip.tsx
import { STORE_CATEGORY_LABELS, type StoreCategory } from "@/lib/types/store";
import { StoreCategoryIcon } from "./StoreCategoryIcon";

export function StoreCategoryChip({ category }: { category: StoreCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cart-border px-2 py-0.5 text-xs">
      <StoreCategoryIcon category={category} className="h-3 w-3" />
      {STORE_CATEGORY_LABELS[category]}
    </span>
  );
}
```

- [ ] **Step 2: `StoreCard.tsx`**

```tsx
// src/components/store/StoreCard.tsx
import Image from "next/image";
import Link from "next/link";
import type { Store } from "@/lib/types/store";
import { StoreCategoryChip } from "./StoreCategoryChip";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link
      href={`/store/${store.id}`}
      className="block rounded-lg border border-cart-border hover:bg-cart-surface/40 transition-colors"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-cart-surface">
        {store.main_image_url && (
          <Image
            src={store.main_image_url}
            alt={store.name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        <StoreCategoryChip category={store.category} />
        <div className="text-base font-medium">{store.name}</div>
        {store.description && (
          <div className="line-clamp-2 text-sm text-cart-muted">
            {store.description}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: `StoreList.tsx`**

카테고리 탭 + 카드 그리드. 클라이언트 상태로 필터.

```tsx
"use client";
import { useState } from "react";
import { STORE_CATEGORIES, STORE_CATEGORY_LABELS, type Store, type StoreCategory } from "@/lib/types/store";
import { StoreCard } from "./StoreCard";

export function StoreList({ stores }: { stores: Store[] }) {
  const [tab, setTab] = useState<"all" | StoreCategory>("all");
  const filtered = tab === "all" ? stores : stores.filter((s) => s.category === tab);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>전체</TabBtn>
        {STORE_CATEGORIES.map((c) => (
          <TabBtn key={c} active={tab === c} onClick={() => setTab(c)}>
            {STORE_CATEGORY_LABELS[c]}
          </TabBtn>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <StoreCard key={s.id} store={s} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-cart-muted">
            등록된 매장이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
        active ? "border-cart-fg bg-cart-fg text-cart-bg" : "border-cart-border text-cart-muted"
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: `StoreDetailView.tsx`**

```tsx
"use client";
import Image from "next/image";
import type { Store } from "@/lib/types/store";
import { CartographicHeader, HairlineRow } from "@/components/design/cartographic";
import { StoreCategoryChip } from "./StoreCategoryChip";

export function StoreDetailView({ store }: { store: Store }) {
  return (
    <div className="space-y-4">
      <CartographicHeader left="STORE" right={store.category.toUpperCase()} />
      <div className="space-y-1">
        <h1 className="text-xl font-medium">{store.name}</h1>
        <StoreCategoryChip category={store.category} />
      </div>
      {store.main_image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-cart-surface">
          <Image src={store.main_image_url} alt={store.name} fill sizes="100vw" className="object-cover" />
        </div>
      )}
      {store.description && <p className="whitespace-pre-wrap">{store.description}</p>}
      {store.verification_method && (
        <section>
          <h2 className="text-sm font-medium text-cart-muted">러닝 인증 방식</h2>
          <p className="whitespace-pre-wrap">{store.verification_method}</p>
        </section>
      )}
      {store.reward_description && (
        <section>
          <h2 className="text-sm font-medium text-cart-muted">혜택</h2>
          <p className="whitespace-pre-wrap">{store.reward_description}</p>
        </section>
      )}
      {store.owner_message && (
        <section>
          <h2 className="text-sm font-medium text-cart-muted">사장님 한말씀</h2>
          <p className="italic">{store.owner_message}</p>
        </section>
      )}
      <div className="rounded-md border border-cart-border">
        <HairlineRow label="위치" value={store.location.address} />
        {store.business_hours && <HairlineRow label="영업시간" value={store.business_hours} />}
        {store.contact && <HairlineRow label="연락처" value={store.contact} />}
        {store.instagram && (
          <HairlineRow
            label="인스타"
            value={<a href={`https://instagram.com/${store.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">@{store.instagram.replace(/^@/, "")}</a>}
          />
        )}
        {store.naver_map_url && (
          <HairlineRow label="네이버지도" value={<a href={store.naver_map_url} target="_blank" rel="noreferrer">열기 ↗</a>} />
        )}
        {store.event_post_url && (
          <HairlineRow label="이벤트 글" value={<a href={store.event_post_url} target="_blank" rel="noreferrer">열기 ↗</a>} />
        )}
      </div>
      {store.photos.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-cart-muted">사진</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {store.photos.map((url) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-md bg-cart-surface">
                <Image src={url} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

`HairlineRow`가 `value` prop에 ReactNode를 허용하지 않으면 string으로 변환해 전달. 시그니처 확인 후 조정.

- [ ] **Step 5: `StoreLocationPickerMap.tsx`**

`src/components/crew/`에 동등 컴포넌트가 있는지 먼저 확인(`CrewLocationPickerMap`). 있다면 그 파일을 열고 props만 store에 맞게 ‎바꿔 새 파일로 만든다. **복제 후 import 경로/상태 키만 store로 치환**. UI/지도 인스턴스 로직은 손대지 않는다.

```tsx
// 시그니처만:
"use client";
export function StoreLocationPickerMap(props: {
  initial?: { lat: number; lng: number; main_address?: string };
  onChange: (loc: { lat: number; lng: number; main_address: string; detail_address?: string }) => void;
}) {
  // ... CrewLocationPickerMap에서 복제, 변수명만 store로
}
```

- [ ] **Step 6: `StorePhotosUpload.tsx`**

다중 파일 선택 + 미리보기 + 삭제 + 순서(드래그 또는 위/아래 버튼). 단순 버전: 6장 상한, 위/아래 버튼.

```tsx
"use client";
import { useState } from "react";

export interface StorePhotoSlot {
  // 새 파일이거나 기존 URL
  file?: File;
  url?: string;
  preview: string;
  display_order: number;
}

export function StorePhotosUpload({
  initial,
  onChange,
}: {
  initial?: Array<{ url: string; display_order: number }>;
  onChange: (slots: StorePhotoSlot[]) => void;
}) {
  const [slots, setSlots] = useState<StorePhotoSlot[]>(
    initial?.map((p) => ({ url: p.url, preview: p.url, display_order: p.display_order })) ?? []
  );
  const push = (next: StorePhotoSlot[]) => {
    setSlots(next);
    onChange(next);
  };
  const onPick = (files: FileList | null) => {
    if (!files) return;
    const remain = 6 - slots.length;
    const picked = Array.from(files).slice(0, Math.max(0, remain));
    const next = [...slots];
    for (const f of picked)
      next.push({ file: f, preview: URL.createObjectURL(f), display_order: next.length });
    push(next);
  };
  const remove = (i: number) => {
    const next = slots.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, display_order: idx }));
    push(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    push(next.map((s, idx) => ({ ...s, display_order: idx })));
  };
  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => onPick(e.target.files)}
        disabled={slots.length >= 6}
      />
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-cart-border">
            <img src={s.preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-xs text-white">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === slots.length - 1}>↓</button>
              </div>
              <button type="button" onClick={() => remove(i)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-cart-muted">최대 6장. 첫 번째가 가장 먼저 표시됩니다.</p>
    </div>
  );
}
```

- [ ] **Step 7: `StoreRegisterForm.tsx` + `StoreEditForm.tsx`**

스펙 5.4 필드 순서 그대로. mode prop으로 공유하는 게 깔끔하다.

```tsx
// src/components/store/StoreRegisterForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { STORE_CATEGORIES, STORE_CATEGORY_LABELS, type StoreCategory } from "@/lib/types/store";
import { storeService } from "@/lib/services/store.service";
import { notifyStoreRegistration } from "@/app/actions/store";
import { StoreLocationPickerMap } from "./StoreLocationPickerMap";
import { StorePhotosUpload, type StorePhotoSlot } from "./StorePhotosUpload";

const Schema = z.object({
  name: z.string().min(1, "필수"),
  category: z.enum(STORE_CATEGORIES),
  description: z.string().min(1, "필수").max(500),
  verification_method: z.string().min(1, "필수"),
  reward_description: z.string().min(1, "필수"),
  owner_message: z.string().optional(),
  business_hours: z.string().optional(),
  contact: z.string().optional(),
  instagram: z.string().optional(),
  naver_map_url: z.string().url().optional().or(z.literal("")),
  event_post_url: z.string().url().optional().or(z.literal("")),
  pin: z.string().regex(/^\d{4}$/, "4자리 숫자"),
}).refine((v) => !!v.contact || !!v.instagram, {
  message: "연락처 또는 인스타그램 중 하나는 필수입니다.",
  path: ["contact"],
});

type FormValues = z.infer<typeof Schema>;

export function StoreRegisterForm() {
  const router = useRouter();
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [photos, setPhotos] = useState<StorePhotoSlot[]>([]);
  const [loc, setLoc] = useState<{ lat: number; lng: number; main_address: string; detail_address?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { category: "cafe" },
  });

  async function onSubmit(values: FormValues) {
    setErr(null);
    if (!mainImage) { setErr("대표 사진은 필수입니다."); return; }
    if (!loc) { setErr("위치를 지도에서 선택해 주세요."); return; }
    setSubmitting(true);
    try {
      const { id } = await storeService.createStore({
        name: values.name,
        category: values.category as StoreCategory,
        description: values.description,
        verification_method: values.verification_method,
        reward_description: values.reward_description,
        owner_message: values.owner_message,
        business_hours: values.business_hours,
        contact: values.contact,
        instagram: values.instagram,
        naver_map_url: values.naver_map_url || undefined,
        event_post_url: values.event_post_url || undefined,
        location: {
          main_address: loc.main_address,
          detail_address: loc.detail_address,
          latitude: loc.lat,
          longitude: loc.lng,
        },
        main_image: mainImage,
        photos: photos.filter((p) => p.file).map((p) => p.file as File),
        pin: values.pin,
      });
      await notifyStoreRegistration(
        {
          id,
          name: values.name,
          category: values.category,
          mainAddress: loc.main_address,
          lat: loc.lat,
          lng: loc.lng,
          description: values.description,
          instagram: values.instagram,
        },
        { pin: values.pin }
      );
      router.push(`/store/${id}?registered=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="가게 이름 *" error={errors.name?.message}>
        <input type="text" {...register("name")} />
      </Field>
      <Field label="카테고리 *" error={errors.category?.message}>
        <select {...register("category")}>
          {STORE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{STORE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </Field>
      <Field label="대표 사진 *">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setMainImage(e.target.files?.[0] ?? null)} />
      </Field>
      <Field label="위치 *">
        <StoreLocationPickerMap onChange={(l) => setLoc(l)} />
      </Field>
      <Field label="가게 소개 * (≤500자)" error={errors.description?.message}>
        <textarea {...register("description")} rows={4} />
      </Field>
      <Field label="러닝 인증 방식 *" error={errors.verification_method?.message}>
        <textarea {...register("verification_method")} rows={3} />
      </Field>
      <Field label="혜택 *" error={errors.reward_description?.message}>
        <textarea {...register("reward_description")} rows={3} />
      </Field>
      <Field label="사장님 한말씀">
        <textarea {...register("owner_message")} rows={2} />
      </Field>
      <Field label="영업시간">
        <input type="text" {...register("business_hours")} placeholder="예: 매일 10:00 - 22:00" />
      </Field>
      <Field label="연락처 (또는 인스타그램 중 하나 필수)" error={errors.contact?.message}>
        <input type="text" {...register("contact")} />
      </Field>
      <Field label="인스타그램">
        <input type="text" {...register("instagram")} placeholder="@username" />
      </Field>
      <Field label="네이버지도 URL">
        <input type="url" {...register("naver_map_url")} />
      </Field>
      <Field label="이벤트 글 URL">
        <input type="url" {...register("event_post_url")} />
      </Field>
      <Field label="추가 사진 (선택, 최대 6장)">
        <StorePhotosUpload onChange={setPhotos} />
      </Field>
      <Field label="PIN 4자리 *" error={errors.pin?.message}>
        <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} {...register("pin")} />
      </Field>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-md bg-cart-accent py-2 text-cart-bg disabled:opacity-50">
        {submitting ? "등록 중..." : "매장 등록 신청"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-cart-muted">{label}</span>
      <div>{children}</div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}
```

`StoreEditForm.tsx`도 동일 구조. 차이점:
- 초기값을 `getStoreForEdit` 결과로 채움
- PIN 필드 별도 (변경 시에만 입력)
- `storeService.updateStore`와 `updateStoreByToken` 둘 다 호출 — 메인/사진은 service, 텍스트·위치는 server action (서버에서 `is_visible=false` 트리거가 필요하므로)

상세 구현은 `src/app/crew/edit/[id]/CrewEditClient.tsx` 패턴을 참조하되, 텍스트/위치 변경은 서버 액션 경로로 라우팅한다(좌표 변경 감지가 서버에서 일어나야 함).

- [ ] **Step 8: 타입 체크 + 린트**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 9: 커밋**

```bash
git add src/components/store/
git commit -m "feat(store): add store UI components (list/detail/register/edit/photos/map)"
```

---

## Task 7: 등록 페이지 (`/store/register`)

**의존:** Task 2, 4, 5, 6 완료

**Files:**
- Create: `src/app/store/register/page.tsx`
- Create: `src/app/store/register/layout.tsx` (선택, 메타 + Header 일관)

- [ ] **Step 1: `src/app/store/register/page.tsx`**

```tsx
// src/app/store/register/page.tsx
import type { Metadata } from "next";
import { StoreRegisterForm } from "@/components/store/StoreRegisterForm";

export const metadata: Metadata = {
  title: "매장 등록 — 런하우스",
  description: "러닝 인증 매장 자가 등록",
};

export default function StoreRegisterPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">매장 등록</h1>
      <p className="mb-6 text-sm text-cart-muted">
        등록 후 어드민 승인을 거쳐 공개됩니다. PIN을 잘 기억해 주세요.
      </p>
      <StoreRegisterForm />
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

기대: 경로 `/store/register` 생성, 0 error.

- [ ] **Step 3: 수동 스모크**

`npm run dev` → `http://localhost:3000/store/register` 진입 → 필드 검증 동작 확인 → 실제 등록 1건 시도 → DB에 `is_visible=false`로 들어가는지 + 디스코드(또는 콘솔)에 메시지 출력 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/app/store/register/
git commit -m "feat(store): add /store/register page"
```

---

## Task 8: 공개 목록 + 상세 (`/store`, `/store/[id]`)

**의존:** Task 2, 3, 6 완료

**Files:**
- Create: `src/app/store/page.tsx`
- Create: `src/app/store/[id]/page.tsx`
- Create: `src/app/store/loading.tsx` (선택)

- [ ] **Step 1: `src/app/store/page.tsx`**

```tsx
// src/app/store/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getVisibleStores } from "@/lib/server/stores";
import { StoreList } from "@/components/store/StoreList";

export const metadata: Metadata = {
  title: "러닝 인증 매장 — 런하우스",
  description: "러닝 인증 시 혜택을 제공하는 카페·식당·주점",
};

export default async function StoreIndexPage() {
  const stores = await getVisibleStores();
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">러닝 인증 매장</h1>
        <Link href="/store/register" className="text-sm underline">매장 등록</Link>
      </header>
      <StoreList stores={stores} />
    </main>
  );
}
```

- [ ] **Step 2: `src/app/store/[id]/page.tsx`**

```tsx
// src/app/store/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreByIdAdmin } from "@/lib/server/stores";
import { StoreDetailView } from "@/components/store/StoreDetailView";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const store = await getStoreByIdAdmin(id);
  if (!store) return { title: "매장 — 런하우스" };
  return {
    title: `${store.name} — 런하우스 매장`,
    description: store.description?.slice(0, 120) ?? undefined,
  };
}

export default async function StoreDetailPage({ params }: Props) {
  const { id } = await params;
  const store = await getStoreByIdAdmin(id);
  if (!store || !store.is_visible) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <StoreDetailView store={store} />
    </main>
  );
}
```

- [ ] **Step 3: 빌드 + 수동 스모크**

승인 후의 매장이 있어야 보이므로, Task 7에서 등록한 매장을 어드민 SQL 또는 Task 10 어드민 페이지로 `is_visible=true` 토글 후 `/store`와 `/store/<id>` 확인.

```bash
npm run build
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/store/page.tsx src/app/store/\[id\]/
git commit -m "feat(store): add public /store and /store/[id] pages"
```

---

## Task 9: PIN 자가 수정 (`/store/edit/login`, `/store/edit/[id]`)

**의존:** Task 2, 4, 5, 6 완료

**Files:**
- Create: `src/app/store/edit/login/page.tsx`
- Create: `src/app/store/edit/login/LoginForm.tsx`
- Create: `src/app/store/edit/[id]/page.tsx`
- Create: `src/app/store/edit/[id]/StoreEditClient.tsx`
- Create: `src/app/store/edit/[id]/SetPinForm.tsx`

크루의 `src/app/crew/edit/login/`과 `src/app/crew/edit/[id]/`를 그대로 미러. 변수명만 store로 치환.

- [ ] **Step 1: `LoginForm.tsx` (client component)**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginStoreWithPin } from "@/app/actions/store";

export function LoginForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await loginStoreWithPin(name, pin);
    setBusy(false);
    if (r.success && r.storeId) router.push(`/store/edit/${r.storeId}`);
    else setErr(r.error || "로그인 실패");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm text-cart-muted">매장 이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-cart-muted">PIN 4자리</span>
        <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} required />
      </label>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-md bg-cart-accent py-2 text-cart-bg">
        {busy ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: `src/app/store/edit/login/page.tsx`**

```tsx
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "매장 자가수정 로그인 — 런하우스" };

export default function StoreEditLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">매장 자가수정</h1>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 3: 토큰 진입 — `src/app/store/edit/[id]/page.tsx`**

토큰 또는 세션 둘 다 받아들임. PIN 미설정 매장은 `SetPinForm` 노출, 설정된 매장은 `StoreEditClient`.

```tsx
import { notFound } from "next/navigation";
import { getStoreForEdit } from "@/app/actions/store";
import { serverSupabase } from "@/lib/server/supabase";
import { StoreEditClient } from "./StoreEditClient";
import { SetPinForm } from "./SetPinForm";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function StoreEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  const r = await getStoreForEdit(id, token);
  if (!r.success) notFound();

  // PIN 설정 여부 확인
  const { data } = await serverSupabase
    .from("stores")
    .select("pin_hash")
    .eq("id", id)
    .maybeSingle();
  const pinSet = !!(data as { pin_hash?: string | null } | null)?.pin_hash;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {!pinSet ? <SetPinForm storeId={id} token={token ?? null} /> : null}
      <StoreEditClient initial={r.store} token={token ?? null} />
    </main>
  );
}
```

- [ ] **Step 4: `SetPinForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { setStorePin } from "@/app/actions/store";

export function SetPinForm({ storeId, token }: { storeId: string; token: string | null }) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await setStorePin(storeId, token, pin);
    setMsg(r.success ? "PIN이 저장됐습니다." : (r.error || "실패"));
  }
  return (
    <form onSubmit={submit} className="mb-6 rounded-md border border-cart-border p-3">
      <p className="mb-2 text-sm text-cart-muted">자가수정에 사용할 4자리 PIN을 설정하세요.</p>
      <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} required />
      <button className="ml-2 rounded-md border border-cart-border px-3 py-1">저장</button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </form>
  );
}
```

- [ ] **Step 5: `StoreEditClient.tsx`**

`getStoreForEdit` 반환 타입을 그대로 받아 폼에 채우고 `updateStoreByToken` + `storeService.updateStore`로 분기 저장.

(코드는 `StoreRegisterForm.tsx`를 기반으로 초기값 prefill + 메인이미지 교체 옵션 + 사진 추가/삭제 + 위치 변경 시 경고 배너. 상세 코드는 `CrewEditClient.tsx`를 1:1 미러; 핵심은 텍스트/위치 → server action, 이미지/사진 → service.)

- [ ] **Step 6: 빌드 + 스모크**

```bash
npm run build
```

수동 흐름:
1. `/store/edit/login`에서 PIN 로그인 → `/store/edit/<id>` 이동
2. 좌표 변경 후 저장 → `is_visible` 다시 false 되는지 DB 확인 + 디스코드 "재승인 필요"

- [ ] **Step 7: 커밋**

```bash
git add src/app/store/edit/
git commit -m "feat(store): add PIN login + self-service edit pages"
```

---

## Task 10: 어드민 (`/admin/store`, `/admin/store/edit/[id]`)

**의존:** Task 2, 3, 4, 5, 6 완료

**Files:**
- Create: `src/app/admin/store/page.tsx`
- Create: `src/app/admin/store/StoreAdminClient.tsx` (필터·테이블 인터랙션)
- Create: `src/app/admin/store/edit/[id]/page.tsx`

`src/middleware.ts`는 이미 `/admin/**` 가드 — 변경 불필요.

- [ ] **Step 1: 어드민 목록 — `page.tsx`**

```tsx
import { StoreAdminClient } from "./StoreAdminClient";

export default function StoreAdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">매장 관리</h1>
      <StoreAdminClient />
    </main>
  );
}
```

- [ ] **Step 2: `StoreAdminClient.tsx` — 필터 + 액션**

`storeService.getStoreList`로 클라이언트 사이드 조회 (어드민이라 서비스-role 캐시 우회 부담 없음). 행별 액션:
- 가시성 토글 → `updateStoreVisibility(id, !current)`
- URL 재발급 → `rotateStoreEditToken(id)` 후 토큰 표시 + 복사 버튼
- PIN 초기화 → `clearStorePinAdmin(id)`
- 편집 → `/admin/store/edit/<id>` 라우팅
- 삭제 → 확인 다이얼로그 → `storeService.deleteStore(id)` + `revalidateStoresCache`

탭: ALL / LIVE / PENDING. 필터는 `getStoreList({ visibilityFilter })`로.

(코드는 `src/app/admin/crew/page.tsx`와 동급 길이. 1:1 미러로 작성)

- [ ] **Step 3: 어드민 편집 — `edit/[id]/page.tsx`**

`StoreEditClient` 컴포넌트를 그대로 재사용. 토큰 없이 진입(어드민은 권한이 다름 — 별도 액션 `updateStoreAdmin`을 만들거나, 어드민 미들웨어 통과를 전제로 `updateStoreByToken`에 어드민 백도어 인자를 두는 대신, 어드민 페이지는 `storeService.updateStore` 직접 호출 + `revalidateStoresCache` 호출하는 별도 흐름이 깔끔. 토큰 분기 없음).

- [ ] **Step 4: 빌드 + 스모크**

```bash
npm run build
```

1. `/admin/login` 통과 후 `/admin/store` 접근
2. PENDING 탭에서 Task 7 등록 매장 노출 → 가시성 토글
3. `/`/`/store`/`/map` 즉시 노출 확인 (`STORES_CACHE_TAG` 무효화 동작)

- [ ] **Step 5: 커밋**

```bash
git add src/app/admin/store/
git commit -m "feat(store): add admin pages (approval queue + edit + actions)"
```

---

## Task 11: `/map` 통합 (매장 레이어 + 상단 토글)

**의존:** Task 2, 3, 6 완료

**Files:**
- Modify: `src/app/_components/MapPageClient.tsx`
- Modify: `src/components/map/NaverMap.tsx` (또는 동등 매장 마커 props 추가)
- Modify: `src/app/page.tsx` 또는 `src/app/map/page.tsx`의 server-side fetch에 매장 추가

- [ ] **Step 1: server-side에서 매장 목록 prefetch**

`MapPageClient`를 호출하는 페이지(`/map`)의 서버 컴포넌트에서:

```ts
import { getCrews } from "@/lib/server/crews";
import { getVisibleStores } from "@/lib/server/stores";

// ...
const [crews, stores] = await Promise.all([getCrews(), getVisibleStores()]);
return <MapPageClient initialCrews={crews} initialStores={stores} />;
```

(현재 시그니처는 `initialCrews`만 받으므로 prop 추가)

- [ ] **Step 2: `MapPageClient.tsx` 수정**

```tsx
// 추가 prop
interface Props {
  initialCrews: Crew[];
  initialStores: Store[];
}

// 페이지 로컬 상태(URL 동기화 X — 스펙 5.2)
const [layer, setLayer] = useState<"all" | "crew" | "store">("all");

// 상단 세그먼트 토글 (CartographicHeader 영역 옆 또는 그 아래)
<div className="flex gap-1 rounded-full border border-cart-border p-1 text-xs">
  {(["all", "crew", "store"] as const).map((k) => (
    <button
      key={k}
      onClick={() => setLayer(k)}
      className={`rounded-full px-3 py-1 ${layer === k ? "bg-cart-fg text-cart-bg" : "text-cart-muted"}`}
    >
      {k === "all" ? "전체" : k === "crew" ? "크루" : "매장"}
    </button>
  ))}
</div>

// NaverMap 호출
<NaverMap
  crews={layer === "store" ? [] : crews}
  stores={layer === "crew" ? [] : initialStores}
  selectedCrew={selectedCrew}
  selectedStore={selectedStore}
  onCrewSelect={setSelectedCrew}
  onStoreSelect={setSelectedStore}
/>

// 상세 Sheet
{selectedStore && (
  <StoreDetailSheet store={selectedStore} onClose={() => setSelectedStore(null)} />
)}
```

`StoreDetailSheet`은 `StoreDetailView`를 Sheet/Drawer로 감싼 얇은 래퍼.

- [ ] **Step 3: `NaverMap.tsx` 수정 — 매장 마커**

기존 크루 마커 렌더링 루프 옆에 매장 마커 루프 추가. 카테고리별 색·아이콘:

```ts
const STORE_COLOR: Record<StoreCategory, string> = {
  cafe: "#A87E5B",
  restaurant: "#D97757",
  pub: "#7A4C3E",
  other: "#8A8A8A",
};
```

마커 HTML 콘텐츠에 lucide 아이콘 대신 간단한 원형 + 첫 글자 또는 SVG inline 사용 (Naver Maps marker는 HTMLContent 지원). 이 부분은 NaverMap.tsx 구조 보고 결정.

- [ ] **Step 4: 빌드 + 스모크**

```bash
npm run build
```

`/map`에서 토글 동작, 매장 마커 클릭 시 Sheet, 카테고리별 색 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/app/_components/MapPageClient.tsx src/components/map/ src/app/map/ src/app/page.tsx
git commit -m "feat(store): integrate store layer + toggle on /map"
```

---

## Task 12: 메뉴 + Sitemap

**의존:** Task 3 완료

**Files:**
- Modify: `src/app/menu/page.tsx`
- Modify: `src/app/sitemap.ts` (없다면 확인 후 생성)

- [ ] **Step 1: 메뉴 — `PRIMARY_LINKS`에 추가**

"지역별 보기" 다음 위치에 3개 항목 삽입:

```ts
{ href: "/store", label: "러닝 인증 매장", description: "혜택 주는 카페·식당" },
{ href: "/store/register", label: "매장 등록", description: "사장님 자가 등록" },
{ href: "/store/edit/login", label: "내 매장 수정", description: "PIN으로 매장 관리" },
```

- [ ] **Step 2: Sitemap — 매장 URL 추가**

`src/app/sitemap.ts`가 있다면 `getVisibleStores()`를 가져와 `is_visible=true` 매장의 `/store/[id]` URL을 추가. 없다면 생성.

```ts
import type { MetadataRoute } from "next";
import { getCrews } from "@/lib/server/crews";
import { getVisibleStores } from "@/lib/server/stores";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://runhouse.kr";
  const [crews, stores] = await Promise.all([getCrews(), getVisibleStores()]);
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/map`, lastModified: now },
    { url: `${base}/store`, lastModified: now },
    ...crews.map((c) => ({ url: `${base}/crew/${c.id}`, lastModified: now })),
    ...stores.map((s) => ({ url: `${base}/store/${s.id}`, lastModified: now })),
  ];
}
```

(기존 sitemap이 있으면 매장 라인만 추가)

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

`/sitemap.xml`에 `/store/...` URL 포함 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/app/menu/page.tsx src/app/sitemap.ts
git commit -m "feat(store): add menu links + sitemap entries"
```

---

## Task 13: 문서 갱신

**Files:**
- Modify: `결정.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: `결정.md`에 한 줄 추가 (맨 아래 또는 시간 역순 위치)**

```
- 2026-05-22: 매장(러닝 인증 카페·식당) 도메인을 크루와 동일한 자가등록+어드민 승인 패턴으로 도입. 도메인 prefix `store`, 캐시 태그 `STORES_CACHE_TAG` 독립. 카테고리는 cafe/restaurant/pub/other 4종.
```

- [ ] **Step 2: `CLAUDE.md` 갱신**

`Architecture (big picture)` 섹션의 캐싱 contract 단락 아래에 다음 한 줄 보강:

```
- `STORES_CACHE_TAG`("stores"): 매장 도메인 전용. `stores`/`store_locations`/`store_photos` 관련 mutation 시 `revalidateTag(STORES_CACHE_TAG)` + `revalidatePath("/", "/map", "/store", "/sitemap.xml")`.
```

env vars 섹션에 다음 추가:

```
- `DISCORD_STORE_WEBHOOK_URL` — 매장 등록/수정 알림 전용. 미설정 시 `DISCORD_REGISTRATION_WEBHOOK_URL`로 fallback.
- `STORE_SESSION_SECRET` — 매장 PIN 세션 HMAC 시크릿. 미설정 시 `CREW_SESSION_SECRET` fallback.
```

- [ ] **Step 3: 커밋**

```bash
git add 결정.md CLAUDE.md
git commit -m "docs(store): update 결정.md and CLAUDE.md for store domain"
```

---

## Task 14: 최종 검증 + 브랜치 정리

**의존:** 모든 이전 Task 완료

- [ ] **Step 1: 전체 타입 + 린트 + 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

기대: 0 error, 0 warning (또는 기존 baseline 유지).

- [ ] **Step 2: 스펙 13장 체크리스트 수동 확인**

스펙 `docs/superpowers/specs/2026-05-22-running-cert-stores-design.md` 13장의 8개 항목을 하나씩 클릭 흐름으로 검증:

- [ ] 자가 등록 → `is_visible=false`로 PENDING 큐
- [ ] 어드민 승인 후 `/map`·`/store`에 즉시 노출 (캐시 무효화)
- [ ] 자가 수정에서 좌표 변경 → `is_visible=false` 재트리거
- [ ] PIN 5회 실패 → 15분 잠금
- [ ] `/map` 토글이 크루/매장 마커 필터링
- [ ] WebP 변환 + 2MB 압축이 매장 사진 업로드에 동작
- [ ] 디스코드 웹훅 실패 시 사용자 흐름 차단 없이 계속
- [ ] 어드민 미들웨어가 `/admin/store/**` 가드 (쿠키 삭제 후 접근 시 `/admin/login` 리다이렉트)

- [ ] **Step 3: 시드 5건 입력 안내**

`러닝인증카페 정보 .md`(루트)의 5건을 `/admin/store/edit/<신규>` (또는 어드민에서 직접 새 매장 등록 흐름)로 입력. 어드민 등록 흐름이 자가등록만 있다면, 자가등록 폼으로 등록 후 어드민에서 `is_visible=true` 토글로 갈음.

- [ ] **Step 4: 메모리 업데이트**

`/Users/whs-95/.claude/projects/-Users-whs-95-Desktop-RunningCrewMap/memory/store-domain-handoff.md`를 갱신: "완료" 상태로 마크 + `MEMORY.md` 인덱스 한 줄 갱신.

- [ ] **Step 5: 푸시 + PR (사용자 확인 후)**

```bash
git push -u origin feat/store-domain
```

PR 본문에 스펙 링크와 검증 체크리스트를 그대로 옮긴다. 사용자가 명시적으로 요청할 때까지 PR 생성하지 말 것.

---

## Self-review (작성자 메모, 실행 전 한번 더 점검)

**Spec coverage:**
- 1 (배경): Task 13 결정.md 라인 ✓
- 2 (전체 구조 + YAGNI): Task 1-12 전반 ✓
- 3 (데이터 모델 + RLS + Storage): Task 1 ✓
- 4 (타입/서비스/액션): Task 2/3/4/5 ✓
- 5 (라우트/UI): Task 6/7/8/9/10/11 ✓
- 6 (어드민): Task 10 ✓
- 7 (디스코드 웹훅): Task 5 (notifyStoreRegistration + notifyStoreEdit) ✓
- 8 (메뉴): Task 12 ✓
- 9 (Sitemap): Task 12 ✓
- 10 (시드): Task 14 Step 3 안내 ✓
- 11 (문서 갱신): Task 13 ✓
- 12 (단위 경계): 본 plan의 14개 task가 단위 경계 그대로 반영 ✓
- 13 (검증 체크리스트): Task 14 Step 2 ✓

**Placeholder 스캔:** "TBD", "TODO", "fill in", "implement later" 검색 — 없음.

**타입 일관성:** `StoreCategory`, `Store`, `CreateStoreInput`, `UpdateStoreInput`, `STORES_CACHE_TAG`, `storeService`, `notifyStoreRegistration`, `updateStoreByToken`, `loginStoreWithPin`, `setStorePin`, `clearStoreSessionCookie`, `getStoreForEdit` — 정의 위치와 사용 위치 동일 이름 사용 확인 ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-26-store-domain.md`.**
