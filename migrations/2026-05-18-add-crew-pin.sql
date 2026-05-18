-- migrations/2026-05-18-add-crew-pin.sql
-- =====================================================================
-- 2026-05-18: Add PIN auth columns to crews.
-- =====================================================================
--
-- Why: Move from edit_token URL (often lost in Instagram DMs) to
-- self-service PIN login (Instagram handle + 4-digit PIN). edit_token
-- stays for bootstrap and reset paths.
--
-- Security model:
--   - pin_hash: bcrypt (cost 12), NULL until set
--   - pin_set_at: bumped on PIN set / admin reset → invalidates sessions
--   - failed_pin_attempts + pin_locked_until: 5 fails / 15-min lock
--
-- Pre-flight: run the duplicate-handle check below FIRST. If it returns
-- rows, admin must dedupe before creating the unique index.
-- =====================================================================

-- Pre-flight check (run separately, must return 0 rows):
--   SELECT LOWER(instagram), COUNT(*)
--   FROM public.crews
--   WHERE instagram IS NOT NULL AND instagram <> ''
--   GROUP BY 1 HAVING COUNT(*) > 1;

ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_pin_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS crews_instagram_lower_unique_idx
  ON public.crews (LOWER(instagram))
  WHERE instagram IS NOT NULL AND instagram <> '';

REVOKE SELECT (pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until)
  ON public.crews FROM anon;
REVOKE SELECT (pin_hash, pin_set_at, failed_pin_attempts, pin_locked_until)
  ON public.crews FROM authenticated;

-- =====================================================================
-- ROLLBACK:
--   DROP INDEX IF EXISTS public.crews_instagram_lower_unique_idx;
--   ALTER TABLE public.crews
--     DROP COLUMN IF EXISTS pin_hash,
--     DROP COLUMN IF EXISTS pin_set_at,
--     DROP COLUMN IF EXISTS failed_pin_attempts,
--     DROP COLUMN IF EXISTS pin_locked_until;
-- =====================================================================
