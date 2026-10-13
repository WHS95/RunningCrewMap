"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { Engrave3D, type EngraveText } from "@/components/record/Engrave3D";
import { RecordSubHeader } from "@/components/record/RecordShell";
import { createRecordOrder } from "@/app/actions/record";
import {
  SKUS,
  TIER_BY_ID,
  TIER_FINISH,
  type RecordSku,
} from "@/lib/record/tier";
import type { EngravingSnapshot } from "@/lib/types/record";
import { cn } from "@/lib/utils";

const PLACEHOLDER: EngraveText = {
  runnerName: "인증 후 자동 입력",
  raceName: "RACE NAME",
  raceDate: "YYYY.MM.DD",
  time: "-:--:--",
  tier: null,
  certNo: "RH-REC-00000",
};

export function ShopClient({
  backHref,
  engraving,
  auth,
  pendingEntry,
}: {
  backHref: string;
  engraving: EngravingSnapshot | null;
  auth: { id: string; token: string } | null;
  pendingEntry: boolean;
}) {
  const [sku, setSku] = useState<RecordSku>("tag");
  const [instagram, setInstagram] = useState("");
  const [memo, setMemo] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const verified = !!engraving && !!auth;
  const text: EngraveText = engraving ?? PLACEHOLDER;
  const finish = engraving ? TIER_FINISH[engraving.tier] : "steel";
  const cur = SKUS.find((s) => s.id === sku) ?? SKUS[0];

  const submit = () => {
    if (!auth) return;
    setError(null);
    startTransition(async () => {
      const res = await createRecordOrder({
        id: auth.id,
        token: auth.token,
        sku,
        contactInstagram: instagram,
        memo,
        consent,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  };

  return (
    <div>
      <RecordSubHeader title={cur.label} backHref={backHref} meta="RECORD · LABS" />
      <div className="border-b border-cart-rule">
        <Engrave3D sku={sku} finish={finish} text={text} height={300} />
      </div>

      <div className="px-[22px] pt-4 flex flex-col gap-4">
        <div role="radiogroup" aria-label="상품 선택" className="flex flex-wrap gap-1.5">
          {SKUS.map((s) => {
            const on = s.id === sku;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSku(s.id)}
                className={cn(
                  "h-9 px-3 rounded-[2px] border font-mono text-[11px] tracking-[0.08em] transition-colors duration-fast ease-apple",
                  on ? "bg-cart-ink text-background border-cart-ink" : "border-cart-rule text-cart-ink-60"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-cart-ink-60">{cur.desc}</span>
          <span className="font-mono text-[13px] font-bold text-[hsl(var(--lime))]">가격 · DM 안내</span>
        </div>

        <div>
          <div className="flex items-center justify-between pb-2">
            <KickerLabel tone="muted">각인 문구 · 인증 데이터 자동 입력</KickerLabel>
            <Lock className="w-3.5 h-3.5 text-cart-ink-40" aria-label="수정 불가" />
          </div>
          <EngraveRow k="이름" v={text.runnerName} />
          <EngraveRow k="대회" v={`${text.raceName} · ${text.raceDate}`} mono />
          <EngraveRow k="기록" v={`${text.time} · ${text.tier ? TIER_BY_ID[text.tier].label : "TIER"}`} mono />
          <EngraveRow k="인증번호" v={text.certNo} mono />
          <EngraveRow
            k="마감"
            v={engraving ? `${TIER_BY_ID[engraving.tier].finish} (${TIER_BY_ID[engraving.tier].label} 전용)` : "티어별 자동 지정 · 미리보기는 스틸"}
          />
        </div>

        {verified && !done && (
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactInstagram" className="text-[12px] font-semibold text-cart-ink">
                연락받을 인스타그램 *
              </label>
              <input
                id="contactInstagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@아이디"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full h-11 px-3.5 rounded-[4px] bg-cart-paper border border-cart-rule text-[14px] text-cart-ink placeholder:text-cart-ink-40 outline-none focus:border-[hsl(var(--lime))]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="memo" className="text-[12px] font-semibold text-cart-ink">
                요청 사항
              </label>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="선택"
                className="w-full px-3.5 py-2.5 rounded-[4px] bg-cart-paper border border-cart-rule text-[14px] text-cart-ink placeholder:text-cart-ink-40 outline-none focus:border-[hsl(var(--lime))]/60 resize-none"
              />
            </div>
            <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-cart-ink-60 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-[18px] h-[18px] accent-[hsl(var(--lime))]"
              />
              <span>
                주문 안내를 위해 인스타그램 아이디와 요청 사항을 수집·이용하는 데 동의합니다. 결제와 배송 정보는 DM으로 따로 받습니다.
              </span>
            </label>
            {error && (
              <p role="alert" className="text-[13px] text-[#FF9A6B]">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-14 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[15px] font-bold active:scale-[0.98] transition-transform duration-fast ease-apple disabled:opacity-60"
            >
              {pending ? "신청 보내는 중…" : `${cur.label} 각인 신청하기`}
            </button>
            <p className="text-[11px] leading-relaxed text-cart-ink-40">
              지금은 주문 신청만 받아요. 확인 후 가격·결제·제작 일정을 DM으로 안내드립니다.
            </p>
          </div>
        )}

        {verified && done && (
          <div className="rounded-[4px] border border-[hsl(var(--lime))]/40 bg-[hsl(var(--lime))]/[0.05] px-4 py-4 flex flex-col gap-1">
            <span className="text-[14px] font-bold text-cart-ink">각인 신청이 접수됐어요.</span>
            <span className="text-[12px] leading-relaxed text-cart-ink-60">
              입력한 인스타그램으로 가격·결제·제작 일정을 안내드릴게요.
            </span>
          </div>
        )}

        {!verified && (
          <div className="rounded-[4px] border border-cart-rule px-4 py-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[hsl(var(--lime))]" />
              <span className="text-[14px] font-bold text-cart-ink">SUB-5 이내 인증 러너 전용</span>
            </div>
            <span className="text-[12px] leading-relaxed text-cart-ink-60">
              {pendingEntry
                ? "기록 검수가 끝나면 이 링크에서 바로 신청할 수 있어요."
                : "인증을 마치면 받는 내 결과 링크로만 신청할 수 있어요."}
            </span>
            {!pendingEntry && (
              <Link
                href="/record/verify"
                className="h-12 inline-flex items-center justify-center rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] text-[14px] font-bold"
              >
                내 기록 인증하기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EngraveRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-t border-cart-rule text-[13px]">
      <span className="w-16 shrink-0 text-cart-ink-60">{k}</span>
      <span className={cn("flex-1 text-cart-ink truncate", mono && "font-mono text-[12px]")}>{v}</span>
    </div>
  );
}
