"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { KickerLabel } from "@/components/design/cartographic";
import { CountUp } from "@/components/record/CountUp";
import { TierBadge } from "@/components/record/RecordShell";
import { setHallVisibility } from "@/app/actions/record";
import { TIER_BY_ID, maskName } from "@/lib/record/tier";
import type { OwnerEntry } from "@/lib/types/record";
import { cn } from "@/lib/utils";

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3.5 text-left rounded-[4px] border border-cart-rule bg-cart-paper px-4 py-3.5 disabled:opacity-60"
    >
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-[14px] font-bold text-cart-ink">{label}</span>
        <span className="text-[11px] text-cart-ink-60">{hint}</span>
      </span>
      <span
        className={cn(
          "relative w-11 h-[26px] rounded-full shrink-0 transition-colors duration-base ease-apple",
          checked ? "bg-[hsl(var(--lime))]" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] w-5 h-5 rounded-full transition-[left] duration-base ease-apple",
            checked ? "left-[21px] bg-background" : "left-[3px] bg-cart-ink"
          )}
        />
      </span>
    </button>
  );
}

export function ResultView({
  entry,
  token,
  isNew,
}: {
  entry: OwnerEntry;
  token: string;
  isNew: boolean;
}) {
  const [hallPublic, setHallPublic] = useState(entry.hallPublic);
  const [nameMasked, setNameMasked] = useState(entry.nameMasked);
  const [saving, startSaving] = useTransition();
  const [copied, setCopied] = useState(false);
  const [round, setRound] = useState(0);
  const tier = entry.tier ? TIER_BY_ID[entry.tier] : null;

  const save = (next: { hallPublic: boolean; nameMasked: boolean }) => {
    const prev = { hallPublic, nameMasked };
    setHallPublic(next.hallPublic);
    setNameMasked(next.nameMasked);
    startSaving(async () => {
      const res = await setHallVisibility(entry.id, token, next);
      if (!res.success) {
        setHallPublic(prev.hallPublic);
        setNameMasked(prev.nameMasked);
        toast.error(res.error);
      }
    });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/record/r/${entry.id}?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("내 결과 링크를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 주소창의 링크를 저장해 주세요.");
    }
  };

  const linkCard = (
    <div
      className={cn(
        "rounded-[4px] border px-4 py-3.5 flex items-center gap-3",
        isNew ? "border-[hsl(var(--lime))]/40 bg-[hsl(var(--lime))]/[0.05]" : "border-cart-rule"
      )}
    >
      <span className="flex-1 text-[12px] leading-relaxed text-cart-ink-60">
        이 페이지 링크가 내 인증서 열쇠예요. 저장해 두면 결과 확인과 각인 신청에 다시 쓸 수 있어요.
      </span>
      <button
        type="button"
        onClick={copyLink}
        className="h-11 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-[2px] border border-cart-rule font-mono text-[10px] tracking-[0.12em] text-cart-ink"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );

  if (entry.status === "pending") {
    return (
      <div className="px-[22px] pt-6 flex flex-col gap-5">
        <KickerLabel tone="lime" className="text-[10px]">● PENDING · 검수 중</KickerLabel>
        <h1 className="font-display text-[28px] font-bold leading-tight text-cart-ink">
          {isNew ? "신청이 접수됐어요." : "기록을 확인하고 있어요."}
        </h1>
        <p className="text-[13px] leading-relaxed text-cart-ink-60">
          관리자가 대회 공식 기록과 기록증을 대조한 뒤 승인합니다. 인스타그램을 남겼다면 결과를 DM으로 알려 드려요.
        </p>
        {linkCard}
        <div className="border-t border-cart-rule">
          <Row k="러너" v={entry.runnerName} />
          <Row k="대회" v={`${entry.raceName} · ${entry.raceDate.replaceAll("-", ".")}`} />
          <Row k="예상 티어" v={tier?.label ?? "—"} mono />
        </div>
      </div>
    );
  }

  if (entry.status === "rejected") {
    return (
      <div className="px-[22px] pt-6 flex flex-col gap-5">
        <KickerLabel tone="muted" className="text-[10px]">REJECTED · 반려</KickerLabel>
        <h1 className="font-display text-[28px] font-bold leading-tight text-cart-ink">
          기록을 확인하지 못했어요.
        </h1>
        <p className="text-[13px] leading-relaxed text-cart-ink-60">
          사유: {entry.rejectedReason ?? "기록 확인 불가"}
        </p>
        <Link
          href="/record/verify"
          className="h-12 inline-flex items-center justify-center rounded-[4px] border border-cart-rule text-[14px] font-semibold text-cart-ink"
        >
          다시 신청하기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[22px] pt-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <KickerLabel tone="lime" className="text-[10px]">● VERIFIED · 인증 완료</KickerLabel>
        <span className="font-mono text-[11px] text-cart-ink-60">{entry.certNo}</span>
      </div>

      <div className="flex flex-col gap-3.5 py-6 border-y border-cart-rule">
        <div className="flex items-center gap-2.5">
          {tier && <TierBadge label={tier.label} top={entry.tier === "sub3"} />}
          <KickerLabel tone="muted" className="text-[10px]">FULL · NET TIME</KickerLabel>
        </div>
        <div className="font-mono text-[clamp(56px,18vw,76px)] font-bold leading-none tracking-[-0.04em] text-cart-ink">
          <CountUp key={round} to={entry.seconds} format="time" duration={1.8} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-cart-ink-60 min-w-0 truncate">
            {entry.raceName} · <span className="font-mono">{entry.raceDate.replaceAll("-", ".")}</span>
          </span>
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            aria-label="기록 카운트업 다시 재생"
            className="h-7 px-2.5 shrink-0 inline-flex items-center gap-1 rounded-[2px] border border-cart-rule font-mono text-[10px] tracking-[0.14em] text-cart-ink-60 hover:text-cart-ink transition-colors duration-fast ease-apple"
          >
            <RotateCcw className="w-3 h-3" /> REPLAY
          </button>
        </div>
      </div>

      <div>
        <Row k="러너" v={`${entry.runnerName}${entry.crewName ? ` · ${entry.crewName}` : ""}`} first />
        <Row k="배번" v="비공개 보관" mono muted />
        <Row
          k="검수"
          v={
            entry.verifiedAt
              ? `공식 기록 대조 · ${new Date(entry.verifiedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`
              : "—"
          }
          mono
        />
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          label="역대 기록장에 각인"
          hint={
            hallPublic
              ? `공개 중 · ${nameMasked ? maskName(entry.runnerName) : entry.runnerName} 로 보여요`
              : "비공개 · 나만 볼 수 있어요"
          }
          checked={hallPublic}
          disabled={saving}
          onChange={(v) => save({ hallPublic: v, nameMasked })}
        />
        {hallPublic && (
          <Toggle
            label="이름 가리기"
            hint={nameMasked ? `${maskName(entry.runnerName)} 로 표시` : `${entry.runnerName} 그대로 표시`}
            checked={nameMasked}
            disabled={saving}
            onChange={(v) => save({ hallPublic, nameMasked: v })}
          />
        )}
      </div>

      {linkCard}

      <div className="flex flex-col gap-2.5 pt-1">
        <Link
          href={`/record/shop?id=${entry.id}&token=${token}`}
          className="w-full flex items-center justify-between px-5 h-14 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform duration-fast ease-apple"
        >
          <span className="font-display text-[15px] font-bold">각인 액세서리 보기</span>
          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold tracking-[0.12em]">
            ENGRAVE <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
        <Link
          href="/record/hall"
          className="h-12 inline-flex items-center justify-center rounded-[4px] border border-cart-rule text-[14px] font-semibold text-cart-ink"
        >
          기록장에서 내 기록 보기
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v, mono, first, muted }: { k: string; v: string; mono?: boolean; first?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-3 text-[13px]", !first && "border-t border-cart-rule")}>
      <span className="text-cart-ink-60 shrink-0">{k}</span>
      <span className={cn("text-right", muted ? "text-cart-ink-60" : "text-cart-ink", mono && "font-mono text-[12px]")}>{v}</span>
    </div>
  );
}
