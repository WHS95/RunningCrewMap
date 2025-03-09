import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "러닝 관련 부상 용어 | 러닝 가이드북",
  description: "러닝 중 발생할 수 있는 부상에 대해 미리 알아두세요.",
};

const runningInjuries = [
  {
    term: "장경인대 증후군(Iliotibial Band Syndrome)",
    description: "무릎 외측에 통증을 유발하는 부상",
    causes: "반복적인 무릎 굽힘과 펴기, 과도한 달리기, 운동 시 잘못된 자세",
    symptoms: "무릎 외측 통증, 활동 중 심해지는 통증, 계단 오르내릴 때 통증",
    prevention:
      "적절한 스트레칭, 강화 운동, 올바른 러닝 자세, 점진적인 훈련 증가",
  },
  {
    term: "러너스 니(Runner's Knee)",
    description: "무릎 전면에 통증을 유발하는 부상",
    causes: "과사용, 무릎 정렬 문제, 평발, 약한 대퇴사두근",
    symptoms: "무릎 앞쪽 통증, 계단 내려갈 때 악화, 오래 앉아있을 때 통증",
    prevention: "적절한 러닝화 선택, 대퇴사두근 강화, 점진적인 훈련 강도 조절",
  },
  {
    term: "아킬레스 건염(Achilles Tendinitis)",
    description: "아킬레스건에 염증이 생기는 부상",
    causes: "급격한 훈련 강도 증가, 종아리 근육 경직, 부적절한 신발",
    symptoms:
      "아킬레스건 통증 및 부기, 아침에 심한 뻣뻣함, 발뒤꿈치 터치 시 통증",
    prevention: "종아리 근육 스트레칭, 점진적인 훈련 증가, 적절한 휴식",
  },
  {
    term: "신 스프린트(Shin Splints)",
    description: "정강이 부위에 통증을 유발하는 부상",
    causes: "과사용, 급격한 훈련 강도 증가, 단단한 표면에서 달리기",
    symptoms: "정강이 통증, 촉진 시 통증, 활동 시 악화되는 통증",
    prevention:
      "점진적인 훈련 증가, 충격 흡수가 좋은 신발, 다양한 표면에서 훈련",
  },
  {
    term: "족저근막염(Plantar Fasciitis)",
    description: "발바닥에 통증을 유발하는 부상",
    causes: "과도한 달리기, 평발, 체중 증가, 잘못된 신발 선택",
    symptoms: "발뒤꿈치 통증, 아침 첫 걸음 시 심한 통증, 오래 앉은 후 통증",
    prevention: "발 아치 지지 신발, 발 스트레칭, 적절한 체중 유지",
  },
  {
    term: "피로골절(Stress Fracture)",
    description: "뼈에 작은 균열이 생기는 부상",
    causes: "반복적인 충격, 급격한 훈련 강도 증가, 영양 부족",
    symptoms: "특정 부위 통증, 누르면 심해지는 통증, 활동 시 악화",
    prevention:
      "적절한 영양 섭취, 점진적인 훈련 증가, 충분한 휴식, 정기적인 신발 교체",
  },
  {
    term: "햄스트링 부상(Hamstring Injury)",
    description: "허벅지 뒤쪽 근육의 부상",
    causes: "불충분한 워밍업, 근력 불균형, 이전 부상 병력",
    symptoms: "허벅지 뒤쪽 통증, 갑작스런 날카로운 통증, 부기, 약화",
    prevention: "철저한 워밍업, 햄스트링 강화 운동, 유연성 개선",
  },
  {
    term: "발목염좌(Ankle Sprain)",
    description: "발목 인대가 손상되는 부상",
    causes: "불안정한 표면, 갑작스러운 방향 전환, 약한 발목 근육",
    symptoms: "발목 통증 및 부기, 움직임 제한, 체중 부하 시 통증",
    prevention:
      "안정적인 신발 착용, 균형 및 발목 강화 운동, 트레일 러닝 시 주의",
  },
  {
    term: "거위발 건염(Pes Anserine Tendinitis)",
    description: "무릎 안쪽에 통증을 유발하는 부상",
    causes: "과사용, O다리, 평발, 내측 무릎 반복 부하",
    symptoms: "무릎 내측 통증, 계단 오를 때 악화, 아침 뻣뻣함",
    prevention: "하체 근력 강화, 하지 정렬 개선, 점진적인 훈련 증가",
  },
];

export default function RunningInjuriesPage() {
  return (
    <div className='container mx-auto px-4 py-12'>
      <header className='mb-8'>
        <nav className='mb-6'>
          <Link href='/running-guide' className='text-blue-500 hover:underline'>
            &larr; 가이드북 메인으로 돌아가기
          </Link>
        </nav>
        <h1 className='text-4xl font-bold text-gray-900 mb-4'>
          러닝 관련 부상 용어
        </h1>
        <p className='text-xl text-gray-600 mb-6'>
          러닝 중 발생할 수 있는 부상에 대해 미리 알아두세요.
        </p>
        <div className='bg-amber-50 border-l-4 border-amber-500 p-4'>
          <p className='text-amber-800'>
            <span className='font-bold'>주의:</span> 이 정보는 교육 목적으로만
            제공됩니다. 실제 부상이 발생한 경우 의료 전문가와 상담하세요.
          </p>
        </div>
      </header>

      <div className='space-y-8'>
        {runningInjuries.map((injury, index) => (
          <div
            key={index}
            className='bg-white rounded-lg shadow-md overflow-hidden'
          >
            <div className='bg-red-500 h-2'></div>
            <div className='p-6'>
              <h2 className='text-xl font-bold text-gray-900 mb-3'>
                {injury.term}
              </h2>
              <p className='text-gray-700 mb-4'>{injury.description}</p>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                <div className='bg-gray-50 p-4 rounded'>
                  <h3 className='font-semibold text-gray-900 mb-2 flex items-center'>
                    <span className='mr-2'>⚠️</span> 원인
                  </h3>
                  <p className='text-gray-700'>{injury.causes}</p>
                </div>

                <div className='bg-gray-50 p-4 rounded'>
                  <h3 className='font-semibold text-gray-900 mb-2 flex items-center'>
                    <span className='mr-2'>🔍</span> 증상
                  </h3>
                  <p className='text-gray-700'>{injury.symptoms}</p>
                </div>

                <div className='bg-gray-50 p-4 rounded'>
                  <h3 className='font-semibold text-gray-900 mb-2 flex items-center'>
                    <span className='mr-2'>🛡️</span> 예방
                  </h3>
                  <p className='text-gray-700'>{injury.prevention}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='mt-12 bg-gray-50 rounded-xl p-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          부상 예방을 위한 일반적인 팁
        </h2>
        <ul className='space-y-3 text-gray-700'>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>
              점진적으로 훈련 강도와 거리를 늘려나가세요 (일반적으로 주당 10%
              이내)
            </span>
          </li>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>
              적절한 러닝화를 신고, 300-500km 주행 후에는 교체하는 것이 좋습니다
            </span>
          </li>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>충분한 워밍업과 쿨다운 시간을 가지세요</span>
          </li>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>
              다양한 표면에서 달리면서 같은 근육군에 지속적인 부담을 줄이세요
            </span>
          </li>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>
              러닝 외에도 근력 훈련을 병행하여 전체적인 근력 균형을 유지하세요
            </span>
          </li>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>통증이 있을 때는 무리하지 말고 충분한 휴식을 취하세요</span>
          </li>
          <li className='flex items-start'>
            <span className='text-green-500 mr-2'>✓</span>
            <span>
              적절한 수분 보충과 영양 섭취를 통해 근육과 뼈 건강을 유지하세요
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
