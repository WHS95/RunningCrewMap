import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Session lengths.
// Default (no "remember me"): 2 hours — safe for shared computers.
// Remember-me: 30 days — auto-login on the same device.
const SHORT_SESSION_SECS = 60 * 60 * 2;
const LONG_SESSION_SECS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, remember } = body as {
      username?: string;
      password?: string;
      remember?: boolean;
    };

    // 하드코딩된 인증 정보 검증 (실제 환경에서는 이런 방식은 권장되지 않습니다)
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const cookieStore = await cookies();

      const maxAge = remember ? LONG_SESSION_SECS : SHORT_SESSION_SECS;

      // HTTP-only auth cookie. `remember=true` extends the session to 30 days
      // so the admin doesn't have to re-enter credentials on the same device.
      cookieStore.set("auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge,
        path: "/",
        sameSite: "lax",
      });

      return NextResponse.json({
        success: true,
        remember: !!remember,
        expiresInSecs: maxAge,
      });
    }

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
