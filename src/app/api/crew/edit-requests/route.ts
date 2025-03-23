import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  try {
    const cookieStore = cookies();
    const crewId = cookieStore.get("crew_id")?.value;

    if (!crewId) {
      return NextResponse.json(
        { error: "인증된 크루 정보가 없습니다." },
        { status: 401 }
      );
    }

    // 크루 ID에 해당하는 수정 요청 조회 (최근 항목부터)
    const { data: editRequests, error } = await supabase
      .from("crew_edit_requests")
      .select("*")
      .eq("crew_id", crewId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("수정 요청 조회 오류:", error);
      return NextResponse.json(
        { error: "수정 요청 목록을 가져오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ editRequests: editRequests || [] });
  } catch (error) {
    console.error("Crew edit requests error:", error);
    return NextResponse.json(
      { error: "수정 요청 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 