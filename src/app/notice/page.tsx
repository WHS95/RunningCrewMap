import React from "react";
import Link from "next/link";
import { CSS_VARIABLES } from "@/lib/constants";

export default function NoticePage() {
  return (
    <div
      className='flex flex-col min-h-screen bg-background'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 헤더 */}
      <div className='p-4 bg-cart-paper border border-cart-rule'>
        <h1 className='text-xl font-bold text-cart-ink'>공지사항 및 이벤트</h1>
      </div>

      {/* 이벤트 목록 */}
      <div className='p-4 space-y-4'>
        <h2 className='mb-2 text-lg font-bold text-cart-ink'>
          진행 중인 이벤트
        </h2>

        {/* 추가 이벤트가 있을 경우 더 추가할 수 있음 */}
      </div>

      {/* 공지사항 섹션 - 추후 공지사항이 생길 경우 추가 */}
      <div className='p-4'>
        <h2 className='mb-2 text-lg font-bold text-cart-ink'>공지사항</h2>
        <div className='p-4 text-center text-cart-ink-60 bg-cart-paper rounded-[4px] border border-cart-rule'>
          등록된 공지사항이 없습니다.
        </div>
      </div>

      {/* 뒤로가기 버튼 */}
      <div className='flex justify-center p-4 mt-auto'>
        <Link
          href='/home'
          className='px-6 py-2 text-cart-ink bg-cart-paper rounded-full transition duration-300 hover:bg-gray-300'
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
