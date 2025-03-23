import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    
    // JWT 토큰 없음, 기존 쿠키로 확인
    if (!token) {
      const crewAuth = cookieStore.get("crew_auth")?.value === "true";
      const crewId = cookieStore.get("crew_id")?.value;
      const accountId = cookieStore.get("crew_account_id")?.value;
      
      if (crewAuth && crewId && accountId) {
        return NextResponse.json({ 
          authenticated: true,
          method: "legacy",
          crewId,
          role: "crew" 
        });
      }
      
      return NextResponse.json({ authenticated: false });
    }
    
    // JWT 토큰 검증
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }
    
    return NextResponse.json({ 
      authenticated: true,
      method: "jwt",
      crewId: payload.crewId,
      role: payload.role
    });
  } catch (error) {
    console.error("인증 확인 오류:", error);
    return NextResponse.json({ 
      authenticated: false,
      error: "인증 상태 확인 중 오류가 발생했습니다."
    });
  }
} 