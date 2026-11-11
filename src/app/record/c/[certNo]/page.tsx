// src/app/record/c/[certNo]/page.tsx — NFC 키링이 여는 공개 기록 페이지 (인증번호 기준)
// 키링 NFC 에는 https://www.runhouse.club/record/c/RH-REC-00001 을 쓴다. 토큰이 없어 개인정보는 없다.
import { notFound } from "next/navigation";
import Link from "next/link";
import { KickerLabel } from "@/components/design/cartographic";
import { RecordShell, TierBadge } from "@/components/record/RecordShell";
import { CountUp } from "@/components/record/CountUp";
import { getPublicEntryByCertNo } from "@/lib/server/records";
import { TIER_BY_ID } from "@/lib/record/tier";

export const dynamic = "force-dynamic";

export default async function PublicRecordPage({ params }: { params: Promise<{ certNo: string }> }) {
  const { certNo } = await params;
  const res = await getPublicEntryByCertNo(decodeURIComponent(certNo));
  if (!res) notFound();

  const tier = res.kind === "public" ? res.entry.tier : res.tier;
  const seconds = res.kind === "public" ? res.entry.seconds : res.seconds;
  const cert = res.kind === "public" ? res.entry.certNo : res.certNo;

  return (
    <RecordShell>
      <div className="px-[22px] pt-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <KickerLabel tone="lime" className="text-[10px]">● VERIFIED RECORD</KickerLabel>
          <span className="font-mono text-[11px] text-cart-ink-60">{cert}</span>
        </div>
        <div className="flex flex-col gap-3.5 py-6 border-y border-cart-rule">
          <div className="flex items-center gap-2.5">
            <TierBadge label={TIER_BY_ID[tier].label} top={tier === "sub3"} />
            <KickerLabel tone="muted">FULL · NET TIME</KickerLabel>
          </div>
          <div className="font-mono text-[clamp(56px,18vw,76px)] font-bold leading-none tracking-[-0.04em] text-cart-ink">
            <CountUp to={seconds} format="time" duration={1.8} />
          </div>
          {res.kind === "public" ? (
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-cart-ink">
                {res.entry.displayName}
                {res.entry.crewName ? ` · ${res.entry.crewName}` : ""}
              </span>
              <span className="text-[13px] text-cart-ink-60">
                {res.entry.raceName} · <span className="font-mono">{res.entry.raceDate.replaceAll("-", ".")}</span>
              </span>
            </div>
          ) : (
            <span className="text-[13px] text-cart-ink-60">러너가 기록장 공개를 끈 기록이에요. 티어와 기록만 보여요.</span>
          )}
        </div>
        <p className="text-[12px] leading-relaxed text-cart-ink-40">
          런하우스가 대회 공식 기록과 기록증을 대조해 인증한 기록이에요. 인증번호로 진위를 확인할 수 있어요.
        </p>
        <Link href="/record" className="h-12 inline-flex items-center justify-center rounded-[4px] border border-cart-rule text-[14px] font-semibold text-cart-ink">
          역대 기록장 보기
        </Link>
      </div>
    </RecordShell>
  );
}
