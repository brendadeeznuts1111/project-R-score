// @see https://bun.com/docs/runtime/networking/fetch — fetch, redirect, timeout

import {
  fetchWithRedirectPolicy,
  readBoundedBody,
  validateRemoteHttpsUrl,
  type RemoteFetchPolicy,
} from './remote-fetch.ts';

export type ImageFetchPolicy = Omit<RemoteFetchPolicy, 'label'>;

export function validateRemoteImageUrl(
  input: string | URL,
  allowedOrigins?: ReadonlySet<string>
): URL {
  return validateRemoteHttpsUrl(input, allowedOrigins, 'Feed image');
}

export function fetchImageResponse(
  initialUrl: URL,
  headers: Headers,
  policy: ImageFetchPolicy
): Promise<{ response: Response; finalUrl: URL }> {
  return fetchWithRedirectPolicy(initialUrl, headers, { ...policy, label: 'Feed image' });
}

export function readBoundedImageBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  return readBoundedBody(response, maxBytes, 'Feed image');
}
