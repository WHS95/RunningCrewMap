import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CSS_VARIABLES } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "크라운 뉴트리션 x 런하우스 마라톤 대비 공구 이벤트 | 러닝크루맵",
  description:
    "크라운 뉴트리션과 런하우스의 콜라보 공구! 최저가 보장으로 마라톤 대비 에너지젤을 준비하세요.",
  openGraph: {
    title: "크라운 뉴트리션 x 런하우스 마라톤 대비 공구",
    description:
      "크라운 뉴트리션과 런하우스의 콜라보 공구! 최저가 보장으로 마라톤 대비 에너지젤을 준비하세요.",
    images: [
      {
        url: "/crown.webp",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Event2Page() {
  return (
    <div
      className='flex flex-col min-h-screen bg-[#f5f5f7]'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 신청 버튼 - 최상단 고정 */}
      <div className='relative z-10 p-4 bg-white shadow-sm'>
        <Link
          href='https://forms.gle/XrY68pzGczPdSP9j8'
          target='_blank'
          className='block w-full py-4 text-lg font-bold text-center text-white transition bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg hover:from-orange-600 hover:to-red-600 active:transform active:scale-[0.98]'
        >
          🏃‍♂️ 지금 바로 신청하기
        </Link>
      </div>

      {/* 이벤트 내용 */}
      <div className='flex flex-col px-4 bg-white shadow-sm'>
        {/* 메인 타이틀 */}
        <div className='py-6 space-y-3 border-b border-gray-100'>
          <h1 className='text-xl font-bold text-center text-gray-900'>
            크라운 뉴트리션 x 런하우스
          </h1>
          <p className='text-sm text-center text-gray-600'>
            <span className='font-medium text-orange-600'>
              마라톤 대비 공구 이벤트
            </span>
            <br />✨ 최저가 보장으로 만나보세요!
          </p>
          <div className='flex justify-center'>
            <span className='px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-full'>
              특가 진행중
            </span>
          </div>
        </div>
        {/* 제품 정보 */}
        <div className='py-4 space-y-3 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>⚡</span> 제품 라인업
          </h3>
          <div className='ml-6 space-y-2'>
            <div className='p-3 bg-gray-50 rounded-lg'>
              <h4 className='text-sm font-medium text-gray-800'>
                에너지젤 (1박스 12개입)
              </h4>
              <ul className='mt-1 space-y-1 text-xs text-gray-600'>
                <li>• 콜라맛 (개당 40g)</li>
                <li>• 오렌지맛 (개당 40g)</li>
                <li>• 레몬맛 (개당 40g)</li>
              </ul>
            </div>
          </div>
        </div>
        {/* 가격 정보 */}
        <div className='py-4 space-y-3 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>💰</span> 특가 정보
          </h3>
          <div className='ml-6 space-y-2'>
            <div className='p-3 bg-orange-50 rounded-lg'>
              <p className='text-lg font-bold text-orange-600'>
                1박스당 36,000원
              </p>
              <p className='text-sm text-gray-600'>배송비 3,500원</p>
              <p className='text-xs font-medium text-green-600'>
                🎉 10만원 이상 구매시 배송비 무료!
              </p>
            </div>
          </div>
        </div>
        {/* 주문 방법 */}
        <div className='py-4 space-y-3 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>📋</span> 주문 방법
          </h3>
          <div className='ml-6 space-y-2 text-sm text-gray-700'>
            <div className='flex items-start space-x-2'>
              <span className='font-medium text-orange-600'>1.</span>
              <span>신청폼 작성 (크루명, 수령자 정보, 제품 선택)</span>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='font-medium text-orange-600'>2.</span>
              <span>신청폼에 안내된 계좌로 입금</span>
            </div>
          </div>
        </div>
        {/* 주의사항 */}
        <div className='py-4 space-y-3 border-b border-gray-100'>
          <h3 className='flex items-center text-base font-medium text-gray-900'>
            <span className='mr-1.5'>⚠️</span> 주의사항
          </h3>
          <div className='ml-6 space-y-1 text-sm text-gray-600'>
            <p>• 신청폼 작성 후 입금까지 완료해주세요</p>
            <p>• 배송비는 주문 수량에 관계없이 일괄 적용됩니다</p>
            <p>• 10만원 이상 주문시 배송비가 무료입니다</p>
            <p>• 자세한 입금 정보는 신청폼에서 확인하세요</p>
          </div>
        </div>

        {/* 이벤트 헤더 - 이미지 가로폭 최대한 넓게, 세로 비율 유지 */}
        <div className='flex justify-center py-6 w-full bg-white'>
          <div className='w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl'>
            <Image
              src='/crown.webp'
              alt='크라운 뉴트리션 x 런하우스 공구 이벤트'
              width={800}
              height={1200}
              priority
              className='object-contain w-full h-auto bg-white rounded-xl shadow-sm'
              sizes='(max-width: 768px) 100vw, 700px'
            />
          </div>
        </div>
        {/* 뒤로가기 버튼 */}
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
