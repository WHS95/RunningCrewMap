import { Suspense } from "react";
import { CrewEditClient } from "./CrewEditClient";

/**
 * Token-gated self-service crew edit.
 *
 * URL: /crew/edit/{id}?token={edit_token}
 *
 * Token is generated server-side on registration and shared with the crew
 * leader via the Instagram DM that admin sends after approval. The client
 * validates the token against `getCrewForEdit` before showing the form.
 *
 * If the URL omits the token, the client falls back to localStorage so
 * a returning crew leader doesn't need to re-bookmark the full URL each
 * time. localStorage is only set after a successful server validation.
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
  return (
    <Suspense fallback={null}>
      <CrewEditClient crewId={id} initialToken={sp.token ?? null} />
    </Suspense>
  );
}
