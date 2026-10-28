// @see https://bun.com/docs/runtime/workers#creating-a-worker — isolated worker execution
// @see https://bun.com/reference/bun/XML/parse — strict native XML parsing

import { parseRssChannelItems } from '../docs/bun-rss.ts';
import { parseRSSFeed } from './rss-xml.ts';
import type { RSSXmlWorkerRequest, RSSXmlWorkerResponse } from './rss-xml-worker-protocol.ts';

// eslint-disable-next-line harness/no-unknown-function-param -- worker catch-boundary normalization
function errorFields(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name || 'Error', message: error.message }
    : { name: 'Error', message: String(error) };
}

self.onmessage = (event: MessageEvent<RSSXmlWorkerRequest>) => {
  const request = event.data;
  let response: RSSXmlWorkerResponse;
  try {
    if (request?.protocol !== 'factorywager-rss-xml-worker-v1') {
      throw new Error('Unsupported RSS XML worker protocol');
    }
    const value =
      request.operation === 'rss-feed'
        ? parseRSSFeed(request.bytes, request.quotas)
        : request.operation === 'bun-channel-items'
          ? parseRssChannelItems(request.bytes, request.quotas)
          : (() => {
              throw new Error('Unsupported RSS XML worker operation');
            })();
    response = { protocol: request.protocol, ok: true, value };
  } catch (error) {
    response = {
      protocol: 'factorywager-rss-xml-worker-v1',
      ok: false,
      error: errorFields(error),
    };
  }
  self.postMessage(response);
};
