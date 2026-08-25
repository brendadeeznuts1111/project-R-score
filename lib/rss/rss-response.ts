import type { RSSChannelDocument } from './rss-fanout.ts';

export interface RSSResponseOptions {
  cacheControl?: string;
  headers?: HeadersInit;
}

function opaqueETag(tag: string): string {
  return tag.trim().replace(/^W\//, '');
}

function matchesETag(header: string, etag: string): boolean {
  if (header.trim() === '*') return true;
  const expected = opaqueETag(etag);
  return header.split(',').some(candidate => opaqueETag(candidate) === expected);
}

function matchesStrongETag(header: string, etag: string): boolean {
  if (header.trim() === '*') return true;
  return header.split(',').some(candidate => {
    const value = candidate.trim();
    return !value.startsWith('W/') && value === etag;
  });
}

function isPreconditionFailed(request: Request, document: RSSChannelDocument): boolean {
  const ifMatch = request.headers.get('If-Match');
  if (ifMatch !== null) return !matchesStrongETag(ifMatch, document.etag);
  const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
  if (!ifUnmodifiedSince || !document.lastModified) return false;
  const since = Date.parse(ifUnmodifiedSince);
  const modified = Date.parse(document.lastModified);
  return Number.isFinite(since) && Number.isFinite(modified) && modified > since;
}

function isNotModified(request: Request, document: RSSChannelDocument): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch !== null) return matchesETag(ifNoneMatch, document.etag);
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  if (!ifModifiedSince || !document.lastModified) return false;
  const since = Date.parse(ifModifiedSince);
  const modified = Date.parse(document.lastModified);
  return Number.isFinite(since) && Number.isFinite(modified) && modified <= since;
}

function responseHeaders(
  document: RSSChannelDocument,
  options: RSSResponseOptions,
  includeEntityHeaders: boolean
): Headers {
  const headers = new Headers(options.headers);
  headers.set('ETag', document.etag);
  headers.set('Cache-Control', options.cacheControl ?? 'public, max-age=60, must-revalidate');
  if (document.lastModified) headers.set('Last-Modified', document.lastModified);
  if (includeEntityHeaders) {
    headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
    headers.set('Content-Length', String(document.byteLength));
  } else {
    headers.delete('Content-Length');
  }
  return headers;
}

export function respondRSSDocument(
  document: RSSChannelDocument,
  request: Request,
  options: RSSResponseOptions = {}
): Response {
  if (isPreconditionFailed(request, document)) {
    return new Response(null, {
      status: 412,
      headers: responseHeaders(document, options, false),
    });
  }
  if (isNotModified(request, document)) {
    return new Response(null, {
      status: 304,
      headers: responseHeaders(document, options, false),
    });
  }
  const headers = responseHeaders(document, options, true);
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
  return new Response(document.xml, { status: 200, headers });
}
