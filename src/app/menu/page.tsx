"use client";

import { PlusCircle, MessageCircle, Calculator, Medal } from "lucide-react";
// import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { CSS_VARIABLES } from "@/lib/constants";

export default function MenuPage() {
  // const { toast } = useToast();
  const router = useRouter();

  // const handleComingSoon = () => {
  //   toast({
  //     description: "기능 준비중입니다.",
  //     duration: 1000,
  //     className: "text-center",
  //   });
  // };

  return (
    <div
      className='flex flex-col bg-background'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <div className='p-4'>
        <div className='mb-4'>
          <button
            onClick={() => router.push("/register")}
            className='flex items-center w-full gap-2 px-3 py-2.5 transition-colors rounded-lg hover:bg-accent'
          >
            <PlusCircle className='w-4 h-4' />
            <span className='text-sm'>크루 등록</span>
          </button>
        </div>

        <div className='mb-4'>
          <button
            onClick={() =>
              window.open("https://open.kakao.com/me/runhouse", "_blank")
            }
            className='flex items-center w-full gap-2 px-3 py-2.5 transition-colors rounded-lg hover:bg-accent'
          >
            <MessageCircle className='w-4 h-4' />
            <span className='text-sm'>문의 및 건의</span>
          </button>
        </div>

        {/* 인증 카테고리 */}
        <div className='pt-2 mb-4'>
          <h3 className='px-3 mb-1 text-xs font-medium text-muted-foreground'>
            인증
          </h3>
          <div className='space-y-1'>
            {[
              {
                title: "러닝 기록 인증",
                path: "/certification",
              },
              {
                title: "크루 인증",
                path: "/certification/crew",
              },
            ].map((menu) => (
              <button
                key={menu.path}
                onClick={() => router.push(menu.path)}
                className='flex items-center w-full gap-2 px-3 py-2.5 transition-colors rounded-lg hover:bg-accent'
              >
                <Medal className='w-4 h-4' />
                <span className='text-sm'>{menu.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 러너 계산기 카테고리 */}
        <div className='pt-2'>
          <h3 className='px-3 mb-1 text-xs font-medium text-muted-foreground'>
            러너 계산기
          </h3>
          <div className='space-y-1'>
            {[
              {
                title: "스플릿 타임 계산기",
                path: "/calculator/split-time",
              },
              {
                title: "완주 시간 예측기",
                path: "/calculator/prediction",
              },
              {
                title: "심박수 존 계산기",
                path: "/calculator/heart-rate",
              },
              {
                title: "페이스 계산기",
                path: "/calculator/pace",
              },
            ].map((menu) => (
              <button
                key={menu.path}
                onClick={() => router.push(menu.path)}
                className='flex items-center w-full gap-2 px-3 py-2.5 transition-colors rounded-lg hover:bg-accent'
              >
                <Calculator className='w-4 h-4' />
                <span className='text-sm'>{menu.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
