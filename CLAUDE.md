# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**런하우스 (RunHouse)** — a Korean-language Next.js 15 PWA that maps running crews across South Korea. Map of registered crews, crew detail/registration flow, marathon event calendar, running clothing shop, MBTI/calculator side tools.

Stack: Next.js 15 (App Router) on React 19, TypeScript strict, Tailwind, Radix UI, Supabase (DB + storage), Naver Maps, Serwist (PWA), Framer Motion, Zustand, React Hook Form + Zod.

Language: UI copy, commit messages, and most code comments are Korean. Keep that convention when adding strings.

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

### Approval queue + self-service edit tokens

- New crew registrations are force-set to `is_visible = false` server-side in `notifyCrewRegistration` (`src/app/actions/crew.ts`). They appear only after an admin flips visibility via `updateCrewVisibility`.
- Every crew has an `edit_token` (UUID; migration `migrations/2026-05-16-add-edit-token.sql`). The user-facing edit URL is `/crew/edit/<id>?token=<token>` — admin DMs the link via the crew's registered Instagram. `getCrewForEdit` / `updateCrewByToken` gate on token equality.
- If a token-edit changes coordinates or main address, `is_visible` is forced back to `false` to re-trigger admin review. Preserve this behavior — it's a deliberate anti-abuse rule, not incidental.

### Admin auth

Cookie-based, dead simple. `src/middleware.ts` gates `/admin/**` on `auth=true` cookie set by `/admin/login`. Do not bolt on RLS-based auth here without rewriting the middleware.

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
