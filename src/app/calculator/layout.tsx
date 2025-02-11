import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "러너 계산기 | 러너하우스",
  description:
    "러너를 위한 다양한 계산기를 제공합니다. 페이스 계산, 완주 시간 예측, 스플릿 타임 계산, 심박수 존 계산 등 러닝에 필요한 모든 계산을 도와드립니다.",
  keywords: [
    "러닝 계산기",
    "페이스 계산",
    "완주시간 예측",
    "스플릿 타임",
    "심박수 존",
    "러너하우스",
  ],
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='relative min-h-screen pb-16'>{children}</div>;
}
