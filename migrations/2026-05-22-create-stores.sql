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

-- 주의: Postgres는 `CREATE POLICY IF NOT EXISTS`를 지원하지 않음
-- (CREATE INDEX/TABLE과 달리). 멱등성은 DROP POLICY IF EXISTS + CREATE POLICY로.
DROP POLICY IF EXISTS "stores select public" ON public.stores;
CREATE POLICY "stores select public"
  ON public.stores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "store_locations select public" ON public.store_locations;
CREATE POLICY "store_locations select public"
  ON public.store_locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "store_photos select public" ON public.store_photos;
CREATE POLICY "store_photos select public"
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
