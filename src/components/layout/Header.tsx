"use client";

import { LAYOUT } from "@/lib/constants";
// import { ChevronLeft } from "lucide-react";
// import { useRouter } from "next/navigation";

export function Header() {
  // const router = useRouter();

  return (
    <nav
      className='fixed top-0 left-0 right-0 z-50 bg-black border-b-0'
      style={{ height: LAYOUT.HEADER_HEIGHT }}
    >
      <div className='flex items-center justify-between h-full px-4'>
        {/* <button onClick={() => router.back()} className='text-white'>
          <ChevronLeft className='w-6 h-6' />
        </button> */}

        <div className='w-6 h-6'></div>
        <a href='/home' className='text-lg font-extrabold text-white'>
          RUN HOUSE CLUB
        </a>

        <div className='w-6 h-6'></div>
      </div>
    </nav>
  );
}
