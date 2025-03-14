"use client";

import { useEffect } from "react";

export function NoZoom() {
  useEffect(() => {
    // touchmove 이벤트 핸들러
    const handleTouchMove = (e: TouchEvent) => {
      // 두 손가락 이상 사용하는 제스처(핀치 줌/줌아웃)를 방지
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // 핀치 줌 방지를 위한 추가 설정
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // 스크롤 확대/축소 방지
    const preventZoomOnWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // 이벤트 리스너 추가
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchstart", preventZoom, { passive: false });
    document.addEventListener("wheel", preventZoomOnWheel, { passive: false });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchstart", preventZoom);
      document.removeEventListener("wheel", preventZoomOnWheel);
    };
  }, []);

  // 실제 DOM에 아무것도 렌더링하지 않음
  return null;
}
