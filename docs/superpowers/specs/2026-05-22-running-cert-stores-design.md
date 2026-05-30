# 러닝 인증 매장(Store) 도메인 도입 설계

날짜: 2026-05-22
대상 브랜치: `feat/crew-pin-auth` (또는 신규 `feat/store-domain`)
관련 기존 결정: `결정.md`, `docs/superpowers/specs/2026-05-18-crew-pin-auth-design.md`

## 1. 배경 & 목적

런하우스에 **러닝 인증 매장**(러닝 후 인증 시 혜택을 제공하는 카페·식당·주점) 도메인을 추가한다. 사용자는 `/map`에서 크루와 함께 매장을 한 화면에서 탐색하고, 매장 상세에서 인증 방식·혜택·사장님 메시지·연락처를 확인할 수 있다. 사장님은 자가 등록·자가 수정이 가능하며, 어드민이 승인 큐로 품질을 통제한다.

근거 자료: `러닝인증카페 정보 .md` (실데이터 5건 — 바틀링·아너카페·오보타르트·무등도원·BACO).

## 2. 전체 구조

- 도메인 prefix: `store`
- 라우트: `/store`, `/store/[id]`, `/store/register`, `/store/edit/login`, `/store/edit/[id]`, `/admin/store`, `/admin/store/edit/[id]`
- `/map`은 크루와 매장을 함께 노출 (상단 토글로 레이어 필터)
- 운영 모델: **사장님 자가 등록 → `is_visible=false` 어드민 승인 큐 → 어드민 승인 후 공개**
- 자가 수정: `edit_token` URL + 4자리 PIN 이중 인증 (크루와 동일 패턴)
- 캐시: `STORES_CACHE_TAG="stores"`, 크루와 독립
- 디스코드 웹훅: `DISCORD_STORE_WEBHOOK_URL`(신설), 없으면 `DISCORD_REGISTRATION_WEBHOOK_URL`로 fallback
- 카테고리: `cafe` / `restaurant` / `pub` / `other` (4개)

### 의도적으로 안 하는 것 (YAGNI)

- 매장-크루 연결, 매장 리뷰/평점/즐겨찾기, 매장 검색
- 위치 기반 거리 정렬, 클러스터링, URL 쿼리 ↔ 토글 동기화
- 시즌 한정 이벤트의 별도 기간 필드 (자유 텍스트로 흡수)
- 매장-마라톤 이벤트 연결
- 영업시간 구조화 (요일별 컬럼·시간 범위 등) — 자유 텍스트 1필드로 통일
- 베이커리·디저트 카테고리 분리 — `cafe` 또는 `other`로 흡수

## 3. 데이터 모델

### 3.1 `stores` 메인 테이블

```sql
CREATE TABLE IF NOT EXISTS stores (
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
  edit_token            TEXT UNIQUE NOT NULL,
  pin_hash              TEXT,
  pin_set_at            TIMESTAMPTZ,
  failed_pin_attempts   INT NOT NULL DEFAULT 0,
  pin_locked_until      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_visible  ON stores (is_visible);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores (category);
```

크루 대비 차이점:
- `is_visible` 기본값이 `false` (어드민 승인 명시적 필요)
- 활동요일/연령대 자식 테이블 없음 (영업시간은 텍스트 1필드)
- `logo_image_url` 대신 `main_image_url` (로고 개념이 매장에 어색)
- `event_post_url` 신설 — 매장 공식 인스타와 별개의 "공식 공고" 링크

### 3.2 `store_locations` (1:1)

```sql
CREATE TABLE IF NOT EXISTS store_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  main_address    VARCHAR(200) NOT NULL,
  detail_address  TEXT,
  latitude        NUMERIC(10,8) NOT NULL,
  longitude       NUMERIC(11,8) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_locations_store ON store_locations (store_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_geo ON store_locations (latitude, longitude);
```

### 3.3 `store_photos` (1:N)

```sql
CREATE TABLE IF NOT EXISTS store_photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  photo_url      TEXT NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_photos_store ON store_photos (store_id, display_order);
```

### 3.4 RLS / 권한 정책

크루 정책과 동일 원칙:
- `stores`, `store_locations`, `store_photos`: `SELECT` 공개, `INSERT/UPDATE/DELETE`는 anon 허용 (서비스 로직에서 검증; service-role bypass 활용)
- 자가 수정의 보안 경계는 RLS가 아니라 서버 액션의 `edit_token` 검증으로 처리

### 3.5 마이그레이션 파일

단일 파일로 통합: `migrations/2026-05-22-create-stores.sql`
- 위 3개 테이블 + 인덱스 + RLS 정책
- 끝에 ROLLBACK 블록 포함 (`DROP TABLE IF EXISTS ... CASCADE`)

### 3.6 Storage 버킷

신규 버킷 `storePhotos`:
- 공개 읽기
- anon 업로드 허용
- 파일명 규칙: `${storeId}_${timestamp}.webp`
- WebP 변환 + `browser-image-compression` 압축(2MB 상한) — 크루 흐름 그대로

## 4. 타입 / 서비스 / 액션

### 4.1 타입 — `src/lib/types/`

- `store.ts` — `Store`, `StoreCategory = 'cafe'|'restaurant'|'pub'|'other'`, `StoreWithDetails` (location + photos 포함)
- `storeInsert.ts` — `CreateStoreInput`, `UpdateStoreInput` (이미지 필드는 `File`)

### 4.2 서버 데이터 레이어 — `src/lib/server/stores.ts`

```ts
import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";

export const STORES_CACHE_TAG = "stores";

export const getVisibleStores = cache(
  unstable_cache(
    async (): Promise<StoreWithDetails[]> => { /* service-role fetch */ },
    ["server-stores-v1"],
    { revalidate: 60, tags: [STORES_CACHE_TAG] }
  )
);

export const getStoreById = cache(async (id: string) => { /* ... */ });
```

### 4.3 클라이언트 서비스 — `src/lib/services/store.service.ts`

`crew.service.ts` 패턴을 미러:
- `BUCKET = "storePhotos"`
- `validateImage()` (JPG/PNG/WebP, 2MB)
- `uploadStorePhoto()` (WebP 변환 + 압축 + upload + cache-busting URL)
- CRUD: `createStore`, `updateStore`, `deleteStore`, `getStoreList`, `getStoreById`

### 4.4 서버 액션 — `src/app/actions/store.ts`

```ts
"use server";
notifyStoreRegistration(input)           // 등록 + PIN 해싱 + is_visible=false + 디스코드 + revalidate
getStoreForEdit(storeId, token)          // 토큰 또는 세션 검증
updateStoreByToken(storeId, token, p)    // 자가 수정. 좌표/주소 변경 시 is_visible=false 재트리거
updateStoreVisibility(storeId, visible)  // 어드민 승인
rotateStoreEditToken(storeId)            // 토큰 재발급
clearStorePinAdmin(storeId)              // PIN 초기화
deleteStore(storeId)                     // 사진 파일 + DB 삭제
loginStoreWithPin(storeName, pin)        // PIN 로그인
notifyStoreEdit(before, after)           // 내부, 디스코드 알림
revalidateStoresCache()                  // 태그 + path 무효화
```

캐시 무효화 규칙:
```ts
revalidateTag(STORES_CACHE_TAG);
revalidatePath("/");
revalidatePath("/map");
revalidatePath("/store");
revalidatePath("/sitemap.xml");
```

좌표 또는 주소 변경 시 `is_visible=false`로 강제 리셋 — 크루의 anti-abuse 규칙과 동일.

## 5. 라우트 / UI

### 5.1 신규 라우트

| 경로 | 역할 |
|---|---|
| `/store` | 매장 목록(공개, 카테고리 탭) |
| `/store/[id]` | 매장 상세 |
| `/store/register` | 자가 등록 폼 |
| `/store/edit/login` | PIN 로그인 |
| `/store/edit/[id]` | 자가 수정 폼 |
| `/admin/store` | 어드민 매장 관리 |
| `/admin/store/edit/[id]` | 어드민 매장 편집 |

### 5.2 `/map` 통합

- 페이지 로컬 상태 `useState<"all"|"crew"|"store">("all")` (URL 동기화 X)
- 상단 세그먼트 토글 `[ 전체 ] [ 크루 ] [ 매장 ]` — 디자인 시스템 하이라인 보더
- 매장 마커: 카테고리별 색·아이콘 (lucide `Coffee` / `UtensilsCrossed` / `Beer` / `Store`)
- 매장 마커 클릭 → `StoreDetailView` Sheet
- 같은 좌표 충돌 시 클러스터링/지터 — 1차 스코프 밖

### 5.3 신규 컴포넌트 — `src/components/store/`

```
StoreCard.tsx                — 카드 (목록/연관). 카테고리 chip + 대표사진 + 이름 + 짧은 소개
StoreList.tsx                — 카테고리 탭 필터 + 카드 그리드
StoreDetailView.tsx          — Sheet (지도 마커 클릭 / /store/[id] 상세)
StoreRegisterForm.tsx        — 등록 폼 (편집과 mode prop 공유 옵션)
StoreEditForm.tsx            — 편집 폼
StorePhotosUpload.tsx        — 다중 사진 업로드 + 순서 정렬
StoreLocationPickerMap.tsx   — 지도 핀 선택 (CrewLocationPickerMap 미러)
```

### 5.4 등록 폼 필드 순서

1. 가게 이름 (필수)
2. 카테고리 (필수)
3. 대표 사진 (필수)
4. 위치 (LocationPickerMap, 필수)
5. 가게 소개 (필수, ≤500자)
6. 러닝 인증 방식 (필수)
7. 혜택 (필수)
8. 사장님 한말씀 (선택)
9. 영업시간 (선택)
10. 연락처 (선택, **연락처 또는 인스타 중 하나 필수**)
11. 인스타그램 (선택)
12. 네이버지도 URL (선택)
13. 이벤트 글 URL (선택)
14. 추가 사진 (선택, 최대 6장)
15. PIN 4자리 (필수)

### 5.5 상세 페이지 정보 배치

```
CartographicHeader: STORE / <CATEGORY UPPER>
이름
대표 사진 (16:9)
가게 소개
러닝 인증 방식 (markdown)
혜택 (markdown)
사장님 한말씀 (italic)
HairlineRow 그룹: 위치 | 영업시간 | 연락처 | 인스타 | 네이버지도 | 이벤트 글
사진 갤러리
```

## 6. 어드민

`/admin/store`:
- 필터 탭: ALL / LIVE (`is_visible=true`) / PENDING (`is_visible=false`)
- 행별 액션: 가시성 토글, URL 재발급(`rotateStoreEditToken`), PIN 초기화(`clearStorePinAdmin`), EDIT, DEL
- `crewService` 클라이언트 패턴을 따라 `storeService` 활용

미들웨어 `src/middleware.ts`의 `/admin/**` 가드는 이미 동작 — 변경 없음.

## 7. 디스코드 웹훅

- env: `DISCORD_STORE_WEBHOOK_URL` 신설, 미설정 시 `DISCORD_REGISTRATION_WEBHOOK_URL` fallback
- 임베드 색상: 등록 `0xD4B896` (베이지), 수정 `0x6B8E5A` (세이지)
- 좌표/주소 변경으로 재승인 트리거 시 제목에 "⚠️ 재승인 필요" 명시
- Fire-and-forget, 실패 시 `logger.warn` + 사용자 흐름 차단 금지

## 8. 메뉴·내비게이션 통합

`src/app/menu/page.tsx`의 `PRIMARY_LINKS`에 추가:

```ts
{ href: "/store", label: "러닝 인증 매장", description: "혜택 주는 카페·식당" },
{ href: "/store/register", label: "매장 등록", description: "사장님 자가 등록" },
{ href: "/store/edit/login", label: "내 매장 수정", description: "PIN으로 매장 관리" },
```

위치: "지역별 보기" 다음.

## 9. SEO / Sitemap

`src/app/sitemap.ts`(또는 동등)에서 `is_visible=true` 매장의 `/store/[id]` URL 추가.

## 10. 시드 데이터

설계서에 시드 SQL 미포함. 마이그레이션 적용 후 `/admin/store`에서 어드민 직접 등록으로 다음 5건 입력:
- 바틀링 (pub) — 뚝섬한강공원
- 아너카페 (cafe)
- 오보타르트 (cafe — 디저트 흡수)
- 무등도원 (cafe)
- BACO (cafe) — 서울숲

좌표는 네이버지도 링크 또는 인스타 위치 태그에서 수동 입력. 입력 즉시 `is_visible=true`로 공개.

## 11. 문서 갱신

`결정.md` 한 줄 추가:
> 2026-05-22: 매장(러닝 인증 카페·식당) 도메인을 크루와 동일한 자가등록+어드민 승인 패턴으로 도입. 도메인 prefix `store`, 캐시 태그 `STORES_CACHE_TAG` 독립. 카테고리는 cafe/restaurant/pub/other 4종.

`CLAUDE.md`의 "Architecture (big picture)" 섹션에 `STORES_CACHE_TAG`와 `DISCORD_STORE_WEBHOOK_URL` 항목 추가.

## 12. 단위(unit) 경계 요약

| 단위 | 책임 | 의존성 |
|---|---|---|
| `migrations/2026-05-22-create-stores.sql` | 스키마·인덱스·RLS | Supabase Postgres |
| `src/lib/types/store.ts`, `storeInsert.ts` | 도메인 타입 | — |
| `src/lib/server/stores.ts` | 서버 캐싱 + 데이터 조회 | service-role 클라이언트 |
| `src/lib/services/store.service.ts` | 클라이언트 CRUD + 이미지 | anon 클라이언트, 이미지 압축 유틸 |
| `src/app/actions/store.ts` | 서버 액션, 캐시 무효화, 웹훅 | server-only |
| `src/components/store/*` | UI 컴포넌트 | 디자인 시스템 |
| `src/app/store/**`, `src/app/admin/store/**` | 페이지 라우트 | 위 단위들 |
| `src/app/_components/MapPageClient.tsx`(수정) | 매장 레이어 + 토글 | server fetch + components/store |

각 단위는 인터페이스가 좁고 내부를 독립적으로 변경 가능하도록 유지한다.

## 13. 검증 체크리스트 (구현 후 확인)

- [ ] 마이그레이션 적용 후 빈 큐에서 자가 등록 → `is_visible=false`로 들어가는지
- [ ] 어드민 승인 후 `/map`과 `/store`에 즉시 노출 (`STORES_CACHE_TAG` 무효화)
- [ ] 자가 수정에서 좌표 변경 시 `is_visible=false`로 재트리거
- [ ] PIN 5회 실패 시 잠금 (크루 PIN과 동일 규칙)
- [ ] `/map` 토글이 크루/매장 마커를 정상 필터링
- [ ] WebP 변환 + 2MB 압축이 매장 사진에도 동작
- [ ] 디스코드 웹훅 실패가 사용자 흐름을 차단하지 않음
- [ ] 어드민 미들웨어가 `/admin/store/**`도 가드
