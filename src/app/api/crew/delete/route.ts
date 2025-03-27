import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import { verifyToken } from "@/lib/jwt";

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "인증 정보가 없습니다." },
        { status: 401 }
      );
    }

    // JWT 토큰 검증
    const payload = verifyToken(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // URL에서 크루 ID 추출
    const url = new URL(request.url);
    const crewId = url.searchParams.get("id");

    if (!crewId) {
      return NextResponse.json(
        { error: "크루 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 크루 정보 조회 (로고 이미지 URL 확인을 위해)
    const { data: crew, error: getError } = await supabase
      .from("crews")
      .select("logo_image_url")
      .eq("id", crewId)
      .single();

    if (getError) {
      console.error("크루 정보 조회 실패:", getError);
      return NextResponse.json(
        { error: "크루 정보 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    // 로고 이미지가 있으면 스토리지에서 삭제
    if (crew?.logo_image_url) {
      try {
        const url = new URL(crew.logo_image_url);
        const pathParts = url.pathname.split("/");
        const fileName = pathParts[pathParts.length - 1].split("?")[0];

        const { error: deleteImageError } = await supabase.storage
          .from("crewLogos")
          .remove([fileName]);

        if (deleteImageError) {
          console.error("로고 이미지 삭제 실패:", deleteImageError);
        }
      } catch (imageError) {
        console.error("로고 이미지 처리 중 오류:", imageError);
      }
    }

    // 크루 삭제 (ON DELETE CASCADE로 인해 관련 데이터도 모두 삭제됨)
    const { error: deleteError } = await supabase
      .from("crews")
      .delete()
      .eq("id", crewId);

    if (deleteError) {
      console.error("크루 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "크루 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("크루 삭제 중 오류 발생:", error);
    return NextResponse.json(
      { error: "크루 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 