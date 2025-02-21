import type { Metadata } from "next";
import { Racing_Sans_One } from "next/font/google";

const racingSansOne = Racing_Sans_One({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "러닝 인증샷 만들기 | 런하우스",
  description:
    "러닝 기록을 이미지로 만들어보세요. 거리, 시간, 페이스, 칼로리, 고도, 심박수, 케이던스 등 다양한 정보를 이미지에 표시할 수 있습니다.",
  keywords: ["러닝", "인증샷", "러닝 기록", "러닝 데이터", "런하우스"],
};

export default function CertificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`relative min-h-screen pb-16 ${racingSansOne.className}`}>
      {children}
    </div>
  );
}
