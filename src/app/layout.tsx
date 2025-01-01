import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
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
    <html lang='ko'>
      <body className={inter.className}>
        <div className='min-h-screen bg-background'>
          <nav className='border-b'>
            <div className='pl-4 flex h-14 items-center'>
              <Link href='/' className='font-bold'>
                RunHouseMap
              </Link>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
