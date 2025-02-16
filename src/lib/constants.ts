export const EXTERNAL_LINKS = {
  RUNNING_EVENTS: "http://www.marathon.pe.kr/schedule_index.html",
} as const;

// 레이아웃 관련 상수
export const LAYOUT = {
  HEADER_HEIGHT: "3.5rem", // 56px
  MOBILE_NAV_HEIGHT: "3.5rem", // 64px
} as const;

// CSS 변수로 사용할 수 있는 계산된 값들
export const CSS_VARIABLES = {
  // 전체 높이에서 헤더 높이를 뺀 값
  CONTENT_HEIGHT: `calc(100vh - ${LAYOUT.HEADER_HEIGHT})`,
  // 전체 높이에서 헤더와 모바일 네비게이션 높이를 뺀 값
  CONTENT_HEIGHT_MOBILE: `calc(100vh - ${LAYOUT.HEADER_HEIGHT} - ${LAYOUT.MOBILE_NAV_HEIGHT})`,
  // 헤더 높이만큼의 상단 패딩
  HEADER_PADDING: LAYOUT.HEADER_HEIGHT,
  MOBILE_NAV_PADDING: LAYOUT.MOBILE_NAV_HEIGHT,
} as const;
