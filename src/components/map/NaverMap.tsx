"use client";

import { useEffect, useRef, useState } from "react";
import type { Crew } from "@/lib/types/crew";
import { CrewDetailSheet } from "./CrewDetailSheet";

interface NaverMapProps {
  width: string;
  height: string;
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  crews: Crew[];
}

export default function NaverMap({
  width,
  height,
  initialCenter,
  initialZoom,
  crews,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    const initializeMap = () => {
      if (typeof window === "undefined" || !window.naver) return;

      const mapOptions = {
        center: new window.naver.maps.LatLng(
          initialCenter.lat,
          initialCenter.lng
        ),
        zoom: initialZoom,
        minZoom: 9,
        maxZoom: 21,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
      };

      const mapDiv = mapRef.current;
      if (!mapDiv) return;

      mapInstanceRef.current = new window.naver.maps.Map(mapDiv, mapOptions);
    };

    // 네이버 지도 스크립트 로드
    if (window.naver && window.naver.maps) {
      initializeMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}`;
      script.onload = initializeMap;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  // 마커 생성 및 이벤트 처리
  useEffect(() => {
    const mapInstance = mapInstanceRef.current;
    if (!mapInstance) return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 새로운 마커 생성
    crews.forEach((crew) => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(
          crew.location.lat,
          crew.location.lng
        ),
        map: mapInstance,
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, "click", () => {
        setSelectedCrew(crew);
        setIsDetailOpen(true);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [crews]);

  return (
    <div style={{ width, height }} className='relative'>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      <CrewDetailSheet
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCrew(null);
        }}
      />
    </div>
  );
}
