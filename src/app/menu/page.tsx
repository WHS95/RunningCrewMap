"use client";

import { PlusCircle, MessageCircle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { CSS_VARIABLES } from "@/lib/constants";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";

interface MenuLinkRow {
  title: string;
  en: string;
  path: string;
  isExternal?: boolean;
  href?: string;
}

const PRIMARY_LINKS: MenuLinkRow[] = [
  { title: "크루 등록", en: "REGISTER", path: "/register" },
  {
    title: "문의 및 건의",
    en: "CONTACT",
    path: "https://open.kakao.com/me/runhouse",
    isExternal: true,
  },
];

const CALCULATOR_LINKS: MenuLinkRow[] = [
  { title: "스플릿 타임 계산기", en: "SPLIT", path: "/calculator/split-time" },
  { title: "완주 시간 예측기", en: "FORECAST", path: "/calculator/prediction" },
  { title: "심박수 존 계산기", en: "HEART RATE", path: "/calculator/heart-rate" },
  { title: "페이스 계산기", en: "PACE", path: "/calculator/pace" },
];

export default function MenuPage() {
  const router = useRouter();

  const handleClick = (item: MenuLinkRow) => {
    if (item.isExternal) {
      window.open(item.path, "_blank");
    } else {
      router.push(item.path);
    }
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <CartographicHeader
        kicker={`MENU · ${PRIMARY_LINKS.length + CALCULATOR_LINKS.length} ITEMS`}
        title="메뉴"
      />

      {/* Primary actions */}
      <section className="px-[22px]">
        <KickerLabel tone="muted" className="py-2 tracking-[0.18em]">
          ACTIONS
        </KickerLabel>
        <div>
          {PRIMARY_LINKS.map((item, idx) => (
            <button
              key={item.path}
              onClick={() => handleClick(item)}
              className={`flex items-center gap-3 w-full py-3.5 text-left transition-transform active:scale-[0.99] ${
                idx === 0 ? "" : "border-t border-cart-rule"
              }`}
            >
              <div className="w-9 h-9 rounded-[4px] bg-cart-paper border border-cart-rule flex items-center justify-center flex-shrink-0">
                {item.en === "REGISTER" ? (
                  <PlusCircle className="w-4 h-4 text-[hsl(var(--lime))]" strokeWidth={1.6} />
                ) : (
                  <MessageCircle className="w-4 h-4 text-[hsl(var(--lime))]" strokeWidth={1.6} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-cart-ink">
                  {item.title}
                </div>
                <KickerLabel tone="muted" className="mt-0.5 tracking-[0.18em]">
                  · {item.en}
                </KickerLabel>
              </div>
              <ChevronRight className="w-4 h-4 text-cart-ink-40" />
            </button>
          ))}
        </div>
      </section>

      {/* Calculators */}
      <section className="px-[22px] mt-7">
        <KickerLabel tone="lime" className="py-2 tracking-[0.22em]">
          · 러닝 계산기 · CALCULATORS
        </KickerLabel>
        <div>
          {CALCULATOR_LINKS.map((item, idx) => (
            <button
              key={item.path}
              onClick={() => handleClick(item)}
              className={`flex items-center gap-3 w-full py-3.5 text-left transition-transform active:scale-[0.99] ${
                idx === 0 ? "" : "border-t border-cart-rule"
              }`}
            >
              <div className="w-8 font-mono text-[10px] tracking-[0.05em] text-cart-ink-60 tabular-nums">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-cart-ink">
                  {item.title}
                </div>
              </div>
              <span className="font-mono text-[9px] tracking-[0.18em] text-[hsl(var(--lime))] font-semibold">
                {item.en}
              </span>
              <ChevronRight className="w-4 h-4 text-cart-ink-40" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
