type EventCallback = () => void;

class EventEmitter {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback());
    }
  }

  off(event: string, callback: EventCallback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }
}

export const eventEmitter = new EventEmitter();

// 이벤트 상수
export const EVENTS = {
  INVALIDATE_CREWS_CACHE: "INVALIDATE_CREWS_CACHE",
} as const;
