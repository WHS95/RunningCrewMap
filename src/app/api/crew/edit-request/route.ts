import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    
    // JWT 토큰으로 인증
    const token = cookieStore.get("auth_token")?.value;

    console.log("JWT 토큰:", token);
    console.log("JWT 토큰 타입:", typeof token);
    
    console.log("요청 데이터:", request);
    if (!token) {
      // 토큰이 없으면 기존 쿠키로 시도 (하위 호환성 유지)
      const crewId = cookieStore.get("crew_id")?.value;
      const accountId = cookieStore.get("crew_account_id")?.value;

      console.log(
        "crewId:", crewId,
        "accountId:", accountId
      );
      
      
      if (!crewId || !accountId) {
        return NextResponse.json(
          { error: "인증된 크루 정보가 없습니다." },
          { status: 401 }
        );
      }
      
      // 요청 데이터 파싱 및 처리 (기존 방식)
      return await handleEditRequest(request, crewId, accountId);
    }
    
    // JWT 토큰 검증
    const payload = verifyToken(token);

    console.log("JWT 토큰 검증 결과:", payload);
    
    if (!payload) {
      return NextResponse.json(
        { error: "유효하지 않은 인증입니다." },
        { status: 401 }
      );
    }
    
    // 토큰에서 정보 추출
    const { crewId, userId, isAdmin } = payload;

    // UUID 유효성 검사
    if (!crewId || typeof crewId !== 'string' || crewId.trim() === '') {
      return NextResponse.json(
        { error: "유효한 크루 ID가 없습니다." },
        { status: 400 }
      );
    }

    console.log("crewId:", crewId);
    console.log("userId:", userId);
    console.log("isAdmin:", isAdmin);
    
    // 요청 데이터 처리
    return await handleEditRequest(request, crewId, userId);
  } catch (error) {
    console.error("Edit request error:", error);
    return NextResponse.json(
      { error: "수정 요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 수정 요청 처리 함수
async function handleEditRequest(request: Request, crewId: string, accountId: string) {
  // 요청 데이터 파싱
  const data = await request.json();
  
  // 이미지 URL 검증 (수정된 경우에만)
  if (data.is_logo_modified && data.logo_url && !isValidUrl(data.logo_url)) {
    return NextResponse.json(
      { error: "로고 이미지 URL이 유효하지 않습니다." },
      { status: 400 }
    );
  }
  
  if (data.are_photos_modified && data.activity_photos && Array.isArray(data.activity_photos)) {
    for (const url of data.activity_photos) {
      if (!isValidUrl(url)) {
        return NextResponse.json(
          { error: "활동 사진 URL이 유효하지 않습니다." },
          { status: 400 }
        );
      }
    }
  }
  
  // 변경 사항 객체 준비
  interface ChangesType {
    description: string;
    instagram: string;
    activity_days: string[];
    activity_locations: string[];
    age_range: { min_age: number; max_age: number };
    logo_url?: string | null;
    activity_photos?: string[];
  }

  const changes: ChangesType = {
    description: data.description,
    instagram: data.instagram,
    activity_days: data.activityDays,
    activity_locations: data.activityLocations,
    age_range: data.ageRange,
  };
  
  // 이미지가 수정된 경우에만 changes 객체에 추가
  if (data.is_logo_modified) {
    changes.logo_url = data.logo_url;
  }
  
  if (data.are_photos_modified) {
    changes.activity_photos = data.activity_photos;
  }
  
  // 수정 요청 데이터 저장
  const { data: editRequest, error: editRequestError } = await supabase
    .from("crew_edit_requests")
    .insert({
      crew_id: crewId,
      requested_by: accountId,
      status: "pending",
      changes: changes,
    })
    .select("id")
    .single();

  if (editRequestError) {
    console.error("수정 요청 생성 오류:", editRequestError);
    return NextResponse.json(
      { error: "수정 요청 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    success: true, 
    message: "수정 요청이 성공적으로 저장되었습니다.", 
    requestId: editRequest.id 
  });
}

// URL 유효성 검사 함수
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    
    // Supabase Storage URL인지 확인 (기본적인 검사)
    return url.includes('supabase.co') && 
           (url.includes('/storage/v1/object/public/') || 
            url.includes('/storage/v1/object/sign/'));
  } catch {
    return false;
  }
} 