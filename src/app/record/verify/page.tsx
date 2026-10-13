// src/app/record/verify/page.tsx — 기록 인증 신청
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { VerifyForm } from "@/components/record/VerifyForm";

export default function RecordVerifyPage() {
  return (
    <RecordShell>
      <RecordSubHeader title="기록 인증 신청" backHref="/record" meta="STEP 1 / 2" />
      <div className="px-[22px]">
        <VerifyForm />
      </div>
    </RecordShell>
  );
}
