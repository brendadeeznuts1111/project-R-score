import type { RSSXmlQuotas } from './rss-xml-input.ts';

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

export function rssXmlBoundaryError(
  code: RSSXmlBoundaryErrorCode,
  name: string,
  message: string
): RSSXmlBoundaryResult<never> {
  return { ok: false, error: { code, name, message } };
}
