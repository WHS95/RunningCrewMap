// src/app/record/support/page.tsx — 커피챗 후원(1,500 · 3,000 · 5,000원). 그로블 결제창 상품 3개(SUPPORT_OPTIONS)의 진입 페이지.
// 내 결과 링크(/record/r/<id>?token=)에서 오면 ?id&token 이 붙어 결제 완료 시 기록장에 SUPPORTER 가 붙는다.
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { SupportClient } from "@/components/record/SupportClient";
import { getOwnerEntry, getSupportSummary } from "@/lib/server/records";

export default async function RecordSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  const [summary, entry] = await Promise.all([
    getSupportSummary(),
    id && token ? getOwnerEntry(id, token) : Promise.resolve(null),
  ]);
  const linked = entry && entry.status === "approved" ? { id: entry.id, token: token!, runnerName: entry.runnerName } : null;

  return (
    <RecordShell>
      <RecordSubHeader title="커피챗 후원" backHref={linked ? `/record/r/${linked.id}?token=${linked.token}` : "/record"} meta="SUPPORT" />
      <SupportClient
        paidCount={summary.paidCount}
        linked={linked}
      />
    </RecordShell>
  );
}
