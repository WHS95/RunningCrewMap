import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "러닝 가이드북 | 런린이를 위한 안내서",
  description:
    "러닝을 처음 시작하는 사람들을 위한 용어, 부상, 지수 등 유용한 정보 모음",
};

export default function RunningGuidePage() {
  return (
    <div className='container px-4 py-12 mx-auto'>
      <header className='mb-12 text-center'>
        <h1 className='mb-4 text-4xl font-bold text-cart-ink'>
          런린이 러닝가이드 북
        </h1>
        <p className='text-xl text-cart-ink-60'>
          러닝을 처음 시작하는 분들을 위한 유용한 가이드
        </p>
      </header>

      <div className='grid grid-cols-1 gap-8 mb-16 md:grid-cols-2 lg:grid-cols-3'>
        <Link href='/running-guide/terms' className='group'>
          <div className='overflow-hidden transition-all duration-300 bg-cart-paper border border-cart-rule rounded-[4px] group-hover:shadow-xl'>
            <div className='h-2 bg-blue-500'></div>
            <div className='p-6'>
              <h2 className='mb-3 text-2xl font-bold text-cart-ink'>
                러닝 용어
              </h2>
              <p className='mb-4 text-cart-ink-60'>
                마라톤과 러닝에 관련된 다양한 용어들을 알아보세요.
              </p>
              <span className='font-medium text-blue-500 group-hover:underline'>
                더 알아보기 &rarr;
              </span>
            </div>
          </div>
        </Link>

        <Link href='/running-guide/injuries' className='group'>
          <div className='overflow-hidden transition-all duration-300 bg-cart-paper border border-cart-rule rounded-[4px] group-hover:shadow-xl'>
            <div className='h-2 bg-red-500'></div>
            <div className='p-6'>
              <h2 className='mb-3 text-2xl font-bold text-cart-ink'>
                러닝 관련 부상 용어
              </h2>
              <p className='mb-4 text-cart-ink-60'>
                러닝 중 발생할 수 있는 부상에 대해 미리 알아두세요.
              </p>
              <span className='font-medium text-blue-500 group-hover:underline'>
                더 알아보기 &rarr;
              </span>
            </div>
          </div>
        </Link>

        <Link href='/running-guide/metrics' className='group'>
          <div className='overflow-hidden transition-all duration-300 bg-cart-paper border border-cart-rule rounded-[4px] group-hover:shadow-xl'>
            <div className='h-2 bg-green-500'></div>
            <div className='p-6'>
              <h2 className='mb-3 text-2xl font-bold text-cart-ink'>
                러너 운동 관련 지수
              </h2>
              <p className='mb-4 text-cart-ink-60'>
                러너들이 목표로 하거나 유지하면 좋은 수치들을 확인하세요.
              </p>
              <span className='font-medium text-blue-500 group-hover:underline'>
                더 알아보기 &rarr;
              </span>
            </div>
          </div>
        </Link>
      </div>

      <section className='p-8 mb-16 bg-background rounded-[4px]'>
        <h2 className='mb-6 text-3xl font-bold text-cart-ink'>
          러닝 가이드북이란?
        </h2>
        <p className='mb-4 text-lg text-cart-ink'>
          러닝은 특별한 장비 없이 쉽게 시작할 수 있는 운동이지만, 관련 용어와
          개념을 이해하면 더 효과적으로 훈련하고 부상을 예방할 수 있습니다.
        </p>
        <p className='mb-4 text-lg text-cart-ink'>
          이 가이드북은 러닝을 처음 시작하는 &apos;런린이&apos;들이 알아두면
          좋은 용어, 부상 정보, 그리고 참고할 수 있는 지수들을 제공합니다.
        </p>
        <p className='text-lg text-cart-ink'>
          각 섹션을 클릭하여 더 자세한 정보를 확인하고, 즐겁고 건강한 러닝
          생활을 시작해보세요!
        </p>
      </section>

      <footer className='text-center text-cart-ink-60'>
        <p>© 2024 러닝 가이드북 - 모든 러너를 위한 정보</p>
      </footer>
    </div>
  );
}
