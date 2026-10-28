// @see https://bun.com/docs/runtime/workers#creating-a-worker — worker isolation
// @see https://bun.com/docs/runtime/workers#worker-unref — do not retain the caller
// @see https://bun.com/docs/runtime/workers#terminating-a-worker — deterministic disposal

import {
  rssXmlBoundaryError,
  type RSSXmlBoundaryOptions,
  type RSSXmlBoundaryResult,
  type UntrustedRSSXmlInput,
} from './rss-xml-boundary-contract.ts';
import {
  assertRssXmlInputWithinQuota,
  DEFAULT_RSS_XML_QUOTAS,
  type RSSXmlQuotas,
} from './rss-xml-input.ts';
import type {
  RSSXmlWorkerOperation,
  RSSXmlWorkerRequest,
  RSSXmlWorkerValue,
} from './rss-xml-worker-protocol.ts';
import { isRSSXmlWorkerResponse } from './rss-xml-worker-response.ts';

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

function resolveOptions(options: RSSXmlBoundaryOptions): {
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

export function createRSSXmlWorker(): RSSXmlWorkerLike {
  return new Worker(new URL('./rss-xml-worker.ts', import.meta.url), {
    type: 'module',
    smol: true,
    name: 'factorywager-rss-xml-parser',
  });
}

export async function runRSSXmlWorker<T extends RSSXmlWorkerValue>(
  operation: RSSXmlWorkerOperation,
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions,
  workerFactory: RSSXmlWorkerFactory
): Promise<RSSXmlBoundaryResult<T>> {
  let prepared: ReturnType<typeof resolveOptions>;
  let bytes: Uint8Array;
  try {
    prepared = resolveOptions(options);
    bytes = materializeBoundedBytes(input, prepared.quotas.maxInputBytes);
  } catch (error) {
    return rssXmlBoundaryError(
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
        rssXmlBoundaryError(
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
        // Preserve the already-selected structured result after redundant disposal errors.
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
      if (!isRSSXmlWorkerResponse(event.data)) {
        finish(rssXmlBoundaryError('protocol-error', 'Error', 'Invalid RSS XML worker response'));
      } else if (event.data.ok) {
        finish({ ok: true, value: event.data.value as T });
      } else {
        finish(
          rssXmlBoundaryError('parse-rejected', event.data.error.name, event.data.error.message)
        );
      }
    }) as EventListener;
    const onError = ((event: ErrorEvent) => {
      finish(
        rssXmlBoundaryError(
          'worker-failure',
          'Error',
          event.message || 'RSS XML worker failed before returning a result'
        )
      );
    }) as EventListener;
    const onMessageError = (() => {
      finish(
        rssXmlBoundaryError('protocol-error', 'Error', 'RSS XML worker reply was not cloneable')
      );
    }) as EventListener;
    const timer = setTimeout(() => {
      finish(
        rssXmlBoundaryError(
          'deadline-exceeded',
          'TimeoutError',
          `RSS XML parse exceeded ${prepared.deadlineMs}ms deadline`
        )
      );
    }, prepared.deadlineMs);

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
        rssXmlBoundaryError(
          'worker-failure',
          error instanceof Error ? error.name : 'Error',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  });
}
