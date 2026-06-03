import { NextResponse } from "next/server";

// 로그아웃: 인증 쿠키를 지우고 로그인 페이지로 리다이렉트.
// 폼(POST)으로 호출되므로 JSON이 아니라 303 redirect를 돌려줘야
// 사용자가 빈 JSON 화면에 멈추지 않는다. 쿠키 삭제(Set-Cookie)는
// 반드시 이 redirect 응답에 직접 실어야 적용된다.
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303,
  });
  response.cookies.delete("auth");
  return response;
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
