import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마라톤 대회 일정 | 런하우스",
  description:
    "전국의 마라톤 대회 일정을 한눈에 확인하세요. 다양한 마라톤 대회 정보를 제공",
  keywords: ["마라톤 대회", "마라톤", "마라톤 대회 일정"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png" },
    ],
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='relative min-h-screen pb-16'>{children}</div>;
}
