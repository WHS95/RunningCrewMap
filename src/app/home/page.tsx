"use client";

import { CSS_VARIABLES } from "@/lib/constants";
import { useState, useEffect, useMemo, useCallback } from "react";
import { crewService } from "@/lib/services/crew.service";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { useRouter } from "next/navigation";
import { NoticeBanner } from "@/components/home/NoticeBanner";
import type { Crew } from "@/lib/types/crew";
import { runningEvents } from "@/lib/data/events";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// react-icons import
import { FaRunning, FaMedal, FaBook } from "react-icons/fa";
import { MdTimer } from "react-icons/md";
import { BsStopwatch, BsBarChartFill } from "react-icons/bs";
import { AiOutlineArrowRight } from "react-icons/ai";
import { FaHeartbeat } from "react-icons/fa";

// 정보 카드 컴포넌트
interface InfoCardProps {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
}

const InfoCard = ({ icon, title, subtitle, href }: InfoCardProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(href);
  };

  return (
    <div
      className='flex items-center justify-between w-full p-4 mb-2 text-white transition-all duration-200 bg-black cursor-pointer rounded-xl hover:bg-gray-900 hover:translate-y-[-2px] hover:scale-[1.01] active:translate-y-[2px] hover:shadow-md'
      onClick={handleClick}
    >
      <div className='flex items-center gap-3'>
        <div className='flex items-center justify-center w-8 h-8 transition-colors duration-200 bg-gray-700 rounded-full hover:bg-gray-600'>
          {icon === "running" && <FaRunning size={16} />}
          {icon === "marathon" && <FaMedal size={16} />}
          {icon === "mbti" && <FaBook size={16} />}
        </div>
        <div>
          <h3 className='text-sm font-medium'>{title}</h3>
          <p className='text-xs text-gray-400'>{subtitle}</p>
        </div>
      </div>
      <div className='transition-transform duration-150 group-hover:translate-x-1'>
        <AiOutlineArrowRight size={16} />
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

  const handleClick = () => {
    router.push(href);
  };

  // 제목에 공백이 포함되어 있는지 확인하고 분리 (첫 번째 공백에서 분리)
  const titleParts = title.split(" ");
  const firstPart = titleParts[0];
  const restParts = titleParts.slice(1).join(" ");

  return (
    <div
      className={`${color} p-4 rounded-xl flex flex-col h-28 cursor-pointer hover:opacity-100 hover:brightness-105 hover:translate-y-[-3px] hover:scale-[1.02] transition-all duration-200 hover:shadow-lg active:translate-y-[3px] transform`}
      onClick={handleClick}
    >
      <div className='flex justify-end mb-auto transition-transform duration-150'>
        {icon === "pace" && <BsStopwatch size={20} />}
        {icon === "heart-rate" && <FaHeartbeat size={20} />}
        {icon === "split-time" && <MdTimer size={20} />}
        {icon === "prediction" && <BsBarChartFill size={20} />}
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

export default function HomePage() {
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [registeredCrews, setRegisteredCrews] = useState<number>(0); // 실제 DB 값 반영
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가

  // 현재 월의 마라톤 대회 수 계산
  const marathonsThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11 (1월-12월)

    return runningEvents.filter(
      (event) => new Date(event.startDate).getMonth() === currentMonth
    ).length;
  }, []);

  // 배너 데이터를 useMemo로 캐싱
  const bannerItems = useMemo(
    () => [
      {
        id: 1,
        link: "/notice/event/1",
        // imageUrl: "/event4.png",
        imageUrl: "/event5.webp",
        // title: "크루 깃발 무료 제작 이벤트",
        // description: "바모스 데포르테와 런하우스 협업 프로모션",
      },
    ],
    []
  );

  // 실제 크루 수 가져오기
  const fetchRegisteredCrews = useCallback(async () => {
    try {
      const count = await crewService.getCrewCount();
      setRegisteredCrews(count);
      setIsLoading(false); // 데이터 로드 완료 후 로딩 상태 해제
    } catch (error) {
      console.error("크루 데이터를 가져오는 중 오류 발생:", error);
      // 오류 발생 시 기본값 사용
      setRegisteredCrews(0);
      setIsLoading(false); // 오류 발생해도 로딩 상태 해제
    }
  }, []);

  useEffect(() => {
    fetchRegisteredCrews();
  }, [fetchRegisteredCrews]);

  // 로딩 중일 때 로딩 스피너 표시
  if (isLoading) {
    return (
      <div
        className='flex items-center justify-center min-h-screen'
        style={{
          paddingTop: CSS_VARIABLES.HEADER_PADDING,
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className='flex flex-col min-h-screen bg-gray-50'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 공지 배너 섹션 */}
      <section className='pb-3'>
        <NoticeBanner items={bannerItems} />
      </section>

      {/* <section className='p-3'>
        <p className='text-lg text-gray-400'>Hello,</p>
        <h1 className='text-3xl font-bold text-gray-800'>
          Supporting
          <br />
          Your
          <br />
          Running Life
        </h1>
      </section> */}
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
      {/* 크루 상세 정보 */}
      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCrew(null);
        }}
      />
    </div>
  );
}
