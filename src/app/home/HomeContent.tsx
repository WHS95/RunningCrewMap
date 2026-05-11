"use client";

import { CSS_VARIABLES } from "@/lib/constants";
import { usePageTransition } from "@/lib/hooks/usePageTransition";
import { NoticeBanner } from "@/components/home/NoticeBanner";

import { Footprints, Medal, BookOpen, Timer, Clock, BarChart3, HeartPulse, ChevronRight } from "lucide-react";

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
  index: number;
}

const InfoCard = ({ icon, title, subtitle, href, index }: InfoCardProps) => {
  const { navigate } = usePageTransition();

  return (
    <div
      className={`flex items-center justify-between w-full p-4 transition-all duration-200 bg-black/90 cursor-pointer rounded-2xl card-press border border-white/[0.06] animate-fade-in-up stagger-${index + 1}`}
      style={{ opacity: 0 }}
      onClick={() => navigate(href)}
    >
      <div className='flex gap-3.5 items-center'>
        <div className='flex justify-center items-center w-10 h-10 rounded-xl bg-white/[0.08]'>
          {icon === "running" && <Footprints size={18} className='text-[hsl(72,100%,50%)]' />}
          {icon === "marathon" && <Medal size={18} className='text-amber-400' />}
          {icon === "mbti" && <BookOpen size={18} className='text-violet-400' />}
        </div>
        <div>
          <h3 className='text-sm font-semibold text-white'>{title}</h3>
          <p className='text-xs text-gray-400 mt-0.5'>{subtitle}</p>
        </div>
      </div>
      <ChevronRight size={18} className='text-gray-500' />
    </div>
  );
};

// 러닝 계산기 메뉴 카드 컴포넌트
interface CalcMenuCardProps {
  icon: string;
  title: string;
  gradient: string;
  href: string;
  index: number;
}

const CalcMenuCard = ({ icon, title, gradient, href, index }: CalcMenuCardProps) => {
  const { navigate } = usePageTransition();

  const titleParts = title.split(" ");
  const firstPart = titleParts[0];
  const restParts = titleParts.slice(1).join(" ");

  return (
    <div
      className={`${gradient} relative overflow-hidden p-4 rounded-2xl flex flex-col h-[120px] cursor-pointer card-press animate-fade-in-up stagger-${index + 1}`}
      style={{ opacity: 0 }}
      onClick={() => navigate(href)}
    >
      <div className='absolute inset-0 opacity-[0.04]' style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '20px 20px'
      }} />
      <div className='relative z-10 flex justify-end mb-auto'>
        {icon === "pace" && <Clock size={22} className='opacity-80' />}
        {icon === "heart-rate" && <HeartPulse size={22} className='opacity-80' />}
        {icon === "split-time" && <Timer size={24} className='opacity-80' />}
        {icon === "prediction" && <BarChart3 size={22} className='opacity-80' />}
      </div>
      <div className='relative z-10 mt-auto'>
        <h3 className='text-[15px] font-bold leading-tight'>
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
      className='flex flex-col min-h-screen bg-[hsl(220,15%,4%)]'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING,
      }}
    >
      {/* Notice banner */}
      <section className='pb-2'>
        <NoticeBanner items={BANNER_ITEMS} />
      </section>

      {/* Info cards */}
      <section className='px-4 mb-5 space-y-2.5'>
        <InfoCard
          icon='running'
          title='러닝 크루'
          subtitle={`${registeredCrews}개의 크루와 함께 합니다`}
          href='/'
          index={0}
        />
        <InfoCard
          icon='marathon'
          title='마라톤 대회'
          subtitle={`이번달 ${marathonsThisMonth}개의 대회가 있습니다`}
          href='/events'
          index={1}
        />
        <InfoCard
          icon='mbti'
          title='러닝 MBTI 테스트'
          subtitle='나의 러닝 스타일을 알아보세요'
          href='/mbti'
          index={2}
        />
      </section>

      {/* Calculator grid */}
      <section className='px-4'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-lg font-bold text-white font-display tracking-tight'>러닝 계산기</h2>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <CalcMenuCard
            icon='pace'
            title='페이스'
            gradient='bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
            href='/calculator/pace'
            index={1}
          />
          <CalcMenuCard
            icon='heart-rate'
            title='심박수'
            gradient='bg-gradient-to-br from-fuchsia-500 to-purple-700 text-white'
            href='/calculator/heart-rate'
            index={2}
          />
          <CalcMenuCard
            icon='split-time'
            title='스플릿 타임'
            gradient='bg-gradient-to-br from-emerald-400 to-teal-600 text-white'
            href='/calculator/split-time'
            index={3}
          />
          <CalcMenuCard
            icon='prediction'
            title='완주시간 예측'
            gradient='bg-gradient-to-br from-orange-400 to-red-500 text-white'
            href='/calculator/prediction'
            index={4}
          />
        </div>
      </section>
    </div>
  );
}
