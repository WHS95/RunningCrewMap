import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const crewId = cookieStore.get("crew_id")?.value;

    if (!crewId) {
      return NextResponse.json(
        { error: "인증된 크루 정보가 없습니다." },
        { status: 401 }
      );
    }

    // 요청 데이터에서 수정 요청 ID 가져오기
    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "수정 요청 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 해당 수정 요청이 현재 로그인한 크루의 것인지 확인
    const { data: editRequest, error: checkError } = await supabase
      .from("crew_edit_requests")
      .select("id, status")
      .eq("id", requestId)
      .eq("crew_id", crewId)
      .single();

    if (checkError || !editRequest) {
      return NextResponse.json(
        { error: "해당 수정 요청을 찾을 수 없거나 접근 권한이 없습니다." },
        { status: 404 }
      );
    }

    // pending 상태인 요청만 취소 가능
    if (editRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청은 취소할 수 없습니다." },
        { status: 400 }
      );
    }

    // 수정 요청 삭제
    const { error: deleteError } = await supabase
      .from("crew_edit_requests")
      .delete()
      .eq("id", requestId);

    if (deleteError) {
      console.error("수정 요청 취소 오류:", deleteError);
      return NextResponse.json(
        { error: "수정 요청 취소 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Edit request cancel error:", error);
    return NextResponse.json(
      { error: "수정 요청 취소 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 