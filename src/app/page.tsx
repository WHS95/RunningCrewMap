"use client";

import { useEffect, useState } from "react";
import NaverMap from "@/components/map/NaverMap";
import { crewService } from "@/lib/services";
import type { Crew } from "@/lib/types/crew";

export default function Home() {
  const [crews, setCrews] = useState<Crew[]>([]);

  useEffect(() => {
    const loadCrews = async () => {
      try {
        const data = await crewService.getAllCrews();
        setCrews(data);
      } catch (error) {
        console.error("Failed to load crews:", error);
      }
    };

    loadCrews();
  }, []);

  return (
    <main className='min-h-screen'>
      <NaverMap
        width='100%'
        height='100vh'
        initialCenter={{ lat: 37.5665, lng: 126.978 }} // 서울 시청 좌표
        initialZoom={13}
        crews={crews}
      />
    </main>
  );
}
