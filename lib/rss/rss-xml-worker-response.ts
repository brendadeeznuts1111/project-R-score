import type { RSSXmlWorkerResponse } from './rss-xml-worker-protocol.ts';

export function isRSSXmlWorkerResponse(value: unknown): value is RSSXmlWorkerResponse {
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
