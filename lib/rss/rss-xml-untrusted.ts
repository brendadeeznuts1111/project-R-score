// @see https://bun.com/reference/bun/XML/parse — strict native XML parsing

import type { RssChannelItem } from '../docs/bun-rss.ts';
import type { RSSFeed } from './rss-types.ts';
import {
  type RSSXmlBoundaryOptions,
  type RSSXmlBoundaryResult,
  type UntrustedRSSXmlInput,
} from './rss-xml-boundary-contract.ts';
import {
  createRSSXmlWorker,
  runRSSXmlWorker,
  type RSSXmlWorkerFactory,
} from './rss-xml-worker-client.ts';

export {
  requireRSSXmlBoundaryValue,
  RSSXmlBoundaryFailure,
  type RSSXmlBoundaryError,
  type RSSXmlBoundaryErrorCode,
  type RSSXmlBoundaryOptions,
  type RSSXmlBoundaryResult,
  type UntrustedRSSXmlInput,
} from './rss-xml-boundary-contract.ts';
export type { RSSXmlWorkerFactory } from './rss-xml-worker-client.ts';

/** Parse network- or user-supplied RSS without running Bun.XML on the caller thread. */
export async function parseRSSFeedUntrusted(
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions = {}
): Promise<RSSXmlBoundaryResult<RSSFeed>> {
  return runRSSXmlWorker('rss-feed', input, options, createRSSXmlWorker);
}

/** Parse Bun's public RSS channel without running Bun.XML on the caller thread. */
export async function parseRssChannelItemsUntrusted(
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions = {}
): Promise<RSSXmlBoundaryResult<RssChannelItem[]>> {
  return runRSSXmlWorker('bun-channel-items', input, options, createRSSXmlWorker);
}

/** Test seam for proving crash, hang, and disposal behavior with a real or fake worker. */
export async function parseRSSFeedWithWorkerFactoryForTest(
  input: UntrustedRSSXmlInput,
  options: RSSXmlBoundaryOptions,
  workerFactory: RSSXmlWorkerFactory
): Promise<RSSXmlBoundaryResult<RSSFeed>> {
  return runRSSXmlWorker('rss-feed', input, options, workerFactory);
}
