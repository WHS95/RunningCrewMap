import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대회 일정 | 런하우스",
  description:
    "전국의 러닝 대회 일정을 한눈에 확인하세요. 마라톤, 하프마라톤, 10K, 5K 등 다양한 러닝 대회 정보를 제공합니다.",
  keywords: [
    "러닝 대회",
    "마라톤",
    "하프마라톤",
    "10K",
    "5K",
    "러닝 이벤트",
    "런하우스",
  ],
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='relative min-h-screen pb-16'>{children}</div>;
}
