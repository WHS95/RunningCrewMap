import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // admin 경로에 대한 요청 처리
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // 로그인 페이지는 인증 없이 접근 가능
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next();
    }

    // 세션 쿠키에서 로그인 상태 확인
    const isLoggedIn = request.cookies.get("auth")?.value === "true";

    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    if (!isLoggedIn) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // crew 대시보드 경로에 대한 요청 처리
  if (request.nextUrl.pathname.startsWith("/crew/dashboard")) {
    // 로그인 페이지는 인증 없이 접근 가능
    if (request.nextUrl.pathname === "/crew/login") {
      return NextResponse.next();
    }

    // 세션 쿠키에서 크루 로그인 상태 확인
    const isCrewLoggedIn = request.cookies.get("crew_auth")?.value === "true";

    // 로그인되지 않은 경우 크루 로그인 페이지로 리다이렉트
    if (!isCrewLoggedIn) {
      const loginUrl = new URL("/crew/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 다른 모든 요청은 그대로 통과
  return NextResponse.next();
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: ["/admin/:path*", "/crew/dashboard/:path*"],
};
