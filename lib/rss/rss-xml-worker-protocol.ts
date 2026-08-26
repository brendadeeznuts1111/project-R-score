import type { RssChannelItem } from '../docs/bun-rss.ts';
import type { RSSFeed } from './rss-types.ts';
import type { RSSXmlQuotas } from './rss-xml-input.ts';

export type RSSXmlWorkerOperation = 'rss-feed' | 'bun-channel-items';

export type RSSXmlWorkerRequest = {
  readonly protocol: 'factorywager-rss-xml-worker-v1';
  readonly operation: RSSXmlWorkerOperation;
  readonly bytes: Uint8Array;
  readonly quotas: RSSXmlQuotas;
};

export type RSSXmlWorkerValue = RSSFeed | RssChannelItem[];

export type RSSXmlWorkerResponse =
  | {
      readonly protocol: 'factorywager-rss-xml-worker-v1';
      readonly ok: true;
      readonly value: RSSXmlWorkerValue;
    }
  | {
      readonly protocol: 'factorywager-rss-xml-worker-v1';
      readonly ok: false;
      readonly error: { readonly name: string; readonly message: string };
    };
