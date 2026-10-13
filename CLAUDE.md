# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**런하우스 (RunHouse)** — a Korean-language Next.js 15 PWA that maps running crews across South Korea. Map of registered crews, crew detail/registration flow, marathon event calendar, running clothing shop, MBTI/calculator side tools.

Stack: Next.js 15 (App Router) on React 19, TypeScript strict, Tailwind, Radix UI, Supabase (DB + storage), Naver Maps, Serwist (PWA), Framer Motion, Zustand, React Hook Form + Zod.

Language: UI copy, commit messages, and most code comments are Korean. Keep that convention when adding strings.

## ⚠️ 아키텍처 문서 갱신 의무 (CRITICAL)

`docs/architecture/`는 ISO/IEC/IEEE 42010 기반 Architecture Description(AD)입니다.
**모든 개발 작업(기능 추가/변경, 마이그레이션, Server Action·라우트 변경, 캐시 규약·인증 흐름 변경, 컴포넌트/컨테이너 구조 변경)을 완료할 때마다 관련 문서를 반드시 함께 갱신하세요.**

- 테이블/컬럼·마이그레이션 변경 → `02-data/erd.md`, `02-data/tables.md`
- Server Action·API 라우트·`CREWS_CACHE_TAG`/`STORES_CACHE_TAG` revalidate 규약 변경 → `04-interface/api-and-actions.md`, `03-process/sequences.md`
- 승인큐·edit_token·매장 PIN 등 도메인 규칙/유스케이스 변경 → `01-domain/*`
- 외부 연동(Supabase server/client, Naver Maps, Discord webhook, Serwist PWA)·컴포넌트 구조 변경 → `05-architecture/c4-*.md`
- 이해관계자·품질속성 변경 → `00-overview/*`, `06-quality/quality-attributes.md`
- 새 View를 추가하면 `architecture-description.md`의 Stakeholder→Concern→Viewpoint→View 매핑표와 `README.md` 링크도 갱신
- 코드와 문서가 어긋난 채로 작업을 종료하지 마세요. 문서 갱신은 "완료(done)"의 일부입니다.

## Commands

```bash
npm run dev      # next dev --turbo (Turbopack). Service worker is disabled in dev.
npm run build    # next build (also emits public/sw.js via @serwist/next)
npm run start    # production server
npm run lint     # next lint (eslint-config-next)
```

No test runner is configured. There is no `typecheck` script — run `npx tsc --noEmit` if you need it.

Path alias: `@/*` → `./src/*`.

## Required env vars

Both `.env` and `.env.local` are used. Server-side Supabase calls fall back from `SUPABASE_SERVICE_ROLE_KEY` to `NEXT_PUBLIC_SUPABASE_ANON_KEY`; service role is required for admin/approval/edit-token flows.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by `src/lib/server/supabase.ts`
- `NEXT_PUBLIC_RUN_NAVER_CLIENT_ID` / `_SECRET` — Naver Maps + geocoding
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — `/admin/login` credentials
- `DISCORD_REGISTRATION_WEBHOOK_URL` — fire-and-forget webhook for crew register/edit events
- `DISCORD_STORE_WEBHOOK_URL` — 매장 등록/수정 알림 전용. 미설정 시 `DISCORD_REGISTRATION_WEBHOOK_URL`로 fallback.
- `DISCORD_RECORD_WEBHOOK_URL` — (선택) 기록 인증 신청·각인 주문 신청 알림. 미설정 시 `DISCORD_REGISTRATION_WEBHOOK_URL`로 fallback — Vercel 에 새 env 추가 없이 동작.
- `CREW_SESSION_SECRET` — **필수(32자 이상)**. 크루 PIN 세션 쿠키 HMAC 시크릿. 미설정이면 PIN 설정/로그인이 실패하고 `/crew/edit/[id]` 서버 렌더가 깨진다.
- `STORE_SESSION_SECRET` — 매장 PIN 세션 HMAC 시크릿. 미설정 시 `CREW_SESSION_SECRET` fallback.
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` — used to build absolute URLs in Discord embeds and edit links

Server env reads in `src/lib/server/supabase.ts` defensively `.trim()` values — some past `.env` lines had stray whitespace around `=`.

## Architecture (big picture)

### Two Supabase clients, two data paths

- **Server (`src/lib/server/supabase.ts`)** — service-role client used only in Server Components and Server Actions. Bypasses RLS; required for approval queue and token-edit logic.
- **Client (`src/lib/supabase/client.ts`)** — anon-key client used by `src/lib/services/crew.service.ts` and the admin UI for browser-side queries and image uploads to Storage buckets (`crewLogos`, `crewActivePicture`).

Public pages (root `/`, `/map`, etc.) read crews through the **server** path. The legacy client-side `CrewService` singleton is still wired up for the admin pages and registration flow; do not delete it.

### Caching contract — `CREWS_CACHE_TAG`

`src/lib/server/crews.ts` wraps the public crew list in `unstable_cache(..., { revalidate: 60, tags: [CREWS_CACHE_TAG] })` and a per-render `cache()`. **Any server mutation that touches `crews`, `crew_locations`, `crew_activity_locations`, etc. must call `revalidateTag(CREWS_CACHE_TAG)` and the relevant `revalidatePath("/")`, `revalidatePath("/map")`, `revalidatePath("/crew/list")`.** See `src/app/actions/crew.ts` for the established pattern.

`STORES_CACHE_TAG`("stores"): 매장 도메인 전용. `stores`/`store_locations`/`store_photos` 관련 mutation 시 `revalidateTag(STORES_CACHE_TAG)` + `revalidatePath("/", "/map", "/store", "/sitemap.xml")` 호출.

`RECORDS_CACHE_TAG`("records", `src/lib/server/records.ts`): 기록 각인 도메인. 승인·반려·기록장 공개 설정·주문 상태 변경 시 `revalidateTag(RECORDS_CACHE_TAG)` + `revalidatePath("/record", "/record/hall")` (`revalidateRecordsCache`, `src/app/actions/record.ts`).

### 기록 각인 (RECORD) — `/record/**`

- 티어(풀코스 넷 타임): SUB-3 < 3:00:00 · SINGLE ≤ 3:09:59 · SUB-4 ≤ 3:59:59 · SUB-5 ≤ 4:59:59. 규칙은 `src/lib/record/tier.ts` 한 곳이고, **서버가 항상 재판정**한다.
- `hall_of_fame_entries`/`record_orders`는 RLS 활성 + 정책 없음 → service role(`serverSupabase`) 전용. 기록증은 비공개 버킷 `recordCertificates`, 관리자만 signed URL 로 연다. anon 클라이언트로 이 테이블을 읽지 마세요.
- 본인 링크 `/record/r/<id>?token=<purchase_token>` — id·token 동시 일치(edit_token 패턴). 각인 문구는 승인된 DB 행에서 서버가 만든다(`buildEngraving`); 클라이언트 입력으로 문구를 받지 마세요.
- **1차는 비노출 개발 링크 운영**: noindex, sitemap·메뉴·`DesktopSidePanel`·홈에 진입점을 넣지 않는다. 홈 진입점은 검토 후 2차.
- 결제 연동 없음 — 주문은 "신청"만 받고 DM 으로 안내.

### Approval queue + self-service edit tokens

- New crew registrations are force-set to `is_visible = false` server-side in `notifyCrewRegistration` (`src/app/actions/crew.ts`). They appear only after an admin flips visibility via `updateCrewVisibility`.
- Every crew has an `edit_token` (UUID; migration `migrations/2026-05-16-add-edit-token.sql`). The user-facing edit URL is `/crew/edit/<id>?token=<token>` — admin DMs the link via the crew's registered Instagram. `getCrewForEdit` / `updateCrewByToken` gate on token equality.
- If a token-edit changes coordinates or main address, `is_visible` is forced back to `false` to re-trigger admin review. Preserve this behavior — it's a deliberate anti-abuse rule, not incidental.

### Admin auth

Cookie-based, dead simple. `src/middleware.ts` gates `/admin/**` on `auth=true` cookie set by `/admin/login`. Do not bolt on RLS-based auth here without rewriting the middleware.

`auth=true` is unsigned (forgeable). `/admin/login` also issues an HMAC-signed `admin_sig` cookie (`src/lib/server/adminSession.ts`, key = `ADMIN_SESSION_SECRET`‖`CREW_SESSION_SECRET` + `ADMIN_PASSWORD`). Admin actions that touch PII — currently every record admin action in `src/app/actions/record.ts` — must check `isSignedAdmin()`, not just `auth`. Sessions from before this change must log in again to use `/admin/record`.

### Layout of `src/`

- `app/` — App Router. `app/actions/*` are Server Actions; `app/_components/` and `app/<route>/...` hold per-route components.
- `lib/server/*` — server-only data + caching layer (`import "server-only"`).
- `lib/services/*` — legacy client-side service singletons (still used by admin + registration).
- `lib/supabase/client.ts` — browser Supabase client.
- `lib/types/*` — domain types (`crew.ts`, `crewInsert.ts`, `event.ts`, `marathon.ts`, etc.).
- `lib/utils/*` — image compression, logger, etc. Image uploads run through `browser-image-compression` + WebP conversion before hitting Storage.
- `components/` — shared components grouped by feature (`crew/`, `map/`, `events/`, `ui/` for shadcn primitives, `design/cartographic.tsx` for design system primitives).
- `sw.ts` — Serwist service worker source, compiled to `public/sw.js` at build time (disabled in dev via `next.config.mjs`).

### Design system

`DESIGN.md` is the source of truth. Dark, near-black canvas, lime (`#C7FF00`) as a restrained accent (≤10% of any screen), JetBrains Mono for anything numeric/measured, hairline borders instead of card shadows. Tokens live in `src/app/globals.css` (`.dark`) and `tailwind.config.ts` (`cart.*` colors). Use the primitives in `src/components/design/cartographic.tsx` (`CartographicHeader`, `HairlineRow`, etc.) rather than re-rolling.

### Maps

Naver Maps is the only map provider (`@types/navermaps`). Geocoding API key is the `NEXT_PUBLIC_RUN_NAVER_CLIENT_*` pair. The map page (`/map`) was the original root and is rendered through `src/app/_components/MapPageClient.tsx`; the new landing page is at `/`.

## Conventions and gotchas

- **Don't reintroduce file-backed services.** A previous `FileCrewService` JSON-file path was removed; all crew data lives in Supabase (`결정.md`).
- **Icons:** use `lucide-react` only. `react-icons` was deliberately removed.
- **Page transitions:** `framer-motion`. Don't reach for the View Transitions API.
- **PWA:** the service worker only runs in production builds. Bumping the Serwist config or cache strategy in `src/sw.ts` requires a full `npm run build` to see effects.
- **Image upload:** logos cap at 2MB, compressed + converted to WebP before upload to `crewLogos`. Crew activity photos go to `crewActivePicture`.
- **Discord webhooks are fire-and-forget.** Never block a user flow on the webhook result — log and continue.
- **Korean copy in errors / Discord embeds** is intentional; keep the language consistent when editing those code paths.
- **`결정.md`** documents past architectural decisions. Read it before reversing one of them.
