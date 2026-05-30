"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Calculator } from "lucide-react";
import { CSS_VARIABLES } from "@/lib/constants";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";

interface CalculatorItem {
  title: string;
  en: string;
  path: string;
  description: string;
}

const CALCULATORS: CalculatorItem[] = [
  {
    title: "페이스 계산기",
    en: "PACE",
    path: "/calculator/pace",
    description: "거리·시간으로 페이스 계산",
  },
  {
    title: "완주 시간 예측기",
    en: "FORECAST",
    path: "/calculator/prediction",
    description: "기록을 바탕으로 다른 거리 완주 시간 예측",
  },
  {
    title: "스플릿 타임 계산기",
    en: "SPLIT",
    path: "/calculator/split-time",
    description: "목표 시간을 구간별 스플릿으로 분해",
  },
  {
    title: "심박수 존 계산기",
    en: "HEART RATE",
    path: "/calculator/heart-rate",
    description: "최대 심박수 기반 존(Zone) 계산",
  },
];

export default function CalculatorIndexPage() {
  const router = useRouter();

  return (
    <div
      className='flex flex-col bg-background'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <CartographicHeader
        kicker={`CALCULATORS · ${CALCULATORS.length} ITEMS`}
        title='러닝 계산기'
      />

      <section className='px-[22px]'>
        <KickerLabel tone='lime' className='py-2 tracking-[0.22em]'>
          · 선택해 주세요 · SELECT
        </KickerLabel>
        <div>
          {CALCULATORS.map((item, idx) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex items-center gap-3 w-full py-3.5 text-left transition-transform active:scale-[0.99] ${
                idx === 0 ? "" : "border-t border-cart-rule"
              }`}
            >
              <div className='w-9 h-9 rounded-[4px] bg-cart-paper border border-cart-rule flex items-center justify-center flex-shrink-0'>
                <Calculator
                  className='w-4 h-4 text-[hsl(var(--lime))]'
                  strokeWidth={1.6}
                />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-[14px] font-semibold text-cart-ink'>
                  {item.title}
                </div>
                <KickerLabel tone='muted' className='mt-0.5 tracking-[0.18em]'>
                  · {item.en} · {item.description}
                </KickerLabel>
              </div>
              <ChevronRight className='w-4 h-4 text-cart-ink-40' />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
