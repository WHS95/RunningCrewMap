import "server-only";
import { createClient } from "@supabase/supabase-js";

// Trim env values defensively — at least one .env line had whitespace
// around the `=` (e.g. `SUPABASE_SERVICE_ROLE_KEY =foo`) which some
// loaders keep as a key with a trailing space, making the var look
// undefined here. Trimming both sides keeps us safe either way.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl) {
  // Loud, single-line warning — surfaces in the dev overlay so a missing
  // env var doesn't masquerade as an empty `{}` PostgrestError.
  console.warn(
    "[serverSupabase] NEXT_PUBLIC_SUPABASE_URL is missing or empty. " +
      "Server-side Supabase calls will fail."
  );
}
if (!supabaseKey) {
  console.warn(
    "[serverSupabase] Neither SUPABASE_SERVICE_ROLE_KEY nor " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is set. Server-side Supabase calls " +
      "will fail."
  );
}

export const serverSupabase = createClient(supabaseUrl, supabaseKey);
