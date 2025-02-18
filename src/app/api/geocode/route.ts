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
    const response = await fetch(
      `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": process.env.NEXT_PUBLIC_NAVER_CLIENT_ID!,
          "X-NCP-APIGW-API-KEY": process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET!,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding API 요청 실패");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { message: "주소 검색에 실패했습니다." },
      { status: 500 }
    );
  }
}
