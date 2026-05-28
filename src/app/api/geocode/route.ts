import { NextResponse } from "next/server";

/**
 * Same-origin gate. /api/geocode 은 우리 도메인에서 띄운 페이지(JS)만 호출해야
 * 한다 — 외부 봇/스크립트는 우리 NCP 키로 무료 호출을 가져갈 수 있어서 차단.
 * 네이버가 우리에게 403을 주는 것과 같은 보호.
 *
 * 허용:
 *   - 동일 origin (Origin 또는 Referer 가 NEXT_PUBLIC_APP_URL/SITE_URL 와 일치)
 *   - 로컬 개발 (localhost / 127.0.0.1, dev 환경)
 *
 * Origin/Referer 둘 다 없으면 거부 (curl, python-requests, 일반 fetch from
 * Node 등).
 */
function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? "";
  const referer = req.headers.get("referer") ?? "";
  const candidate = origin || referer;
  if (!candidate) return false;

  let host: string;
  try {
    host = new URL(candidate).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  const fromEnv = (url?: string) => {
    if (!url) return;
    try {
      allowed.add(new URL(url).host);
    } catch {
      /* ignore malformed env */
    }
  };
  fromEnv(process.env.NEXT_PUBLIC_APP_URL);
  fromEnv(process.env.NEXT_PUBLIC_SITE_URL);

  if (process.env.NODE_ENV !== "production") {
    allowed.add("localhost:3000");
    allowed.add("127.0.0.1:3000");
  }

  return allowed.has(host);
}

export async function GET(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { message: "검색어를 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    // 네이버 클라우드 플랫폼 통합 방식으로 업데이트
    const response = await fetch(
      `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID!,
          "X-NCP-APIGW-API-KEY": process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_SECRET!,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Geocoding API 응답 오류:", response.status, errorText);
      throw new Error(`Geocoding API 요청 실패: ${response.status}`);
    }

    const data = await response.json();

    // 응답 데이터 유효성 검사
    if (!data.addresses || data.addresses.length === 0) {
      return NextResponse.json(
        { message: "검색 결과가 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { message: "주소 검색에 실패했습니다." },
      { status: 500 }
    );
  }
}
