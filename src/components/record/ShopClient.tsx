"use client";

// 04 각인 키링 상세 + 주문·결제. 배송비 포함 2만 원 · 한정 30개 · NFC 로 내 기록 확인.
// 결제는 Groble 결제창으로 이동한다(ref=주문 id). 완료는 웹훅이 처리하고 /record/paid 가 확인한다.
import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock, Nfc, Truck } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { Engrave3D, type EngraveText } from "@/components/record/Engrave3D";
import { RecordSubHeader } from "@/components/record/RecordShell";
import { createRecordOrder } from "@/app/actions/record";
import { RECORD_LIMIT_QTY, RECORD_PRICE_KRW, SKUS, TIER_BY_ID, TIER_FINISH } from "@/lib/record/tier";
import type { EngravingSnapshot } from "@/lib/types/record";
import { cn } from "@/lib/utils";

const PLACEHOLDER: EngraveText = {
  runnerName: "HONG GIL DONG",
  raceName: "RACE NAME",
  raceDate: "YYYY.MM.DD",
  time: "-:--:--",
  tier: null,
  certNo: "RH-REC-00000",
};

const inputClass =
  "w-full h-11 px-3.5 rounded-[4px] bg-cart-paper border border-cart-rule text-[14px] text-cart-ink placeholder:text-cart-ink-40 outline-none focus:border-[hsl(var(--lime))]/60 transition-colors duration-fast ease-apple";
const labelClass = "text-[12px] font-semibold text-cart-ink";

export const PAID_SESSION_KEY = "rh_record_paid";

export function ShopClient({
  backHref,
  engraving,
  auth,
  pendingEntry,
  remaining,
  paymentReady,
}: {
  backHref: string;
  engraving: EngravingSnapshot | null;
  auth: { id: string; token: string } | null;
  pendingEntry: boolean;
  remaining: number;
  /** GROBLE_PAYMENT_URL 이 설정돼 결제로 넘길 수 있는지 */
  paymentReady: boolean;
}) {
  const sku = SKUS[0];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [detail, setDetail] = useState("");
  const [request, setRequest] = useState("");
  const [instagram, setInstagram] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const verified = !!engraving && !!auth;
  const soldOut = remaining <= 0;
  const text: EngraveText = engraving ?? PLACEHOLDER;
  const finish = engraving ? TIER_FINISH[engraving.tier] : "acrylic";

  const submit = () => {
    if (!auth) return;
    setError(null);
    startTransition(async () => {
      const res = await createRecordOrder({
        id: auth.id,
        token: auth.token,
        sku: sku.id,
        buyerName: name,
        buyerPhone: phone,
        postcode,
        address,
        addressDetail: detail,
        deliveryRequest: request,
        contactInstagram: instagram,
        consent,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      if (!res.paymentUrl) {
        setError("결제 준비 중이에요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      // 결제 후 이동 페이지(/record/paid)가 어느 주문인지 알 수 있게 남겨 둔다.
      try {
        sessionStorage.setItem(
          PAID_SESSION_KEY,
          JSON.stringify({ orderId: res.orderId, entryId: auth.id, token: auth.token })
        );
      } catch {
        // 비공개 모드 등 — /record/paid 가 "내 결과 링크" 안내로 대신한다.
      }
      window.location.href = res.paymentUrl;
    });
  };

  return (
    <div>
      <RecordSubHeader title={sku.label} backHref={backHref} meta="RECORD · LABS" />
      <div className="border-b border-cart-rule">
        <Engrave3D sku={sku.id} finish={finish} text={text} height={300} />
      </div>

      <div className="px-[22px] pt-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-cart-ink-60">{sku.desc}</span>
            <span className="flex items-center gap-2 text-[11px] text-cart-ink-40">
              <Truck className="w-3.5 h-3.5" /> 배송비 포함 · 결제 후 14일 내 발송
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-mono text-[20px] font-bold text-[hsl(var(--lime))] tabular-nums">
              {RECORD_PRICE_KRW.toLocaleString("ko-KR")}원
            </span>
            <span
              className={cn(
                "font-mono text-[10px] tracking-[0.12em]",
                soldOut ? "text-cart-ink-40" : "text-cart-ink-60"
              )}
            >
              {soldOut ? "SOLD OUT" : `LIMITED · ${remaining} / ${RECORD_LIMIT_QTY}`}
            </span>
          </div>
        </div>

        <div className="rounded-[4px] border border-cart-rule bg-cart-paper px-4 py-3.5 flex items-start gap-3">
          <Nfc className="w-5 h-5 text-[hsl(var(--lime))] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-bold text-cart-ink">NFC 내장 · 폰을 대면 내 기록이 열려요</span>
            <span className="text-[11px] leading-relaxed text-cart-ink-60">
              키링 뒷면에 폰을 가까이 대면 인증번호로 연결된 기록 페이지가 바로 열려요. 앱 설치는 필요 없어요.
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between pb-2">
            <KickerLabel tone="muted">각인 문구 · 인증 데이터 자동 입력</KickerLabel>
            <Lock className="w-3.5 h-3.5 text-cart-ink-40" aria-label="수정 불가" />
          </div>
          <EngraveRow k="티어" v={text.tier ? TIER_BY_ID[text.tier].label : "TIER"} mono />
          <EngraveRow k="기록" v={text.time} mono />
          <EngraveRow k="이름" v={text.runnerName} />
          <EngraveRow k="인증번호" v={text.certNo} mono />
        </div>

        {verified && !soldOut && (
          <form
            className="flex flex-col gap-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <KickerLabel tone="lime" className="text-[10px]">● 배송 정보</KickerLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <Field id="buyerName" label="받는 분 *">
                <input id="buyerName" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} autoComplete="name" placeholder="성함" className={inputClass} />
              </Field>
              <Field id="buyerPhone" label="연락처 *">
                <input id="buyerPhone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, ""))} required inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" className={cn(inputClass, "font-mono")} />
              </Field>
            </div>
            <div className="grid grid-cols-[96px_1fr] gap-2.5">
              <Field id="postcode" label="우편번호">
                <input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" autoComplete="postal-code" placeholder="00000" className={cn(inputClass, "font-mono")} />
              </Field>
              <Field id="address" label="주소 *">
                <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={200} autoComplete="street-address" placeholder="도로명 주소" className={inputClass} />
              </Field>
            </div>
            <Field id="addressDetail" label="상세 주소">
              <input id="addressDetail" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={100} placeholder="동 · 호수" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field id="request" label="배송 요청">
                <input id="request" value={request} onChange={(e) => setRequest(e.target.value)} maxLength={100} placeholder="문 앞" className={inputClass} />
              </Field>
              <Field id="instagram" label="인스타그램">
                <input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={40} autoCapitalize="none" placeholder="@아이디 (선택)" className={inputClass} />
              </Field>
            </div>

            <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-cart-ink-60 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-[18px] h-[18px] accent-[hsl(var(--lime))]" />
              <span>배송을 위해 이름·연락처·주소를 수집·이용하는 데 동의합니다. 결제는 그로블 결제창에서 진행되고, 배송 완료 후 30일 뒤 삭제해요.</span>
            </label>

            {error && (
              <p role="alert" className="text-[13px] text-[#FF9A6B]">{error}</p>
            )}

            <div className="flex items-center justify-between py-3 border-t border-cart-rule">
              <span className="text-[13px] text-cart-ink-60">결제 금액 · 배송비 포함</span>
              <span className="font-mono text-[18px] font-bold text-cart-ink tabular-nums">{RECORD_PRICE_KRW.toLocaleString("ko-KR")}원</span>
            </div>
            <button
              type="submit"
              disabled={pending || !paymentReady}
              className="h-14 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[15px] font-bold active:scale-[0.98] transition-transform duration-fast ease-apple disabled:opacity-60"
            >
              {pending ? "결제창으로 이동 중…" : paymentReady ? "결제하고 각인 주문하기" : "결제 준비 중"}
            </button>
            <p className="text-[11px] leading-relaxed text-cart-ink-40">
              결제는 그로블(앱카드 · 카카오페이 · 네이버페이)에서 진행돼요. 결제 후 7일 안에 취소를 요청할 수 있어요. 제작에 들어간 뒤에는 각인 문구를 바꿀 수 없어요.
            </p>
          </form>
        )}

        {verified && soldOut && (
          <div className="rounded-[4px] border border-cart-rule px-4 py-4 flex flex-col gap-1">
            <span className="text-[14px] font-bold text-cart-ink">한정 수량 30개가 모두 소진됐어요</span>
            <span className="text-[12px] leading-relaxed text-cart-ink-60">다음 제작 소식은 인스타그램에서 알려 드릴게요.</span>
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
                ? "기록 검수가 끝나면 이 링크에서 바로 주문할 수 있어요."
                : "인증을 마치면 받는 내 결과 링크로만 주문할 수 있어요."}
            </span>
            {!pendingEntry && (
              <Link href="/record/verify" className="h-12 inline-flex items-center justify-center rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] text-[14px] font-bold">
                내 기록 인증하기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
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
