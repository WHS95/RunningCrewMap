"use client";

import { useCallback } from "react";

interface OutboundLinkProps {
    href: string;
    utmMedium: string;
    utmCampaign?: string;
    className?: string;
    children: React.ReactNode;
}

/**
 * 아웃바운드 링크 컴포넌트 — 클릭 시점에 localStorage rh_anon을 읽어
 * UTM + rh_anon 파라미터를 URL에 추가한 뒤 새 탭으로 이동합니다.
 * 서버 컴포넌트에서 사용할 수 있도록 별도 클라이언트 래퍼로 분리.
 */
export function OutboundLink({
    href,
    utmMedium,
    utmCampaign = "benefit",
    className,
    children,
}: OutboundLinkProps) {
    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            const params = new URLSearchParams({
                utm_source: "map",
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
            });
            try {
                const anon = localStorage.getItem("rh_anon");
                if (anon) params.set("rh_anon", anon);
            } catch {
                // localStorage 접근 불가 시 무시
            }
            window.open(`${href}?${params.toString()}`, "_blank", "noopener,noreferrer");
        },
        [href, utmMedium, utmCampaign]
    );

    return (
        <a
            href={href}
            onClick={handleClick}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
        >
            {children}
        </a>
    );
}
