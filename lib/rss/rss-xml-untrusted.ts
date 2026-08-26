// @see https://bun.com/docs/runtime/workers#creating-a-worker — worker isolation
// @see https://bun.com/docs/runtime/workers#worker-unref — do not retain the caller
// @see https://bun.com/docs/runtime/workers#terminating-a-worker — deterministic disposal
// @see https://bun.com/reference/bun/XML/parse — strict native XML parsing

import type { RssChannelItem } from '../docs/bun-rss.ts';
import {
  assertRssXmlInputWithinQuota,
  DEFAULT_RSS_XML_QUOTAS,
  type RSSXmlQuotas,
} from './rss-xml-input.ts';
import type { RSSFeed } from './rss-types.ts';
import type {
  RSSXmlWorkerOperation,
  RSSXmlWorkerRequest,
  RSSXmlWorkerResponse,
  RSSXmlWorkerValue,
} from './rss-xml-worker-protocol.ts';

export type UntrustedRSSXmlInput = string | ArrayBuffer | ArrayBufferView;

export type RSSXmlBoundaryErrorCode =
  'invalid-input' | 'parse-rejected' | 'deadline-exceeded' | 'worker-failure' | 'protocol-error';

export type RSSXmlBoundaryError = {
  readonly code: RSSXmlBoundaryErrorCode;
  readonly name: string;
  readonly message: string;
};

export type RSSXmlBoundaryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RSSXmlBoundaryError };

export class RSSXmlBoundaryFailure extends Error {
  readonly code: RSSXmlBoundaryErrorCode;

  constructor(error: RSSXmlBoundaryError) {
    super(error.message);
    this.name = error.name;
    this.code = error.code;
  }
}

export function requireRSSXmlBoundaryValue<T>(result: RSSXmlBoundaryResult<T>): T {
  if (result.ok) return result.value;
  throw new RSSXmlBoundaryFailure(result.error);
}

export type RSSXmlBoundaryOptions = {
  /** Wall-clock budget for worker startup, parsing, validation, and reply. */
  readonly deadlineMs?: number;
  readonly quotas?: Partial<RSSXmlQuotas>;
};

type RSSXmlWorkerLike = {
  postMessage(message: RSSXmlWorkerRequest, transfer?: readonly Transferable[]): void;
  addEventListener(type: 'message' | 'error' | 'messageerror', listener: EventListener): void;
  removeEventListener(type: 'message' | 'error' | 'messageerror', listener: EventListener): void;
  unref?(): void;
  terminate(): void;
};

export type RSSXmlWorkerFactory = () => RSSXmlWorkerLike;

const DEFAULT_DEADLINE_MS = 1_000;
const MAX_DEADLINE_MS = 30_000;

function errorResult(
  code: RSSXmlBoundaryErrorCode,
  name: string,
  message: string
): RSSXmlBoundaryResult<never> {
  return { ok: false, error: { code, name, message } };
}

function materializeBoundedBytes(input: UntrustedRSSXmlInput, maxInputBytes: number): Uint8Array {
  if (typeof input === 'string' && input.length > maxInputBytes) {
    throw new RangeError(`RSS XML input exceeds ${maxInputBytes} byte quota`);
  }
  const source =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : ArrayBuffer.isView(input)
        ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
        : new Uint8Array(input);
  assertRssXmlInputWithinQuota(source, maxInputBytes);
  return source.slice();
}

function resolvedOptions(options: RSSXmlBoundaryOptions): {
  deadlineMs: number;
  quotas: RSSXmlQuotas;
} {
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > MAX_DEADLINE_MS) {
    throw new RangeError(`RSS XML deadlineMs must be an integer from 1 to ${MAX_DEADLINE_MS}`);
  }
  const quotas = Object.freeze({ ...DEFAULT_RSS_XML_QUOTAS, ...options.quotas });
  // Validate all quota fields before authority crosses into a worker. The shape
  // checker validates these same values again after Bun.XML.parse.
  assertRssXmlInputWithinQuota(new Uint8Array(), quotas.maxInputBytes);
  for (const [name, value, minimum] of [
    ['maxDepth', quotas.maxDepth, 0],
    ['maxNodes', quotas.maxNodes, 1],
    ['maxAttributesPerElement', quotas.maxAttributesPerElement, 0],
    ['maxTextBytes', quotas.maxTextBytes, 0],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new RangeError(`RSS XML ${name} must be a safe integer >= ${minimum}`);
    }
  }
  return { deadlineMs, quotas };
}

function defaultWorkerFactory(): RSSXmlWorkerLike {
  return new Worker(new URL('./rss-xml-worker.ts', import.meta.url), {
    type: 'module',
    smol: true,
    name: 'factorywager-rss-xml-parser',
  });
}

function isWorkerResponse(value: unknown): value is RSSXmlWorkerResponse {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.protocol !== 'factorywager-rss-xml-worker-v1') return false;
  if (record.ok === true) {
    return Object.keys(record).sort().join(',') === 'ok,protocol,value';
  }
  if (record.ok !== false || Object.keys(record).sort().join(',') !== 'error,ok,protocol') {
    return false;
  }
  if (record.error === null || typeof record.error !== 'object') return false;
  const error = record.error as Record<string, unknown>;
  return (
    Object.keys(error).sort().join(',') === 'message,name' &&
    typeof error.name === 'string' &&
    typeof error.message === 'string'
  );
}

async function runWorker<T extends RSSXmlWorkerValue>(
  operation: RSSXmlWorkerOperation,
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions,
  workerFactory: RSSXmlWorkerFactory
): Promise<RSSXmlBoundaryResult<T>> {
  let prepared: ReturnType<typeof resolvedOptions>;
  let bytes: Uint8Array;
  try {
    prepared = resolvedOptions(options);
    bytes = materializeBoundedBytes(input, prepared.quotas.maxInputBytes);
  } catch (error) {
    return errorResult(
      'invalid-input',
      error instanceof Error ? error.name : 'Error',
      error instanceof Error ? error.message : String(error)
    );
  }

  return await new Promise(resolve => {
    let worker: RSSXmlWorkerLike;
    try {
      worker = workerFactory();
    } catch (error) {
      resolve(
        errorResult(
          'worker-failure',
          error instanceof Error ? error.name : 'Error',
          error instanceof Error ? error.message : String(error)
        )
      );
      return;
    }

    let settled = false;
    const dispose = () => {
      try {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        worker.removeEventListener('messageerror', onMessageError);
      } catch {
        // Continue to termination if an injected EventTarget is already gone.
      }
      try {
        worker.terminate();
      } catch {
        // Termination is idempotent cleanup. The already-selected structured
        // result remains the caller-visible outcome if the runtime reports a
        // redundant disposal error.
      }
    };
    const finish = (result: RSSXmlBoundaryResult<T>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      dispose();
      resolve(result);
    };
    const onMessage = ((event: MessageEvent<unknown>) => {
      if (!isWorkerResponse(event.data)) {
        finish(errorResult('protocol-error', 'Error', 'Invalid RSS XML worker response'));
        return;
      }
      if (event.data.ok) {
        finish({ ok: true, value: event.data.value as T });
      } else {
        finish(errorResult('parse-rejected', event.data.error.name, event.data.error.message));
      }
    }) as EventListener;
    const onError = ((event: ErrorEvent) => {
      finish(
        errorResult(
          'worker-failure',
          'Error',
          event.message || 'RSS XML worker failed before returning a result'
        )
      );
    }) as EventListener;
    const onMessageError = (() => {
      finish(errorResult('protocol-error', 'Error', 'RSS XML worker reply was not cloneable'));
    }) as EventListener;
    const timer = setTimeout(() => {
      finish(
        errorResult(
          'deadline-exceeded',
          'TimeoutError',
          `RSS XML parse exceeded ${prepared.deadlineMs}ms deadline`
        )
      );
    }, prepared.deadlineMs);

    // Bun's runtime exposes Worker.unref(); some stable DOM declaration sets
    // have not yet caught up, so the structural contract keeps it optional.
    try {
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.addEventListener('messageerror', onMessageError);
      worker.unref?.();
      const request: RSSXmlWorkerRequest = {
        protocol: 'factorywager-rss-xml-worker-v1',
        operation,
        bytes,
        quotas: prepared.quotas,
      };
      worker.postMessage(request, [bytes.buffer]);
    } catch (error) {
      finish(
        errorResult(
          'worker-failure',
          error instanceof Error ? error.name : 'Error',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  });
}

/** Parse network- or user-supplied RSS without running Bun.XML on the caller thread. */
export async function parseRSSFeedUntrusted(
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions = {}
): Promise<RSSXmlBoundaryResult<RSSFeed>> {
  return runWorker('rss-feed', input, options, defaultWorkerFactory);
}

/** Parse Bun's public RSS channel without running Bun.XML on the caller thread. */
export async function parseRssChannelItemsUntrusted(
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions = {}
): Promise<RSSXmlBoundaryResult<RssChannelItem[]>> {
  return runWorker('bun-channel-items', input, options, defaultWorkerFactory);
}

/** Test seam for proving crash, hang, and disposal behavior with a real or fake worker. */
export async function parseRSSFeedWithWorkerFactoryForTest(
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions,
  workerFactory: RSSXmlWorkerFactory
): Promise<RSSXmlBoundaryResult<RSSFeed>> {
  return runWorker('rss-feed', input, options, workerFactory);
}
