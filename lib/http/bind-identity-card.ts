// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port / hostname after Bun.serve
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — BUN_PORT / PORT / NODE_PORT pre-bind only
/**
 * BIND IDENTITY startup card — chosen listen identity after Bun.serve.
 *
 * Operators read `server.port` / `server.url` (and harness loopbackOrigin) from the
 * live snapshot — never re-read env for the bound port.
 */
import { formatIndexedCards, type IndexedCard } from '../portal/cli-chrome.ts';
import type { ServeBindSnapshot } from './bun-server.ts';

/** Fields needed for the startup identity card (no live Server handle). */
export type BindIdentitySnapshot = Pick<
  ServeBindSnapshot,
  'port' | 'hostname' | 'protocol' | 'url' | 'origin' | 'loopbackOrigin' | 'development'
>;

/**
 * Indexed cards: #1 port … #n loopback (chosen listen after Bun.serve).
 */
export function bindIdentityCards(snapshot: BindIdentitySnapshot): IndexedCard[] {
  return [
    {
      index: 1,
      title: 'port',
      subtitle: 'server.port',
      fields: [
        ['value', String(snapshot.port)],
        [
          'note',
          'omit → --port → BUN_PORT → PORT → NODE_PORT → 3000 then read server.port after bind',
        ],
      ],
    },
    {
      index: 2,
      title: 'hostname',
      subtitle: 'server.hostname',
      fields: [['value', snapshot.hostname]],
    },
    {
      index: 3,
      title: 'protocol',
      subtitle: 'server.protocol',
      fields: [['value', String(snapshot.protocol)]],
    },
    {
      index: 4,
      title: 'url',
      subtitle: 'server.url',
      fields: [['value', snapshot.url]],
    },
    {
      index: 5,
      title: 'origin',
      subtitle: 'server.url.origin',
      fields: [['value', snapshot.origin]],
    },
    {
      index: 6,
      title: 'development',
      subtitle: 'server.development',
      fields: [['value', String(snapshot.development)]],
    },
    {
      index: 7,
      title: 'loopback',
      subtitle: 'loopbackOrigin',
      fields: [
        ['value', snapshot.loopbackOrigin],
        ['note', '0.0.0.0 bind → 127.0.0.1 for console / verify URLs'],
      ],
    },
  ];
}

/** Full BIND IDENTITY section for serve-public startup console. */
export function formatBindIdentityStartup(snapshot: BindIdentitySnapshot): string {
  return formatIndexedCards(
    'BIND IDENTITY',
    'chosen listen after Bun.serve',
    bindIdentityCards(snapshot)
  );
}
