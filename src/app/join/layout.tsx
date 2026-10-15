// src/app/join/layout.tsx — 런하우스 리그 앱 크루 초대 안내
import type { Metadata } from "next";

// 초대 링크는 메신저로만 오가는 개인 링크 — 검색 노출·사이트맵·메뉴에서 뺀다.
// robots.txt 로 막지 않는 건 카카오톡 등 링크 미리보기 크롤러가 OG 를 읽어야 해서다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
