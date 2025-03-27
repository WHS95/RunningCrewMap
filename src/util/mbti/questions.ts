import { Question } from './types';

export const questions: Question[] = [
  {
    id: 1,
    text: "러닝을 할 때 선호하는 시간대는 언제인가요?",
    category: "running",
    options: [
      {
        text: "아침 일찍 시작하는 것이 좋아요",
        value: "morning",
        score: { type: 'J', value: 2 }
      },
      {
        text: "저녁에 달리는 것이 좋아요",
        value: "evening",
        score: { type: 'P', value: 2 }
      }
    ]
  },
  {
    id: 2,
    text: "러닝 코스를 선택할 때 어떤 것을 선호하시나요?",
    category: "running",
    options: [
      {
        text: "미리 계획된 코스를 따라 \n달리는 것이 좋아요",
        value: "planned",
        score: { type: 'J', value: 2 }
      },
      {
        text: "그때그때 마음 가는대로 \n달리는 것이 좋아요",
        value: "spontaneous",
        score: { type: 'P', value: 2 }
      }
    ]
  },
  {
    id: 3,
    text: "러닝 중에 다른 러너를 만났을 때 어떻게 하시나요?",
    category: "personality",
    options: [
      {
        text: "반갑게 인사하고 \n대화를 나누고 싶어요",
        value: "social",
        score: { type: 'E', value: 2 }
      },
      {
        text: "조용히 달리는 것을 선호해요",
        value: "quiet",
        score: { type: 'I', value: 2 }
      }
    ]
  },
  {
    id: 4,
    text: "러닝을 할 때 어떤 페이스를 선호하시나요?",
    category: "running",
    options: [
      {
        text: "일정한 페이스를 \n유지하는 것이 좋아요",
        value: "steady",
        score: { type: 'S', value: 2 }
      },
      {
        text: "구간별로 속도를 바꾸며 \n달리는 것이 재미있어요",
        value: "varying",
        score: { type: 'N', value: 2 }
      }
    ]
  },
  {
    id: 5,
    text: "러닝 기록을 측정할 때 어떤 것을 중요시하나요?",
    category: "personality",
    options: [
      {
        text: "정확한 시간과 거리 데이터가 중요해요",
        value: "data",
        score: { type: 'T', value: 2 }
      },
      {
        text: "러닝 중에 느낀 \n감정과 경험이 더 중요해요",
        value: "feeling",
        score: { type: 'F', value: 2 }
      }
    ]
  },
  {
    id: 6,
    text: "러닝 후 어떤 것을 가장 중요하게 생각하시나요?",
    category: "personality",
    options: [
      {
        text: "목표한 거리나 시간을 달성했는지\n확인해요",
        value: "achievement",
        score: { type: 'T', value: 2 }
      },
      {
        text: "러닝 중에 얼마나 즐거웠는지,\n기분이 좋아졌는지 생각해요",
        value: "enjoyment",
        score: { type: 'F', value: 2 }
      }
    ]
  },
  {
    id: 7,
    text: "러닝 크루에 참여한다면 어떤 활동을 선호하시나요?",
    category: "personality",
    options: [
      {
        text: "여러 사람과 함께 \n달리고 소통하는 것이 좋아요",
        value: "group",
        score: { type: 'E', value: 2 }
      },
      {
        text: "소수의 친한 사람들과 \n함께 달리거나 혼자 달리는 것이 좋아요",
        value: "alone",
        score: { type: 'I', value: 2 }
      }
    ]
  },
  {
    id: 8,
    text: "러닝 일정을 잡을 때 어떻게 계획하시나요?",
    category: "personality",
    options: [
      {
        text: "일주일 단위로 미리 \n계획을 세우고 지키려고 노력해요",
        value: "schedule",
        score: { type: 'J', value: 2 }
      },
      {
        text: "컨디션이나 상황에 따라 \n유연하게 결정해요",
        value: "flexible",
        score: { type: 'P', value: 2 }
      }
    ]
  },
  {
    id: 9,
    text: "러닝을 하는 주된 이유는 무엇인가요?",
    category: "running",
    options: [
      {
        text: "체력 향상이나 \n건강 관리를 위해서요",
        value: "health",
        score: { type: 'S', value: 2 }
      },
      {
        text: "스트레스 해소와 \n정신적 안정을 위해서요",
        value: "stress",
        score: { type: 'N', value: 2 }
      }
    ]
  },
  {
    id: 10,
    text: "러닝 중 예상치 못한 상황(기상 악화, 코스 변경 등)이 생기면 어떻게 대처하시나요?",
    category: "personality",
    options: [
      {
        text: "미리 대비책을 마련해두거나 \n계획을 변경하는 것이 불편해요",
        value: "prepared",
        score: { type: 'J', value: 2 }
      },
      {
        text: "상황에 맞게 유연하게 대처하고 \n새로운 경험으로 받아들여요",
        value: "adaptive",
        score: { type: 'P', value: 2 }
      }
    ]
  },
  {
    id: 11,
    text: "러닝 거리는 어느 정도를 선호하시나요?",
    category: "running",
    options: [
      {
        text: "5km 이내의 짧은 거리를 선호해요",
        value: "short",
        score: { type: 'S', value: 1 }
      },
      {
        text: "5-10km 정도의  \n중간 거리가 좋아요",
        value: "medium",
        score: { type: 'S', value: 1 }
      },
      {
        text: "10km 이상의 장거리에 \n도전하는 것을 좋아해요",
        value: "long",
        score: { type: 'N', value: 2 }
      }
    ]
  },
  {
    id: 12,
    text: "러닝 중 어떤 페이스를 유지하시나요?",
    category: "running",
    options: [
      {
        text: "천천히 편안하게 달려요",
        value: "slow",
        score: { type: 'F', value: 1 }
      },
      {
        text: "적당한 페이스로 균형있게 달려요",
        value: "medium",
        score: { type: 'S', value: 1 }
      },
      {
        text: "빠르게 도전적으로 달려요",
        value: "fast",
        score: { type: 'T', value: 2 }
      }
    ]
  }
]; 