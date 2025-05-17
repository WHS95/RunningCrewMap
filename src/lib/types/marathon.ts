import type { RunningEvent } from "./event";

export interface MarathonEvent {
  date: string;
  eventName: string;
  location: string;
  courses: string;
  organizer: string;
  giveaways: string;
  registrationFee: string;
  eventHomepage: string;
  mapLink: string;
}

// events.ts의 RunningEvent 타입과 호환되도록 변환하는 함수
export function convertToRunningEvent(marathon: MarathonEvent): RunningEvent {
  // date 포맷이 "5/17 (토)" 형식이므로 현재 연도를 추가하여 날짜 형식으로 변환
  const currentYear = new Date().getFullYear();
  const dateString = marathon.date.split(" ")[0]; // "5/17"
  const [month, day] = dateString.split("/");
  const formattedDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  
  // 지역 정보에서 도시 추출 (쉼표 앞 부분)
  const city = marathon.location.split(',')[0].trim();
  
  return {
    title: marathon.eventName,
    startDate: formattedDate,
    endDate: formattedDate,
    location: marathon.location.split(',')[1]?.trim() || marathon.location,
    city: city,
    link: marathon.eventHomepage || null,
  };
}