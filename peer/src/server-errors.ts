import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "http_error", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class AuthenticationError extends HttpError {
  constructor(message = "Authentication required.") {
    super(401, message, "authentication_required");
  }
}

export class AuthorizationError extends HttpError {
  constructor(message = "You do not have permission for this action.") {
    super(403, message, "forbidden");
  }
}

export class RateLimitError extends HttpError {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(429, message, "rate_limited", { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof RateLimitError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(error.retryAfterSeconds),
        },
      },
    );
  }

  if (error instanceof HttpError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Request validation failed.",
        code: "invalid_request",
        details: error.flatten(),
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json(
    {
      error: message,
      code: "internal_error",
    },
    {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
