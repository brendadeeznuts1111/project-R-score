// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import {
  prefersRegistryBoardHtml,
  registryBoardRedirectFor,
} from '../lib/http/registry-board-negotiate.ts';

describe('registry-board-negotiate', () => {
  test('browser document nav to vault-health.json → vault board', () => {
    const req = new Request('http://localhost/registry/vault-health.json', {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Sec-Fetch-Dest': 'document',
      },
    });
    expect(registryBoardRedirectFor(req, '/registry/vault-health.json')).toBe('/portal/vault/');
    expect(prefersRegistryBoardHtml(req)).toBe(true);
  });

  test('curl / JSON clients keep the artifact', () => {
    const curl = new Request('http://localhost/registry/vault-health.json', {
      headers: { Accept: '*/*' },
    });
    expect(registryBoardRedirectFor(curl, '/registry/vault-health.json')).toBeNull();

    const json = new Request('http://localhost/registry/vault-health.json', {
      headers: { Accept: 'application/json' },
    });
    expect(registryBoardRedirectFor(json, '/registry/vault-health.json')).toBeNull();
  });

  test('?raw=1 and ?format=json force JSON even for browsers', () => {
    const raw = new Request('http://localhost/registry/vault-health.json?raw=1', {
      headers: {
        Accept: 'text/html',
        'Sec-Fetch-Dest': 'document',
      },
    });
    expect(registryBoardRedirectFor(raw, '/registry/vault-health.json')).toBeNull();

    const fmt = new Request('http://localhost/registry/vault-health.json?format=json', {
      headers: {
        Accept: 'text/html',
        'Sec-Fetch-Dest': 'document',
      },
    });
    expect(registryBoardRedirectFor(fmt, '/registry/vault-health.json')).toBeNull();
  });

  test('maps env-inventory and partners-ops to boards', () => {
    const html = {
      headers: { Accept: 'text/html', 'Sec-Fetch-Dest': 'document' },
    };
    expect(
      registryBoardRedirectFor(
        new Request('http://localhost/registry/env-inventory.json', html),
        '/registry/env-inventory.json'
      )
    ).toBe('/portal/env/');
    expect(
      registryBoardRedirectFor(
        new Request('http://localhost/registry/partners-ops.json', html),
        '/registry/partners-ops.json'
      )
    ).toBe('/portal/partners/');
  });
});
