import type { Metadata, Viewport } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "관리자 로그인 | Running Crew Map",
  description: "런닝크루맵 관리자 페이지 로그인",
};

// Next.js 14에서는 viewport 및 themeColor를 별도의 viewport export로 이동해야 합니다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

interface LoginLayoutProps {
  children: React.ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  return <>{children}</>;
}
