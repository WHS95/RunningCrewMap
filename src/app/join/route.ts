// src/app/join/route.ts — 예전 형식(`?code=…&n=…`) 링크를 `/join/<코드>` 로 넘긴다.
// 앱에서 주소 앞부분만 바꿔도 동작하게 남겨 둔 호환 경로.
// 페이지의 redirect() 는 스트리밍 중이면 200 + meta refresh 로 나가서, 링크 미리보기 크롤러도 따라가도록 진짜 308 을 쓴다.
import { NextResponse, type NextRequest } from "next/server";
import { normalizeInviteCode, sanitizeCrewNameHint } from "@/lib/league/invite";

export function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const code = normalizeInviteCode(sp.get("code")) ?? "invalid";
  const name = sanitizeCrewNameHint(sp.get("n") ?? undefined);

  const target = new URL(`/join/${encodeURIComponent(code)}`, request.url);
  if (name) target.searchParams.set("n", name);
  return NextResponse.redirect(target, 308);
}
