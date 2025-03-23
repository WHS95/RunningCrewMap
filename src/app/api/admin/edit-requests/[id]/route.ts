import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const isAdmin = cookieStore.get("is_admin")?.value === "true";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 401 }
      );
    }

    const id = params.id;

    // 수정 요청 조회
    const { data: editRequest, error: editRequestError } = await supabase
      .from("crew_edit_requests")
      .select("id, crew_id, status, changes, admin_comment, created_at, updated_at")
      .eq("id", id)
      .single();

    if (editRequestError) {
      console.error("수정 요청 조회 오류:", editRequestError);
      return NextResponse.json(
        { error: "수정 요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 크루 이름 조회
    const { data: crew, error: crewError } = await supabase
      .from("crews")
      .select("name")
      .eq("id", editRequest.crew_id)
      .single();

    if (crewError) {
      console.error("크루 조회 오류:", crewError);
      return NextResponse.json({
        editRequest: {
          ...editRequest,
          crew_name: "알 수 없는 크루",
        },
      });
    }

    return NextResponse.json({
      editRequest: {
        ...editRequest,
        crew_name: crew.name,
      },
    });
  } catch (error) {
    console.error("Edit request detail error:", error);
    return NextResponse.json(
      { error: "수정 요청 상세 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 