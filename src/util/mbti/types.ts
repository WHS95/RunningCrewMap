export type MBTIType = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export type RunningPreference = {
  pace: 'slow' | 'medium' | 'fast';
  distance: 'short' | 'medium' | 'long';
  time: 'morning' | 'afternoon' | 'evening';
  social: 'alone' | 'small' | 'large';
  frequency: 'daily' | 'weekly' | 'monthly';
};

export type Question = {
  id: number;
  text: string;
  category: 'running' | 'personality';
  options: {
    text: string;
    value: string;
    score: {
      type: MBTIType;
      value: number;
    };
  }[];
};

export type RunningMBTIResult = {
  mbtiType: string;
  runningStyle: string;
  description: string;
  recommendations: string[];
  compatibility: {
    bestPartners: string[];
    challengingPartners: string[];
  };
}; 