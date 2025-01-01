"use client";

import { useEffect, useRef, useState } from "react";
import type { Crew } from "@/lib/types/crew";
import { CrewDetailSheet } from "./CrewDetailSheet";
import { SearchBox } from "../search/SearchBox";

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
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const initializeMap = () => {
      if (!window.naver) return;

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
      setIsMapLoaded(true);
    };

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}`;
    script.onload = initializeMap;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  // 마커 생성 및 이벤트 처리
  useEffect(() => {
    if (
      !isMapLoaded ||
      !mapInstanceRef.current ||
      typeof window === "undefined"
    )
      return;

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
        map: mapInstanceRef.current!,
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
  }, [crews, isMapLoaded]);

  // 크루 선택 시 지도 이동
  const handleCrewSelect = (crew: Crew) => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    const position = new window.naver.maps.LatLng(
      crew.location.lat,
      crew.location.lng
    );

    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);

    setSelectedCrew(crew);
    setIsDetailOpen(true);
  };

  return (
    <div style={{ width, height }} className='relative'>
      <div className='absolute top-4 left-0 right-0 z-[200]'>
        <SearchBox crews={crews} onSelect={handleCrewSelect} />
      </div>
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
