interface ClothingRange {
  minTemp: number;
  maxTemp: number;
  description: string;
  items: {
    name: string;
    icon: string;
    description: string;
  }[];
}

export const CLOTHING_RANGES: ClothingRange[] = [
  {
    minTemp: 30,
    maxTemp: Infinity,
    description: "매우 더운 날씨",
    items: [
      {
        name: "민소매",
        icon: "IoShirtOutline",
        description: "통기성 좋은 민소매",
      },
      { name: "반바지", icon: "GiShorts", description: "가벼운 반바지" },
      {
        name: "실내러닝",
        icon: "FaPersonRunning",
        description: "실내 러닝 권장",
      },
    ],
  },
  {
    minTemp: 20,
    maxTemp: 29,
    description: "따뜻한 날씨",
    items: [
      { name: "반팔", icon: "IoShirtOutline", description: "반팔 티셔츠" },
      { name: "반바지", icon: "GiShorts", description: "반바지" },
    ],
  },
  {
    minTemp: 10,
    maxTemp: 19,
    description: "선선한 날씨",
    items: [
      { name: "긴팔", icon: "IoShirtOutline", description: "얇은 긴팔 티셔츠" },
      {
        name: "반바지/7부",
        icon: "GiShorts",
        description: "반바지 또는 7부 바지",
      },
      {
        name: "얇은 자켓",
        icon: "IoShirtOutline",
        description: "가벼운 러닝 자켓",
      },
    ],
  },
  {
    minTemp: 0,
    maxTemp: 9,
    description: "쌀쌀한 날씨",
    items: [
      {
        name: "긴팔",
        icon: "IoShirtOutline",
        description: "기능성 긴팔 티셔츠",
      },
      { name: "긴바지", icon: "GiShorts", description: "긴바지" },
      { name: "자켓", icon: "IoShirtOutline", description: "방풍 자켓" },
    ],
  },
  {
    minTemp: -Infinity,
    maxTemp: -1,
    description: "추운 날씨",
    items: [
      { name: "내복", icon: "IoShirtOutline", description: "기능성 내복" },
      { name: "긴바지", icon: "GiShorts", description: "기모 긴바지" },
      { name: "패딩", icon: "IoShirtOutline", description: "러닝용 패딩" },
      { name: "목토시", icon: "IoShirtOutline", description: "넥워머" },
    ],
  },
];

export type { ClothingRange };
