import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import { verifyToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const { searchParams } = new URL(request.url);
    
    // 요청 파라미터에서 크루 ID 가져오기 또는 인증 토큰에서 가져오기
    let crewId = searchParams.get("crewId");

    // 파라미터로 전달된 crewId가 없으면 인증 정보에서 가져오기
    if (!crewId) {
      // JWT 인증 확인
      const token = cookieStore.get("auth_token")?.value;
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          crewId = payload.crewId;
        }
      }
      
      // 기존 쿠키 확인
      crewId = cookieStore.get("crew_id")?.value ?? null;
    }

    if (!crewId) {
      return NextResponse.json(
        { error: "크루 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 크루 활동 사진 조회
    const { data: photos, error } = await supabase
      .from("crew_photos")
      .select("id, photo_url, display_order")
      .eq("crew_id", crewId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("크루 사진 조회 오류:", error);
      return NextResponse.json(
        { error: "크루 사진을 가져오는데 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      photos: photos || [] 
    });
  } catch (error) {
    console.error("Crew photos API error:", error);
    return NextResponse.json(
      { error: "크루 사진 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 