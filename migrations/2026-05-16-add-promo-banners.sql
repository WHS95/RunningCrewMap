-- =====================================================================
-- 2026-05-16: promo_banners table for admin-editable /home banners.
-- =====================================================================
--
-- Why: The /home top carousel was hardcoded in HomeContent.tsx. Admin
-- wants to add/edit promo banners (e.g. "러닝 모자 제작 오픈") without
-- a code deploy. This table holds the structured banner data, and
-- /home now fetches from here.
--
-- Variants: matches the BannerItem.variant union in NoticeBanner.tsx:
--   - "cap"   — Cartographic Dark lime card with cap silhouette
--   - "flag"  — Paper card with flag silhouette
--   - NULL    — Fallback: legacy image-only carousel slide
--
-- Apply: paste into Supabase SQL editor and run once. Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.promo_banners (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT         NOT NULL,
  description TEXT         NULL,
  link        TEXT         NOT NULL DEFAULT '/',
  image_url   TEXT         NULL,
  variant     TEXT         NULL CHECK (variant IN ('cap', 'flag') OR variant IS NULL),
  code        TEXT         NULL,          -- small mono kicker (e.g. "0312")
  cta         TEXT         NULL,          -- CTA hint text (e.g. "RUNHOUSE →")
  bg_color    TEXT         NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  display_order INT        NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ordered fetch is the only access pattern, so a single composite index
-- on (is_active, display_order) covers list reads.
CREATE INDEX IF NOT EXISTS promo_banners_active_order_idx
  ON public.promo_banners (is_active, display_order);

-- updated_at maintained via trigger so server actions don't have to set it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promo_banners_set_updated_at ON public.promo_banners;
CREATE TRIGGER promo_banners_set_updated_at
  BEFORE UPDATE ON public.promo_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public read access for the /home carousel (no RLS needed if the table
-- is intentionally open). Service role still bypasses everything.
-- Adjust if you decide to enable RLS on this table later.

-- Seed two starter rows mirroring the previous hardcoded banners so the
-- /home carousel doesn't go empty between this migration and admin entry.
INSERT INTO public.promo_banners
  (title, description, link, variant, code, cta, display_order, is_active)
VALUES
  (
    '러닝 모자 제작 오픈',
    '등록 크루 한정 특가 - 러닝 최적화 모자',
    '/notice/event/3',
    'cap',
    '0312',
    'RUNHOUSE →',
    0,
    true
  ),
  (
    '크루 깃발 무료 제작',
    '보아델와 런하우스 협업 프로모션',
    '/notice/event/1',
    'flag',
    '0420',
    '신청하기 →',
    1,
    true
  )
ON CONFLICT DO NOTHING;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DROP TRIGGER IF EXISTS promo_banners_set_updated_at ON public.promo_banners;
-- DROP INDEX IF EXISTS public.promo_banners_active_order_idx;
-- DROP TABLE IF EXISTS public.promo_banners;
-- (Note: leave public.set_updated_at() in place — it may be used by other tables.)
