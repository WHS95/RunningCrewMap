"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CSS_VARIABLES } from "@/lib/constants";

interface FormLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function FormLayout({ title, children }: FormLayoutProps) {
  return (
    <div
      className='flex flex-col min-h-screen'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 헤더 */}
      <div className='sticky top-0 flex items-center gap-2 p-2 border-b bg-background'>
        <Link
          href='/menu'
          className='p-2 rounded-full hover:bg-accent'
          title='뒤로가기'
        >
          <ArrowLeft className='w-5 h-5' />
        </Link>
        <h1 className='text-lg font-medium'>{title}</h1>
      </div>

      {/* 컨텐츠 */}
      <div className='flex-1 p-4'>{children}</div>
    </div>
  );
}
