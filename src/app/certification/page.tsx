"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus } from "lucide-react";
import { CSS_VARIABLES } from "@/lib/constants";

interface RunningData {
  distance: string;
  duration: string;
  pace: string;
  calories: string;
  elevation: string;
  heartRate: string;
  cadence: string;
}

interface TextPosition {
  x: number;
  y: number;
}

interface DraggableTextProps {
  text: string;
  position: TextPosition;
  onPositionChange: (position: TextPosition) => void;
}

function DraggableText({
  text,
  position,
  onPositionChange,
}: DraggableTextProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    onPositionChange({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className='absolute cursor-move select-none'
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        color: "white",
        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
        fontWeight: "400",
        fontSize: "28px",
        letterSpacing: "0.5px",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {text}
    </div>
  );
}

export default function CertificationPage() {
  const [image, setImage] = useState<string | null>(null);
  const [runningData, setRunningData] = useState<RunningData>({
    distance: "",
    duration: "",
    pace: "",
    calories: "",
    elevation: "",
    heartRate: "",
    cadence: "",
  });
  const [textPositions, setTextPositions] = useState<
    Record<string, TextPosition>
  >({
    distance: { x: 20, y: 20 },
    duration: { x: 20, y: 60 },
    pace: { x: 20, y: 100 },
    calories: { x: 20, y: 140 },
    elevation: { x: 20, y: 180 },
    heartRate: { x: 20, y: 220 },
    cadence: { x: 20, y: 260 },
  });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof RunningData
  ) => {
    setRunningData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const generateImage = () => {
    if (!image || !imageContainerRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx!.drawImage(img, 0, 0);

      // 텍스트 스타일 설정
      ctx!.fillStyle = "white";
      ctx!.font = "400 28px 'Racing Sans One'";
      ctx!.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx!.shadowBlur = 4;
      ctx!.shadowOffsetX = 2;
      ctx!.shadowOffsetY = 2;
      ctx!.letterSpacing = "0.5px";

      // 각 텍스트의 현재 위치를 기반으로 그리기
      const scale = img.width / imageContainerRef.current!.clientWidth;

      Object.entries(runningData).forEach(([key, value]) => {
        const position = textPositions[key];
        if (!position) return;

        const text = getFormattedText(key, value);
        if (text) {
          ctx!.fillText(text, position.x * scale, position.y * scale);
        }
      });

      // 이미지 다운로드
      const link = document.createElement("a");
      link.download = "running-certification.png";
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = image;
  };

  const getFormattedText = (key: string, value: string): string => {
    if (!value) return "";

    switch (key) {
      case "distance":
        return `${value}km`;
      case "duration":
        return `${value}`;
      case "pace":
        return `${value}/km`;
      case "calories":
        return `${value}kcal`;
      case "elevation":
        return `${value}m`;
      case "heartRate":
        return `${value}bpm`;
      case "cadence":
        return `${value}spm`;
      default:
        return value;
    }
  };

  return (
    <div
      className='min-h-screen p-4'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <div className='max-w-md mx-auto space-y-6'>
        <h1 className='text-2xl font-bold'>러닝 인증샷 만들기</h1>

        {/* 이미지 업로드 및 미리보기 */}
        <div className='space-y-2'>
          <Label>러닝 사진</Label>
          <div className='relative'>
            <input
              type='file'
              accept='image/*'
              onChange={handleImageUpload}
              className='hidden'
              id='image-upload'
            />
            <div ref={imageContainerRef} className='relative'>
              <label
                htmlFor='image-upload'
                className='flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50'
              >
                {image ? (
                  <img
                    src={image}
                    alt='Preview'
                    className='object-contain w-full h-full rounded-lg'
                  />
                ) : (
                  <div className='flex flex-col items-center'>
                    <ImagePlus className='w-8 h-8 mb-2 text-muted-foreground' />
                    <span className='text-sm text-muted-foreground'>
                      클릭하여 사진 업로드
                    </span>
                  </div>
                )}
              </label>

              {/* 드래그 가능한 텍스트 오버레이 */}
              {image && (
                <div className='absolute inset-0'>
                  {Object.entries(runningData).map(
                    ([key, value]) =>
                      value && (
                        <DraggableText
                          key={key}
                          text={getFormattedText(key, value)}
                          position={textPositions[key]}
                          onPositionChange={(newPosition) => {
                            setTextPositions((prev) => ({
                              ...prev,
                              [key]: newPosition,
                            }));
                          }}
                        />
                      )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 러닝 데이터 입력 폼 */}
        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>거리 (km)</Label>
            <Input
              type='number'
              step='0.01'
              value={runningData.distance}
              onChange={(e) => handleInputChange(e, "distance")}
              placeholder='0.00'
            />
          </div>

          <div className='grid gap-2'>
            <Label>러닝 시간 (hh:mm:ss)</Label>
            <Input
              type='text'
              value={runningData.duration}
              onChange={(e) => handleInputChange(e, "duration")}
              placeholder='00:00:00'
            />
          </div>

          <div className='grid gap-2'>
            <Label>평균 페이스 (mm:ss)</Label>
            <Input
              type='text'
              value={runningData.pace}
              onChange={(e) => handleInputChange(e, "pace")}
              placeholder='00:00'
            />
          </div>

          <div className='grid gap-2'>
            <Label>칼로리 (kcal)</Label>
            <Input
              type='number'
              value={runningData.calories}
              onChange={(e) => handleInputChange(e, "calories")}
              placeholder='0'
            />
          </div>

          <div className='grid gap-2'>
            <Label>고도 (m)</Label>
            <Input
              type='number'
              value={runningData.elevation}
              onChange={(e) => handleInputChange(e, "elevation")}
              placeholder='0'
            />
          </div>

          <div className='grid gap-2'>
            <Label>평균 심박수 (bpm)</Label>
            <Input
              type='number'
              value={runningData.heartRate}
              onChange={(e) => handleInputChange(e, "heartRate")}
              placeholder='0'
            />
          </div>

          <div className='grid gap-2'>
            <Label>케이던스 (spm)</Label>
            <Input
              type='number'
              value={runningData.cadence}
              onChange={(e) => handleInputChange(e, "cadence")}
              placeholder='0'
            />
          </div>
        </div>

        {/* 생성 버튼 */}
        <Button onClick={generateImage} className='w-full' disabled={!image}>
          인증샷 생성하기
        </Button>
      </div>
    </div>
  );
}
