import withSerwist from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        // SSO 토큰이 리다이렉트 URL 쿼리에 포함되므로 Referer 헤더로 유출되지 않도록 차단
        source: "/sso/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  async rewrites() {
    return [
      // PostHog 인제스트 역방향 프록시 — 광고 차단기 우회
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts", "@radix-ui/react-dialog", "@radix-ui/react-select", "framer-motion"],
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
  images: {
    // Vercel Image Optimization 전체 비활성화 — Hobby 무료 한도(5K Transformations/월)
    // 초과로 402 Payment Required가 발생해 이미지 로드 자체가 실패하던 사고 대응.
    // 모든 next/image 요청은 원본 URL로 직접 서비스(Supabase 등 자체 CDN 통과).
    // 업로드 파이프라인에서 이미 webp 변환 + 256px 썸네일 사전 생성을 마쳤으므로
    // 런타임 변환 의존성이 없다. Pro 플랜 전환 시 unoptimized:false로 복귀 가능.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [40, 64, 128, 256],
    minimumCacheTTL: 2678400,
  },
};

export default withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
