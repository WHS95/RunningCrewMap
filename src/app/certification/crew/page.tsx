"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ImagePlus,
  Search,
  Minus,
  Plus,
  Square,
  RectangleVertical,
} from "lucide-react";
import { CSS_VARIABLES } from "@/lib/constants";
import { crewService } from "@/lib/services";
import type { Crew } from "@/lib/types/crewFile";

interface CrewCertData {
  crewLogo: string | null;
  runningImage: string | null;
  distance: string;
  duration: string;
  pace: string;
}

interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

// interface TextPosition {
//   x: number;
//   y: number;
// }

type AspectRatio = "square" | "story";

// interface DraggableTextProps {
//   text: string;
//   position: TextPosition;
//   onPositionChange: (position: TextPosition) => void;
// }

// function DraggableText({
//   text,
//   position,
//   onPositionChange,
// }: DraggableTextProps) {
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

//   const handleMouseDown = (e: React.MouseEvent) => {
//     setIsDragging(true);
//     const rect = e.currentTarget.getBoundingClientRect();
//     setDragOffset({
//       x: e.clientX - rect.left,
//       y: e.clientY - rect.top,
//     });
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (!isDragging) return;

//     const parent = (e.currentTarget as HTMLElement).parentElement;
//     if (!parent) return;

//     const rect = parent.getBoundingClientRect();
//     const x = e.clientX - rect.left - dragOffset.x;
//     const y = e.clientY - rect.top - dragOffset.y;

//     onPositionChange({ x, y });
//   };

//   const handleMouseUp = () => {
//     setIsDragging(false);
//   };

//   return (
//     <div
//       className='absolute cursor-move select-none'
//       style={{
//         left: `${position.x}px`,
//         top: `${position.y}px`,
//         color: "white",
//         textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
//         fontWeight: "400",
//         fontSize: "28px",
//         letterSpacing: "0.5px",
//       }}
//       onMouseDown={handleMouseDown}
//       onMouseMove={handleMouseMove}
//       onMouseUp={handleMouseUp}
//       onMouseLeave={handleMouseUp}
//     >
//       {text}
//     </div>
//   );
// }

function EditableImage({
  image,
  position,
  onPositionChange,
  aspectRatio,
}: {
  image: string;
  position: ImagePosition;
  onPositionChange: (position: ImagePosition) => void;
  aspectRatio: AspectRatio;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    onPositionChange({
      ...position,
      x: newX,
      y: newY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(position.scale + delta, 0.5), 3);

    onPositionChange({
      ...position,
      scale: newScale,
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${
        aspectRatio === "square" ? "aspect-square" : "aspect-[9/16]"
      } bg-black`}
      onWheel={handleWheel}
    >
      <img
        src={image}
        alt='Preview'
        className='absolute transform-gpu'
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${position.scale})`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        draggable={false}
      />
    </div>
  );
}

function EditableLogo({
  image,
  position,
  onPositionChange,
}: {
  image: string;
  position: ImagePosition;
  onPositionChange: (position: ImagePosition) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    onPositionChange({
      ...position,
      x: newX,
      y: newY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(position.scale + delta, 0.2), 2);

    onPositionChange({
      ...position,
      scale: newScale,
    });
  };

  return (
    <div
      className='absolute cursor-move transform-gpu'
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${position.scale})`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <img
        src={image}
        alt='Crew Logo'
        className='object-contain w-20 h-20'
        draggable={false}
      />
    </div>
  );
}

export default function CrewCertificationPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("square");
  const [certData, setCertData] = useState<CrewCertData>({
    crewLogo: null,
    runningImage: null,
    distance: "",
    duration: "",
    pace: "",
  });

  const [imagePosition, setImagePosition] = useState<ImagePosition>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [logoPosition, setLogoPosition] = useState<ImagePosition>({
    x: 20,
    y: 20,
    scale: 1,
  });

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 크루 데이터 로드
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

  // 크루 검색 결과
  const filteredCrews = crews.filter((crew) =>
    crew.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCrewSelect = (crew: Crew) => {
    setSearchQuery(crew.name);
    setCertData((prev) => ({
      ...prev,
      crewLogo: crew.logo_image || null,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCertData((prev) => ({
          ...prev,
          runningImage: e.target?.result as string,
        }));
        // 이미지 업로드시 위치 초기화
        setImagePosition({ x: 0, y: 0, scale: 1 });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = () => {
    if (!certData.runningImage || !imageContainerRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // 캔버스 크기 설정
    const container = imageContainerRef.current;
    // const ratio = aspectRatio === "square" ? 1 : 16 / 9;
    canvas.width = 1080; // 인스타그램 권장 크기
    canvas.height = aspectRatio === "square" ? 1080 : 1920;

    // 배경 이미지 그리기
    const img = new Image();
    img.onload = () => {
      const scale = imagePosition.scale;
      const x = (imagePosition.x / container.clientWidth) * canvas.width;
      const y = (imagePosition.y / container.clientHeight) * canvas.height;

      ctx!.drawImage(img, x, y, img.width * scale, img.height * scale);

      // 크루 로고 그리기
      if (certData.crewLogo) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const logoScale = logoPosition.scale;
          const logoX = (logoPosition.x / container.clientWidth) * canvas.width;
          const logoY =
            (logoPosition.y / container.clientHeight) * canvas.height;

          ctx!.drawImage(
            logoImg,
            logoX,
            logoY,
            logoImg.width * logoScale,
            logoImg.height * logoScale
          );

          // 이미지 다운로드
          const link = document.createElement("a");
          link.download = "crew-certification.png";
          link.href = canvas.toDataURL();
          link.click();
        };
        logoImg.src = certData.crewLogo;
      }
    };
    img.src = certData.runningImage;
  };

  return (
    <div
      className='min-h-screen p-4'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <div className='max-w-md mx-auto space-y-6'>
        <h1 className='text-2xl font-bold'>크루 인증샷 만들기</h1>

        {/* 비율 선택 */}
        <div className='flex gap-2'>
          <Button
            variant={aspectRatio === "square" ? "default" : "outline"}
            onClick={() => setAspectRatio("square")}
            className='flex-1'
          >
            <Square className='w-4 h-4 mr-2' />
            정사각형
          </Button>
          <Button
            variant={aspectRatio === "story" ? "default" : "outline"}
            onClick={() => setAspectRatio("story")}
            className='flex-1'
          >
            <RectangleVertical className='w-4 h-4 mr-2' />
            스토리
          </Button>
        </div>

        {/* 크루 검색 */}
        <div className='space-y-2'>
          <Label>크루 검색</Label>
          <div className='relative'>
            <Search className='absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground' />
            <Input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='크루명을 입력하세요'
              className='pl-9'
            />

            {/* 검색 결과 */}
            {searchQuery && filteredCrews.length > 0 && (
              <div className='absolute left-0 right-0 z-10 mt-1 overflow-auto border rounded-md shadow-lg bg-background max-h-48'>
                {filteredCrews.map((crew) => (
                  <button
                    key={crew.id}
                    onClick={() => handleCrewSelect(crew)}
                    className='flex items-center w-full gap-3 px-3 py-2 transition-colors hover:bg-accent'
                  >
                    {crew.logo_image && (
                      <img
                        src={crew.logo_image}
                        alt={crew.name}
                        className='w-8 h-8 rounded-full'
                      />
                    )}
                    <span>{crew.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 이미지 편집 영역 */}
        <div className='space-y-2'>
          <Label>러닝 사진</Label>
          <div className='relative' ref={imageContainerRef}>
            <input
              type='file'
              accept='image/*'
              onChange={handleImageUpload}
              className='hidden'
              id='image-upload'
            />
            {certData.runningImage ? (
              <div className='relative'>
                <EditableImage
                  image={certData.runningImage}
                  position={imagePosition}
                  onPositionChange={setImagePosition}
                  aspectRatio={aspectRatio}
                />
                {certData.crewLogo && (
                  <EditableLogo
                    image={certData.crewLogo}
                    position={logoPosition}
                    onPositionChange={setLogoPosition}
                  />
                )}
                <div className='absolute flex gap-2 bottom-4 right-4'>
                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() =>
                      setImagePosition((prev) => ({
                        ...prev,
                        scale: Math.max(prev.scale - 0.1, 0.5),
                      }))
                    }
                  >
                    <Minus className='w-4 h-4' />
                  </Button>
                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() =>
                      setImagePosition((prev) => ({
                        ...prev,
                        scale: Math.min(prev.scale + 0.1, 3),
                      }))
                    }
                  >
                    <Plus className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor='image-upload'
                className='flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer aspect-square hover:bg-accent/50'
              >
                <div className='flex flex-col items-center'>
                  <ImagePlus className='w-8 h-8 mb-2 text-muted-foreground' />
                  <span className='text-sm text-muted-foreground'>
                    러닝 사진 업로드
                  </span>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* 인증샷 생성 버튼 */}
        <Button
          onClick={generateImage}
          className='w-full'
          disabled={!certData.runningImage || !certData.crewLogo}
        >
          인증샷 생성
        </Button>
      </div>
    </div>
  );
}
