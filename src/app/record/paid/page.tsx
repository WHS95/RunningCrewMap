// src/app/record/paid/page.tsx — Groble 결제 후 이동 페이지(주문 정보가 URL 에 안 실리므로 sessionStorage 로 잇는다)
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { PaidClient } from "@/components/record/PaidClient";

export default function RecordPaidPage() {
  return (
    <RecordShell>
      <RecordSubHeader title="결제 확인" backHref="/record" meta="PAYMENT" />
      <PaidClient />
    </RecordShell>
  );
}
