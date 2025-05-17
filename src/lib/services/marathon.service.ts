import { MarathonEvent, convertToRunningEvent } from "../types/marathon";
import type { RunningEvent } from "../types/event";
import { runningEvents } from "../data/events";

class MarathonService {
  private marathonEvents: MarathonEvent[] = [];
  private runningEventsConverted: RunningEvent[] = [];

  constructor() {
    // events.ts에서 가져온 데이터를 그대로 사용
    this.marathonEvents = runningEvents;
    
    // 필요한 경우 RunningEvent 타입으로 변환
    this.runningEventsConverted = this.marathonEvents.map(convertToRunningEvent);
  }

  // 전체 마라톤 데이터 가져오기
  getMarathonEvents(): MarathonEvent[] {
    return this.marathonEvents;
  }

  // 기존 RunningEvent 타입으로 변환된 데이터 가져오기
  getRunningEvents(): RunningEvent[] {
    return this.runningEventsConverted;
  }

  // 특정 마라톤 이벤트 상세 정보 가져오기 (제목으로 검색)
  getMarathonEventByTitle(title: string): MarathonEvent | undefined {
    return this.marathonEvents.find(event => 
      event.eventName.toLowerCase() === title.toLowerCase()
    );
  }

  // 월별 이벤트 필터링
  getMarathonEventsByMonth(month: number): MarathonEvent[] {
    if (month === 0) return this.marathonEvents; // 0은 전체 월 표시
    
    return this.marathonEvents.filter(event => {
      const dateString = event.date.split(" ")[0]; // "5/17"
      const eventMonth = parseInt(dateString.split("/")[0]);
      return eventMonth === month;
    });
  }
}

export const marathonService = new MarathonService(); 