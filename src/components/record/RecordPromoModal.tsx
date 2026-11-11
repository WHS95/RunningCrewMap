"use client";

/**
 * RecordPromoModal — 홈 첫 진입 시 뜨는 기록 각인 키링 한정판 팝업 (야놀자식 '다시 보지 않기 | 닫기').
 * NEXT_PUBLIC_RECORD_PROMO=on 일 때만 마운트한다(1차 비노출 방침 → 공개 전환은 env 하나로).
 * '다시 보지 않기'는 7일, '닫기'는 세션 동안만 숨긴다.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nfc } from "lucide-react";
import { RECORD_LIMIT_QTY, RECORD_PRICE_KRW } from "@/lib/record/tier";
import { KEYRING_CLIP, KEYRING_H, KEYRING_W, KeyringArt, KeyringRing } from "@/components/record/KeyringArt";

const HIDE_KEY = "rh_record_promo_hide_until";
const SESSION_KEY = "rh_record_promo_closed";
const HIDE_DAYS = 7;

export function RecordPromoModal({ remaining }: { remaining: number }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(HIDE_KEY) ?? 0);
      if (until > Date.now()) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // 스토리지 접근 불가여도 팝업은 보여 준다
    }
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const close = (forDays?: number) => {
    try {
      if (forDays) localStorage.setItem(HIDE_KEY, String(Date.now() + forDays * 86400000));
      else sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // 무시
    }
    setOpen(false);
  };

  const soldOut = remaining <= 0;

  // PageTransition(framer-motion)이 transform 을 걸어 fixed 가 그 안에 갇힌다 → body 로 포털.
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-promo-title"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <button type="button" aria-label="닫기" onClick={() => close()} className="absolute inset-0 bg-black/70" />
          <motion.div
            className="relative w-full max-w-[360px] rounded-[6px] overflow-hidden border border-cart-rule bg-[#0B0C0A] text-cart-ink"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* 포스터 */}
            <div className="relative px-6 pt-6 pb-5 flex flex-col gap-3 overflow-hidden">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: "radial-gradient(rgba(242,242,238,.9) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
              />
              <div className="relative flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-[hsl(var(--lime))]">● RECORD · LIMITED</span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-cart-ink-40">{soldOut ? "SOLD OUT" : `${remaining} / ${RECORD_LIMIT_QTY}`}</span>
              </div>
              <h2 id="record-promo-title" className="relative text-[30px] leading-[1.1] font-black tracking-[-0.03em]">
                내 기록을
                <br />
                키링에 새긴다
              </h2>
              <p className="relative text-[13px] leading-relaxed text-cart-ink-60">
                서브3 · 싱글 · 서브4 · 서브5 인증 러너만.
                <br />
                이름 · 기록 · 티어를 각인한 아크릴 키링.
              </p>

              {/* 키링 미니 목업 — 실제 제품 아트 */}
              <div className="relative mx-auto mt-1" style={{ width: 230, height: 150 }}>
                <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${230 / KEYRING_W}) rotate(-2deg)`, width: KEYRING_W, height: KEYRING_H }}>
                  <div className="relative" style={{ width: KEYRING_W, height: KEYRING_H, clipPath: KEYRING_CLIP, background: "rgba(214,222,226,.42)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)" }}>
                    <KeyringArt side="front" tier="SUB-3" time="02:58:36" name="HONG GIL DONG" bg="#0B0C0A" />
                  </div>
                  <KeyringRing side="front" />
                </div>
              </div>

              <div className="relative flex items-center justify-between pt-2">
                <span className="flex items-center gap-1.5 text-[11px] text-cart-ink-60">
                  <Nfc className="w-3.5 h-3.5 text-[hsl(var(--lime))]" /> NFC · 폰을 대면 내 기록
                </span>
                <span className="font-mono text-[16px] font-bold text-[hsl(var(--lime))] tabular-nums">
                  {RECORD_PRICE_KRW.toLocaleString("ko-KR")}원 <span className="text-[10px] text-cart-ink-60 font-normal">배송비 포함</span>
                </span>
              </div>
            </div>

            <Link
              href="/record"
              onClick={() => close()}
              className="flex items-center justify-center h-[52px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] text-[15px] font-extrabold"
            >
              {soldOut ? "역대 기록장 보기 ›" : "내 기록 인증하고 주문하기 ›"}
            </Link>
            <div className="grid grid-cols-2 divide-x divide-cart-rule border-t border-cart-rule bg-[#0B0C0A]">
              <button type="button" onClick={() => close(HIDE_DAYS)} className="h-12 text-[13px] text-cart-ink-60">
                다시 보지 않기
              </button>
              <button type="button" onClick={() => close()} className="h-12 text-[13px] text-cart-ink">
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
