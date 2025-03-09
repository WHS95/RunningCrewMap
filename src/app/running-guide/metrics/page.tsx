import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "러너 운동 관련 지수 | 러닝 가이드북",
  description: "러너들이 목표로 하거나 유지하면 좋은 수치들을 확인하세요.",
};

const runnerMetrics = [
  {
    name: "케이던스",
    goodValue: "160-180 보폭/분",
    description:
      "발걸음의 빈도. 케이던스가 높을수록 효율적인 달리기와 부상 위험 감소에 도움이 됩니다.",
    icon: "👣",
  },
  {
    name: "보폭",
    goodValue: "75-90cm",
    description:
      "발걸음의 길이. 너무 길거나 짧으면 비효율적이므로 적절한 보폭 유지가 중요합니다.",
    icon: "📏",
  },
  {
    name: "심박수",
    goodValue: "최대 심박수의 60-80% (Zone 2)",
    description:
      '지구력 훈련에 적합한 강도. 일반적인 최대 심박수는 "220 - 나이"로 계산할 수 있습니다.',
    icon: "💓",
  },
  {
    name: "최대 심박수",
    goodValue: '"220 - 나이" (예: 30세라면 190 bpm)',
    description: "최대 심박수. 운동 강도를 조절하는 데 중요한 지표입니다.",
    icon: "❤️",
  },
  {
    name: "VO2 Max",
    goodValue: "남성: 45-55 ml/kg/min\n여성: 35-45 ml/kg/min",
    description:
      "최대 산소 섭취량. 운동 능력의 지표로 사용됩니다. 이 값이 높을수록 심폐 지구력이 좋음을 의미합니다.",
    icon: "🫁",
  },
  {
    name: "템포런 페이스",
    goodValue: "평소 러닝 페이스의 80-90%",
    description:
      "중장거리 달리기 훈련 속도. 경주 페이스 유지 능력을 향상시키는 데 도움을 줍니다.",
    icon: "🏃‍♂️",
  },
  {
    name: "장거리 페이스",
    goodValue: "평소 러닝 페이스의 60-70%",
    description: "장거리 훈련 속도. 지구력을 키우는 데 적합한 속도입니다.",
    icon: "🏃‍♀️",
  },
  {
    name: "마일리지",
    goodValue: "초보자: 주 30-40km\n중급자: 주 40-60km\n상급자: 주 60-100km",
    description:
      "주간 달리기 거리. 체력 수준에 따라 목표로 하는 마일리지가 다를 수 있습니다.",
    icon: "📅",
  },
];

export default function RunnerMetricsPage() {
  return (
    <div className='container mx-auto px-4 py-12'>
      <header className='mb-8'>
        <nav className='mb-6'>
          <Link href='/running-guide' className='text-blue-500 hover:underline'>
            &larr; 가이드북 메인으로 돌아가기
          </Link>
        </nav>
        <h1 className='text-4xl font-bold text-gray-900 mb-4'>
          러너 운동 관련 지수
        </h1>
        <p className='text-xl text-gray-600 mb-6'>
          러너들이 목표로 하거나 유지하면 좋은 수치들을 확인하세요.
        </p>
        <div className='bg-blue-50 border-l-4 border-blue-500 p-4'>
          <p className='text-blue-800'>
            <span className='font-bold'>참고:</span> 아래 수치들은 일반적인
            가이드라인이며, 개인의 체격, 연령, 훈련 수준에 따라 달라질 수
            있습니다.
          </p>
        </div>
      </header>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-12'>
        {runnerMetrics.map((metric, index) => (
          <div
            key={index}
            className='bg-white rounded-lg shadow-md overflow-hidden'
          >
            <div className='p-6'>
              <div className='flex items-center mb-4'>
                <span className='text-3xl mr-3'>{metric.icon}</span>
                <h2 className='text-2xl font-bold text-gray-900'>
                  {metric.name}
                </h2>
              </div>

              <div className='bg-green-50 rounded-lg p-4 mb-4'>
                <h3 className='font-semibold text-gray-900 mb-1'>좋은 수치</h3>
                <p className='text-green-700 font-medium'>
                  {metric.goodValue.split("\n").map((line, idx) => (
                    <span key={idx} className='block'>
                      {line}
                    </span>
                  ))}
                </p>
              </div>

              <p className='text-gray-700'>{metric.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className='bg-gray-50 rounded-xl p-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6'>
          러닝 지수 활용하기
        </h2>

        <div className='space-y-6'>
          <div>
            <h3 className='text-xl font-semibold text-gray-900 mb-3'>
              지수는 왜 중요한가요?
            </h3>
            <p className='text-gray-700'>
              러닝 관련 지수는 훈련의 효율성을 높이고 부상 위험을 줄이는 데
              도움을 줍니다. 자신의 수치를 알고 적절한 목표를 설정하면 러닝
              능력을 체계적으로 향상시킬 수 있습니다.
            </p>
          </div>

          <div>
            <h3 className='text-xl font-semibold text-gray-900 mb-3'>
              초보자를 위한 조언
            </h3>
            <p className='text-gray-700'>
              러닝을 시작하는 초보자는 처음부터 모든 지수를 맞추려고
              노력하기보다, 점진적으로 훈련하며 자신의 신체가 적응하도록 하는
              것이 중요합니다. 특히 케이던스와 심박수는 초보자가 가장 먼저
              주목해야 할 지표입니다.
            </p>
          </div>

          <div>
            <h3 className='text-xl font-semibold text-gray-900 mb-3'>
              지수 측정 방법
            </h3>
            <p className='text-gray-700'>
              러닝 워치, 스마트폰 앱, 가슴 스트랩 심박계 등 다양한 도구를 통해
              이러한 지수들을 측정할 수 있습니다. 정확한 측정을 위해서는 적절한
              장비를 사용하는 것이 좋습니다.
            </p>
          </div>

          <div>
            <h3 className='text-xl font-semibold text-gray-900 mb-3'>
              나에게 맞는 지수 찾기
            </h3>
            <p className='text-gray-700'>
              제시된 범위는 일반적인 가이드라인일 뿐, 개인마다 최적의 수치는
              다를 수 있습니다. 다양한 훈련을 통해 자신에게 가장 편안하고
              효율적인 수치를 찾아보세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
