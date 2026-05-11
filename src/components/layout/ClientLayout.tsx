"use client";

import { ReactNode } from "react";
import { NoZoom } from "./NoZoom";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { PullToRefreshIndicator } from "@/components/pwa/PullToRefreshIndicator";

type ClientLayoutProps = {
  children: ReactNode;
};

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      <NoZoom />
      <InstallPrompt />
      <OfflineBanner />
      <PullToRefreshIndicator />
      {children}
    </>
  );
}
