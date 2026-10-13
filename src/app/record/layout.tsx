// src/app/record/layout.tsx
import type { Metadata } from "next";

// 1차 운영은 비노출 개발 링크로만 공유한다 — 검색 노출·사이트맵·메뉴·aside 모두 제외.
// 진짜 홈 진입점은 운영 결과를 검토한 뒤 2차에 붙인다.
export const metadata: Metadata = {
  title: "역대 기록장 — 런하우스",
  description: "서브3 · 싱글 · 서브4 · 서브5 인증 러너의 기록을 각인합니다.",
  robots: { index: false, follow: false },
};

export default function RecordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
