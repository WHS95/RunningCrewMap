import { CrewLocation } from "@/types/map";

export const dummyCrews: CrewLocation[] = [
  {
    id: 1,
    name: "서울역 러너스",
    location: {
      lat: 37.5559,
      lng: 126.9723,
    },
    description: "서울역을 중심으로 활동하는 러닝 크루입니다.",
  },
  {
    id: 2,
    name: "수서 러닝 크루",
    location: {
      lat: 37.4869,
      lng: 127.1018,
    },
    description: "수서역 주변에서 활동하는 러닝 크루입니다.",
  },
  {
    id: 3,
    name: "강남 러너스",
    location: {
      lat: 37.498,
      lng: 127.0276,
    },
    description: "강남역 인근에서 활동하는 러닝 크루입니다.",
  },
];
