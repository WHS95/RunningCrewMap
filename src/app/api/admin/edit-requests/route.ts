import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";

// 수정 요청 타입 정의
interface EditRequest {
  id: string;
  crew_id: string;
  status: string;
  changes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const isAdmin = cookieStore.get("auth")?.value === "true";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 401 }
      );
    }

    // 크루 정보와 함께 수정 요청 조회
    const { data, error } = await supabase
      .from("crew_edit_requests")
      .select(`
        id,
        crew_id,
        status,
        changes,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("수정 요청 조회 오류:", error);
      return NextResponse.json(
        { error: "수정 요청 목록을 가져오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // null 체크 및 타입 캐스팅
    const editRequests = data as EditRequest[] || [];

    // 각 크루 ID에 해당하는 크루 이름 조회
    const formattedRequests = await Promise.all(
      editRequests.map(async (request) => {
        // 크루 정보 조회
        const { data: crew } = await supabase
          .from("crews")
          .select("name")
          .eq("id", request.crew_id)
          .single();

        return {
          id: request.id,
          crew_id: request.crew_id,
          crew_name: crew?.name || "알 수 없는 크루",
          status: request.status,
          changes: request.changes,
          created_at: request.created_at,
          updated_at: request.updated_at,
        };
      })
    );

    return NextResponse.json({ editRequests: formattedRequests });
  } catch (error) {
    console.error("Admin edit requests error:", error);
    return NextResponse.json(
      { error: "수정 요청 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 