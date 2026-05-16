import type { Metadata } from "next";
import Script from "next/script";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";

// Admin pages live inside the same root <html>/<body> as the rest of the
// app (the cartographic dark theme + font stack come from src/app/layout.tsx).
// This file is just a thin wrapper that loads the Naver Maps SDK (admin's
// edit page uses the picker), tells search engines to ignore admin, and
// renders the admin-only bottom nav.
//
// The user-facing Header + MobileNav are hidden on /admin/* routes by
// their own pathname checks (see src/components/layout/Header.tsx and
// MobileNav.tsx). Admin sees only AdminBottomNav.

export const metadata: Metadata = {
  title: "관리자 콘솔 | 런하우스",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID}&submodules=geocoder`}
        strategy='afterInteractive'
      />
      {children}
      <AdminBottomNav />
    </>
  );
}
