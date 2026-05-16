-- =====================================================================
-- 2026-05-16: Add edit_token to crews for self-service edit links.
-- =====================================================================
--
-- Why: Crew leaders want to edit their own crew info (Instagram handle
-- changed, meeting place moved, etc.) without creating a full account.
-- We give each crew a server-issued random token. The admin shares the
-- token-bearing URL with the crew leader via the Instagram DM that was
-- used at registration, and the leader can self-edit from any device
-- without logging in.
--
-- Security model:
--   - Token is generated server-side (service-role only).
--   - URL is shared 1:1 between admin ↔ crew leader (Instagram DM acts
--     as the 1st-factor identity proof since registration captured the
--     handle).
--   - On any edit, a Discord webhook fires with the diff so admin can
--     spot abuse and rotate the token if needed.
--   - Editing the location coordinates flips `is_visible` back to false
--     so abuse can't move a published crew pin without admin re-review.
--
-- How to apply: paste this whole file into the Supabase SQL editor and
-- run it once. It's idempotent (uses IF NOT EXISTS).
--
-- Rollback: see the `-- ROLLBACK` block at the bottom.
-- =====================================================================

-- 1. Add the column. We default to a fresh UUID so existing rows are
-- backfilled in a single step. NOT NULL is safe because of the default.
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS edit_token TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- 2. Unique index. Two crews must never share a token (otherwise an admin
-- could accidentally hand out a URL that exposes another crew).
CREATE UNIQUE INDEX IF NOT EXISTS crews_edit_token_unique_idx
  ON public.crews (edit_token);

-- 3. (Optional but recommended) Hide the column from the anon-key client
-- so it can't be SELECTed from the browser. Token lookup happens only via
-- server actions running with the service role. Skip this block if you
-- don't have an `anon` role policy / RLS yet.
--
-- This assumes you already have RLS enabled on `crews`. If not, the
-- service-role server actions still work — but every authenticated user
-- could read the token via the REST API.
--
-- Safe to run; uses a column-level grant revoke.
REVOKE SELECT (edit_token) ON public.crews FROM anon;
REVOKE SELECT (edit_token) ON public.crews FROM authenticated;

-- Note: service_role retains all privileges by default. The server-side
-- Supabase client (`serverSupabase` with SUPABASE_SERVICE_ROLE_KEY) bypasses
-- RLS and can read/write the token freely.

-- =====================================================================
-- ROLLBACK (only run if you need to undo this migration):
-- =====================================================================
-- DROP INDEX IF EXISTS public.crews_edit_token_unique_idx;
-- ALTER TABLE public.crews DROP COLUMN IF EXISTS edit_token;
