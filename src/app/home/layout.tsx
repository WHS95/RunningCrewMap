import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "홈 | 런하우스",
  description:
    "러닝 크루의 소식과 공지사항을 확인하세요. 러너들을 위한 최신 정보와 업데이트를 제공합니다.",
  keywords: ["러닝", "러닝크루", "달리기", "러너", "런하우스", "공지사항"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png" },
    ],
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='relative pb-16 min-h-screen'>
      {children}
      <Analytics />
    </div>
  );
}
