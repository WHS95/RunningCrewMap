/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import { CSS_VARIABLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { KickerLabel, TagPill } from "@/components/design/cartographic";
import { cn } from "@/lib/utils";
import { questions } from "@/util/mbti/questions";
import {
  calculateMBTI,
  analyzeRunningMBTI,
  getCompatibility,
  getRecommendations,
} from "@/util/mbti/analyzer";
import { copyResultLink, downloadResult } from "@/util/mbti/share";
import {
  RunningPreference,
  RunningMBTIResult,
  Question,
} from "@/util/mbti/types";

// MBTI 유형 목록
const mbtiTypes = [
  "ENFJ",
  "ENFP",
  "ENTJ",
  "ENTP",
  "ESFJ",
  "ESFP",
  "ESTJ",
  "ESTP",
  "INFJ",
  "INFP",
  "INTJ",
  "INTP",
  "ISFJ",
  "ISFP",
  "ISTJ",
  "ISTP",
];

export default function MBTIPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // answers는 결과 계산에 내부적으로 사용되므로 유지합니다
  const [_answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [result, setResult] = useState<RunningMBTIResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [showGenderSelection, setShowGenderSelection] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // 카드 뽑기 관련 상태
  const [flippedCard, setFlippedCard] = useState<"male" | "female" | null>(
    null
  );
  // 미래 확장성을 위해 selectedCardIndex 유지
  const [_selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [cardDeckAnimation, setCardDeckAnimation] = useState<
    "idle" | "flip" | "spread" | "select"
  >("idle");
  const [startButtonClicked, setStartButtonClicked] = useState(false);

  // 질문 전환 애니메이션을 위한 상태
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 캐러셀 관련 상태
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const slideWidth = 140; // 각 슬라이드 이미지의 너비

  // MBTI 점수 계산용 상태
  const [scores, setScores] = useState<{
    E: number;
    I: number;
    S: number;
    N: number;
    T: number;
    F: number;
    J: number;
    P: number;
  }>({
    E: 0,
    I: 0,
    S: 0,
    N: 0,
    T: 0,
    F: 0,
    J: 0,
    P: 0,
  });

  // 러닝 선호도 결정용 상태
  const [runningPreferences, setRunningPreferences] =
    useState<RunningPreference>({
      pace: "medium",
      distance: "medium",
      time: "morning",
      social: "small",
      frequency: "weekly",
    });

  // 진행도 계산
  const progress = Math.round((currentQuestionIndex / questions.length) * 100);

  // 현재 질문
  const currentQuestion = questions[currentQuestionIndex] as Question;

  // 자동 슬라이드 기능
  useEffect(() => {
    if (!showGenderSelection) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % (mbtiTypes.length * 2)); // 남성/여성 모두 표시하기 위해 *2
    }, 2000);

    return () => clearInterval(interval);
  }, [showGenderSelection]);

  // 슬라이드 위치 업데이트
  useEffect(() => {
    if (carouselRef.current) {
      // 슬라이드가 계속 왼쪽으로 움직이는 효과
      const position = -currentSlide * slideWidth;
      carouselRef.current.style.transform = `translateX(${position}px)`;

      // 끝까지 가면 처음으로 순간이동 (무한 슬라이드 효과)
      if (currentSlide >= mbtiTypes.length * 2 - 4) {
        setTimeout(() => {
          if (carouselRef.current) {
            carouselRef.current.style.transition = "none";
            setCurrentSlide(0);
            setTimeout(() => {
              if (carouselRef.current) {
                carouselRef.current.style.transition =
                  "transform 1000ms ease-in-out";
              }
            }, 50);
          }
        }, 1000);
      }
    }
  }, [currentSlide]);

  // 답변 선택 처리
  const handleAnswer = (optionValue: string) => {
    if (isLoading) return;

    setIsLoading(true);
    // 트랜지션 애니메이션 제거
    // setIsTransitioning(true);

    // 선택한 답변 저장
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionValue }));

    // 현재 선택한 옵션 찾기
    const selectedOption = currentQuestion.options.find(
      (opt) => opt.value === optionValue
    );
    if (selectedOption) {
      // MBTI 점수 업데이트
      const { type, value } = selectedOption.score;
      setScores((prev) => ({
        ...prev,
        [type]: prev[type as keyof typeof prev] + value,
      }));

      // 러닝 선호도 업데이트 (특정 질문에서만)
      if (currentQuestion.category === "running") {
        if (
          optionValue === "fast" ||
          optionValue === "medium" ||
          optionValue === "slow"
        ) {
          setRunningPreferences((prev) => ({
            ...prev,
            pace: optionValue as "fast" | "medium" | "slow",
          }));
        } else if (
          optionValue === "short" ||
          optionValue === "medium" ||
          optionValue === "long"
        ) {
          setRunningPreferences((prev) => ({
            ...prev,
            distance: optionValue as "short" | "medium" | "long",
          }));
        } else if (
          optionValue === "morning" ||
          optionValue === "afternoon" ||
          optionValue === "evening"
        ) {
          setRunningPreferences((prev) => ({
            ...prev,
            time: optionValue as "morning" | "afternoon" | "evening",
          }));
        } else if (
          optionValue === "alone" ||
          optionValue === "small" ||
          optionValue === "large"
        ) {
          setRunningPreferences((prev) => ({
            ...prev,
            social: optionValue as "alone" | "small" | "large",
          }));
        } else if (
          optionValue === "daily" ||
          optionValue === "weekly" ||
          optionValue === "monthly"
        ) {
          setRunningPreferences((prev) => ({
            ...prev,
            frequency: optionValue as "daily" | "weekly" | "monthly",
          }));
        }
      }
    }

    // 다음 질문으로 이동 또는 결과 표시
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      } else {
        setIsCompleted(true);
        setTimeout(() => {
          calculateResult();
        }, 1000);
      }
      setIsLoading(false);
      // setIsTransitioning(false);
    }, 500);
  };

  // 더미 클립보드 체크 SVG (이미지 로드 실패 시 사용)
  const dummyClipboardSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%2349de80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/><rect x="6" y="5" width="12" height="15" rx="2" stroke="%23d4d4d8" fill="none"/></svg>`;

  // 결과 계산
  const calculateResult = () => {
    const mbtiType = calculateMBTI(scores);
    const result = analyzeRunningMBTI(mbtiType, runningPreferences);
    setResult(result);
    setShowResult(true);
  };

  // 성별 선택 처리
  const handleGenderSelect = (selectedGender: "male" | "female") => {
    setGender(selectedGender);
    setShowGenderSelection(false);
  };

  // 결과 이미지 경로 생성
  const getResultImagePath = (mbtiType: string): string => {
    if (!gender) return `/mbti/default.png`; // 기본 이미지 경로
    return `/mbti/${gender}/${gender}_${mbtiType.toUpperCase()}.png`;
  };

  // 이미지 로드 실패 시 실행될 함수
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    mbtiType: string
  ) => {
    const img = e.currentTarget;

    // 캔버스를 이용한 텍스트 이미지 생성
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // 배경 그리기
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 테두리 그리기
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // MBTI 텍스트 그리기
      ctx.font = "bold 60px sans-serif";
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        mbtiType.toUpperCase(),
        canvas.width / 2,
        canvas.height / 2 - 30
      );

      // 러닝 스타일 텍스트 그리기
      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#4b5563";
      ctx.fillText(
        result?.runningStyle || "러닝 스타일",
        canvas.width / 2,
        canvas.height / 2 + 40
      );

      // 생성된 이미지 적용
      img.src = canvas.toDataURL("image/png");
    } else {
      // 컨텍스트를 얻지 못한 경우 이미지 숨김
      img.style.display = "none";
    }
  };

  // 결과 공유하기 - 성별 정보 추가
  const handleShare = async () => {
    if (!result || !gender) return;

    try {
      // 성별 정보를 URL에 포함시키도록 함수 수정
      const response = await copyResultLink(result, gender);
      toast.success(response.message);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  // 결과 이미지 다운로드
  const handleDownload = async () => {
    if (!result) return;

    try {
      await downloadResult("result-container");
      toast.success("결과 이미지가 다운로드 되었습니다!");
    } catch {
      toast.error("이미지 다운로드에 실패했습니다.");
    }
  };

  // 다시 테스트하기
  const handleRestart = () => {
    // 페이지 리다이렉트로 변경
    window.location.href = "/mbti";
  };

  // URL에서 결과 데이터 파싱
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mbtiParam = urlParams.get("mbti");
    const styleParam = urlParams.get("style");
    const genderParam = urlParams.get("gender") as "male" | "female" | null;

    if (mbtiParam && styleParam) {
      // URL에서 결과 파라미터가 있으면 결과 화면 바로 보여주기
      const decodedStyle = decodeURIComponent(styleParam);
      setGender(genderParam || "male"); // 기본값은 male
      setShowGenderSelection(false);

      // 기본 러닝 선호도 설정
      const defaultPreference: RunningPreference = {
        pace: "medium",
        distance: "medium",
        time: "morning",
        social: "small",
        frequency: "weekly",
      };

      const fakeResult: RunningMBTIResult = {
        mbtiType: mbtiParam,
        runningStyle: decodedStyle,
        description: `당신은 ${decodedStyle}이며, MBTI 유형은 ${mbtiParam}입니다.`,
        recommendations: getRecommendations(mbtiParam, defaultPreference),
        compatibility: getCompatibility(mbtiParam),
      };
      setResult(fakeResult);
      setShowResult(true);
    }
  }, []);

  // 카드 선택 처리
  const handleCardSelect = (gender: "male" | "female", index: number) => {
    if (cardDeckAnimation !== "idle") return;

    // 즉시 성별 선택하고 다음 화면으로 이동
    setFlippedCard(gender);
    setSelectedCardIndex(index);
    handleGenderSelect(gender);
  };

  // 카드 덱 보여주기
  const handleStartClick = () => {
    setStartButtonClicked(true);
    setCardDeckAnimation("spread");

    // 카드 펼쳐진 후 상태 초기화
    setTimeout(() => {
      setCardDeckAnimation("idle");
    }, 1000);
  };

  return (
    <div
      className='flex flex-col min-h-screen bg-background'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: "80px", // 하단 네비게이션바 높이보다 넉넉하게 설정
      }}
    >
      <div className='w-full max-w-md px-3 pt-6 pb-16 mx-auto'>
        {showGenderSelection ? (
          // Cartographic intro + gender selection
          <div className='px-3 py-6'>
            <KickerLabel tone="lime" className='text-center mb-3'>
              · RUNNING MBTI · 16 TYPES
            </KickerLabel>
            <h1 className='font-display text-[30px] font-bold tracking-[-0.025em] text-cart-ink text-center leading-[1.1] mb-8'>
              당신의<br/>러너 타입은?
            </h1>

            {!startButtonClicked ? (
              <div className='flex flex-col items-center justify-center gap-6'>
                <div className='relative w-full max-w-[280px]'>
                  <div className='aspect-[3/4] bg-cart-paper border border-cart-rule rounded-[4px] flex items-center justify-center'>
                    <div className='flex flex-col items-center px-6'>
                      <svg
                        className='w-16 h-16 mb-4 text-[hsl(var(--lime))]'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5'
                        />
                      </svg>
                      <KickerLabel tone="lime" className='mb-2'>· 12 QUESTIONS · 16 TYPES ·</KickerLabel>
                      <p className='font-mono text-[10px] tracking-[0.05em] text-cart-ink-60 text-center mt-2'>
                        나의 러닝 스타일을 알아보세요
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className='w-full py-4 text-[15px] font-bold bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] hover:bg-[hsl(var(--lime))]/90'
                  onClick={handleStartClick}
                >
                  시작하기 →
                </Button>
              </div>
            ) : (
              // Cartographic gender selection
              <div className='flex flex-col items-center w-full'>
                <KickerLabel tone="muted" className='mb-5 tracking-[0.22em]'>
                  · SELECT YOUR PROFILE ·
                </KickerLabel>
                <div className='w-full flex flex-col gap-2.5 mb-6'>
                  {[
                    { g: "male" as const, letter: "A", kr: "남성", en: "MALE RUNNER" },
                    { g: "female" as const, letter: "B", kr: "여성", en: "FEMALE RUNNER" },
                  ].map((opt) => (
                    <button
                      key={opt.g}
                      onClick={() => handleCardSelect(opt.g, 0)}
                      className='w-full py-4 px-4 bg-cart-paper border border-cart-rule rounded-[4px] text-left transition-transform active:scale-[0.98] hover:border-[hsl(var(--lime))]/40'
                    >
                      <div className='flex items-center gap-3.5'>
                        <div className='w-9 h-9 rounded-[4px] border border-cart-rule flex items-center justify-center font-display text-[14px] font-bold text-cart-ink flex-shrink-0'>
                          {opt.letter}
                        </div>
                        <div className='flex-1'>
                          <div className='text-[15px] font-semibold text-cart-ink'>{opt.kr}</div>
                          <KickerLabel tone="muted" className='mt-1 tracking-[0.18em]'>
                            · {opt.en}
                          </KickerLabel>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {/* legacy card-flip layout retained but hidden — preserves animation state hooks */}
                <div className='relative w-full h-0 mb-0 overflow-hidden opacity-0 pointer-events-none'>
                  {/* 남성 카드 덱 - z-index 조정하여 뒤로 이동 */}
                  <div
                    className={`absolute ${
                      cardDeckAnimation === "spread"
                        ? "left-[5%]"
                        : "left-[15%]"
                    } top-0 transition-all duration-700 ease-out preserve-3d -z-10
                    ${
                      flippedCard === "male" && cardDeckAnimation === "select"
                        ? "left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 scale-110 z-20"
                        : ""
                    }
                    ${
                      flippedCard === "male" && cardDeckAnimation === "flip"
                        ? "left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 scale-110 z-20 rotate-y-180"
                        : ""
                    }
                  `}
                  >
                    {/* 카드 스택 효과 */}
                    <div className='absolute w-32 bg-blue-100 left-1 top-1 h-44 rounded-xl -z-10'></div>

                    <div
                      className={`relative w-32 h-44 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl shadow-md flex flex-col items-center justify-center cursor-pointer transform transition-transform duration-300 preserve-3d hover:shadow-lg
                        ${cardDeckAnimation === "select" ? "shadow-xl" : ""}
                        ${
                          cardDeckAnimation === "flip" && flippedCard === "male"
                            ? "rotate-y-180"
                            : ""
                        }
                      `}
                      onClick={() => handleCardSelect("male", 0)}
                    >
                      {/* 카드 앞면 */}
                      <div
                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center rounded-xl p-2 backface-hidden
                        ${
                          cardDeckAnimation === "flip" && flippedCard === "male"
                            ? "opacity-0"
                            : "opacity-100"
                        }
                      `}
                      >
                        <div className='absolute flex items-center justify-center w-8 h-8 text-xl font-bold text-blue-600 bg-blue-100 rounded-full top-2 left-2'>
                          ♂
                        </div>

                        <div className='flex flex-col items-center justify-center h-full'>
                          <div className='flex items-center justify-center w-16 h-16 mb-2 bg-blue-300 rounded-full'>
                            <span className='text-4xl font-bold text-blue-600'>
                              ♂
                            </span>
                          </div>
                          <p className='text-base font-medium text-center text-blue-600'>
                            남성
                          </p>
                        </div>
                      </div>

                      {/* 카드 뒷면 */}
                      <div
                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-blue-50 rounded-xl p-2 backface-hidden rotate-y-180 border-2 border-blue-200
                        ${
                          cardDeckAnimation === "flip" && flippedCard === "male"
                            ? "opacity-100"
                            : "opacity-0"
                        }
                      `}
                      >
                        <div className='flex flex-col items-center justify-center'>
                          <div className='flex items-center justify-center w-16 h-16 mb-2 bg-blue-300 rounded-full'>
                            <svg
                              className='w-10 h-10 text-blue-600'
                              xmlns='http://www.w3.org/2000/svg'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={1.5}
                                d='M5 13l4 4L19 7'
                              />
                            </svg>
                          </div>
                          <p className='text-base font-medium text-center text-blue-600'>
                            남성 러너
                          </p>
                          <p className='mt-1 text-sm text-center text-gray-500'>
                            선택 완료
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 여성 카드 덱 - 앞으로 이동 */}
                  <div
                    className={`absolute ${
                      cardDeckAnimation === "spread"
                        ? "right-[5%]"
                        : "right-[15%]"
                    } top-0 transition-all duration-700 ease-out preserve-3d z-10
                    ${
                      flippedCard === "female" && cardDeckAnimation === "select"
                        ? "left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 scale-110 z-20"
                        : ""
                    }
                    ${
                      flippedCard === "female" && cardDeckAnimation === "flip"
                        ? "left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 scale-110 z-20 rotate-y-180"
                        : ""
                    }
                  `}
                  >
                    {/* 카드 스택 효과 */}
                    <div className='absolute w-32 bg-pink-100 left-1 top-1 h-44 rounded-xl -z-10'></div>

                    <div
                      className={`relative w-32 h-44 bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 rounded-xl shadow-md flex flex-col items-center justify-center cursor-pointer transform transition-transform duration-300 preserve-3d hover:shadow-lg
                        ${cardDeckAnimation === "select" ? "shadow-xl" : ""}
                        ${
                          cardDeckAnimation === "flip" &&
                          flippedCard === "female"
                            ? "rotate-y-180"
                            : ""
                        }
                      `}
                      onClick={() => handleCardSelect("female", 0)}
                    >
                      {/* 카드 앞면 */}
                      <div
                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center rounded-xl p-2 backface-hidden
                        ${
                          cardDeckAnimation === "flip" &&
                          flippedCard === "female"
                            ? "opacity-0"
                            : "opacity-100"
                        }
                      `}
                      >
                        <div className='absolute flex items-center justify-center w-8 h-8 text-xl font-bold text-pink-600 bg-pink-100 rounded-full top-2 left-2'>
                          ♀
                        </div>

                        <div className='flex flex-col items-center justify-center h-full'>
                          <div className='flex items-center justify-center w-16 h-16 mb-2 bg-pink-300 rounded-full'>
                            <span className='text-4xl font-bold text-pink-600'>
                              ♀
                            </span>
                          </div>
                          <p className='text-base font-medium text-center text-pink-600'>
                            여성
                          </p>
                        </div>
                      </div>

                      {/* 카드 뒷면 */}
                      <div
                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-pink-50 rounded-xl p-2 backface-hidden rotate-y-180 border-2 border-pink-200
                        ${
                          cardDeckAnimation === "flip" &&
                          flippedCard === "female"
                            ? "opacity-100"
                            : "opacity-0"
                        }
                      `}
                      >
                        <div className='flex flex-col items-center justify-center'>
                          <div className='flex items-center justify-center w-16 h-16 mb-2 bg-pink-300 rounded-full'>
                            <svg
                              className='w-10 h-10 text-pink-600'
                              xmlns='http://www.w3.org/2000/svg'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={1.5}
                                d='M5 13l4 4L19 7'
                              />
                            </svg>
                          </div>
                          <p className='text-base font-medium text-center text-pink-600'>
                            여성 러너
                          </p>
                          <p className='mt-1 text-sm text-center text-gray-500'>
                            선택 완료
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 안내 텍스트 */}
                  <div className='absolute bottom-0 left-0 right-0 text-center'>
                    <p className='text-sm text-gray-500'>
                      {cardDeckAnimation === "idle"
                        ? "성별 카드를 선택해주세요"
                        : cardDeckAnimation === "select"
                        ? "카드를 확인합니다..."
                        : cardDeckAnimation === "flip"
                        ? "준비 완료!"
                        : "카드가 펼쳐집니다..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !showResult ? (
          <>
            {/* Cartographic stepper header */}
            <div className='mb-7'>
              <KickerLabel tone="lime" className='text-center mb-3'>
                ● QUESTION · {String(currentQuestionIndex + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
              </KickerLabel>
              {/* segmented progress dots */}
              <div className='flex gap-1 mb-2'>
                {Array.from({ length: questions.length }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-[3px] rounded-full ${
                      i < currentQuestionIndex
                        ? "bg-[hsl(var(--lime))]"
                        : i === currentQuestionIndex
                        ? "bg-[hsl(var(--lime))]/60"
                        : "bg-cart-rule"
                    }`}
                  />
                ))}
              </div>
              <Progress value={progress} className='hidden' />
            </div>

            {isCompleted ? (
              <div className='flex flex-col items-center justify-center p-8 bg-cart-paper border border-cart-rule rounded-[4px]'>
                <div className='flex flex-col items-center mb-6'>
                  <svg
                    className='w-12 h-12 mb-4 text-[hsl(var(--lime))] animate-spin'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  <KickerLabel tone="lime" className='mb-2'>· ANALYZING ·</KickerLabel>
                  <h2 className='font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink text-center'>
                    결과 분석 중
                  </h2>
                </div>

                <div className='w-full bg-cart-rule h-[2px] rounded-full overflow-hidden'>
                  <div className='h-full bg-[hsl(var(--lime))] animate-progress-completion'></div>
                </div>
              </div>
            ) : (
              currentQuestion && (
                <div className='flex flex-col'>
                  {/* Question */}
                  <div className='px-2 mb-7'>
                    <KickerLabel tone="muted" className='mb-3 tracking-[0.22em]'>
                      QUESTION · {String(currentQuestionIndex + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
                    </KickerLabel>
                    <h2 className='font-display text-[26px] font-bold leading-[1.15] tracking-[-0.025em] text-cart-ink'>
                      {currentQuestion.text}
                    </h2>
                  </div>

                  {/* Options */}
                  <div className='flex flex-col gap-2.5 px-2'>
                    {currentQuestion.options.map((option, index) => {
                      const letter = String.fromCharCode(65 + index);
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleAnswer(option.value)}
                          disabled={isLoading}
                          className={`relative w-full py-4 px-4 bg-cart-paper border border-cart-rule rounded-[4px] text-left transition-transform active:scale-[0.98] hover:border-[hsl(var(--lime))]/40 ${
                            isLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <div className='flex items-center gap-3.5'>
                            <div className='w-8 h-8 rounded-[4px] border border-cart-rule flex items-center justify-center font-display text-[14px] font-bold text-cart-ink flex-shrink-0 group-hover:bg-[hsl(var(--lime))]'>
                              {letter}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div className='text-[14px] font-semibold text-cart-ink leading-[1.3] whitespace-pre-line'>
                                {option.text}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {isLoading && (
                    <div className='flex justify-center mt-5'>
                      <KickerLabel tone="lime" className='inline-flex items-center gap-2 px-3 py-1.5 bg-cart-paper border border-cart-rule rounded-[4px]'>
                        <span className='size-1.5 rounded-full bg-[hsl(var(--lime))] animate-pulse' />
                        PROCESSING…
                      </KickerLabel>
                    </div>
                  )}

                  {/* Footer hint */}
                  <KickerLabel tone="muted" className='text-center mt-7 tracking-[0.2em]'>
                    · 8,420 RUNNERS HAVE ANSWERED ·
                  </KickerLabel>
                </div>
              )
            )}

            {/* keep transition placeholder hidden */}
            <span aria-hidden className={isTransitioning ? "" : "hidden"} />
          </>
        ) : (
          <>
            {/* Result hero card */}
            <div
              id='result-container'
              className='mb-5 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] p-5 relative overflow-hidden'
            >
              <div className='absolute top-2 right-3 font-display text-[90px] font-bold opacity-[0.12] tracking-[-0.05em] leading-[0.85] pointer-events-none'>
                {result?.mbtiType?.slice(0, 2)}
              </div>
              <div className='relative'>
                <div className='font-mono text-[9px] tracking-[0.22em] font-bold'>· CHAMPION TYPE ·</div>
                <div className='font-display text-[36px] font-bold tracking-[-0.025em] mt-2 leading-[1]'>
                  {result?.mbtiType}
                </div>
                <div className='text-[13px] font-semibold mt-1 opacity-80'>
                  {result?.runningStyle}
                </div>
              </div>
            </div>

            {/* Result image */}
            {result && (
              <div className='mb-5 bg-cart-paper border border-cart-rule rounded-[4px] p-3 flex justify-center'>
                <img
                  src={getResultImagePath(result.mbtiType)}
                  alt={`${result.mbtiType} 유형 이미지`}
                  className='w-full h-auto rounded-[4px]'
                  style={{ maxHeight: "240px", objectFit: "contain" }}
                  onError={(e) => handleImageError(e, result.mbtiType)}
                />
              </div>
            )}

            {/* Partner compatibility — cartographic two-column */}
            <div className='mb-5'>
              <KickerLabel tone="lime" className='mb-2.5 tracking-[0.22em]'>
                · 러닝 파트너 관계 성향
              </KickerLabel>
              <div className='flex flex-col gap-2'>
                <div className='bg-cart-paper border border-cart-rule rounded-[4px] p-3'>
                  <KickerLabel tone="lime" className='mb-2 tracking-[0.18em]'>
                    GOOD MATCH · 좋은 조합
                  </KickerLabel>
                  <div className='flex flex-wrap gap-1.5'>
                    {result?.compatibility.bestPartners.map((partner, index) => (
                      <TagPill key={index} variant="outline">
                        {partner}
                      </TagPill>
                    ))}
                  </div>
                </div>

                <div className='bg-cart-paper border border-cart-rule rounded-[4px] p-3'>
                  <KickerLabel tone="muted" className='mb-2 tracking-[0.18em]'>
                    CHALLENGING · 어려울 수도 있는 조합
                  </KickerLabel>
                  <div className='flex flex-wrap gap-1.5'>
                    {result?.compatibility.challengingPartners.map((partner, index) => (
                      <TagPill key={index} variant="ghost">
                        {partner}
                      </TagPill>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className='mb-7'>
              <KickerLabel tone="lime" className='mb-2.5 tracking-[0.22em]'>
                · 추천 활동 · ACTIVITIES
              </KickerLabel>
              <div>
                {result?.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 py-2.5",
                      index === 0 ? "" : "border-t border-cart-rule"
                    )}
                  >
                    <span className='font-mono text-[10px] tracking-[0.05em] text-cart-ink-60 tabular-nums w-6 mt-0.5'>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className='text-[13px] text-cart-ink flex-1'>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className='flex flex-col gap-2 mb-8'>
              <button
                onClick={handleShare}
                className='w-full py-3.5 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] flex items-center justify-between px-4 active:scale-[0.98] transition-transform'
              >
                <span className='font-display text-[14px] font-bold'>러닝메이트에게 공유</span>
                <span className='font-mono text-[10px] font-semibold tracking-[0.12em]'>SHARE →</span>
              </button>
              <button
                onClick={handleDownload}
                className='w-full py-3.5 bg-cart-paper border border-cart-rule text-cart-ink rounded-[4px] flex items-center justify-between px-4 active:scale-[0.98] transition-transform'
              >
                <span className='text-[14px] font-semibold'>결과 이미지 저장</span>
                <span className='font-mono text-[10px] font-semibold tracking-[0.12em] text-cart-ink-60'>DOWNLOAD ↓</span>
              </button>
              <button
                onClick={handleRestart}
                className='w-full py-3.5 bg-cart-paper border border-cart-rule text-cart-ink rounded-[4px] flex items-center justify-between px-4 active:scale-[0.98] transition-transform'
              >
                <span className='text-[14px] font-semibold'>다시 테스트하기</span>
                <span className='font-mono text-[10px] font-semibold tracking-[0.12em] text-cart-ink-60'>RESTART ↻</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
