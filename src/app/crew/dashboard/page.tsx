"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// 크루 정보 타입 정의
interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  founded_date: string;
}

export default function CrewDashboard() {
  const router = useRouter();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 서버에서 쿠키 값을 가져올 수 없으므로, 크루 정보 API 호출
    async function fetchCrewInfo() {
      try {
        const response = await fetch("/api/crew/info");
        if (!response.ok) {
          throw new Error("크루 정보를 가져오는데 실패했습니다.");
        }

        const data = await response.json();
        setCrew(data.crew);
      } catch (err) {
        console.error("크루 정보 로드 오류:", err);
        setError("크루 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchCrewInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/crew/logout", { method: "POST" });
      router.push("/crew/login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error || !crew) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <p className='text-red-500'>
          {error || "크루 정보를 불러올 수 없습니다."}
        </p>
        <Button onClick={handleLogout} className='mt-4'>
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8'>
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold'>{crew.name} 관리 대시보드</h1>
        <Button onClick={handleLogout} variant='outline'>
          로그아웃
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>크루 정보 수정</CardTitle>
            <CardDescription>
              크루의 기본 정보, 활동 지역, 활동 요일 등을 수정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='mb-4'>수정 요청은 관리자 검토 후 반영됩니다.</p>
            <Link href='/crew/dashboard/edit-info'>
              <Button>정보 수정하기</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>수정 요청 상태</CardTitle>
            <CardDescription>
              현재 진행 중인 수정 요청의 상태를 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/crew/dashboard/edit-requests'>
              <Button>요청 상태 확인</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
