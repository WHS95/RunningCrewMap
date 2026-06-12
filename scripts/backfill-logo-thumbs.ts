/**
 * One-off backfill script: generate 256px WebP thumbnails for existing crew and store logos.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/backfill-logo-thumbs.ts
 *   # (or: npx tsx scripts/backfill-logo-thumbs.ts)
 *
 * Required dev dependencies (install before running):
 *   npm install --save-dev sharp tsx @supabase/supabase-js
 *
 * What it does:
 *   1. Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from process.env.
 *   2. Selects crews where logo_image_url IS NOT NULL AND logo_thumb_url IS NULL.
 *      Selects stores where logo_url IS NOT NULL AND logo_thumb_url IS NULL.
 *   3. For each row:
 *      - Downloads the original image via fetch.
 *      - Resizes to 256px (max width/height, preserving aspect ratio) using sharp.
 *      - Converts to WebP.
 *      - Uploads to the same Supabase storage bucket with `_thumb.webp` suffix.
 *      - Updates the row's logo_thumb_url column with the new public URL.
 *   4. Logs progress per row and a final summary.
 *
 * Notes:
 *   - sharp is used (NOT browser-image-compression) because this runs in Node.
 *   - Crew logos live in the 'crewLogos' bucket; store logos live in the 'storePhotos' bucket.
 *   - This script uses the service-role key, which bypasses RLS. Do not commit the key.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[backfill] Missing required env vars. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const CREW_BUCKET = 'crewLogos';
const STORE_BUCKET = 'storePhotos';
const THUMB_MAX_DIMENSION = 256;

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

interface BackfillResult {
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * Derive the storage object key for the thumbnail from the original public URL.
 * Supabase public URLs look like:
 *   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{objectKey}?v=...
 * We strip the prefix and query string, then replace the extension with `_thumb.webp`.
 */
function deriveThumbObjectKey(
  originalUrl: string,
  bucket: string,
): string | null {
  try {
    const url = new URL(originalUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    const objectKey = url.pathname.substring(idx + marker.length);
    // Drop existing extension and append _thumb.webp.
    const dot = objectKey.lastIndexOf('.');
    const base = dot === -1 ? objectKey : objectKey.substring(0, dot);
    return `${base}_thumb.webp`;
  } catch {
    return null;
  }
}

async function generateThumb(sourceUrl: string): Promise<Buffer> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${sourceUrl}: ${res.status} ${res.statusText}`,
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  const input = Buffer.from(arrayBuffer);
  return await sharp(input)
    .resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
}

async function uploadThumb(
  bucket: string,
  objectKey: string,
  data: Buffer,
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectKey, data, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '3600',
    });
  if (uploadError) {
    throw new Error(`Upload failed for ${bucket}/${objectKey}: ${uploadError.message}`);
  }
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(objectKey);
  const baseUrl = publicUrlData.publicUrl;
  // Cache-bust to match patterns used elsewhere in the codebase.
  return `${baseUrl}?v=${Date.now()}`;
}

async function backfillCrews(): Promise<BackfillResult> {
  const result: BackfillResult = { processed: 0, succeeded: 0, failed: 0 };

  const { data: rows, error } = await supabase
    .from('crews')
    .select('id, name, logo_image_url')
    .not('logo_image_url', 'is', null)
    .is('logo_thumb_url', null);

  if (error) {
    console.error('[backfill][crews] select failed:', error.message);
    return result;
  }

  console.log(`[backfill][crews] found ${rows?.length ?? 0} rows needing thumbnails`);

  for (const row of rows ?? []) {
    result.processed += 1;
    const id = (row as { id: string }).id;
    const name = (row as { name?: string }).name ?? '(no name)';
    const originalUrl = (row as { logo_image_url: string }).logo_image_url;
    try {
      const thumbKey = deriveThumbObjectKey(originalUrl, CREW_BUCKET);
      if (!thumbKey) {
        throw new Error(
          `Could not derive object key from URL: ${originalUrl}`,
        );
      }
      const thumbBuffer = await generateThumb(originalUrl);
      const thumbUrl = await uploadThumb(CREW_BUCKET, thumbKey, thumbBuffer);

      const { error: updateError } = await supabase
        .from('crews')
        .update({ logo_thumb_url: thumbUrl })
        .eq('id', id);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      result.succeeded += 1;
      console.log(
        `[backfill][crews] (${result.processed}/${rows?.length ?? 0}) OK id=${id} name=${name}`,
      );
    } catch (err) {
      result.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[backfill][crews] (${result.processed}/${rows?.length ?? 0}) FAIL id=${id} name=${name}: ${message}`,
      );
    }
  }

  return result;
}

async function backfillStores(): Promise<BackfillResult> {
  const result: BackfillResult = { processed: 0, succeeded: 0, failed: 0 };

  const { data: rows, error } = await supabase
    .from('stores')
    .select('id, name, logo_url')
    .not('logo_url', 'is', null)
    .is('logo_thumb_url', null);

  if (error) {
    console.error('[backfill][stores] select failed:', error.message);
    return result;
  }

  console.log(`[backfill][stores] found ${rows?.length ?? 0} rows needing thumbnails`);

  for (const row of rows ?? []) {
    result.processed += 1;
    const id = (row as { id: string }).id;
    const name = (row as { name?: string }).name ?? '(no name)';
    const originalUrl = (row as { logo_url: string }).logo_url;
    try {
      const thumbKey = deriveThumbObjectKey(originalUrl, STORE_BUCKET);
      if (!thumbKey) {
        throw new Error(
          `Could not derive object key from URL: ${originalUrl}`,
        );
      }
      const thumbBuffer = await generateThumb(originalUrl);
      const thumbUrl = await uploadThumb(STORE_BUCKET, thumbKey, thumbBuffer);

      const { error: updateError } = await supabase
        .from('stores')
        .update({ logo_thumb_url: thumbUrl })
        .eq('id', id);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      result.succeeded += 1;
      console.log(
        `[backfill][stores] (${result.processed}/${rows?.length ?? 0}) OK id=${id} name=${name}`,
      );
    } catch (err) {
      result.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[backfill][stores] (${result.processed}/${rows?.length ?? 0}) FAIL id=${id} name=${name}: ${message}`,
      );
    }
  }

  return result;
}

async function main() {
  console.log('[backfill] Starting logo thumbnail backfill...');
  const startedAt = Date.now();

  const crewResult = await backfillCrews();
  const storeResult = await backfillStores();

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('');
  console.log('[backfill] ===== Summary =====');
  console.log(
    `[backfill] Crews:  ${crewResult.succeeded} backfilled, ${crewResult.failed} failed (of ${crewResult.processed} processed)`,
  );
  console.log(
    `[backfill] Stores: ${storeResult.succeeded} backfilled, ${storeResult.failed} failed (of ${storeResult.processed} processed)`,
  );
  console.log(`[backfill] Total elapsed: ${elapsedSec}s`);

  if (crewResult.failed > 0 || storeResult.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
