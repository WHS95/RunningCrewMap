export enum ErrorCode {
  // 입력값 검증 에러
  INVALID_CREW_NAME = "INVALID_CREW_NAME",
  INVALID_DESCRIPTION = "INVALID_DESCRIPTION",
  INVALID_INSTAGRAM = "INVALID_INSTAGRAM",
  INVALID_LOCATION = "INVALID_LOCATION",
  INVALID_ACTIVITY_DAYS = "INVALID_ACTIVITY_DAYS",
  INVALID_AGE_RANGE = "INVALID_AGE_RANGE",
  INVALID_FOUNDED_DATE = "INVALID_FOUNDED_DATE",
  FUTURE_FOUNDED_DATE = "FUTURE_FOUNDED_DATE",

  // 파일 업로드 에러
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  UPLOAD_FAILED = "UPLOAD_FAILED",
  FILE_COMPRESSED = "FILE_COMPRESSED",
  COMPRESSION_FAILED = "COMPRESSION_FAILED",

  // DB 에러
  DUPLICATE_CREW_NAME = "DUPLICATE_CREW_NAME",
  FOREIGN_KEY_VIOLATION = "FOREIGN_KEY_VIOLATION",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",

  // 서버 에러
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
}

export interface ErrorDetails {
  originalError?: unknown;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

export interface AppError extends Error {
  code: ErrorCode;
  details?: ErrorDetails;
}

export const ErrorMessages: Record<ErrorCode, string> = {
  // 사용자에게 보여질 친화적인 메시지
  INVALID_CREW_NAME: "크루명은 2자 이상 100자 이하로 입력해주세요.",
  INVALID_DESCRIPTION: "크루 소개를 입력해주세요.",
  INVALID_INSTAGRAM: "올바른 인스타그램 아이디를 입력해주세요.",
  INVALID_LOCATION: "활동 장소를 입력해주세요.",
  INVALID_ACTIVITY_DAYS: "활동 요일을 선택해주세요.",
  INVALID_AGE_RANGE: "올바른 연령대 범위를 선택해주세요.",
  INVALID_FOUNDED_DATE: "올바른 크루 개설일을 선택해주세요.",
  FUTURE_FOUNDED_DATE: "크루 개설일은 오늘 이후의 날짜가 될 수 없습니다.",

  FILE_TOO_LARGE:
    "이미지 크기는 2MB 이하여야 합니다. 자동으로 압축을 시도합니다.",
  INVALID_FILE_TYPE: "JPG, PNG 형식의 이미지만 업로드 가능합니다.",
  UPLOAD_FAILED: "이미지 업로드에 실패했습니다. 다시 시도해주세요.",
  FILE_COMPRESSED: "이미지가 자동으로 압축되었습니다.",
  COMPRESSION_FAILED:
    "이미지 압축에 실패했습니다. 더 작은 이미지를 사용해주세요.",

  DUPLICATE_CREW_NAME: "이미 사용 중인 크루명입니다. 다른 이름을 선택해주세요.",
  FOREIGN_KEY_VIOLATION: "데이터 처리 중 오류가 발생했습니다.",
  TRANSACTION_FAILED: "크루 등록에 실패했습니다. 다시 시도해주세요.",

  SERVER_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  NETWORK_ERROR: "네트워크 연결을 확인해주세요.",
  STORAGE_ERROR: "파일 저장소 오류가 발생했습니다. 다시 시도해주세요.",
};
