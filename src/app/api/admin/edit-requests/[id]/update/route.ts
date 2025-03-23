import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";

export async function POST(
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
    const { status, admin_comment } = await request.json();

    // 유효한 상태값인지 확인
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태값입니다." },
        { status: 400 }
      );
    }

    // 거부 시 코멘트 필수
    if (status === "rejected" && !admin_comment?.trim()) {
      return NextResponse.json(
        { error: "거부 사유를 입력해주세요." },
        { status: 400 }
      );
    }

    // 현재 수정 요청 조회
    const { data: editRequest, error: editRequestError } = await supabase
      .from("crew_edit_requests")
      .select("id, crew_id, status, changes")
      .eq("id", id)
      .single();

    if (editRequestError || !editRequest) {
      console.error("수정 요청 조회 오류:", editRequestError);
      return NextResponse.json(
        { error: "수정 요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 처리된 요청인지 확인
    if (editRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다." },
        { status: 400 }
      );
    }

    // 상태 업데이트
    const { error: updateError } = await supabase
      .from("crew_edit_requests")
      .update({
        status,
        admin_comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("수정 요청 업데이트 오류:", updateError);
      return NextResponse.json(
        { error: "상태 업데이트 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 승인된 경우 크루 정보 업데이트
    if (status === "approved") {
      const changes = editRequest.changes;
      const updates: Record<string, unknown> = {};

      // 기본 정보 업데이트
      if (changes.description !== undefined) {
        updates.description = changes.description;
      }
      if (changes.instagram !== undefined) {
        updates.instagram = changes.instagram;
      }
      
      // 로고 URL이 변경된 경우에만 업데이트
      if ('logo_url' in changes) {
        updates.logo_image_url = changes.logo_url;
      }

      // 크루 정보 업데이트
      if (Object.keys(updates).length > 0) {
        const { error: crewUpdateError } = await supabase
          .from("crews")
          .update(updates)
          .eq("id", editRequest.crew_id);

        if (crewUpdateError) {
          console.error("크루 정보 업데이트 오류:", crewUpdateError);
          // 실패해도 진행 (부분 성공 처리)
        }
      }

      // 활동 요일 업데이트
      if (changes.activity_days !== undefined) {
        // 기존 활동 요일 삭제
        await supabase
          .from("crew_activity_days")
          .delete()
          .eq("crew_id", editRequest.crew_id);

        // 새 활동 요일 추가
        if (changes.activity_days.length > 0) {
          const activityDays = changes.activity_days.map((day: string) => ({
            crew_id: editRequest.crew_id,
            day_of_week: day,
          }));

          await supabase.from("crew_activity_days").insert(activityDays);
        }
      }

      // 활동 장소 업데이트
      if (changes.activity_locations !== undefined) {
        // 기존 활동 장소 삭제
        await supabase
          .from("crew_activity_locations")
          .delete()
          .eq("crew_id", editRequest.crew_id);

        // 새 활동 장소 추가
        if (changes.activity_locations.length > 0) {
          const activityLocations = changes.activity_locations.map(
            (location: string) => ({
              crew_id: editRequest.crew_id,
              location_name: location,
            })
          );

          await supabase
            .from("crew_activity_locations")
            .insert(activityLocations);
        }
      }

      // 연령대 업데이트
      if (changes.age_range) {
        // 기존 연령대 삭제
        await supabase
          .from("crew_age_ranges")
          .delete()
          .eq("crew_id", editRequest.crew_id);

        // 새 연령대 추가
        await supabase.from("crew_age_ranges").insert({
          crew_id: editRequest.crew_id,
          min_age: changes.age_range.min_age,
          max_age: changes.age_range.max_age,
        });
      }

      // 활동 사진 업데이트
      if ('activity_photos' in changes) {
        // 기존 활동 사진 삭제
        await supabase
          .from("crew_photos")
          .delete()
          .eq("crew_id", editRequest.crew_id);

        // 새 활동 사진 추가
        if (changes.activity_photos && Array.isArray(changes.activity_photos) && changes.activity_photos.length > 0) {
          const photos = changes.activity_photos.map((photoUrl: string, index: number) => ({
            crew_id: editRequest.crew_id,
            photo_url: photoUrl,
            display_order: index
          }));

          await supabase.from("crew_photos").insert(photos);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `수정 요청이 ${status === "approved" ? "승인" : "거부"}되었습니다.`,
    });
  } catch (error) {
    console.error("Edit request update error:", error);
    return NextResponse.json(
      { error: "수정 요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 