import { describe, expect, test } from 'bun:test';
import {
  AGENT_ODDS_PUBLIC_READ_PREFIXES,
  AGENT_ODDS_WS_PATHS,
  handleAgentOddsRequest,
} from '../lib/operator-research/agent-odds-http.ts';
import { isPublicReadPath } from '../lib/http/public-read-path.ts';

describe('agent-odds shared HTTP handlers', () => {
  async function postAlertRule(body: object): Promise<Response> {
    const res = await handleAgentOddsRequest(
      new Request('http://127.0.0.1:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    expect(res).not.toBeNull();
    return res!;
  }

  test('public-read prefixes cover health and edges', () => {
    expect(AGENT_ODDS_PUBLIC_READ_PREFIXES.some(p => p.startsWith('/api/edges'))).toBe(true);
    expect(isPublicReadPath('/api/partners/health')).toBe(true);
    expect(isPublicReadPath('/api/edges')).toBe(true);
    expect(isPublicReadPath('/api/odds/options')).toBe(true);
  });

  test('WS paths include /ws and /api/agent-odds/ws', () => {
    expect(AGENT_ODDS_WS_PATHS).toContain('/ws');
    expect(AGENT_ODDS_WS_PATHS).toContain('/api/agent-odds/ws');
  });

  test('returns null for unrelated paths', async () => {
    const res = await handleAgentOddsRequest(
      new Request('http://127.0.0.1:3000/api/monitoring'),
    );
    expect(res).toBeNull();
  });

  test('serves partners health from merged registry', async () => {
    const res = await handleAgentOddsRequest(
      new Request('http://127.0.0.1:3000/api/partners/health'),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as {
      health?: unknown[];
      summary?: { total?: number };
      plane?: string;
    };
    expect(Array.isArray(body.health)).toBe(true);
    expect((body.health?.length ?? 0) > 0 || body.summary?.total === 0).toBe(true);
    expect(body.plane).toBe('agent-odds');
  });

  test('serves edges list', async () => {
    const res = await handleAgentOddsRequest(
      new Request('http://127.0.0.1:3000/api/edges?limit=5'),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as { data?: unknown[]; total?: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('platform advertises serve-public feature', async () => {
    const res = await handleAgentOddsRequest(
      new Request('http://127.0.0.1:3000/api/platform'),
    );
    expect(res).not.toBeNull();
    const body = (await res!.json()) as { features?: string[]; dashboard?: string };
    expect(body.features).toContain('serve-public');
    expect(String(body.dashboard)).toContain('agent-odds');
  });

  test('validates simulator alert channel, period, and pattern vocabularies', async () => {
    const base = { id: 'boundary-rule', name: 'Boundary rule', pattern: 'value' };

    const valid = await postAlertRule({
      ...base,
      channels: ['ws', 'email'],
      period: 'prematch',
    });
    expect(valid.status).toBe(200);
    const validBody = (await valid.json()) as {
      data?: { channels?: string[]; period?: string; pattern?: string };
    };
    expect(validBody.data?.channels).toEqual(['ws', 'email']);
    expect(validBody.data?.period).toBe('prematch');
    expect(validBody.data?.pattern).toBe('value');

    const defaults = await postAlertRule({
      id: 'boundary-defaults',
      name: 'Boundary defaults',
      pattern: 'arbitrage',
    });
    expect(defaults.status).toBe(200);
    const defaultsBody = (await defaults.json()) as {
      data?: { channels?: string[]; period?: string };
    };
    expect(defaultsBody.data?.channels).toEqual(['ws']);
    expect(defaultsBody.data?.period).toBe('all');

    for (const [field, value, error] of [
      ['channels', ['ws', 'sms'], 'invalid alert channels'],
      ['period', 'pregame', 'invalid alert period'],
      ['pattern', 'noise', 'invalid alert pattern'],
    ] as const) {
      const response = await postAlertRule({ ...base, [field]: value });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error });
    }

    const missingPattern = await postAlertRule({
      id: 'boundary-missing-pattern',
      name: 'Missing pattern',
    });
    expect(missingPattern.status).toBe(400);
    expect(await missingPattern.json()).toEqual({ ok: false, error: 'invalid alert pattern' });
  });
});
