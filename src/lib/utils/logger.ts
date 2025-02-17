import { ErrorCode, AppError, ErrorDetails } from "../types/error";

interface LogContext {
  userId?: string;
  path?: string;
  action?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

interface LogData {
  code: ErrorCode;
  message: string;
  stack?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

class Logger {
  private formatError(error: AppError, context: LogContext): LogData {
    return {
      code: error.code,
      message: error.message,
      stack: error.stack,
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
    };
  }

  error(error: AppError, context: LogContext = {}) {
    const logData = this.formatError(error, context);

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === "development") {
      console.error("[ERROR]", logData);
      return;
    }

    // 프로덕션 환경에서는 외부 로깅 서비스로 전송
    // TODO: 외부 로깅 서비스 연동 (예: Sentry, LogRocket 등)
    this.sendToExternalService(logData);
  }

  private async sendToExternalService(logData: LogData): Promise<void> {
    // 외부 로깅 서비스 연동 로직이 구현되기 전까지 콘솔에 출력
    console.warn("[External Service]", logData);
  }

  createError(code: ErrorCode, details?: ErrorDetails): AppError {
    const error = new Error(code) as AppError;
    error.code = code;
    if (details) error.details = details;
    return error;
  }
}

export const logger = new Logger();
