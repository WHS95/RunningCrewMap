-- Migration: Add logo_thumb_url column to crews and stores tables
-- Date: 2026-06-12
--
-- Purpose:
--   Adds a nullable `logo_thumb_url` (text) column to both the `crews` and
--   `stores` tables. This column stores the public URL of a smaller,
--   thumbnail-sized variant of the entity's logo image. Thumbnails are
--   intended for use in list views, map markers, and other low-bandwidth
--   contexts where the full-resolution `logo_image_url` / `logo_url` would
--   be wasteful to load.
--
--   - crews.logo_thumb_url   : thumbnail companion to crews.logo_image_url
--   - stores.logo_thumb_url  : thumbnail companion to stores.logo_url
--
--   The column is nullable because thumbnail generation may be performed
--   lazily (e.g. backfilled by a worker) and existing rows will not have a
--   thumbnail until their logo is re-processed.
--
-- Apply this migration manually via the Supabase SQL editor.
-- This script is idempotent and safe to re-run.

BEGIN;

-- Crews: thumbnail variant of logo_image_url
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS logo_thumb_url text;

COMMENT ON COLUMN public.crews.logo_thumb_url IS
  'Public URL of the thumbnail-sized variant of the crew logo (companion to logo_image_url). Nullable; populated when a thumbnail has been generated.';

-- Stores: thumbnail variant of logo_url
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_thumb_url text;

COMMENT ON COLUMN public.stores.logo_thumb_url IS
  'Public URL of the thumbnail-sized variant of the store logo (companion to logo_url). Nullable; populated when a thumbnail has been generated.';

COMMIT;

-- Rollback (run manually if needed):
-- BEGIN;
--   ALTER TABLE public.crews  DROP COLUMN IF EXISTS logo_thumb_url;
--   ALTER TABLE public.stores DROP COLUMN IF EXISTS logo_thumb_url;
-- COMMIT;
