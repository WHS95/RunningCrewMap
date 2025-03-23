"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// 수정 요청 상태 타입
type RequestStatus = "pending" | "approved" | "rejected";

// 수정 요청 타입
interface EditRequest {
  id: string;
  crew_id: string;
  crew_name: string;
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

export default function EditRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [editRequest, setEditRequest] = useState<EditRequest | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 수정 요청 상세 정보 가져오기
    async function fetchEditRequestDetail() {
      if (!requestId) return;

      try {
        const response = await fetch(`/api/admin/edit-requests/${requestId}`);

        if (!response.ok) {
          throw new Error("수정 요청 정보를 가져오는데 실패했습니다.");
        }

        const data = await response.json();
        setEditRequest(data.editRequest);
        if (data.editRequest.admin_comment) {
          setAdminComment(data.editRequest.admin_comment);
        }
      } catch (err) {
        console.error("수정 요청 상세 정보 로드 오류:", err);
        setError("수정 요청 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchEditRequestDetail();
  }, [requestId]);

  // 수정 요청 승인 처리
  const handleApprove = async () => {
    if (!editRequest || actionLoading) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/admin/edit-requests/${requestId}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "approved",
            admin_comment: adminComment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("승인 처리 중 오류가 발생했습니다.");
      }

      toast.success("수정 요청이 승인되었습니다.");
      // 목록 페이지로 이동
      router.push("/admin/edit-requests");
    } catch (err) {
      console.error("수정 요청 승인 오류:", err);
      toast.error("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // 수정 요청 거부 처리
  const handleReject = async () => {
    if (!editRequest || actionLoading) return;

    // 코멘트 필수
    if (!adminComment.trim()) {
      toast.error("거부 사유를 입력해주세요.");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/admin/edit-requests/${requestId}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "rejected",
            admin_comment: adminComment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("거부 처리 중 오류가 발생했습니다.");
      }

      toast.success("수정 요청이 거부되었습니다.");
      // 목록 페이지로 이동
      router.push("/admin/edit-requests");
    } catch (err) {
      console.error("수정 요청 거부 오류:", err);
      toast.error("거부 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

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

  // 수정 내용 렌더링
  const renderChanges = () => {
    if (!editRequest) return null;
    const { changes } = editRequest;

    return (
      <div className='space-y-6'>
        {/* 소개글 */}
        {changes.description !== undefined && (
          <div>
            <h3 className='mb-2 text-lg font-medium'>소개글</h3>
            <div className='p-4 whitespace-pre-wrap rounded-md bg-gray-50'>
              {changes.description}
            </div>
          </div>
        )}

        {/* 인스타그램 */}
        {changes.instagram !== undefined && (
          <div>
            <h3 className='mb-2 text-lg font-medium'>인스타그램</h3>
            <div className='p-4 rounded-md bg-gray-50'>
              {changes.instagram || "(삭제됨)"}
            </div>
          </div>
        )}

        {/* 활동 요일 */}
        {changes.activity_days !== undefined &&
          changes.activity_days.length > 0 && (
            <div>
              <h3 className='mb-2 text-lg font-medium'>활동 요일</h3>
              <div className='p-4 rounded-md bg-gray-50'>
                {changes.activity_days.join(", ")}
              </div>
            </div>
          )}

        {/* 활동 장소 */}
        {changes.activity_locations !== undefined &&
          changes.activity_locations.length > 0 && (
            <div>
              <h3 className='mb-2 text-lg font-medium'>활동 장소</h3>
              <div className='p-4 rounded-md bg-gray-50'>
                <ul className='list-disc list-inside'>
                  {changes.activity_locations.map((location, index) => (
                    <li key={index}>{location}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        {/* 연령대 */}
        {changes.age_range && (
          <div>
            <h3 className='mb-2 text-lg font-medium'>연령대</h3>
            <div className='p-4 rounded-md bg-gray-50'>
              {changes.age_range.min_age}세 ~ {changes.age_range.max_age}세
            </div>
          </div>
        )}

        {/* 크루 로고 */}
        {changes.logo_url !== undefined && (
          <div>
            <h3 className='mb-2 text-lg font-medium'>크루 로고</h3>
            <div className='p-4 rounded-md bg-gray-50'>
              {changes.logo_url ? (
                <div className='flex flex-col items-center'>
                  <img
                    src={changes.logo_url}
                    alt='새 크루 로고'
                    className='object-cover w-40 h-40 rounded-md'
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

        {/* 활동 사진 */}
        {changes.activity_photos !== undefined &&
          changes.activity_photos.length > 0 && (
            <div>
              <h3 className='mb-2 text-lg font-medium'>활동 사진</h3>
              <div className='p-4 rounded-md bg-gray-50'>
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
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

  if (error || !editRequest) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <p className='text-red-500'>
          {error || "수정 요청을 찾을 수 없습니다."}
        </p>
        <Button
          onClick={() => router.push("/admin/edit-requests")}
          className='mt-4'
        >
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className='container py-8 mx-auto'>
      <div className='mb-8'>
        <Button
          onClick={() => router.push("/admin/edit-requests")}
          variant='outline'
        >
          ← 수정 요청 목록
        </Button>
        <h1 className='mt-4 text-3xl font-bold'>
          {editRequest.crew_name} 수정 요청
        </h1>
        <div className='flex items-center mt-2 space-x-4'>
          <p className='text-gray-500'>
            요청일: {formatDate(editRequest.created_at)}
          </p>
          {getStatusBadge(editRequest.status)}
        </div>
      </div>

      <div className='grid gap-8 md:grid-cols-3'>
        <div className='space-y-6 md:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>수정 사항</CardTitle>
              <CardDescription>
                크루가 요청한 정보 변경 사항입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderChanges()}</CardContent>
          </Card>
        </div>

        <div>
          <Card className='sticky top-8'>
            <CardHeader>
              <CardTitle>관리자 액션</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='block mb-2 text-sm font-medium'>
                  관리자 코멘트
                </label>
                <Textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder='코멘트를 입력하세요 (거부 시 필수)'
                  rows={4}
                  className='mb-4'
                />
              </div>

              {editRequest.status === "pending" && (
                <div className='flex flex-col space-y-2'>
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className='w-full bg-green-600 hover:bg-green-700'
                  >
                    {actionLoading ? "처리 중..." : "요청 승인"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    variant='destructive'
                    className='w-full'
                  >
                    {actionLoading ? "처리 중..." : "요청 거부"}
                  </Button>
                </div>
              )}

              {editRequest.status !== "pending" && (
                <div className='p-3 text-center text-gray-700 bg-gray-100 rounded-md'>
                  이미 {editRequest.status === "approved" ? "승인" : "거부"}된
                  요청입니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
