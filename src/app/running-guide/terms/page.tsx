import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "러닝 용어 | 러닝 가이드북",
  description: "마라톤과 러닝에 관련된 다양한 용어들을 알아보세요.",
};

const runningTerms = [
  {
    term: "BIB",
    emoji: "📄",
    description:
      "대회 번호표. 참가자의 고유 번호 및 타이밍 칩을 포함하며 경주 중 착용",
    isHighlighted: false,
  },
  {
    term: "DNF",
    emoji: "❌",
    description: '"Did Not Finish"의 약자이며 완주 못함을 의미',
    isHighlighted: false,
  },
  {
    term: "DNS",
    emoji: "❌",
    description:
      '"Did Not Start"의 약자이며 등록했으나 경주를 시작하지 않음을 의미',
    isHighlighted: false,
  },
  {
    term: "LSD",
    emoji: "🏃‍♂️",
    description: '"Long Slow Distance"의 약자이며 장시간 저강도 달리기를 의미',
    isHighlighted: true,
  },
  {
    term: "PB/PR",
    emoji: "🏅",
    description:
      '"Personal Best" 또는 "Personal Record", 개인 최고 기록을 의미',
    isHighlighted: true,
  },
  {
    term: "Sub-3",
    emoji: "⏱️",
    description:
      "풀코스 마라톤을 3시간 이내에 완주하는 것을 의미하며 마스터즈의 주요 목표 중에 하나",
    isHighlighted: false,
  },
  {
    term: "VO2 Max",
    emoji: "🫁",
    description: "최대 산소 섭취량, 운동 능력의 지표",
    isHighlighted: false,
  },
  {
    term: "Zone 1",
    emoji: "💪",
    description:
      "최대 심박수의 약 50~60%로 매우 가벼운 운동 강도이며 회복 운동 및 워밍업에 적합",
    isHighlighted: false,
  },
  {
    term: "Zone 2",
    emoji: "💪",
    description:
      "최대 심박수의 약 60~70%로 가벼운 운동 강도이며 기초 체력 및 지구력 향상에 유용",
    isHighlighted: true,
  },
  {
    term: "Zone 3",
    emoji: "💪",
    description:
      "최대 심박수의 약 70-80%로 보통 운동 강도이며 효율적인 지구력 훈련에 적합",
    isHighlighted: false,
  },
  {
    term: "Zone 4",
    emoji: "💪",
    description:
      "최대 심박수의 약 80-90%로 격렬한 운동 강도이며 속도와 체력 향상에 도움",
    isHighlighted: false,
  },
  {
    term: "Zone 5",
    emoji: "💪",
    description:
      "최대 심박수의 약 90-100%로 매우 격렬한 운동 강도이며 고강도 인터벌 훈련에 사용",
    isHighlighted: false,
  },
  {
    term: "글리코겐",
    emoji: "🍚",
    description:
      "근육과 간에 저장되는 탄수화물 형태의 에너지원으로 장시간 운동 시 중요한 역할",
    isHighlighted: false,
  },
  {
    term: "네거티브 스플릿",
    emoji: "🔄",
    description: "레이스에서 후반부 구간을 전반부보다 빠르게 달리는 전략",
    isHighlighted: true,
  },
  {
    term: "드릴",
    emoji: "🛠️",
    description:
      "운동 전후 수행하는 다양한 운동 기술 연습이며 폼 개선, 부상 예방, 기록 향상에 도움",
    isHighlighted: false,
  },
  {
    term: "마일리지",
    emoji: "📅",
    description: "주간 또는 월간 총 달리기 거리를 의미하며 훈련량 측정 지표",
    isHighlighted: true,
  },
  {
    term: "보폭",
    emoji: "📏",
    description:
      "달리기 시 한 발걸음의 길이를 의미. 너무 길거나 짧으면 비효율적이며 적절한 보폭은 효율적인 달리기와 부상 예방에 중요",
    isHighlighted: true,
  },
  {
    term: "봉크",
    emoji: "🥴",
    description:
      "장거리 달리기 중 에너지 고갈을 의미하며 극심한 피로와 체력 저하 현상이 나타남. 계획된 탄수화물 섭취로 예방 가능",
    isHighlighted: true,
  },
  {
    term: "불완전 휴식",
    emoji: "🏃‍♀️",
    description: "고강도 운동 사이에 조깅 페이스로 심박수를 다시 내리는 행동",
    isHighlighted: false,
  },
  {
    term: "심박수",
    emoji: "💓",
    description:
      "분당 심장 박동 횟수, 운동 강도 평가 및 조절에 중요하며 심박수 존에 따라 훈련 효율성 및 목표 조절",
    isHighlighted: true,
  },
  // 나머지 항목들 추가...
  {
    term: "스플릿",
    emoji: "⏱️",
    description: "경주나 훈련 중 특정 구간의 완주 시간",
    isHighlighted: false,
  },
  {
    term: "아킬레스건",
    emoji: "🦵",
    description: "발뒤꿈치와 종아리 근육 연결하며 보행 시 중요 역할",
    isHighlighted: false,
  },
  {
    term: "에키덴",
    emoji: "🇯🇵",
    description: "일본의 인기있는 릴레이 마라톤 대회",
    isHighlighted: false,
  },
  {
    term: "역치주",
    emoji: "💨",
    description: "최대 산소 섭취량에 근접한 강도로 지속 달리기",
    isHighlighted: false,
  },
  {
    term: "이븐 스플릿",
    emoji: "⏱️",
    description:
      "경주나 훈련에서 각 구간을 일정한 속도로 일관되게 달리는 전략을 의미하며 체력 관리에 효과적",
    isHighlighted: false,
  },
  {
    term: "인터벌 훈련",
    emoji: "🏃‍♂️",
    description:
      "고강도 단거리 달리기와 휴식을 번갈아 하는 훈련이며 속도 및 지구력 향상에 도움",
    isHighlighted: true,
  },
  {
    term: "오버스트라이드",
    emoji: "❌",
    description:
      "달리기 시 지나치게 긴 보폭으로 발을 몸 앞에 착지시키는 것을 의미하며 부상 위험 증가 및 에너지 효율성 감소",
    isHighlighted: true,
  },
  {
    term: "웜업",
    emoji: "🔥",
    description:
      "본 운동 전 몸을 준비시키기 위한 가벼운 운동을 의미하며 근육 활성화, 부상 예방에 도움",
    isHighlighted: true,
  },
  {
    term: "장경인대",
    emoji: "🦵",
    description: "무릎 옆을 지나가는 긴 인대, 무릎 안정과 움직임 조절에 중요",
    isHighlighted: false,
  },
  {
    term: "정규트랙",
    emoji: "🏟️",
    description: "표준 규격의 400m 육상 트랙, 경기 및 훈련용",
    isHighlighted: false,
  },
  {
    term: "제로드롭",
    emoji: "➖",
    description: "발뒤꿈치와 앞발부분의 높이가 같은 상태를 의미",
    isHighlighted: false,
  },
  {
    term: "조깅",
    emoji: "🏃‍♂️",
    description:
      "천천히 일정한 속도로 하는 가벼운 달리기, 옆사람과 대화가 가능한 정도의 강도를 의미하며 건강 유지 및 체력 증진에 효과적",
    isHighlighted: true,
  },
  {
    term: "지속주",
    emoji: "⏱️",
    description:
      "일정한 속도로 긴 시간 동안 지속적으로 달리는 훈련이며 지구력 개선에 효과적",
    isHighlighted: false,
  },
  {
    term: "지연성 근육통",
    emoji: "😖",
    description:
      "DOMS(Delayed onset muscle soreness)라고도 하며 운동 후 일정 시간 지나 발생하는 근육통. 신체 적응 과정의 일부",
    isHighlighted: true,
  },
  {
    term: "최대 심박수",
    emoji: "💓",
    description:
      "개인의 심장이 분당 최대로 뛸 수 있는 박동 수를 의미하며 운동 강도 측정 및 훈련 계획에 중요한 지표",
    isHighlighted: false,
  },
  {
    term: "카본화",
    emoji: "🥾",
    description:
      "미드솔에 탄소 섬유 적용한 러닝화이며 반발력 증가, 달리기 효율 개선",
    isHighlighted: false,
  },
  {
    term: "케이던스",
    emoji: "👣",
    description:
      "분당 발걸음 수를 뜻하며 러닝 시에 일반적으로 180 내외로 달리며 조깅이나 레이스에는 낮아지거나 높아짐",
    isHighlighted: true,
  },
  {
    term: "쿨다운",
    emoji: "🌬️",
    description:
      "본 운동 후 점차 강도를 낮추며 몸을 정상 상태로 복귀시키는 과정을 의미하며 근육 이완 및 회복에 중요",
    isHighlighted: true,
  },
  {
    term: "테이퍼링",
    emoji: "⏳",
    description:
      "대회 전 훈련량 및 운동량을 감소시켜 신체 상태 회복 및 최적 상태 유지",
    isHighlighted: false,
  },
  {
    term: "템포런",
    emoji: "🏃‍♂️",
    description:
      "일정하고 빠른 속도로 중장거리 달리기를 의미하며 경주 페이스 유지 능력 및 지구력 향상에 중요",
    isHighlighted: true,
  },
  {
    term: "토박스",
    emoji: "👟",
    description: "신발 앞부분, 발가락 보호 및 지지 역할",
    isHighlighted: false,
  },
  {
    term: "페이스메이커",
    emoji: "🏃‍♀️",
    description: "지정된 목표 시간 혹은 속도 유지를 도와주는 동료 러너",
    isHighlighted: true,
  },
  {
    term: "풀마라톤",
    emoji: "🏃‍♂️",
    description: "42.195km 달리기 경주이며 장거리 달리기의 정점",
    isHighlighted: true,
  },
  {
    term: "포디움",
    emoji: "🏆",
    description:
      "경주에서 상위 성적을 낸 선수들이 서는 시상대를 의미하며 1위부터 3위까지 선수들을 위한 자리",
    isHighlighted: false,
  },
  {
    term: "하프마라톤",
    emoji: "🏃‍♀️",
    description: "21.0975km 달리기 경주이며 전체 마라톤의 정확히 절반",
    isHighlighted: true,
  },
  {
    term: "힐드롭",
    emoji: "👟",
    description:
      '정확한 명칭은 "Heel to Toe Drop"이며 러닝화의 뒤꿈치와 발볼 위치의 높이 혹은 두께 차이',
    isHighlighted: false,
  },
  {
    term: "횡문근융해증",
    emoji: "🦠",
    description:
      "강도 높은 운동 후 근육 섬유가 파괴되어 근육 통증 및 약화 발생. 대표적인 증상으로는 혈뇨이며 심할 경우 신장 손상의 위험이 있기 때문에 의심 증상 시에는 병원에 내원해야하며 예방 및 관리로는 적절한 훈련, 수분 섭취, 충분한 휴식",
    isHighlighted: false,
  },
  {
    term: "러너스 루프",
    emoji: "👟",
    description:
      "러닝화 끈을 묶는 방법을 의미하며, 발목 부분에 더 많은 지지를 제공하고 러닝 중에 발이 신발 안에서 미끄러지는 것을 방지",
    isHighlighted: false,
  },
  {
    term: "마스터즈",
    emoji: "🏅",
    description:
      "마라톤 혹은 달리기를 취미 이상으로 좋아하는 사람을 의미하며 일반적으로 엘리트 선수를 제외한 일반인 아마추어 참가자를 지칭",
    isHighlighted: false,
  },
  {
    term: "테이핑",
    emoji: "🎗️",
    description:
      "운동 중 부상 방지 혹은 이미 발생한 부상의 치료를 위해 특정 부위에 테이프를 붙이는 행위",
    isHighlighted: false,
  },
];

export default function RunningTermsPage() {
  return (
    <div className='container mx-auto px-4 py-12'>
      <header className='mb-8'>
        <nav className='mb-6'>
          <Link href='/running-guide' className='text-blue-500 hover:underline'>
            &larr; 가이드북 메인으로 돌아가기
          </Link>
        </nav>
        <h1 className='text-4xl font-bold text-gray-900 mb-4'>러닝 용어</h1>
        <p className='text-xl text-gray-600 mb-2'>
          러닝과 마라톤에 관련된 다양한 용어들을 알아보세요.
        </p>
        <p className='text-gray-500 italic'>
          * 자주 사용하는 용어들은 빨간색으로 표시되어 있습니다.
        </p>
      </header>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
        {runningTerms.map((term, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow p-5 border-l-4 ${
              term.isHighlighted ? "border-red-500" : "border-blue-500"
            }`}
          >
            <div className='flex items-start'>
              <span className='text-2xl mr-2'>{term.emoji}</span>
              <div>
                <h3
                  className={`text-lg font-bold mb-1 ${
                    term.isHighlighted ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {term.term}
                </h3>
                <p className='text-gray-700'>{term.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='mt-16 bg-gray-50 rounded-xl p-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          러닝 용어의 중요성
        </h2>
        <p className='text-gray-700 mb-4'>
          러닝 용어를 이해하는 것은 러닝 커뮤니티의 일원이 되는 첫 걸음입니다.
          이러한 용어들은 훈련 계획을 세우거나 다른 러너들과 소통할 때 매우
          유용합니다.
        </p>
        <p className='text-gray-700'>
          특히 빨간색으로 표시된 용어들은 초보자들이 자주 접하게 되는 용어들이니
          먼저 익혀두시면 좋습니다!
        </p>
      </div>
    </div>
  );
}
