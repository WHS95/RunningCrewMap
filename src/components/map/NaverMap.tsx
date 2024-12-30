"use client";

import { useEffect, useRef } from "react";
import { NaverMapProps } from "@/types/map";
import SearchBox from "../search/SearchBox";
import type { Crew } from "@/lib/types/crew";

interface ExtendedNaverMapProps extends NaverMapProps {
  crews: Crew[];
}

const NaverMap = ({
  width,
  height,
  initialCenter,
  initialZoom,
  crews,
}: ExtendedNaverMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);

  const handleSearch = (crew: Crew) => {
    if (!mapInstanceRef.current) return;

    const position = new window.naver.maps.LatLng(
      crew.location.lat,
      crew.location.lng
    );

    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      const mapOptions = {
        center: new window.naver.maps.LatLng(
          initialCenter.lat,
          initialCenter.lng
        ),
        zoom: initialZoom,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
      };

      mapInstanceRef.current = new window.naver.maps.Map(
        mapRef.current!,
        mapOptions
      );

      // 크루 마커 생성
      crews.forEach((crew) => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(
            crew.location.lat,
            crew.location.lng
          ),
          map: mapInstanceRef.current as naver.maps.Map,
          title: crew.name,
        });

        // 마커 클릭 시 정보창 표시
        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h3>${crew.name}</h3>
              <p>${crew.description}</p>
              ${crew.instagram ? `<p>Instagram: ${crew.instagram}</p>` : ""}
            </div>
          `,
        });

        window.naver.maps.Event.addListener(marker, "click", () => {
          if (infoWindow.getMap()) {
            infoWindow.close();
          } else {
            infoWindow.open(mapInstanceRef.current as naver.maps.Map, marker);
          }
        });
      });
    };

    // 네이버 지도 스크립트가 이미 로드되어 있는지 확인
    if (window.naver && window.naver.maps) {
      initMap();
    } else {
      // 네이버 지도 스크립트 로드
      const script = document.createElement("script");
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}`;
      script.onload = initMap;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [initialCenter, initialZoom, crews]);

  return (
    <div style={{ position: "relative", width, height }}>
      <SearchBox crews={crews} onSearch={handleSearch} />
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      <div className='absolute bottom-4 right-4'>
        <a
          href='/register'
          className='bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors'
        >
          크루 등록하기
        </a>
      </div>
    </div>
  );
};

export default NaverMap;
