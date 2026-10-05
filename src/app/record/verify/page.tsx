// src/app/record/verify/page.tsx — 기록 인증 신청
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { VerifyForm } from "@/components/record/VerifyForm";

export default function RecordVerifyPage() {
  return (
    <RecordShell>
      <RecordSubHeader title="기록 인증 신청" backHref="/record" meta="VERIFY" />
      <div className="px-[22px] pt-5">
        <p className="text-[13px] leading-relaxed text-cart-ink-60">
          대회 공식 기록과 기록증을 대조해 관리자가 승인합니다. 승인되면 인증번호가 발급되고, 각인 액세서리를 신청할 수 있어요.
        </p>
        <VerifyForm />
      </div>
    </RecordShell>
  );
}
