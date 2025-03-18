import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이벤트 | 러닝크루맵",
  description: "러닝크루맵의 다양한 이벤트와 프로모션 정보를 확인하세요.",
};

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
