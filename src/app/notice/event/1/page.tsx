import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CSS_VARIABLES } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "크루 깃발 무료 제작 이벤트 | 러닝크루맵",
  description:
    "바모스 데포르테와 런하우스가 협업하여 여러분의 러닝 크루를 위한 특별한 깃발을 무료로 제작해드립니다.",
  openGraph: {
    title: "크루 깃발 무료 제작",
    description:
      "바모스 데포르테와 런하우스가 협업하여 여러분의 러닝 크루를 위한 특별한 깃발을 무료로 제작해드립니다.",
    images: [
      {
        url: "/event5.webp",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function EventPage() {
  return (
    <div
      className='flex flex-col min-h-screen bg-[#f5f5f7]'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 이벤트 헤더 - 더 작고 심플하게 */}
      <div className='relative w-full h-40 shadow-sm'>
        <Image
          src='/event5.webp'
          alt='크루 깃발 이벤트'
          fill
          priority
          className='object-cover'
        />
      </div>

      {/* 이벤트 내용 - 더 컴팩트하게 */}
      <div className='flex flex-col px-4 -mt-4 bg-white shadow-sm rounded-t-3xl'>
        {/* 메인 타이틀 */}
        <div className='py-6 space-y-3 border-b border-gray-100'>
          <p className='text-sm text-center text-gray-600'>
            바모스 데포르테와 런하우스가 협업하여
            <br />
            <span className='font-medium text-blue-500'>
              여러분의 러닝 크루를 위한 특별한 깃발
            </span>
            <br />
            ✨무료 제작 해드립니다.
          </p>
          <p className='text-xs text-center text-gray-500'>
            여러분의 크루가 더욱 빛날 수 있도록,
            <br />
            지금 바로 함께하세요!
          </p>
        </div>

        {/* 깃발 스펙 */}
        <div className='py-4 space-y-2 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>🏁</span> 깃발스펙
          </h3>
          <ul className='ml-6 space-y-1 text-sm text-gray-700'>
            <li>• 크루 깃발 사이즈 1000x600</li>
            <li>• 깃발 하단에 런하우스, 바모스 데포르테 로고 포함</li>
          </ul>

          {/* 이미지 - 더 작게 */}
          <div className='relative w-full h-48 mt-2 overflow-hidden rounded-xl'>
            <Image
              src='/example.webp'
              alt='크루 깃발 예시'
              fill
              className='object-contain'
            />
          </div>
        </div>

        {/* 비용 */}
        <div className='py-4 space-y-1 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>✅</span> 비용
          </h3>
          <p className='ml-6 text-sm text-gray-700'>
            배송비 3,000원 (도서산간 추가비용)
          </p>
        </div>

        {/* 신청 조건 */}
        <div className='py-4 space-y-1 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>🏃‍♂️</span> 신청 조건
          </h3>
          <p className='ml-6 text-sm text-gray-700'>크루 활동 인원 5인 이상</p>
        </div>

        {/* 신청방법 - iOS 스타일 버튼으로 */}
        <div className='py-4 space-y-4'>
          <h3 className='text-base font-medium text-gray-900'>🤝 신청방법</h3>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-sm font-medium text-gray-800'>1) 크루 등록</p>
              <Link
                href='https://www.runhouse.club/register'
                target='_blank'
                className='block w-full py-2.5 text-sm text-center text-white transition bg-blue-500 rounded-full shadow-sm hover:bg-blue-600 active:bg-blue-700 active:transform active:scale-[0.98]'
              >
                크루 등록 바로가기
              </Link>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-gray-800'>
                2) 크루 깃발 신청 폼
              </p>
              <p className='text-xs text-gray-500'>
                (받으시는분, 이름, 주소 등)
              </p>
              <Link
                href='https://forms.gle/yXE5Vb8QDycy4N9i8'
                target='_blank'
                className='block w-full py-2.5 text-sm text-center text-white transition bg-blue-500 rounded-full shadow-sm hover:bg-blue-600 active:bg-blue-700 active:transform active:scale-[0.98]'
              >
                신청 폼 작성하기
              </Link>
            </div>

            <p className='text-xs text-gray-600'>
              1, 2번이 완료 된 이후 아래 링크로 연락주시면
              <br />
              확인 후 깃발 제작 후 배송해드리겠습니다
            </p>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-gray-800'>🔗 완료 링크</p>
              <Link
                href='https://open.kakao.com/me/runhouse'
                target='_blank'
                className='block w-full py-2.5 text-sm text-center text-white transition bg-yellow-400 rounded-full shadow-sm hover:bg-yellow-500 active:bg-yellow-600 active:transform active:scale-[0.98]'
              >
                카카오톡으로 연락하기
              </Link>
            </div>
          </div>
        </div>

        {/* 뒤로가기 버튼 - iOS 스타일 */}
        <div className='py-6 mt-2'>
          <Link
            href='/home'
            className='block w-full py-2.5 text-sm text-center text-gray-700 transition bg-gray-100 rounded-full shadow-sm hover:bg-gray-200 active:bg-gray-300 active:transform active:scale-[0.98]'
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
