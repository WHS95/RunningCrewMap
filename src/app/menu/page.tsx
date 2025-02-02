"use client";

import { PlusCircle, MessageCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
// import { useRouter } from "next/navigation";

export default function MenuPage() {
  const { toast } = useToast();
  //   const router = useRouter();

  const handleComingSoon = () => {
    toast({
      description: "기능 준비중입니다.",
      duration: 1000,
      className: "text-center",
    });
  };

  return (
    <div className='h-[calc(100vh-4rem)] bg-background'>
      {/* 헤더 */}
      <div className='sticky top-0 flex items-center gap-3 p-4 border-b bg-background'>
        <Link
          href='/'
          className='p-2 rounded-full hover:bg-accent'
          title='뒤로가기'
        >
          <ArrowLeft className='w-5 h-5' />
        </Link>
        <h1 className='text-lg font-medium'>전체</h1>
      </div>

      {/* 메뉴 목록 */}
      <div className='p-4 space-y-2'>
        <button
          // TODO 크루 등록 페이지 이동 기능 구현
          //   onClick={() => router.push("/register")}
          onClick={handleComingSoon}
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
  );
}
