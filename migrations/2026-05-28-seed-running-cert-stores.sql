-- migrations/2026-05-28-seed-running-cert-stores.sql
-- =====================================================================
-- 2026-05-28: 러닝인증가게.md 의 5개 매장 시드 (1~5 전체).
-- =====================================================================
--
-- 적용: Supabase SQL editor에 통째로 붙여넣고 1회 실행. 멱등 (재실행 안전).
--
-- 정책:
--   - 5개 매장 모두 is_visible = false 로 들어감 → 어드민이 검수 후 공개.
--   - 좌표는 (1,2,3) 일부 placeholder, (4,5) OSM Nominatim 근사값.
--     공통적으로 어드민 또는 사장님이 /store/edit/<id>?token=... 에서
--     지도 핀을 정확한 위치로 한 번 옮겨 좌표를 보정해야 함.
--   - 대표 사진(main_image_url) NULL. 사장님 편집 화면에서 업로드.
--   - PIN 미설정. 사장님이 토큰 링크로 첫 진입할 때 SetPinForm 으로 설정.
--
-- 사장님에게 보낼 편집 링크 포맷:
--     {NEXT_PUBLIC_APP_URL}/store/edit/{id}?token={edit_token}
--   파일 끝 SELECT 가 id·edit_token·상대경로를 뽑아 줍니다.
--
-- 데이터 출처: /Users/whs-95/Desktop/RunningCrewMap/러닝인증가게.md
-- =====================================================================

-- 1) 바틀링 — 뚝섬한강공원, 생맥주 테이크아웃 (pub)
WITH s AS (
  INSERT INTO public.stores
    (name, category, description, reward_description,
     instagram, event_post_url, is_visible)
  VALUES
    ('바틀링',
     'pub',
     E'원하는 만큼만 담아가는 한강 생맥주 약수터.\n대표 메뉴: 로컬 맥주 / 수입 맥주 드래프트 비어 12종',
     '생맥주 1km 당 1% 할인 (최대 10%)',
     'bottling.kr',
     'https://www.instagram.com/p/DLE_tW3TJu9/?img_index=1',
     false)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
INSERT INTO public.store_locations
  (store_id, main_address, detail_address, latitude, longitude)
SELECT id,
       '서울 광진구 자양동 뚝섬한강공원 (정확 위치 입력 필요)',
       NULL,
       37.53020000,   -- 뚝섬한강공원 근사. 사장님 핀 보정 필요
       127.06730000
FROM s
ON CONFLICT (store_id) DO NOTHING;

-- 2) 아너카페 — Honor Cafe (cafe)
WITH s AS (
  INSERT INTO public.stores
    (name, category, description, verification_method, reward_description,
     business_hours, instagram, event_post_url, is_visible)
  VALUES
    ('아너카페',
     'cafe',
     E'James 1:4 ✝️\n사장님 러닝 기록 — 10k 41:03 · HM 1:27:24 · FM 2:59:37',
     E'24시간 이내 뛰고 와서 앱(스트라바/NRC 등)으로 기록 인증',
     '1K = 1% 할인 (음료만)',
     E'월~목 10:00–새벽 02:00\n금·토 10:00–새벽 01:00\n일 휴무',
     'honor_cafe',
     'https://www.instagram.com/p/DLh3OvWJDx9/',
     false)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
INSERT INTO public.store_locations
  (store_id, main_address, detail_address, latitude, longitude)
SELECT id,
       '(주소 미정 — 사장님 입력 필요)',
       NULL,
       37.56650000,   -- 임시 placeholder (서울시청). 사장님 핀 보정 필요
       126.97800000
FROM s
ON CONFLICT (store_id) DO NOTHING;

-- 3) 오보타르트 — 선유도 디저트, 에그타르트 (cafe)
WITH s AS (
  INSERT INTO public.stores
    (name, category, description,
     instagram, event_post_url, is_visible)
  VALUES
    ('오보타르트',
     'cafe',
     E'포르투갈식 에그타르트 달인 (생활의달인 945회 출현).\n유기농 밀가루 · 프랑스 버터 · 농장 계란 사용.\n답례품 대량주문 시 2·4·6구 가능, 납품 문의 환영.',
     'ovo_tart',
     'https://www.instagram.com/p/DPDZ-nZAW_7/',
     false)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
INSERT INTO public.store_locations
  (store_id, main_address, detail_address, latitude, longitude)
SELECT id,
       '서울 영등포구 양화동 선유도 인근 (정확 위치 입력 필요)',
       NULL,
       37.53940000,   -- 선유도공원 근사. 사장님 핀 보정 필요
       126.89750000
FROM s
ON CONFLICT (store_id) DO NOTHING;

-- 4) 무릉도원 — 음악·커피, 성북구 보문로32길 56 (cafe)
WITH s AS (
  INSERT INTO public.stores
    (name, category, description, instagram, naver_map_url, event_post_url, is_visible)
  VALUES
    ('무릉도원',
     'cafe',
     '음악과 커피가 만나는 힐링 스팟',
     'mdgutopia',
     'https://map.naver.com/p/entry/place/2095884407?placePath=%2Fhome',
     'https://www.instagram.com/p/DYMPhpWkwGA/',
     false)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
INSERT INTO public.store_locations
  (store_id, main_address, detail_address, latitude, longitude)
SELECT id,
       '서울 성북구 보문로32길 56',
       '1층',
       37.58921430,   -- OSM Nominatim 보문로32길 근사
       127.01701950
FROM s
ON CONFLICT (store_id) DO NOTHING;

-- 5) RUN BY BACO — 서울숲 카페, 성동구 왕십리로 63 (cafe)
WITH s AS (
  INSERT INTO public.stores
    (name, category, description, verification_method, reward_description,
     business_hours, instagram, naver_map_url, is_visible)
  VALUES
    ('RUN BY BACO',
     'cafe',
     E'서울숲 런 베이스 · 휴식의 공간\n언더스탠드에비뉴 · 서울숲',
     E'당일 러닝 기록 인증 (가민, 스트라바, NRC 등 기록 화면)\n매장 이용 당일 영수증 지참',
     E'· 거리 무관: 음료 15% 할인 OR 쿨링시트\n· 5KM 인증: 베이글+크림치즈 4,000원\n· 10KM 인증: 베이글+크림치즈 2,000원\n· 카페 이용객 짐 보관 가능\n※ 테이크아웃은 상시 할인 중이며 중복 할인 불가',
     '매일 07:00–20:00',
     'baco_21315',
     'https://map.naver.com/p/entry/place/2060710410',
     false)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
INSERT INTO public.store_locations
  (store_id, main_address, detail_address, latitude, longitude)
SELECT id,
       '서울 성동구 왕십리로 63',
       '1층 A7-1호 (언더스탠드에비뉴)',
       37.54360660,   -- OSM Nominatim: 언더스탠드에비뉴 아트스탠드 매칭
       127.04364150
FROM s
ON CONFLICT (store_id) DO NOTHING;

-- =====================================================================
-- 사장님 편집 링크 뽑기 — 위 INSERT 끝나면 이 SELECT 결과로 DM 발송.
--   최종 URL = {NEXT_PUBLIC_APP_URL}{edit_path}
--   예: https://runhouse.kr/store/edit/abc-123?token=xyz
-- =====================================================================
SELECT
  s.name,
  s.id,
  s.edit_token,
  '/store/edit/' || s.id || '?token=' || s.edit_token AS edit_path,
  s.is_visible,
  l.main_address,
  l.latitude AS lat,
  l.longitude AS lng
FROM public.stores s
LEFT JOIN public.store_locations l ON l.store_id = s.id
WHERE s.name IN ('바틀링','아너카페','오보타르트','무릉도원','RUN BY BACO')
ORDER BY s.name;

-- =====================================================================
-- 사장님이 편집 링크로 들어가서 할 일:
--   1. PIN 4자리 설정 (이후 수정 시 인증용)
--   2. 지도에서 정확한 위치로 핀 이동 → 좌표 보정
--   3. 대표 사진 업로드
--   4. (1·3번) 도로명/지번 주소 입력
--   5. (1·3번) 러닝 인증 방식 입력
-- 어드민이 검토 후 /admin/store 에서 is_visible 토글 → 공개.
-- =====================================================================
