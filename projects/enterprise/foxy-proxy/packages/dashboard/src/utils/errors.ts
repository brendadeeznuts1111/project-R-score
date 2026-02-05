/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * API-related errors
 */
export class APIError extends AppError {
  constructor(message: string, code?: string, statusCode: number = 500) {
    super(message, code, statusCode);
    this.name = "APIError";
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", 0);
    this.name = "NetworkError";
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", 500);
    this.name = "ConfigError";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

/**
 * R2/storage errors
 */
export class StorageError extends AppError {
  constructor(message: string, code?: string) {
    super(message, code, 500);
    this.name = "StorageError";
  }
}

/**
 * Automation errors
 */
export class AutomationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, code, 500);
    this.name = "AutomationError";
  }
}

/**
 * Error factory for creating appropriate error types
 */
export const ErrorFactory = {
  fromAxiosError(error: unknown): APIError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    const message = axiosError.response?.data?.msg || axiosError.message || "Unknown API error";
    const code = axiosError.response?.data?.code?.toString();
    const statusCode = axiosError.response?.status || 500;

    return new APIError(message, code, statusCode);
  },

  fromError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message);
    }

    return new AppError("Unknown error occurred");
  }
};

/**
 * Error logging utility
 */
export const logError = (error: AppError, context?: string) => {
  console.error(`[${error.name}] ${context ? `${context}: ` : ""}${error.message}`, {
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack
  });
};
