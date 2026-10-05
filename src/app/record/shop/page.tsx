// src/app/record/shop/page.tsx — 각인 액세서리 (승인된 기록의 토큰으로만 신청 가능)
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { ShopClient } from "@/components/record/ShopClient";
import { buildEngraving, getOwnerEntry } from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function RecordShopPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  const entry = id && token ? await getOwnerEntry(id, token) : null;
  const engraving = entry ? buildEngraving(entry) : null;

  return (
    <RecordShell>
      <RecordSubHeader
        title="기록 각인 액세서리"
        backHref={entry && token ? `/record/r/${entry.id}?token=${token}` : "/record"}
        meta="RECORD · LABS"
      />
      <ShopClient
        engraving={engraving}
        auth={engraving && id && token ? { id, token } : null}
        pendingEntry={!!entry && !engraving}
      />
    </RecordShell>
  );
}
