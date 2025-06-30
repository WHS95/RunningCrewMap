import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CSS_VARIABLES } from "@/lib/constants";

export default function NoticePage() {
  return (
    <div
      className='flex flex-col min-h-screen bg-gray-50'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 헤더 */}
      <div className='p-4 bg-white shadow-sm'>
        <h1 className='text-xl font-bold text-gray-800'>공지사항 및 이벤트</h1>
      </div>

      {/* 이벤트 목록 */}
      <div className='p-4 space-y-4'>
        <h2 className='mb-2 text-lg font-bold text-gray-800'>
          진행 중인 이벤트
        </h2>

        {/* 이벤트 카드 */}
        <Link href='/notice/event/1' className='block'>
          <div className='overflow-hidden bg-white rounded-lg shadow-md transition duration-300 hover:shadow-lg'>
            <div className='relative h-40'>
              <Image
                src='/event5.webp'
                alt='크루 깃발 이벤트'
                fill
                className='object-cover'
              />
            </div>
            <div className='p-4'>
              <h3 className='font-bold text-gray-800'>
                크루 깃발 무료 제작 이벤트
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                보아델와 런하우스가 협업하여 여러분의 러닝 크루를 위한 특별한
                깃발을 무료로 제작해드립니다.
              </p>
              <div className='flex justify-between items-center mt-3'>
                <span className='text-xs font-semibold text-blue-600'>
                  자세히 보기
                </span>
                <span className='text-xs text-gray-500'>진행 중</span>
              </div>
            </div>
          </div>
        </Link>

        {/* 추가 이벤트가 있을 경우 더 추가할 수 있음 */}
      </div>

      {/* 공지사항 섹션 - 추후 공지사항이 생길 경우 추가 */}
      <div className='p-4'>
        <h2 className='mb-2 text-lg font-bold text-gray-800'>공지사항</h2>
        <div className='p-4 text-center text-gray-500 bg-white rounded-lg shadow-sm'>
          등록된 공지사항이 없습니다.
        </div>
      </div>

      {/* 뒤로가기 버튼 */}
      <div className='flex justify-center p-4 mt-auto'>
        <Link
          href='/home'
          className='px-6 py-2 text-gray-800 bg-gray-200 rounded-full transition duration-300 hover:bg-gray-300'
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
