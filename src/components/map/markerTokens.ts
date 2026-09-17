// src/components/map/markerTokens.ts
// 지도 마커의 시각 토큰(색·물방울 경로·치수)을 한곳에 모은다.
//
// 실제 지도 마커(NaverMap.createMarkerContent)와 크루 수정 페이지의
// "지도에서 이렇게 보여요" 미리보기가 같은 값을 쓰게 하기 위한 모듈.
// 핀 모양을 손볼 때 두 곳이 어긋나지 않도록 여기만 고치면 되게 한다.

/** 핀 테두리·글자 색 (Cartographic ink) */
export const CART_INK = "#0B0C0A";
/** 핀 배경 — 어떤 로고 색과도 충돌하지 않도록 흰색 */
export const MARKER_BG = "#FFFFFF";
/**
 * 지도 컨테이너에 걸린 다크 반전 필터를 마커 HTML에서 되돌리는 역-필터.
 * 지도 밖(미리보기 등)에서는 적용하면 안 된다 — 반전 대상이 없기 때문.
 */
export const MARKER_COUNTER_FILTER =
  "invert(1) hue-rotate(180deg) saturate(1.8) brightness(1.05) contrast(1.05)";

/** 물방울 핀 경로. viewBox "0 0 36 42" 기준. */
export const MARKER_TEARDROP_PATH =
  "M18 41 C 18 28, 35 28, 35 16 a 17 17 0 1 0 -34 0 c 0 12, 17 12, 17 25 z";

/** 마커 치수 — width/height 는 렌더 크기, logo 는 원형 로고 한 변, well 은 로고를 감싸는 원. */
export const MARKER_SIZE = {
  width: 48,
  height: 58,
  logo: 32,
  well: 34,
} as const;
