"use client";

import { PlusCircle, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function MenuList() {
  const { toast } = useToast();

  const handleComingSoon = () => {
    toast({
      description: "기능 준비중입니다.",
      duration: 1000,
      className: "text-center",
    });
  };

  return (
    <div className='p-4 space-y-4'>
      <h2 className='mb-6 text-lg font-medium'>전체</h2>

      <div className='space-y-2'>
        <button
          //TODO : 크루등록 기능 완료 후 붙이ㅣ기
          // onClick={handleComingSoon}
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
  );
}
