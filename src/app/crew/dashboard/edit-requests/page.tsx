"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

// 수정 요청 상태 타입
type RequestStatus = "pending" | "approved" | "rejected";

// 수정 요청 타입
interface EditRequest {
  id: string;
  status: RequestStatus;
  changes: {
    description?: string;
    instagram?: string;
    activity_days?: string[];
    activity_locations?: string[];
    age_range?: {
      min_age: number;
      max_age: number;
    };
    logo_url?: string;
    activity_photos?: string[];
  };
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

export default function CrewEditRequestsPage() {
  const router = useRouter();
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEditRequests();
  }, []);

  // 수정 요청 목록 조회
  async function fetchEditRequests() {
    try {
      const response = await fetch("/api/crew/edit-requests");

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

  // 수정 요청 취소 기능
  async function handleCancelRequest(requestId: string) {
    if (cancelLoading) return; // 이미 취소 중인 요청이 있으면 무시

    setCancelLoading(requestId);

    try {
      const response = await fetch("/api/crew/edit-requests/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("수정 요청이 취소되었습니다.");
        // 목록 다시 불러오기
        fetchEditRequests();
      } else {
        toast.error(data.error || "수정 요청 취소에 실패했습니다.");
      }
    } catch (err) {
      console.error("수정 요청 취소 오류:", err);
      toast.error("수정 요청 취소 중 오류가 발생했습니다.");
    } finally {
      setCancelLoading(null);
    }
  }

  // 상태별 배지 색상
  const getStatusBadge = (status: RequestStatus) => {
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

  // 수정 요청 내용 요약
  const summarizeChanges = (changes: EditRequest["changes"]) => {
    const summaries = [];
    if (changes.description !== undefined) summaries.push("소개글");
    if (changes.instagram !== undefined) summaries.push("인스타그램");
    if (changes.activity_days !== undefined && changes.activity_days.length > 0)
      summaries.push("활동 요일");
    if (
      changes.activity_locations !== undefined &&
      changes.activity_locations.length > 0
    )
      summaries.push("활동 장소");
    if (changes.age_range) summaries.push("연령대");
    if (changes.logo_url !== undefined) summaries.push("크루 로고");
    if (
      changes.activity_photos !== undefined &&
      changes.activity_photos.length > 0
    )
      summaries.push("활동 사진");

    return summaries.length ? summaries.join(", ") : "변경 사항 없음";
  };

  // 수정 요청 상세 내용 표시
  const renderDetailedChanges = (changes: EditRequest["changes"]) => {
    return (
      <div className='space-y-4'>
        {changes.description !== undefined && (
          <div>
            <h4 className='font-medium text-gray-700'>소개글</h4>
            <div className='p-3 mt-1 whitespace-pre-wrap rounded-md bg-gray-50'>
              {changes.description}
            </div>
          </div>
        )}

        {changes.instagram !== undefined && (
          <div>
            <h4 className='font-medium text-gray-700'>인스타그램</h4>
            <div className='p-3 mt-1 rounded-md bg-gray-50'>
              {changes.instagram || "(삭제됨)"}
            </div>
          </div>
        )}

        {changes.activity_days !== undefined &&
          changes.activity_days.length > 0 && (
            <div>
              <h4 className='font-medium text-gray-700'>활동 요일</h4>
              <div className='p-3 mt-1 rounded-md bg-gray-50'>
                {changes.activity_days.join(", ")}
              </div>
            </div>
          )}

        {changes.activity_locations !== undefined &&
          changes.activity_locations.length > 0 && (
            <div>
              <h4 className='font-medium text-gray-700'>활동 장소</h4>
              <div className='p-3 mt-1 rounded-md bg-gray-50'>
                <ul className='list-disc list-inside'>
                  {changes.activity_locations.map((location, index) => (
                    <li key={index}>{location}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        {changes.age_range && (
          <div>
            <h4 className='font-medium text-gray-700'>연령대</h4>
            <div className='p-3 mt-1 rounded-md bg-gray-50'>
              {changes.age_range.min_age}세 ~ {changes.age_range.max_age}세
            </div>
          </div>
        )}

        {changes.logo_url !== undefined && (
          <div>
            <h4 className='font-medium text-gray-700'>크루 로고</h4>
            <div className='p-3 mt-1 rounded-md bg-gray-50'>
              {changes.logo_url ? (
                <div className='flex flex-col items-center'>
                  <img
                    src={changes.logo_url}
                    alt='크루 로고'
                    className='object-cover w-40 h-40 my-2 rounded-md'
                  />
                  <span className='mt-2 text-sm text-gray-500'>
                    새 로고 이미지
                  </span>
                </div>
              ) : (
                <p className='text-gray-500'>로고 삭제 요청</p>
              )}
            </div>
          </div>
        )}

        {changes.activity_photos !== undefined &&
          changes.activity_photos.length > 0 && (
            <div>
              <h4 className='font-medium text-gray-700'>활동 사진</h4>
              <div className='p-3 mt-1 rounded-md bg-gray-50'>
                <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
                  {changes.activity_photos.map((photo, index) => (
                    <div key={index} className='flex flex-col items-center'>
                      <img
                        src={photo}
                        alt={`활동 사진 ${index + 1}`}
                        className='object-cover w-full h-40 rounded-md'
                      />
                      <span className='mt-1 text-sm text-gray-500'>
                        사진 {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className='container py-8 mx-auto'>
      <div className='mb-8'>
        <Button
          onClick={() => router.push("/crew/dashboard")}
          variant='outline'
        >
          ← 대시보드로 돌아가기
        </Button>
        <h1 className='mt-4 text-3xl font-bold'>수정 요청 상태</h1>
        <p className='text-gray-500'>
          제출한 수정 요청의 승인 상태를 확인할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className='p-4 mb-6 text-red-800 bg-red-100 rounded-md'>
          {error}
        </div>
      )}

      {editRequests.length === 0 ? (
        <Card>
          <CardContent className='py-10'>
            <p className='text-center text-gray-500'>
              제출한 수정 요청이 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-4'>
          {editRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <CardTitle className='text-xl'>
                    수정 요청 ({formatDate(request.created_at)})
                  </CardTitle>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <h3 className='font-medium text-gray-700'>수정된 항목</h3>
                  <p>{summarizeChanges(request.changes)}</p>
                </div>

                <Accordion type='single' collapsible className='w-full'>
                  <AccordionItem value='changes'>
                    <AccordionTrigger>수정 내용 상세 보기</AccordionTrigger>
                    <AccordionContent>
                      {renderDetailedChanges(request.changes)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {request.admin_comment && (
                  <div>
                    <h3 className='font-medium text-gray-700'>관리자 코멘트</h3>
                    <p className='p-3 rounded bg-gray-50'>
                      {request.admin_comment}
                    </p>
                  </div>
                )}

                {request.status === "rejected" && !request.admin_comment && (
                  <div className='p-3 text-red-800 rounded-md bg-red-50'>
                    요청이 거부되었습니다. 자세한 내용은 관리자에게 문의하세요.
                  </div>
                )}

                {request.status === "approved" && (
                  <div className='p-3 text-green-800 rounded-md bg-green-50'>
                    요청이 승인되어 정보가 업데이트 되었습니다.
                  </div>
                )}

                {request.status === "pending" && (
                  <div className='flex justify-end'>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancelLoading === request.id}
                    >
                      {cancelLoading === request.id
                        ? "취소 중..."
                        : "요청 취소"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
