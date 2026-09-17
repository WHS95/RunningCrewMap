"use client";

/**
 * CrewLogoPreview — 고른 대표 사진이 "실서비스에서" 어떻게 보이는지 보여준다.
 *
 * 크루 운영진이 수정 페이지에서 로고를 바꿀 때, 76px 정사각 파일 미리보기만으로는
 * 지도 마커의 원형 크롭(32px)에서 로고가 잘리는지, 목록 썸네일에서 알아볼 수 있는지
 * 알 수 없다. 그래서 실제 렌더와 같은 두 곳을 그대로 재현한다.
 *
 *  1) 지도 마커 — NaverMap.createMarkerContent 와 동일한 물방울 핀.
 *     경로·색·치수는 markerTokens 를 공유하므로 핀 디자인이 바뀌어도 같이 따라간다.
 *     단 MARKER_COUNTER_FILTER 는 쓰지 않는다 — 그 필터는 지도 컨테이너의 다크
 *     반전을 되돌리는 용도라, 반전이 없는 여기서 적용하면 오히려 색이 뒤집힌다.
 *  2) 크루 목록 행 — CrewList/VisibleCrewList 의 40px 원형 썸네일.
 *
 * 로고가 없을 때는 실제 서비스와 똑같이 크루명 첫 글자로 떨어지는 모습을 보여준다.
 * (사진 삭제를 누른 사람이 무엇을 얻게 되는지 보고 판단할 수 있어야 하므로)
 */

import {
  CART_INK,
  MARKER_BG,
  MARKER_TEARDROP_PATH,
  MARKER_SIZE,
} from "@/components/map/markerTokens";

interface Props {
  /** 로고 URL. blob: 미리보기 URL 이거나 이미 올라간 public URL. 없으면 첫 글자 폴백. */
  logoUrl: string | null;
  /** 폴백 글자를 만들 크루명 */
  crewName: string;
}

export function CrewLogoPreview({ logoUrl, crewName }: Props) {
  const initial = crewName.trim().charAt(0) || "런";
  const { width, height, logo: logoSize, well: wellSize } = MARKER_SIZE;

  return (
    <div className='rounded-[4px] border border-cart-rule overflow-hidden'>
      <div className='px-3 py-2 border-b border-cart-rule'>
        <span className='font-mono text-[10px] tracking-[0.12em] text-cart-ink-60'>
          PREVIEW · 실제 서비스 화면
        </span>
      </div>

      <div className='flex items-stretch'>
        {/* 지도 마커 */}
        <div className='flex-1 flex flex-col items-center justify-center gap-2 py-4 px-3 border-r border-cart-rule'>
          <div
            style={{ width, height, position: "relative" }}
            aria-label='지도 마커 미리보기'
          >
            <svg
              width={width}
              height={height}
              viewBox='0 0 36 42'
              style={{ position: "absolute", inset: 0, display: "block" }}
            >
              <path
                d={MARKER_TEARDROP_PATH}
                fill={MARKER_BG}
                stroke={CART_INK}
                strokeWidth={1.4}
                strokeLinejoin='round'
              />
            </svg>
            <div
              style={{
                position: "absolute",
                top: 5,
                left: "50%",
                transform: "translateX(-50%)",
                width: wellSize,
                height: wellSize,
                background: MARKER_BG,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {logoUrl ? (
                // next/image 는 blob: URL 을 다루지 않으므로 여기서는 <img> 를 쓴다.
                // 실제 마커도 DOM 문자열 안의 <img> 라 렌더 결과는 동일하다.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=''
                  width={logoSize}
                  height={logoSize}
                  style={{
                    width: logoSize,
                    height: logoSize,
                    objectFit: "cover",
                    borderRadius: "50%",
                    display: "block",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: CART_INK,
                    lineHeight: 1,
                  }}
                >
                  {initial}
                </span>
              )}
            </div>
          </div>
          <span className='font-mono text-[10px] tracking-[0.08em] text-cart-ink-40'>
            지도 마커
          </span>
        </div>

        {/* 크루 목록 행 */}
        <div className='flex-1 flex flex-col justify-center gap-2 py-4 px-3'>
          <div className='flex items-center'>
            {logoUrl ? (
              <div className='relative flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 overflow-hidden border border-cart-rule rounded-full'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt=''
                  className='object-cover w-full h-full'
                />
              </div>
            ) : (
              <div className='flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 text-base font-medium rounded-full text-cart-ink-60 bg-cart-paper'>
                {initial}
              </div>
            )}
            <div className='flex-1 min-w-0'>
              <p className='font-medium truncate text-cart-ink text-[14px]'>
                {crewName.trim() || "크루 이름"}
              </p>
              <p className='text-[12px] text-cart-ink-40 truncate'>
                목록 · 검색 결과
              </p>
            </div>
          </div>
          <span className='font-mono text-[10px] tracking-[0.08em] text-cart-ink-40'>
            크루 목록
          </span>
        </div>
      </div>
    </div>
  );
}
