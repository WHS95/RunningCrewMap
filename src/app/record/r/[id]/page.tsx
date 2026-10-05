// src/app/record/r/[id]/page.tsx — 본인 인증 결과 (id + token 게이트)
import { notFound } from "next/navigation";
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { ResultView } from "@/components/record/ResultView";
import { getOwnerEntry } from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function RecordResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; new?: string }>;
}) {
  const { id } = await params;
  const { token, new: isNew } = await searchParams;
  const entry = token ? await getOwnerEntry(id, token) : null;
  if (!entry || !token) notFound();

  return (
    <RecordShell>
      <RecordSubHeader title="인증 결과" backHref="/record" meta={entry.certNo ?? "PENDING"} />
      <ResultView entry={entry} token={token} isNew={isNew === "1"} />
    </RecordShell>
  );
}
