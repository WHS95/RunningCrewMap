import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공지사항 | 러닝크루맵",
  description: "러닝크루맵의 공지사항과 이벤트 정보를 확인하세요.",
};

export default function NoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
