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

    // Supabase에서 크루 정보 조회
    const { data: crew, error } = await supabase
      .from("crews")
      .select("id, name, description, instagram, logo_image_url, founded_date")
      .eq("id", crewId)
      .single();

    if (error || !crew) {
      return NextResponse.json(
        { error: "크루 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ crew });
  } catch (error) {
    console.error("Crew info error:", error);
    return NextResponse.json(
      { error: "크루 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 