import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
// import { EXTERNAL_LINKS } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "러닝 크루 지도",
  description: "다양한 러닝 크루들을 한눈에 확인하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const RUNNING_EVENTS = "http://www.marathon.pe.kr/schedule_index.html";
  return (
    <html lang='ko' suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className='min-h-screen bg-background'>
          <Header />
          <main>{children}</main>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
