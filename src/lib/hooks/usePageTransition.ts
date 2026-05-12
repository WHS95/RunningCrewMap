"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function usePageTransition() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  return { navigate };
}
