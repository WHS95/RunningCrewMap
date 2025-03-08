// 이미지 업로드 전략 인터페이스
export interface PhotoUploadStrategy {
  getMaxPhotoCount(): number;
  validatePhotos(
    photos: File[],
    newPhotos: File[]
  ): {
    isValid: boolean;
    errorTitle?: string;
    errorMessage?: string;
  };
  getPhotoUploadButtonText(): string;
  getPhotoSectionTitle(): string;
}

// 단일 이미지 업로드 전략 (1개)
export class SinglePhotoUploadStrategy implements PhotoUploadStrategy {
  getMaxPhotoCount(): number {
    return 1;
  }

  validatePhotos(
    photos: File[],
    newPhotos: File[]
  ): {
    isValid: boolean;
    errorTitle?: string;
    errorMessage?: string;
  } {
    if (photos.length + newPhotos.length > this.getMaxPhotoCount()) {
      return {
        isValid: false,
        errorTitle: "사진 개수 초과",
        errorMessage: "크루 사진은 1개만 업로드할 수 있습니다.",
      };
    }
    return { isValid: true };
  }

  getPhotoUploadButtonText(): string {
    return "크루 대표 활동 사진 업로드 (최대 1개)";
  }

  getPhotoSectionTitle(): string {
    return "크루 대표 활동 사진 (선택사항)";
  }
}

// 다중 이미지 업로드 전략 (3개) - 미래에 사용
export class MultiplePhotoUploadStrategy implements PhotoUploadStrategy {
  getMaxPhotoCount(): number {
    return 3;
  }

  validatePhotos(
    photos: File[],
    newPhotos: File[]
  ): {
    isValid: boolean;
    errorTitle?: string;
    errorMessage?: string;
  } {
    if (photos.length + newPhotos.length > this.getMaxPhotoCount()) {
      return {
        isValid: false,
        errorTitle: "사진 개수 초과",
        errorMessage: "크루 사진은 최대 3개까지만 업로드할 수 있습니다.",
      };
    }
    return { isValid: true };
  }

  getPhotoUploadButtonText(): string {
    return "크루 대표 활동 사진 업로드 (최대 3개)";
  }

  getPhotoSectionTitle(): string {
    return "크루 대표 활동 사진 (선택사항)";
  }
}

// 이미지 전략 선택을 위한 팩토리 클래스
export class PhotoUploadStrategyFactory {
  static getStrategy(): PhotoUploadStrategy {
    // 환경 변수나 설정에 따라 전략을 바꿀 수 있음
    // 지금은 하드코딩으로 SinglePhotoUploadStrategy를 사용
    return new SinglePhotoUploadStrategy();

    // 향후 다중 업로드로 전환할 때는 아래 코드로 변경하면 됨
    // return new MultiplePhotoUploadStrategy();
  }
}
