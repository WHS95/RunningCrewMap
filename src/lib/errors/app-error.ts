import { ErrorCode } from "./error-codes";

interface AppErrorParams {
  code: ErrorCode;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export class AppError extends Error {
  code: ErrorCode;
  details: unknown;
  statusCode: number;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.details = params.details;
    this.statusCode = params.statusCode || 500;

    // 스택 트레이스를 올바르게 캡처하기 위한 설정
    Error.captureStackTrace(this, this.constructor);
  }
}
