import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 하드코딩된 인증 정보 검증 (실제 환경에서는 이런 방식은 권장되지 않습니다)
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // 성공 시 쿠키 설정
      const cookieStore = cookies();

      // HTTP only 쿠키 설정 (JavaScript에서 접근 불가능)
      cookieStore.set("auth", "true", {
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
