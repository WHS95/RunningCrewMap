import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://running-crew-map.vercel.app"),
  title: {
    default: "런하우스 | 전국 러닝크루 지도",
    template: "%s | 러닝크루맵",
  },
  description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
    google: "google-site-verification=YOUR_CODE",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "런하우스",
  },
  formatDetection: {
    telephone: true,
  },
  themeColor: "#ffffff",
  category: "sports",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko' suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className='min-h-screen bg-background'>
          <Header />
          <main>{children}</main>
          <MobileNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
