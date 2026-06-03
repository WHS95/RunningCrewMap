// src/app/api/sso/verify-pin/route.ts
// 백채널 인라인 크루 인증 — IdP 측 엔드포인트.
// custom-hat 서버 액션이 X-SSO-Client-Secret + { client_id, instagram, pin }로 호출.
// PIN을 검증(verifyCrewPin)하고 성공 시 기존 redirect 경로와 동일한 60초 jti 토큰을 발급한다.
// 절대 pin/요청 본문을 로깅하지 않는다. 시크릿은 서버 전용 env (NEXT_PUBLIC 금지).
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyCrewPin } from "@/lib/server/pin-auth";
import { serverSupabase } from "@/lib/server/supabase";
import { mintSsoToken } from "@/lib/server/sso";

export const runtime = "nodejs";

// 백채널이 토큰을 발급할 수 있는 client_id 허용목록.
const ALLOWED_CLIENT_IDS = new Set<string>(["custom_hat"]);

/**
 * X-SSO-Client-Secret 헤더를 RUNHOUSE_SSO_BACKCHANNEL_SECRET와 상수시간 비교.
 * 시크릿이 없거나 32자 미만이거나 불일치하면 false.
 */
function checkBackchannelSecret(provided: string | null): boolean {
  const expected = (process.env.RUNHOUSE_SSO_BACKCHANNEL_SECRET ?? "").trim();
  if (!expected || expected.length < 32) return false;
  if (!provided) return false;

  // timingSafeEqual은 길이가 다르면 throw하므로 길이 가드를 먼저.
  // 길이 자체도 비밀이 새지 않도록, 항상 동일 길이 버퍼끼리 비교한다.
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (providedBuf.length !== expectedBuf.length) {
    // 길이 불일치 — 그래도 상수시간 비교를 한 번 수행해 타이밍을 평탄화.
    crypto.timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

const forbidden = () =>
  NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
const badRequest = () =>
  NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });

export async function POST(req: NextRequest) {
  // 1) 백채널 시크릿 상수시간 검증 (없음/짧음/불일치 → 403)
  if (!checkBackchannelSecret(req.headers.get("x-sso-client-secret"))) {
    return forbidden();
  }

  // 2) 본문 파싱 — 절대 로깅하지 않는다.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }
  if (typeof body !== "object" || body === null) {
    return badRequest();
  }
  const { client_id, instagram, pin } = body as {
    client_id?: unknown;
    instagram?: unknown;
    pin?: unknown;
  };
  if (
    typeof client_id !== "string" ||
    typeof instagram !== "string" ||
    typeof pin !== "string"
  ) {
    return badRequest();
  }

  // 3) client_id 허용목록 검증 (아니면 400)
  if (!ALLOWED_CLIENT_IDS.has(client_id)) {
    return badRequest();
  }

  // 4) PIN 검증 (bcrypt + 5회 잠금, 쿠키 없음, loginWithPin과 단일 소스)
  const result = await verifyCrewPin(instagram, pin);
  if (!result.ok) {
    // 401: invalid | locked | no-pin (+ locked일 때 unlocksAt)
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        ...(result.reason === "locked" && result.unlocksAt
          ? { unlocksAt: result.unlocksAt }
          : {}),
      },
      { status: 401 }
    );
  }

  // 5) 크루 프로필 조회 (id, name, instagram, logo_image_url)
  const { data, error } = await serverSupabase
    .from("crews")
    .select("id, name, instagram, logo_image_url")
    .eq("id", result.crewId)
    .maybeSingle();

  if (error || !data) {
    // 크루가 사라졌거나 조회 실패 — invalid로 취급.
    return NextResponse.json(
      { ok: false, reason: "invalid" },
      { status: 401 }
    );
  }

  const crew = data as {
    id: string;
    name: string;
    instagram: string | null;
    logo_image_url: string | null;
  };

  // instagram: DB 값 우선(@ 제거·소문자), 없으면 입력값 정규화.
  const normalizedInstagram = crew.instagram
    ? crew.instagram.replace(/^@/, "").toLowerCase()
    : instagram.trim().replace(/^@+/, "").toLowerCase();

  // 6) 기존 mintSsoToken으로 동일한 60초 HS256 jti 토큰 발급.
  let token: string;
  try {
    token = await mintSsoToken(
      client_id,
      crew.id,
      normalizedInstagram,
      crew.name,
      crew.logo_image_url ?? null
    );
  } catch {
    // 서명 시크릿 누락 등 — forbidden이 아닌 서버 설정 오류지만,
    // 본문/pin을 노출하지 않고 보수적으로 403 처리.
    return forbidden();
  }

  return NextResponse.json({ ok: true, token }, { status: 200 });
}
