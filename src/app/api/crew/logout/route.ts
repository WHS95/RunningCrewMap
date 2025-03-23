import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = cookies();

  // JWT 토큰 쿠키 제거
  cookieStore.delete("auth_token");
  
  // 기존 크루 인증 관련 쿠키 제거
  cookieStore.delete("crew_auth");
  cookieStore.delete("crew_id");
  cookieStore.delete("crew_account_id");

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
} 