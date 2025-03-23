import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 하드코딩된 인증 정보 검증 (실제 환경에서는 이런 방식은 권장되지 않습니다)
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // JWT 토큰 생성
      const token = generateToken({
        userId: "admin",
        crewId: "", // 빈 문자열 유지 (관리자 계정에 연결된 크루가 없는 경우)
        isAdmin: true
      });
      
      // 성공 시 쿠키 설정
      const cookieStore = cookies();

      // JWT 토큰 쿠키 설정
      cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 2, // 2시간
        path: "/",
      });
      
      // 기존 쿠키도 유지 (하위 호환성)
      cookieStore.set("auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 2, // 2시간
        path: "/",
      });
      
      // is_admin 쿠키 설정
      cookieStore.set("is_admin", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 2, // 2시간
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    // 인증 실패
    return NextResponse.json(
      { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
