import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly recoverable = false,
  ) {
    super(message);
  }
}

type FetchJsonOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
};

export async function fetchJson<T>(
  url: string,
  init?: FetchJsonOptions,
): Promise<T> {
  const retries = init?.retries ?? 1;
  const retryDelayMs = init?.retryDelayMs ?? 500;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: init?.credentials ?? "same-origin",
        ...init,
      });
      const payload = (await response.json()) as T & { error?: string };

      if (!response.ok) {
        throw new HttpError(
          typeof payload.error === "string" ? payload.error : "Unexpected request failure.",
          response.status,
          response.status >= 500,
        );
      }

      return payload;
    } catch (error) {
      const recoverable =
        error instanceof HttpError ? error.recoverable : true;
      logger.warn("HTTP request failed", {
        url,
        attempt,
        recoverable,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt >= retries || !recoverable) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    }
  }

  throw new Error("Unreachable fetchJson state.");
}
