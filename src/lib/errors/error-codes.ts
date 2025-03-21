export enum ErrorCode {
  // 일반 에러
  UNKNOWN_ERROR = "UNKNOWN_ERROR",

  // 인증 관련 에러
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // 데이터베이스 관련 에러
  DATABASE_ERROR = "DATABASE_ERROR",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  FOREIGN_KEY_VIOLATION = "FOREIGN_KEY_VIOLATION",
  NOT_FOUND = "NOT_FOUND",

  // 파일 및 스토리지 관련 에러
  FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED",
  STORAGE_INITIALIZATION_FAILED = "STORAGE_INITIALIZATION_FAILED",

  // 유효성 검증 관련 에러
  VALIDATION_FAILED = "VALIDATION_FAILED",

  // API 관련 에러
  API_ERROR = "API_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // 외부 서비스 관련 에러
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}
