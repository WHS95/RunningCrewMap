// src/app/record/shop/page.tsx — 각인 키링 상세·주문 (승인된 기록의 토큰으로만 결제 가능)
import { RecordShell } from "@/components/record/RecordShell";
import { ShopClient } from "@/components/record/ShopClient";
import { buildEngraving, getOwnerEntry } from "@/lib/server/records";
import { getRemainingStock } from "@/app/actions/record";

export const dynamic = "force-dynamic";

export default async function RecordShopPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  const [entry, remaining] = await Promise.all([
    id && token ? getOwnerEntry(id, token) : Promise.resolve(null),
    getRemainingStock(),
  ]);
  const engraving = entry ? buildEngraving(entry) : null;

  return (
    <RecordShell>
      <ShopClient
        backHref={entry && token ? `/record/r/${entry.id}?token=${token}` : "/record/collection"}
        engraving={engraving}
        auth={engraving && id && token ? { id, token } : null}
        pendingEntry={!!entry && !engraving}
        remaining={remaining}
        paymentReady={!!(process.env.GROBLE_PAYMENT_URL ?? "").trim()}
      />
    </RecordShell>
  );
}
