import { CrewEditClient } from "./CrewEditClient";
import SetPinForm from "./SetPinForm";
import { getCrewSession } from "@/lib/server/crewSession";
import { serverSupabase } from "@/lib/server/supabase";

export const runtime = "nodejs";

/**
 * Session-aware crew edit entry point.
 *
 * Resolution order:
 *   1. Session cookie matches crewId → render edit client (no token needed)
 *   2. URL token + crew has no pin_hash → render PIN setup form
 *   3. Fall through to client (handles URL token / localStorage / denied)
 */
export default async function CrewEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const token = sp.token ?? null;

  // 1) Session matches → straight to edit client
  const session = await getCrewSession();
  if (session?.crewId === id) {
    return <CrewEditClient crewId={id} initialToken={token} hasSession />;
  }

  // 2) Token + no PIN set → bootstrap PIN
  if (token) {
    const { data } = await serverSupabase
      .from("crews")
      .select("id, edit_token, pin_hash")
      .eq("id", id)
      .maybeSingle();
    const row = data as
      | { id: string; edit_token: string; pin_hash: string | null }
      | null;
    if (row && row.edit_token === token && !row.pin_hash) {
      return <SetPinForm crewId={id} token={token} />;
    }
  }

  // 3) Fall through — client handles token / localStorage / denied state
  return (
    <CrewEditClient crewId={id} initialToken={token} hasSession={false} />
  );
}
