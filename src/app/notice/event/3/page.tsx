import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CSS_VARIABLES } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "런하우스 러닝 기능성 모자 특가 | 러닝크루맵",
  description:
    "런하우스 등록 크루 한정 특가! 러닝에 최적화된 기능성 모자를 만나보세요.",
  openGraph: {
    title: "런하우스 러닝 기능성 모자 특가",
    description:
      "런하우스 등록 크루 한정 특가! 러닝에 최적화된 기능성 모자를 만나보세요.",
    images: [
      {
        url: "/runhousecap.webp",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Event3Page() {
  return (
    <div
      className='flex flex-col min-h-screen bg-[#f5f5f7]'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 주문 및 상담 버튼 - 최상단 고정 */}
      <div className='relative z-10 p-4 bg-cart-paper border border-cart-rule'>
        <Link
          href='https://open.kakao.com/me/runhouse'
          target='_blank'
          className='block w-full py-4 text-lg font-bold text-center text-white transition bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border border-cart-rule hover:from-blue-600 hover:to-purple-600 active:transform active:scale-[0.98]'
        >
          주문 및 상담 카톡
        </Link>
      </div>

      {/* 이벤트 헤더 - 모바일 최적화 */}
      <div className='flex justify-center py-6 w-full bg-cart-paper'>
        <div className='w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl'>
          <Image
            src='/runhousecap.webp'
            alt='런하우스 러닝 기능성 모자'
            width={800}
            height={1200}
            priority
            className='object-contain w-full h-auto bg-cart-paper rounded-[4px] border border-cart-rule'
            sizes='(max-width: 768px) 100vw, 700px'
          />
        </div>
      </div>

      {/* 모자 영상 섹션 */}
      <div className='py-6 bg-cart-paper'>
        <div className='px-4'>
          <h3 className='flex items-center mb-4 text-base font-medium text-cart-ink'>
            모자 실제 영상
          </h3>
          <div className='flex justify-center'>
            <div className='w-full max-w-md sm:max-w-lg'>
              <video
                className='w-full h-auto rounded-[4px] border border-cart-rule'
                controls
                preload='metadata'
                poster='/runhousecapThumnail.png'
              >
                <source src='/IMG_6549 3.mp4' type='video/quicktime' />
                <source src='/IMG_6549 3.mp4' type='video/mp4' />
                브라우저가 비디오를 지원하지 않습니다.
              </video>
              <p className='mt-2 text-xs text-center text-cart-ink-60'>
                실제 착용 모습을 확인해보세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 가격 정보 - 크루 할인가 강조 */}
      <div className='py-6 bg-cart-paper border-b border-cart-rule'>
        <div className='px-4'>
          <h3 className='mb-4 text-base font-medium text-cart-ink'>
            가격 정보
          </h3>
          <div className='space-y-3'>
            {/* 크루 전용 특가 */}
            <div className='p-4 text-center bg-blue-50 rounded-[4px] border border-blue-200'>
              <div className='mb-2'>
                <span className='px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded-full'>
                  런하우스 등록 크루 한정
                </span>
              </div>
              <div className='mb-1 text-3xl font-bold text-blue-600'>
                23,800원
              </div>
              <div className='text-sm text-cart-ink-60'>
                일반가 28,900원에서 5,100원 할인
              </div>
            </div>

            {/* 추가 할인 정보 */}
            <div className='p-3 bg-green-50 rounded-[4px]'>
              <p className='mb-1 text-sm font-medium text-green-700'>
                주문수량에 따른 추가 할인 가능
              </p>
              <p className='text-xs text-green-600'>
                대량 주문시 더 큰 할인 혜택을 받으실 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 이벤트 내용 */}
      <div className='flex flex-col px-4 bg-cart-paper border border-cart-rule'>
        {/* 메인 타이틀 */}
        <div className='py-6 space-y-3 border-b border-cart-rule'>
          <h1 className='text-xl font-bold text-center text-cart-ink'>
            런하우스 러닝 기능성 모자
          </h1>
          <p className='text-sm text-center text-cart-ink-60'>
            <span className='font-medium text-blue-600'>
              런하우스 등록 크루 한정 특가
            </span>
            <br />
            러닝에 최적화된 기능성 모자
          </p>
          <div className='flex justify-center'>
            <span className='px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full'>
              크루 멤버 전용
            </span>
          </div>
        </div>

        {/* 제품 특징 */}
        <div className='py-4 space-y-3 border-b border-cart-rule'>
          <h3 className='text-base font-medium text-cart-ink'>제품 특징</h3>
          <div className='ml-6 space-y-2'>
            <div className='p-3 bg-background rounded-[4px]'>
              <ul className='space-y-2 text-sm text-cart-ink'>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>모자 챙이 유연함:</strong> 소지 편의성 극대화
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>모자 조임 조절:</strong> 개인 맞춤 착용감
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>러닝 최적화:</strong> 통기성과 편안함
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>고품질 소재:</strong> 내구성과 기능성
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 상품 정보 */}
        <div className='py-4 space-y-3 border-b border-cart-rule'>
          <h3 className='text-base font-medium text-cart-ink'>상품 정보</h3>
          <div className='ml-6 space-y-2'>
            <div className='p-3 bg-background rounded-[4px]'>
              <ul className='space-y-2 text-sm text-cart-ink'>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>사이즈:</strong> 프리 사이즈 (Free Size)
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>깊이감:</strong> 깊어서 대두도 부담없이 착용 가능
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>주문 형태:</strong> 1차 프리오더
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='mr-2 text-blue-500'>•</span>
                  <span>
                    <strong>배송일:</strong> 11월 4일 (화) 일괄 배송
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 주문 방법 */}
        <div className='py-4 space-y-3 border-b border-cart-rule'>
          <h3 className='text-base font-medium text-cart-ink'>주문 방법</h3>
          <div className='ml-6 space-y-2 text-sm text-cart-ink'>
            <div className='flex items-start space-x-2'>
              <span className='font-medium text-blue-600'>1.</span>
              <span>런하우스 크루 등록 확인</span>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='font-medium text-blue-600'>2.</span>
              <span>카카오톡으로 아래 양식에 맞춰 주문</span>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='font-medium text-blue-600'>3.</span>
              <span>주문 확인 후 결제 안내</span>
            </div>
          </div>

          {/* 주문 양식 */}
          <div className='mt-4 ml-6'>
            <div className='p-4 bg-blue-50 rounded-[4px] border border-blue-200'>
              <h4 className='mb-3 text-sm font-medium text-blue-800'>
                주문 양식
              </h4>
              <div className='space-y-2 text-sm text-cart-ink'>
                <p>
                  <strong>크루명:</strong> [크루명을 입력해주세요]
                </p>
                <p>
                  <strong>주문자:</strong> [주문자 성함]
                </p>
                <p>
                  <strong>배송지명:</strong> [받으실 분 성함]
                </p>
                <p>
                  <strong>연락처:</strong> [연락 가능한 번호]
                </p>
                <p>
                  <strong>주문 개수:</strong> [주문하실 개수]
                </p>
              </div>
              <p className='mt-3 text-xs text-blue-600'>
                위 양식을 복사해서 카카오톡으로 보내주세요!
              </p>
            </div>
          </div>
        </div>

        {/* 주의사항 */}
        <div className='py-4 space-y-3 border-b border-cart-rule'>
          <h3 className='text-base font-medium text-cart-ink'>주의사항</h3>
          <div className='ml-6 space-y-1 text-sm text-cart-ink-60'>
            <p>• 런하우스 등록 크루 멤버만 구매 가능합니다</p>
            <p>• 1차 프리오더로 재고 상황에 따라 주문이 제한될 수 있습니다</p>
            <p>• 자세한 사이즈 정보는 카톡 상담을 통해 확인하세요</p>
            <p className='font-medium text-red-600'>
              • 단순변심에 의한 환불은 어렵습니다
            </p>
            <p>• 배송일: 11월 4일 (화) 일괄 배송 예정</p>
          </div>
        </div>

        {/* 주문 버튼 - 하단에도 추가 */}
        <div className='py-6 space-y-4'>
          <Link
            href='https://open.kakao.com/me/runhouse'
            target='_blank'
            className='block w-full py-4 text-lg font-bold text-center text-white transition bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border border-cart-rule hover:from-blue-600 hover:to-purple-600 active:transform active:scale-[0.98]'
          >
            주문 및 상담 카톡
          </Link>

          <p className='text-xs text-center text-cart-ink-60'>
            런하우스와 함께 더 멋진 러닝을 시작하세요!
          </p>
        </div>

        {/* 뒤로가기 버튼 */}
        <div className='py-6 mt-2'>
          <Link
            href='/home'
            className='block w-full py-2.5 text-sm text-center text-cart-ink transition bg-cart-paper rounded-full border border-cart-rule hover:bg-cart-paper active:bg-gray-300 active:transform active:scale-[0.98]'
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
