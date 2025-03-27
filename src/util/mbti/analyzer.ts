import { RunningMBTIResult, RunningPreference } from './types';

type ScoreMap = {
  E: number;
  I: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
};

export const calculateMBTI = (scores: ScoreMap): string => {
  return [
    scores.E > scores.I ? 'E' : 'I',
    scores.S > scores.N ? 'S' : 'N',
    scores.T > scores.F ? 'T' : 'F',
    scores.J > scores.P ? 'J' : 'P'
  ].join('');
};

export const getRunningStyle = (mbtiType: string, preferences: RunningPreference): string => {
  const styles: { [key: string]: string } = {
    'ISTJ': '체계적인 솔로 러너',
    'ISFJ': '꾸준한 페이스 메이커 러너',
    'INFJ': '명상하는 러너',
    'INTJ': '목표 지향적 러너',
    'ISTP': '자유로운 트레일 러너',
    'ISFP': '자연을 즐기는 러너',
    'INFP': '영감을 찾는 러너',
    'INTP': '데이터 분석형 러너',
    'ESTP': '도전적인 스프린터 러너',
    'ESFP': '늘 즐거운 러너',
    'ENFP': '열정적인 그룹 러너',
    'ENTP': '창의적인 코스 개척 러너',
    'ESTJ': '리더형 러너',
    'ESFJ': '친화적인 크루장형 러너',
    'ENFJ': '동기부여형 러너',
    'ENTJ': '전략적인 플랜 러너'
  };

  // preferences를 활용한 스타일 조정
  const baseStyle = styles[mbtiType] || '개성있는 러너';
  const pacePrefix = preferences.pace === 'fast' ? '스피드한 ' : 
                    preferences.pace === 'slow' ? '여유로운 ' : '';
  
  return pacePrefix + baseStyle;
};

export const analyzeRunningMBTI = (
  mbtiType: string,
  preferences: RunningPreference
): RunningMBTIResult => {
  const runningStyle = getRunningStyle(mbtiType, preferences);
  
  const result: RunningMBTIResult = {
    mbtiType,
    runningStyle,
    description: `당신은 ${runningStyle}입니다. ${mbtiType} 성향과 러닝을 결합한 독특한 러닝 스타일을 가지고 있습니다.`,
    recommendations: getRecommendations(mbtiType, preferences),
    compatibility: getCompatibility(mbtiType)
  };

  return result;
};

export const getRecommendations = (mbtiType: string, preferences: RunningPreference): string[] => {
  const baseRecommendations = [
    '정기적인 러닝 일정 설정하기',
    '러닝 기록 트래킹하기',
    '적절한 휴식과 회복 시간 가지기'
  ];

  // MBTI 타입별 맞춤 추천사항 추가
  if (mbtiType.includes('E')) {
    baseRecommendations.push('러닝 크루 활동 참여하기');
    baseRecommendations.push('러닝 이벤트나 대회 참가하기');
  }

  if (mbtiType.includes('I')) {
    baseRecommendations.push('조용한 시간대에 러닝하기');
    baseRecommendations.push('명상적 러닝 시도해보기');
  }

  // preferences를 활용한 추천사항 추가
  if (preferences.pace === 'fast') {
    baseRecommendations.push('인터벌 트레이닝 시도하기');
  }

  if (preferences.frequency === 'daily') {
    baseRecommendations.push('적절한 휴식일 설정하기');
  }

  return baseRecommendations;
};

export const getCompatibility = (mbtiType: string): { bestPartners: string[], challengingPartners: string[] } => {
  // 16가지 MBTI 러너 유형
  const runnerTypes = {
    'ISTJ': '체계적 솔로 러너',
    'ISFJ': '꾸준 페이스 메이커 러너',
    'INFJ': '명상 러너',
    'INTJ': '목표 지향 러너',
    'ISTP': '자유 영혼 러너',
    'ISFP': '자연친화 러너',
    'INFP': '영감 러너',
    'INTP': '데이터 분석 러너',
    'ESTP': '도전적 스프린터 러너',
    'ESFP': '늘 즐거운 러너',
    'ENFP': '열정 러너',
    'ENTP': '코스 개척 러너',
    'ESTJ': '리더형 러너',
    'ESFJ': '크루장형 러너',
    'ENFJ': '동기부여 러너',
    'ENTJ': '전략적 플랜 러너'
  };

  // MBTI 유형별 최적 파트너 매핑 - 오직 정의된 16가지 유형만 사용
  const compatibilityMap: { [key: string]: { best: string[], challenging: string[] } } = {
    'ISTJ': {
      best: [runnerTypes['ISFJ'], runnerTypes['INTJ'], runnerTypes['ESTJ']],
      challenging: [runnerTypes['ENFP'], runnerTypes['ESFP'], runnerTypes['ENTP']]
    },
    'ISFJ': {
      best: [runnerTypes['ESFJ'], runnerTypes['ISFP'], runnerTypes['ISTJ']],
      challenging: [runnerTypes['INTP'], runnerTypes['ISTP'], runnerTypes['ESTP']]
    },
    'INFJ': {
      best: [runnerTypes['INFP'], runnerTypes['ENFJ'], runnerTypes['INTJ']],
      challenging: [runnerTypes['ESTP'], runnerTypes['ESTJ'], runnerTypes['ISTP']]
    },
    'INTJ': {
      best: [runnerTypes['ISTJ'], runnerTypes['ENTJ'], runnerTypes['INTP']],
      challenging: [runnerTypes['ESFP'], runnerTypes['ENFP'], runnerTypes['ISFP']]
    },
    'ISTP': {
      best: [runnerTypes['ESTP'], runnerTypes['INTP'], runnerTypes['ISTP']],
      challenging: [runnerTypes['ESFJ'], runnerTypes['ISFJ'], runnerTypes['ENFJ']]
    },
    'ISFP': {
      best: [runnerTypes['ESFP'], runnerTypes['INFP'], runnerTypes['ISFJ']],
      challenging: [runnerTypes['ESTJ'], runnerTypes['ENTJ'], runnerTypes['ISTJ']]
    },
    'INFP': {
      best: [runnerTypes['ENFP'], runnerTypes['INFJ'], runnerTypes['ISFP']],
      challenging: [runnerTypes['ISTJ'], runnerTypes['ESTJ'], runnerTypes['ESTP']]
    },
    'INTP': {
      best: [runnerTypes['ENTP'], runnerTypes['INTJ'], runnerTypes['ISTP']],
      challenging: [runnerTypes['ESFJ'], runnerTypes['ISFJ'], runnerTypes['ESFP']]
    },
    'ESTP': {
      best: [runnerTypes['ISTP'], runnerTypes['ENTP'], runnerTypes['ESFP']],
      challenging: [runnerTypes['INFJ'], runnerTypes['INFP'], runnerTypes['ISFJ']]
    },
    'ESFP': {
      best: [runnerTypes['ISFP'], runnerTypes['ENFP'], runnerTypes['ESFJ']],
      challenging: [runnerTypes['INTP'], runnerTypes['INTJ'], runnerTypes['ISTJ']]
    },
    'ENFP': {
      best: [runnerTypes['INFP'], runnerTypes['ENFJ'], runnerTypes['ENTP']],
      challenging: [runnerTypes['ISTJ'], runnerTypes['INTP'], runnerTypes['ESTJ']]
    },
    'ENTP': {
      best: [runnerTypes['INTP'], runnerTypes['ENFP'], runnerTypes['ENTJ']],
      challenging: [runnerTypes['ISFJ'], runnerTypes['ISFP'], runnerTypes['ESFJ']]
    },
    'ESTJ': {
      best: [runnerTypes['ISTJ'], runnerTypes['ENTJ'], runnerTypes['ESFJ']],
      challenging: [runnerTypes['ISTP'], runnerTypes['INFP'], runnerTypes['ESFP']]
    },
    'ESFJ': {
      best: [runnerTypes['ISFJ'], runnerTypes['ENFJ'], runnerTypes['ESFP']],
      challenging: [runnerTypes['ISTJ'], runnerTypes['ISTP'], runnerTypes['INTP']]
    },
    'ENFJ': {
      best: [runnerTypes['INFJ'], runnerTypes['ENFP'], runnerTypes['ESFJ']],
      challenging: [runnerTypes['INTP'], runnerTypes['ISTJ'], runnerTypes['ISTP']]
    },
    'ENTJ': {
      best: [runnerTypes['INTJ'], runnerTypes['ESTJ'], runnerTypes['ENTP']],
      challenging: [runnerTypes['ISFP'], runnerTypes['INFJ'], runnerTypes['ESFP']]
    }
  };

  // 기본 호환성 가져오기
  const baseCompatibility = compatibilityMap[mbtiType] || {
    best: [runnerTypes['ENFP'], runnerTypes['ISTJ'], runnerTypes['ESTP']],
    challenging: [runnerTypes['INTJ'], runnerTypes['INFP'], runnerTypes['ESFJ']]
  };

  // 중복 제거하고 최대 3개로 제한
  const bestPartners = [...new Set(baseCompatibility.best)].slice(0, 3);
  const challengingPartners = [...new Set(baseCompatibility.challenging)].slice(0, 3);

  return {
    bestPartners,
    challengingPartners
  };
}; 