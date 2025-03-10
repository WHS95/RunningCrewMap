"use client";

import { CSS_VARIABLES } from "@/lib/constants";
import { useState, useEffect } from "react";
import { crewService } from "@/lib/services/crew.service";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import { useRouter } from "next/navigation";

// react-icons import
import { FaRunning, FaMedal } from "react-icons/fa";
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
      className='flex items-center justify-between w-full p-4 mb-2 text-white transition-colors bg-black cursor-pointer rounded-xl hover:bg-gray-900'
      onClick={handleClick}
    >
      <div className='flex items-center gap-3'>
        <div className='flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full'>
          {icon === "running" && <FaRunning size={16} />}
          {icon === "marathon" && <FaMedal size={16} />}
        </div>
        <div>
          <h3 className='text-sm font-medium'>{title}</h3>
          <p className='text-xs text-gray-400'>{subtitle}</p>
        </div>
      </div>
      <div>
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
      className={`${color} p-4 rounded-xl flex flex-col h-32 cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={handleClick}
    >
      <div className='flex justify-end mb-auto'>
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
  const [selectedCrew, setSelectedCrew] = useState<null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [registeredCrews, setRegisteredCrews] = useState<number>(0); // 실제 DB 값 반영
  const marathonsThisMonth = 3; // 더미 데이터: 이번 달 마라톤 대회 수

  // 실제 크루 수 가져오기
  useEffect(() => {
    const fetchRegisteredCrews = async () => {
      try {
        const crews = await crewService.getCrews();
        setRegisteredCrews(crews.length);
      } catch (error) {
        console.error("크루 데이터를 가져오는 중 오류 발생:", error);
        // 오류 발생 시 기본값 사용
        setRegisteredCrews(0);
      }
    };

    fetchRegisteredCrews();
  }, []);

  return (
    <div
      className='flex flex-col min-h-screen bg-gray-50'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 인사말 섹션 */}
      <section className='p-3'>
        <p className='text-lg text-gray-400'>Hello,</p>
        <h1 className='text-3xl font-bold text-gray-800'>
          Supporting
          <br />
          Your
          <br />
          Running Life
        </h1>
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
