"use client";

import { PlusCircle, MessageCircle, Calculator } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { CSS_VARIABLES } from "@/lib/constants";

export default function MenuPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleComingSoon = () => {
    toast({
      description: "기능 준비중입니다.",
      duration: 1000,
      className: "text-center",
    });
  };

  const calculatorMenus = [
    {
      title: "스플릿 타임 계산기",
      description: "목표 거리와 시간으로 구간별 예상 시간을 계산합니다",
      path: "/calculator/split-time",
    },
    {
      title: "완주 시간 예측기",
      description: "기존 기록을 바탕으로 풀코스 완주 시간을 예측합니다",
      path: "/calculator/prediction",
    },
    {
      title: "심박수 존 계산기",
      description: "나이를 기반으로 트레이닝 존을 계산합니다",
      path: "/calculator/heart-rate",
    },
  ];

  return (
    <div
      className='flex flex-col'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 메뉴 목록 */}
      <div className='p-4 space-y-6'>
        {/* 주요 기능 */}
        <div>
          <h2 className='mb-2 text-lg font-medium'>주요 기능</h2>
          <div className='space-y-2'>
            <button
              onClick={() =>
                window.open(
                  "https://docs.google.com/forms/d/e/1FAIpQLSdfAbw3WBAF7xyrM7abGcI8geU2zQZkIFCOes_nFYrtVuo_aw/viewform",
                  "_blank"
                )
              }
              className='flex items-center w-full gap-3 px-4 py-3 transition-colors rounded-lg hover:bg-accent'
            >
              <PlusCircle className='w-5 h-5' />
              <span>크루 등록</span>
            </button>

            <button
              onClick={handleComingSoon}
              className='flex items-center w-full gap-3 px-4 py-3 transition-colors rounded-lg hover:bg-accent'
            >
              <MessageCircle className='w-5 h-5' />
              <span>문의하기</span>
            </button>
          </div>
        </div>

        {/* 러너 계산기 */}
        <div>
          <h2 className='mb-2 text-lg font-medium'>러너 계산기</h2>
          <div className='space-y-2'>
            {calculatorMenus.map((menu) => (
              <button
                key={menu.path}
                onClick={() => router.push(menu.path)}
                className='flex items-center w-full gap-3 px-4 py-3 transition-colors rounded-lg hover:bg-accent'
              >
                <Calculator className='w-5 h-5' />
                <div className='text-left'>
                  <span className='block font-medium'>{menu.title}</span>
                  <span className='text-sm text-muted-foreground'>
                    {menu.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
