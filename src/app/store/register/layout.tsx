import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "매장 등록 | 런하우스",
  description: "런하우스 러닝 인증 매장 등록",
  keywords: ["러닝매장", "런하우스", "매장등록"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png" },
    ],
  },
};

export default function StoreRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen pb-16">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID}&submodules=geocoder`}
        strategy="beforeInteractive"
      />
      {children}
    </div>
  );
}
