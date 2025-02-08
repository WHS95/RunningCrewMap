"use client";

import { PlusCircle, MessageCircle } from "lucide-react";
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

  return (
    <div
      className='flex flex-col'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 메뉴 목록 */}
      <div className='p-4 space-y-2'>
        <button
          onClick={() => router.push("/register")}
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
