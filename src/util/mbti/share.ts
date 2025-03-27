import { RunningMBTIResult } from './types';
import html2canvas from 'html2canvas';

// Kakao SDK 타입 정의
type KakaoSDK = {
  init(key: string): void;
  isInitialized(): boolean;
  Link: {
    sendDefault(options: {
      objectType: string;
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: {
          mobileWebUrl: string;
          webUrl: string;
        };
      };
      buttons: Array<{
        title: string;
        link: {
          mobileWebUrl: string;
          webUrl: string;
        };
      }>;
    }): void;
  };
};

declare global {
  interface Window {
    Kakao: KakaoSDK;
  }
}

export const initializeKakao = (kakaoJsKey: string) => {
  if (typeof window !== 'undefined' && !window.Kakao.isInitialized()) {
    window.Kakao.init(kakaoJsKey);
  }
};

export const shareToKakao = (result: RunningMBTIResult) => {
  if (typeof window === 'undefined') return;

  const { mbtiType, runningStyle, description } = result;

  window.Kakao.Link.sendDefault({
    objectType: 'feed',
    content: {
      title: `나의 러닝 MBTI: ${mbtiType}`,
      description: `${runningStyle}\n${description}`,
      imageUrl: 'https://your-domain.com/images/running-mbti.jpg',
      link: {
        mobileWebUrl: window.location.href,
        webUrl: window.location.href,
      },
    },
    buttons: [
      {
        title: '결과 보기',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      {
        title: '테스트 하기',
        link: {
          mobileWebUrl: 'https://your-domain.com',
          webUrl: 'https://your-domain.com',
        },
      },
    ],
  });
};

export const copyResultLink = async (result: RunningMBTIResult, gender: 'male' | 'female') => {
  try {
    // URL에 결과 정보를 쿼리 파라미터로 포함
    const url = new URL(window.location.href);
    url.searchParams.set('mbti', result.mbtiType);
    url.searchParams.set('style', encodeURIComponent(result.runningStyle));
    url.searchParams.set('gender', gender);

    // 클립보드에 복사
    await navigator.clipboard.writeText(url.toString());
    return { success: true, message: '링크가 복사되었습니다!' };
  } catch (error) {
    console.error('링크 복사 중 오류가 발생했습니다:', error);
    return { success: false, message: '링크 복사에 실패했습니다.' };
  }
};

export const downloadResult = async (elementId: string) => {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      throw new Error('결과를 캡처할 요소를 찾을 수 없습니다.');
    }

    // 이미지 로딩을 위한 지연 처리
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff', // 배경색 지정
      imageTimeout: 5000, // 이미지 로딩 타임아웃 증가
    });
    
    const image = canvas.toDataURL('image/png', 1.0); // 최대 품질로 설정
    const link = document.createElement('a');
    link.href = image;
    link.download = '나의_러닝_MBTI_결과.png';
    link.click();
  } catch (error) {
    console.error('결과 이미지 다운로드 중 오류가 발생했습니다:', error);
    throw error;
  }
}; 