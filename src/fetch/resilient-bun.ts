import { dns } from "bun";

export interface ResilientFetchOptions extends Omit<RequestInit, "signal"> {
  origins?: string[];
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  circuitBreaker?: boolean;
  prefetch?: boolean;
  preconnect?: boolean;
}

type CircuitState = {
  failures: number;
  openUntilMs: number;
};

const circuitBreakers = new Map<string, CircuitState>();
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;

function isCircuitOpen(origin: string): boolean {
  const state = circuitBreakers.get(origin);
  return Boolean(state && state.openUntilMs > Date.now());
}

function recordCircuitFailure(origin: string): void {
  const state = circuitBreakers.get(origin) ?? { failures: 0, openUntilMs: 0 };
  state.failures += 1;
  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.openUntilMs = Date.now() + CIRCUIT_COOLDOWN_MS;
    state.failures = 0;
  }
  circuitBreakers.set(origin, state);
}

function recordCircuitSuccess(origin: string): void {
  circuitBreakers.set(origin, { failures: 0, openUntilMs: 0 });
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
      if (circuitBreaker && isCircuitOpen(origin)) {
        continue;
      }

      try {
        const url = buildUrl(origin, path);
        const response = await fetch(url, {
          ...fetchOptions,
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          if (circuitBreaker) recordCircuitSuccess(origin);
          return response;
        }

        const statusError = new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
        errors.push(statusError);
        if (circuitBreaker && response.status >= 500) {
          recordCircuitFailure(origin);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        if (circuitBreaker) {
          recordCircuitFailure(origin);
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
