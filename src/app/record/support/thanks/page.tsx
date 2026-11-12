// src/app/record/support/thanks/page.tsx — 후원 결제 후 이동 페이지. sessionStorage 로 어느 후원인지 잇는다.
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { SupportThanksClient } from "@/components/record/SupportThanksClient";

export default function RecordSupportThanksPage() {
  return (
    <RecordShell>
      <RecordSubHeader title="고마워요" backHref="/record" meta="SUPPORT" />
      <SupportThanksClient />
    </RecordShell>
  );
}
