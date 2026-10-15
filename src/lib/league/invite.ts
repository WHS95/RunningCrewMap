// src/lib/league/invite.ts — 런하우스 리그 앱 크루 초대 링크 규칙 (서버·클라이언트 공용)
//
// 리그 앱(별도 Flutter 앱)이 공유하는 초대 링크는 `/join/<코드>` 로 들어온다.
// 예전 GitHub Pages 주소(whs95.github.io/runhouse-league/join/?code=…&n=…)에서 옮겨 왔다.

export const LEAGUE_APP_STORE_URL = "https://apps.apple.com/kr/app/id6808215626";
export const LEAGUE_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.runhouse.app";

// 코드는 RH-XXXX 또는 옛 8자. 모양이 아니면 보여 주지 않는다(주소로 아무 글이나 띄우지 않게).
const CODE_PATTERN = /^(RH-[A-Z0-9]{4}|[A-Z0-9]{8})$/;

export function normalizeInviteCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

// `?n=` 크루 이름 — 웹은 league 스키마를 읽지 않으므로 링크 값을 그대로 쓴다.
// 누구나 바꿀 수 있는 글이라 짧게 자르고, React 텍스트로만 렌더한다.
export function sanitizeCrewNameHint(raw: string | string[] | undefined): string | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 20);
  return value ? value : null;
}

export function leagueDeepLink(code: string | null): string {
  return code ? `runhouse://crew/join?code=${encodeURIComponent(code)}` : "runhouse://";
}
