import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | 러닝 가이드북",
    default: "러닝 가이드북 | 런린이를 위한 안내서",
  },
  description:
    "러닝을 처음 시작하는 사람들을 위한 용어, 부상, 지수 등 유용한 정보 모음",
};

export default function RunningGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen flex flex-col bg-gray-100'>
      <header className='bg-blue-600 text-white shadow-md'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex flex-col md:flex-row md:justify-between md:items-center'>
            <div className='flex items-center mb-4 md:mb-0'>
              <span className='text-2xl mr-2'>🏃‍♂️</span>
              <h1 className='text-xl font-bold'>
                <Link href='/running-guide' className='hover:text-blue-100'>
                  런린이 러닝가이드 북
                </Link>
              </h1>
            </div>
            <nav>
              <ul className='flex space-x-6'>
                <li>
                  <Link href='/running-guide' className='hover:text-blue-100'>
                    홈
                  </Link>
                </li>
                <li>
                  <Link
                    href='/running-guide/terms'
                    className='hover:text-blue-100'
                  >
                    러닝 용어
                  </Link>
                </li>
                <li>
                  <Link
                    href='/running-guide/injuries'
                    className='hover:text-blue-100'
                  >
                    부상 용어
                  </Link>
                </li>
                <li>
                  <Link
                    href='/running-guide/metrics'
                    className='hover:text-blue-100'
                  >
                    러닝 지수
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className='flex-grow'>{children}</main>

      <footer className='bg-gray-800 text-white py-8'>
        <div className='container mx-auto px-4'>
          <div className='flex flex-col md:flex-row justify-between'>
            <div className='mb-6 md:mb-0'>
              <h2 className='text-xl font-bold mb-4'>런린이 러닝가이드 북</h2>
              <p className='text-gray-400'>
                러닝을 시작하는 모든 분들을 위한 가이드북입니다.
              </p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-3'>빠른 링크</h3>
              <ul className='space-y-2'>
                <li>
                  <Link
                    href='/running-guide/terms'
                    className='text-gray-400 hover:text-white'
                  >
                    러닝 용어
                  </Link>
                </li>
                <li>
                  <Link
                    href='/running-guide/injuries'
                    className='text-gray-400 hover:text-white'
                  >
                    부상 용어
                  </Link>
                </li>
                <li>
                  <Link
                    href='/running-guide/metrics'
                    className='text-gray-400 hover:text-white'
                  >
                    러닝 지수
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className='border-t border-gray-700 mt-8 pt-6 text-center text-gray-400'>
            <p>© 2024 러닝 가이드북 - 모든 러너를 위한 정보</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
