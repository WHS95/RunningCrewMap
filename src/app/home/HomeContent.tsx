"use client";

import { CSS_VARIABLES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { NoticeBanner } from "@/components/home/NoticeBanner";

import { Footprints, Medal, BookOpen, Timer, Clock, BarChart3, HeartPulse, ArrowRight } from "lucide-react";

// 배너 데이터 (모듈 레벨 상수로 호이스팅)
const BANNER_ITEMS = [
  {
    id: 1,
    link: "/notice/event/3",
    imageUrl: "/runhousecapThumnail.png",
    title: "런하우스 러닝 기능성 모자",
    description: "등록 크루 한정 특가 - 러닝 최적화 모자",
  },
  {
    id: 2,
    link: "/notice/event/1",
    imageUrl: "/event5.webp",
    title: "크루 깃발 무료 제작",
    description: "보아델와 런하우스 협업 프로모션",
  },
];

// 정보 카드 컴포넌트
interface InfoCardProps {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
}

const InfoCard = ({ icon, title, subtitle, href }: InfoCardProps) => {
  const router = useRouter();

  return (
    <div
      className='flex items-center justify-between w-full p-4 mb-2 text-white transition-all duration-200 bg-black cursor-pointer rounded-xl hover:bg-gray-900 hover:translate-y-[-2px] hover:scale-[1.01] active:translate-y-[2px] hover:shadow-md'
      onClick={() => router.push(href)}
    >
      <div className='flex gap-3 items-center'>
        <div className='flex justify-center items-center w-8 h-8 bg-gray-700 rounded-full transition-colors duration-200 hover:bg-gray-600'>
          {icon === "running" && <Footprints size={16} />}
          {icon === "marathon" && <Medal size={16} />}
          {icon === "mbti" && <BookOpen size={16} />}
        </div>
        <div>
          <h3 className='text-sm font-medium'>{title}</h3>
          <p className='text-xs text-gray-400'>{subtitle}</p>
        </div>
      </div>
      <div className='transition-transform duration-150 group-hover:translate-x-1'>
        <ArrowRight size={16} />
      </div>
    </div>
  );
};

// 러닝 계산기 메뉴 카드 컴포넌트
interface CalcMenuCardProps {
  icon: string;
  title: string;
  color: string;
  href: string;
}

const CalcMenuCard = ({ icon, title, color, href }: CalcMenuCardProps) => {
  const router = useRouter();

  const titleParts = title.split(" ");
  const firstPart = titleParts[0];
  const restParts = titleParts.slice(1).join(" ");

  return (
    <div
      className={`${color} p-4 rounded-xl flex flex-col h-28 cursor-pointer hover:opacity-100 hover:brightness-105 hover:translate-y-[-3px] hover:scale-[1.02] transition-all duration-200 hover:shadow-lg active:translate-y-[3px] transform`}
      onClick={() => router.push(href)}
    >
      <div className='flex justify-end mb-auto transition-transform duration-150'>
        {icon === "pace" && <Clock size={20} />}
        {icon === "heart-rate" && <HeartPulse size={20} />}
        {icon === "split-time" && <Timer size={20} />}
        {icon === "prediction" && <BarChart3 size={20} />}
      </div>
      <div className='mt-auto'>
        <h3 className='text-lg font-medium'>
          {restParts ? (
            <>
              {firstPart}
              <br />
              {restParts}
            </>
          ) : (
            title
          )}
        </h3>
      </div>
    </div>
  );
};

interface HomeContentProps {
  registeredCrews: number;
  marathonsThisMonth: number;
}

export function HomeContent({
  registeredCrews,
  marathonsThisMonth,
}: HomeContentProps) {
  return (
    <div
      className='flex flex-col min-h-screen bg-gray-50'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 공지 배너 섹션 */}
      <section className='pb-3'>
        <NoticeBanner items={BANNER_ITEMS} />
      </section>

      {/* 정보 카드 섹션 */}
      <section className='px-3 mb-2'>
        <InfoCard
          icon='running'
          title='러닝 크루'
          subtitle={`${registeredCrews}개의 크루와 함께 합니다`}
          href='/'
        />
        <InfoCard
          icon='marathon'
          title='마라톤 대회'
          subtitle={`이번달 ${marathonsThisMonth}개의 대회가 있습니다.`}
          href='/events'
        />
        <InfoCard
          icon='mbti'
          title='러닝 MBTI 테스트'
          subtitle='나의 러닝 스타일을 알아보세요'
          href='/mbti'
        />
      </section>

      {/* 러닝 계산기 메뉴 그리드 */}
      <section className='px-5'>
        <h2 className='mb-3 text-lg font-bold'>러닝 계산기</h2>
        <div className='grid grid-cols-2 gap-3'>
          <CalcMenuCard
            icon='pace'
            title='페이스'
            color='bg-sky-200'
            href='/calculator/pace'
          />
          <CalcMenuCard
            icon='heart-rate'
            title='심박수'
            color='bg-purple-200'
            href='/calculator/heart-rate'
          />
          <CalcMenuCard
            icon='split-time'
            title='스플릿 타임'
            color='bg-green-200'
            href='/calculator/split-time'
          />
          <CalcMenuCard
            icon='prediction'
            title='완주시간 예측'
            color='bg-orange-200'
            href='/calculator/prediction'
          />
        </div>
      </section>
    </div>
  );
}
