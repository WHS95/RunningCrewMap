// src/app/league/page.tsx — 런하우스 리그 앱 소개 (스크롤 인터랙티브)
//
// 홈 왼쪽 거터 카드(DesktopLeaguePanel)에서 들어온다.
// 연출은 클라이언트 컴포넌트 LeagueIntro 에 있고, 여기서는 메타데이터만 둔다.
import type { Metadata } from "next";
import { LeagueIntro } from "@/components/league/intro/LeagueIntro";

const title = "런하우스 리그 | 러닝 크루 리그";
const description =
  "혼자 달린 기록이 크루의 점수가 돼요. 러닝 기록은 기본, 달린 만큼 우리 크루 리그 점수가 쌓이고 크루끼리 순위를 겨루는 앱이에요.";
const image = { url: "/league/intro-og.png", width: 1200, height: 630, alt: "런하우스 리그 — 혼자 달린 기록이 크루의 점수가 돼요" };

export const metadata: Metadata = {
  // 루트 title.template(「| 러닝크루맵」)을 붙이지 않는다.
  title: { absolute: title },
  description,
  alternates: { canonical: "/league" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "런하우스 리그",
    url: "/league",
    title,
    description,
    images: [image],
  },
  twitter: { card: "summary_large_image", title, description, images: [image.url] },
};

export default function LeaguePage() {
  return <LeagueIntro />;
}
