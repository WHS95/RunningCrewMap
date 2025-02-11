"use client";

import { CSS_VARIABLES } from "@/lib/constants";

export default function HomePage() {
  return (
    <div
      className='flex flex-col min-h-screen'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 공지사항 섹션 */}
      <section className='p-4 border-b'>
        <h2 className='mb-4 text-lg font-medium'>❗️공지사항</h2>
        <div className='space-y-2'>
          <div className='p-4 rounded-lg bg-accent/50'>
            <h3 className='font-medium'>서비스 오픈 안내</h3>
            <p className='mt-1 text-sm text-muted-foreground'>
              Runner House 가 베타 오픈했습니다. 많은 관심 부탁드립니다.
            </p>
            {/* <time className='block mt-2 text-xs text-muted-foreground'>
              2024.02.08
            </time> */}
          </div>
        </div>
      </section>

      {/* 러닝 매거진 섹션 */}
      {/* <section className='p-4'>
        <h2 className='mb-4 text-lg font-medium'>러닝 매거진</h2>
        <div className='grid gap-4'>
          <article className='overflow-hidden border rounded-lg'>
            <div className='aspect-video bg-muted' />
            <div className='p-4'>
              <h3 className='font-medium'>올바른 러닝 자세의 중요성</h3>
              <p className='mt-1 text-sm text-muted-foreground line-clamp-2'>
                러닝을 시작하기 전에 알아야 할 기본적인 자세와 주의사항에 대해
                알아봅니다.
              </p>
            </div>
          </article>

          <article className='overflow-hidden border rounded-lg'>
            <div className='aspect-video bg-muted' />
            <div className='p-4'>
              <h3 className='font-medium'>초보 러너를 위한 준비운동</h3>
              <p className='mt-1 text-sm text-muted-foreground line-clamp-2'>
                부상 예방을 위한 효과적인 준비운동 방법을 소개합니다.
              </p>
            </div>
          </article>
        </div>
      </section> */}
    </div>
  );
}
