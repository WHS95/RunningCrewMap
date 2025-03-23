import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import { generateToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Supabase에서 크루 계정 확인
    const { data, error } = await supabase
      .from("crew_accounts")
      .select("id, crew_id, username, password")
      .eq("username", username)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 비밀번호 검증 (실제 환경에서는 bcrypt 등을 사용해 암호화해야 합니다)
    if (data.password !== password) {
      return NextResponse.json(
        { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = generateToken({
      userId: data.id,
      crewId: data.crew_id,
      isAdmin: false
    });

    // 성공 시 쿠키 설정
    const cookieStore = cookies();

    // JWT 토큰 쿠키 설정
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    // 기존 쿠키도 유지 (하위 호환성을 위해)
    // 크루 정보 쿠키 설정
    cookieStore.set("crew_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    // 크루 ID 저장 (대시보드에서 사용)
    cookieStore.set("crew_id", data.crew_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    // 계정 ID 저장
    cookieStore.set("crew_account_id", data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Crew login error:", error);
    return NextResponse.json(
      { success: false, error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
} 