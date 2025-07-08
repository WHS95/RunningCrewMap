import { NextResponse } from "next/server";

export async function GET(request: Request) {
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
