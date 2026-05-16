import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "크루 정보 수정 | 런하우스",
  description: "내 크루 정보 수정",
  robots: { index: false, follow: false },
};

export default function CrewEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='relative min-h-screen pb-16'>
      {/* Naver Maps SDK — required by <CrewLocationPickerMap>. */}
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID}&submodules=geocoder`}
        strategy='beforeInteractive'
      />
      {children}
    </div>
  );
}
