/**
 * Channel events API — poll and SSE tail from R2 jsonl log (session-scoped).
 */

import { AccountR2Store } from '../../../lib/accounts/account-r2-store.ts';
import { R2ChannelStore, type ChannelMessage } from '../../../lib/channels/channels.ts';
import { sessionFromRequest } from '../../../lib/auth/session.ts';
import { isTenantSlug } from '../../../config/tenants.ts';
import { asPortalTenantId } from '../../../lib/types/branded/portal.ts';
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

  const session = await sessionFromRequest(request, secret);
  if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const topic = url.searchParams.get('topic') ?? 'onboard';
  if (!isTenantSlug(topic) && topic !== 'onboard' && topic !== 'ops-sync') {
    return jsonResponse({ error: 'Invalid topic' }, 400);
  }

  const accounts = new AccountR2Store(bucket);
  const account = await accounts.getByOidc(session.sub);

  if (topic !== 'onboard' && topic !== 'ops-sync') {
    if (!account || (account.tenantId as string) !== topic) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }
  }

  const since = Number(url.searchParams.get('since') ?? '0') || 0;
  const store = new R2ChannelStore(bucket);

  if (url.searchParams.get('stream') === '1') {
    return sseStream(store, topic, since, session.sub, account?.tenantId as string | undefined);
  }

  let events = await store.readSince(topic, since);
  events = filterEventsForSession(events, topic, session.sub, account?.tenantId as string | undefined);
  const meta = await store.getMeta(topic);
  return jsonResponse({ topic, since, events, meta });
}

function filterEventsForSession(
  events: ChannelMessage[],
  topic: string,
  oidcSubject: string,
  tenantId?: string // brand-ok — tenant slug filter
): ChannelMessage[] {
  if (topic === 'onboard') {
    return events.filter(ev => {
      const p = ev.payload as Record<string, unknown>;
      return p.oidcSubject === oidcSubject;
    });
  }
  if (topic === 'ops-sync' && tenantId) {
    return events.filter(ev => {
      const p = ev.payload as Record<string, unknown>;
      return p.tenantId === tenantId || p.tenantId === undefined;
    });
  }
  return events;
}

async function sseStream(
  store: R2ChannelStore,
  topic: string,
  since: number,
  oidcSubject: string,
  tenantId?: string // brand-ok — tenant slug filter
): Promise<Response> {
  let cursor = since;
  const stream = new ReadableStream({
    async pull(controller) {
      let events = await store.readSince(topic, cursor);
      events = filterEventsForSession(events, topic, oidcSubject, tenantId);
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
