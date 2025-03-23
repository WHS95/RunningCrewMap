import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import { verifyToken } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = cookies();
    
    // JWT 토큰으로 인증
    const token = cookieStore.get("auth_token")?.value;
    let crewId = null;
    
    if (token) {
      // JWT 토큰 검증
      const payload = verifyToken(token);
      
      if (!payload) {
        return NextResponse.json(
          { error: "유효하지 않은 인증입니다." },
          { status: 401 }
        );
      }
      
      crewId = payload.crewId;
    } else {
      // 기존 쿠키로 시도 (하위 호환성 유지)
      crewId = cookieStore.get("crew_id")?.value;
    }

    if (!crewId) {
      return NextResponse.json(
        { error: "인증된 크루 정보가 없습니다." },
        { status: 401 }
      );
    }

    // 1. 기본 크루 정보 조회
    const { data: crew, error: crewError } = await supabase
      .from("crews")
      .select("id, name, description, instagram, logo_image_url, founded_date")
      .eq("id", crewId)
      .single();

    if (crewError || !crew) {
      return NextResponse.json(
        { error: "크루 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. 활동 요일 정보 조회
    const { data: activityDays, error: activityDaysError } = await supabase
      .from("crew_activity_days")
      .select("id, day_of_week")
      .eq("crew_id", crewId);

    if (activityDaysError) {
      console.error("활동 요일 조회 오류:", activityDaysError);
    }

    // 3. 활동 장소 정보 조회
    const { data: activityLocations, error: activityLocationsError } = await supabase
      .from("crew_activity_locations")
      .select("id, location_name")
      .eq("crew_id", crewId);

    if (activityLocationsError) {
      console.error("활동 장소 조회 오류:", activityLocationsError);
    }

    // 4. 연령대 정보 조회
    const { data: ageRanges, error: ageRangesError } = await supabase
      .from("crew_age_ranges")
      .select("id, min_age, max_age")
      .eq("crew_id", crewId);

    if (ageRangesError) {
      console.error("연령대 조회 오류:", ageRangesError);
    }

    // 모든 정보 반환
    return NextResponse.json({
      crew,
      activityDays: activityDays || [],
      activityLocations: activityLocations || [],
      ageRanges: ageRanges || [],
    });
  } catch (error) {
    console.error("Crew details error:", error);
    return NextResponse.json(
      { error: "크루 상세 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 