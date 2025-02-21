import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "등록 | 런하우스",
  description: "런하우스 크루 등록",
  keywords: ["러닝크루", "런하우스", "크루등록"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png" },
    ],
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='relative min-h-screen pb-16'>{children}</div>;
}
