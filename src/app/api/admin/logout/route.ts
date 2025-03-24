import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // 인증 쿠키 제거
    const cookieStore = cookies();
    cookieStore.delete("auth");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "로그아웃 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
