/**
 * Channel events API — poll and SSE tail from R2 jsonl log.
 */

import { R2ChannelStore } from '../../../lib/channels/channels.ts';
import { sessionFromRequest } from '../../../lib/auth/session.ts';
import { isTenantSlug } from '../../../config/tenants.ts';
import {
  jsonResponse,
  requireBucket,
  requireSessionSecret,
  type PagesContext,
} from '../_shared/pages-env.ts';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let secret: string;
  let bucket: NonNullable<typeof env.REGISTRY_BUCKET>;
  try {
    secret = requireSessionSecret(env);
    bucket = requireBucket(env);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const url = new URL(request.url);
  const topic = url.searchParams.get('topic') ?? 'onboard';
  if (!isTenantSlug(topic) && topic !== 'onboard') {
    return jsonResponse({ error: 'Invalid topic' }, 400);
  }

  const session = await sessionFromRequest(request, secret);
  if (!session && topic !== 'onboard') {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const since = Number(url.searchParams.get('since') ?? '0') || 0;
  const store = new R2ChannelStore(bucket);

  if (url.searchParams.get('stream') === '1') {
    return sseStream(store, topic, since);
  }

  const events = await store.readSince(topic, since);
  const meta = await store.getMeta(topic);
  return jsonResponse({ topic, since, events, meta });
}

async function sseStream(
  store: R2ChannelStore,
  topic: string,
  since: number
): Promise<Response> {
  let cursor = since;
  const stream = new ReadableStream({
    async pull(controller) {
      const events = await store.readSince(topic, cursor);
      if (events.length === 0) {
        await new Promise(r => setTimeout(r, 2000));
        return;
      }
      for (const ev of events) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(ev)}\n\n`));
        cursor = ev.seq;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}
