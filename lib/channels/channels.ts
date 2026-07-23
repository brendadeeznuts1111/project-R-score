/**
 * R2 append-only channel event log.
 */

import type { R2PutBucket } from '../pages/r2-types.ts';
import { r2AppendText, r2GetJson, r2GetText, r2PutJson } from '../pages/r2-types.ts';
import type { PortalTenantId } from '../types/branded/portal.ts';

export type ChannelMessage = {
  seq: number;
  topic: string;
  payload: unknown;
  timestamp: string;
  sender: string;
  tenant?: string;
};

export type ChannelMeta = {
  lastSeq: number;
  updatedAt: string;
};

function eventsKey(topic: string): string {
  return `channels/${topic}/events.jsonl`;
}

function metaKey(topic: string): string {
  return `channels/${topic}/meta.json`;
}

export class R2ChannelStore {
  constructor(private readonly bucket: R2PutBucket) {}

  async publish(
    topic: string,
    // eslint-disable-next-line harness/no-unknown-function-param -- R2 channel wire payload
    payload: unknown,
    opts?: { sender?: string; tenant?: PortalTenantId }
  ): Promise<ChannelMessage> {
    const meta = (await r2GetJson<ChannelMeta>(this.bucket, metaKey(topic))) ?? {
      lastSeq: 0,
      updatedAt: new Date().toISOString(),
    };
    const seq = meta.lastSeq + 1;
    const msg: ChannelMessage = {
      seq,
      topic,
      payload,
      timestamp: new Date().toISOString(),
      sender: opts?.sender ?? 'dashboard',
      tenant: opts?.tenant as string | undefined,
    };
    await r2AppendText(this.bucket, eventsKey(topic), `${JSON.stringify(msg)}\n`);
    await r2PutJson(this.bucket, metaKey(topic), {
      lastSeq: seq,
      updatedAt: msg.timestamp,
    });
    return msg;
  }

  async readSince(topic: string, since: number): Promise<ChannelMessage[]> {
    const text = (await r2GetText(this.bucket, eventsKey(topic))) ?? '';
    const out: ChannelMessage[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as ChannelMessage;
        if (msg.seq > since) out.push(msg);
      } catch {
        /* skip corrupt line */
      }
    }
    return out;
  }

  async getMeta(topic: string): Promise<ChannelMeta> {
    return (
      (await r2GetJson<ChannelMeta>(this.bucket, metaKey(topic))) ?? {
        lastSeq: 0,
        updatedAt: new Date(0).toISOString(),
      }
    );
  }
}

/** Dev/test in-memory channel. */
export class MemoryChannelStore {
  private events = new Map<string, ChannelMessage[]>();

  async publish(
    topic: string,
    // eslint-disable-next-line harness/no-unknown-function-param -- R2 channel wire payload
    payload: unknown,
    opts?: { sender?: string; tenant?: PortalTenantId }
  ): Promise<ChannelMessage> {
    const list = this.events.get(topic) ?? [];
    const seq = list.length + 1;
    const msg: ChannelMessage = {
      seq,
      topic,
      payload,
      timestamp: new Date().toISOString(),
      sender: opts?.sender ?? 'dashboard',
      tenant: opts?.tenant as string | undefined,
    };
    list.push(msg);
    this.events.set(topic, list);
    return msg;
  }

  async readSince(topic: string, since: number): Promise<ChannelMessage[]> {
    return (this.events.get(topic) ?? []).filter(m => m.seq > since);
  }
}

export async function publishEvent(
  store: R2ChannelStore | MemoryChannelStore,
  topic: string,
  // eslint-disable-next-line harness/no-unknown-function-param -- R2 channel wire payload
  payload: unknown,
  opts?: { sender?: string; tenant?: PortalTenantId }
): Promise<ChannelMessage> {
  return store.publish(topic, payload, opts);
}
