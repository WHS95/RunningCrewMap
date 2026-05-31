"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

// 페이지 전환 시 pageview 이벤트를 수동으로 캡처하는 내부 컴포넌트
function PostHogPageView() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (process.env.NODE_ENV === "development") return;
        if (!pathname) return;
        let url = window.origin + pathname;
        const qs = searchParams?.toString();
        if (qs) url = `${url}?${qs}`;
        posthog.capture("$pageview", { $current_url: url });
    }, [pathname, searchParams]);

    return null;
}

// 루트 레이아웃에서 children을 감싸는 메인 프로바이더
export default function PostHogProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") return;
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (!key) return;
        if (posthog.__loaded) return;

        posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest",
            ui_host: "https://us.posthog.com",
            defaults: "2026-01-30",
            capture_pageview: false,
            capture_pageleave: true,
            person_profiles: "identified_only",
            loaded: (ph) => {
                // 앱 식별자 글로벌 등록
                ph.register({ app_name: "runningcrewmap" });

                // rh_anon: 이 앱이 소스 — 익명 ID를 생성·지속해 크로스앱 연결에 활용
                try {
                    let anon = localStorage.getItem("rh_anon");
                    const urlAnon = new URLSearchParams(window.location.search).get("rh_anon");
                    if (urlAnon) anon = urlAnon;
                    if (!anon) {
                        anon = crypto.randomUUID();
                    }
                    localStorage.setItem("rh_anon", anon);
                    ph.register({ rh_anon: anon });
                } catch {
                    // localStorage 접근 불가 시 무시 (Safari 개인정보 보호 모드 등)
                }
            },
        });
    }, []);

    return (
        <PHProvider client={posthog}>
            <Suspense fallback={null}>
                <PostHogPageView />
            </Suspense>
            {children}
        </PHProvider>
    );
}
