"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 수정 요청 타입 정의
interface EditRequest {
  id: string;
  crew_id: string;
  crew_name: string;
  status: "pending" | "approved" | "rejected";
  changes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export default function EditRequestsPage() {
  const router = useRouter();
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEditRequests() {
      try {
        const response = await fetch("/api/admin/edit-requests");

        if (!response.ok) {
          throw new Error("수정 요청 목록을 가져오는데 실패했습니다.");
        }

        const data = await response.json();
        setEditRequests(data.editRequests);
      } catch (err) {
        console.error("수정 요청 목록 로드 오류:", err);
        setError("수정 요청 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchEditRequests();
  }, []);

  // 상태별 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant='outline' className='text-yellow-800 bg-yellow-100'>
            검토 중
          </Badge>
        );
      case "approved":
        return (
          <Badge variant='outline' className='text-green-800 bg-green-100'>
            승인됨
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant='outline' className='text-red-800 bg-red-100'>
            거부됨
          </Badge>
        );
      default:
        return <Badge variant='outline'>미정</Badge>;
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${
      date.getMonth() + 1
    }. ${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <p className='text-red-500'>{error}</p>
        <Button onClick={() => router.push("/admin")} className='mt-4'>
          관리자 대시보드로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className='container py-8 mx-auto'>
      <div className='mb-8'>
        <Button onClick={() => router.push("/admin")} variant='outline'>
          ← 관리자 대시보드
        </Button>
        <h1 className='mt-4 text-3xl font-bold'>크루 정보 수정 요청 목록</h1>
        <p className='text-gray-500'>
          크루가 요청한 정보 수정 내역을 검토하고 승인 또는 거부할 수 있습니다.
        </p>
      </div>

      {editRequests.length === 0 ? (
        <div className='py-12 text-center'>
          <p className='text-gray-500'>현재 검토할 수정 요청이 없습니다.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {editRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>{request.crew_name}</CardTitle>
                    <CardDescription>
                      요청일: {formatDate(request.created_at)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className='flex justify-end'>
                  <Link href={`/admin/edit-requests/${request.id}`}>
                    <Button>상세 보기</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
