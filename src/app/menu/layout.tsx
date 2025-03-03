import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "메뉴 | 런하우스",
  description:
    "런하우스의 다양한 기능을 이용해보세요. 크루 등록, 문의하기, 러너 계산기 등 러닝과 관련된 모든 기능을 제공합니다.",
  keywords: [
    "러닝크루",
    "런하우스",
    "크루등록",
    "러닝 계산기",
    "러닝 커뮤니티",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png" },
    ],
  },
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='relative min-h-screen pb-16'>{children}</div>;
}
