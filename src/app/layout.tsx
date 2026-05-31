import type { Metadata, Viewport } from "next";
import { Outfit, Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { DesktopSidePanel } from "@/components/layout/DesktopSidePanel";
import { Toaster } from "@/components/ui/sonner";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Analytics } from "@vercel/analytics/next";
import PostHogProvider from "@/components/analytics/PostHogProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
  weight: ["300", "400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://running-crew-map.vercel.app"),
  title: {
    default: "런하우스 | 전국 러닝크루 지도",
    template: "%s | 러닝크루맵",
  },
  description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
  manifest: "/manifest.json",
  applicationName: "런하우스",
  keywords: ["러닝", "러닝크루", "달리기", "러닝맵", "러닝 커뮤니티"],
  authors: [{ name: "RunningCrewMap" }],
  creator: "RunningCrewMap",
  publisher: "RunningCrewMap",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://running-crew-map.vercel.app",
    title: "런하우스 | 전국 러닝크루 지도",
    description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
    siteName: "런하우스",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "런하우스 대표 이미지",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "런하우스 | 전국 러닝크루 지도",
    description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
    creator: "@runningcrewmap",
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png" },
    ],
    shortcut: ["/favicon-32x32.png"],
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/apple-touch-icon.png", sizes: "72x72", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "114x114", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "kTNCTTBcS4y_iB6NN8sjBN4_4NUWgZM3W7C6080WZZg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "런하우스",
  },
  formatDetection: {
    telephone: true,
  },
  category: "sports",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// viewport 및 themeColor를 별도의 export로 분리 (Next.js 14.2.23 이상 권장사항)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko' className='dark' suppressHydrationWarning>
      <head>
        {/* Perf hints — kick off DNS lookup + TLS handshake for hosts the
            map / tile loads will hit. Saves 100-300ms on the first map
            paint by overlapping these with the HTML/JS download. */}
        <link rel='dns-prefetch' href='https://oapi.map.naver.com' />
        <link rel='preconnect' href='https://oapi.map.naver.com' crossOrigin='anonymous' />
        <link rel='dns-prefetch' href='https://nrbe.map.naver.net' />
        <link rel='preconnect' href='https://nrbe.map.naver.net' crossOrigin='anonymous' />
        <link rel='dns-prefetch' href='https://map.pstatic.net' />
        <link rel='preconnect' href='https://map.pstatic.net' crossOrigin='anonymous' />
      </head>
      <body
        className={`${outfit.variable} ${notoSansKR.variable} ${jetbrainsMono.variable} font-sans bg-background text-foreground md:bg-[hsl(var(--canvas-outer))]`}
        suppressHydrationWarning
      >
        {/* Desktop-only ambient dot pattern. Sits behind the mobile frame so
            the surrounding "desk" feels tactile rather than dead flat. */}
        <div
          aria-hidden
          className='hidden md:block fixed inset-0 pointer-events-none z-0'
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--cart-ink-40)) 1px, transparent 1.2px)",
            backgroundSize: "26px 26px",
            opacity: 0.18,
          }}
        />
        <PostHogProvider>
          <ClientLayout>
            <div className='mx-auto max-w-[430px] min-h-screen bg-background relative md:ring-1 md:ring-[hsl(var(--canvas-outer-rule))] md:shadow-[0_10px_60px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(199,255,0,0.04)] z-10'>
              <Header />
              <main className='w-full'>
                <PageTransition>{children}</PageTransition>
              </main>
              <MobileNav />
            </div>
            {/* Desktop-only side panel — promotional cards parked in the
                right gutter (lg+ viewports). Hides on admin / token-edit
                focus routes via its own pathname check. */}
            <DesktopSidePanel />
            <Toaster />
          </ClientLayout>
        </PostHogProvider>
        {/* Vercel Analytics — 루트 레이아웃에서 전체 앱 커버 */}
        <Analytics />
      </body>
    </html>
  );
}
