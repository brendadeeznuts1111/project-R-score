import { dns } from "bun";
import { CircuitBreaker, createCircuitBreaker } from "./resilient-ultra";

export interface ResilientFetchOptions extends Omit<RequestInit, "signal"> {
  origins?: string[];
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  circuitBreaker?: boolean;
  prefetch?: boolean;
  preconnect?: boolean;
  circuitBreakerConfig?: Partial<{
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxCalls: number;
  }>;
}

const circuitBreakers = new Map<string, CircuitBreaker>();

function getOrCreateCircuitBreaker(origin: string, config?: ResilientFetchOptions["circuitBreakerConfig"]): CircuitBreaker {
  let cb = circuitBreakers.get(origin);
  if (!cb) {
    cb = createCircuitBreaker(config);
    circuitBreakers.set(origin, cb);
  }
  return cb;
}

function isCircuitOpen(origin: string): boolean {
  const cb = circuitBreakers.get(origin);
  return cb ? !cb.canExecute() : false;
}

function recordCircuitFailure(origin: string): void {
  getOrCreateCircuitBreaker(origin).recordFailure();
}

function recordCircuitSuccess(origin: string): void {
  getOrCreateCircuitBreaker(origin).recordSuccess();
}

function buildUrl(origin: string, path: string): string {
  const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedOrigin}${normalizedPath}`;
}

export async function resilientFetchBun(path: string, options: ResilientFetchOptions = {}): Promise<Response> {
  const {
    origins = ["http://localhost:3000", "http://localhost:3001", "http://backup.internal"],
    timeoutMs = 5000,
    retries = 3,
    backoffMs = 100,
    circuitBreaker = true,
    prefetch = true,
    preconnect = true,
    circuitBreakerConfig,
    ...fetchOptions
  } = options;

  if (prefetch) {
    for (const origin of origins) {
      try {
        dns.prefetch(new URL(origin).hostname);
      } catch {
        // ignore invalid origin or prefetch failures
      }
    }
  }

  if (preconnect) {
    await Promise.all(
      origins.map(async (origin) => {
        try {
          await fetch.preconnect(origin);
        } catch {
          // preconnect is best-effort only
        }
      })
    );
  }

  const errors: Error[] = [];

  for (let attempt = 0; attempt < retries; attempt += 1) {
    for (const origin of origins) {
      const cb = getOrCreateCircuitBreaker(origin, circuitBreakerConfig);
      if (circuitBreaker && !cb.canExecute()) {
        continue;
      }

      try {
        const url = buildUrl(origin, path);
        const response = await fetch(url, {
          ...fetchOptions,
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          if (circuitBreaker) cb.recordSuccess();
          return response;
        }

        const statusError = new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
        errors.push(statusError);
        if (circuitBreaker && response.status >= 500) {
          cb.recordFailure();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        if (circuitBreaker) {
          cb.recordFailure();
        }
      }
    }

    if (attempt < retries - 1) {
      await Bun.sleep(backoffMs * Math.pow(2, attempt));
    }
  }

  throw new AggregateError(
    errors,
    `Service unavailable after ${retries} retries across ${origins.length} origins`
  );
}

export function resetAllCircuitBreakers(): void {
  for (const cb of circuitBreakers.values()) {
    cb.reset();
  }
}

export function getCircuitBreakerStates(): Record<string, string> {
  return Object.fromEntries(
    Array.from(circuitBreakers.entries()).map(([origin, cb]) => [origin, cb.getState()])
  );
}
