"use client";

import { ReactNode } from "react";
import { NoZoom } from "./NoZoom";

type ClientLayoutProps = {
  children: ReactNode;
};

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      <NoZoom />
      {children}
    </>
  );
}
