// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  CAESARS_ENDPOINT_CATALOG,
  CAESARS_LIVE_URL,
  caesarsBetsConfigurationUrl,
  caesarsEndpointsByRole,
  caesarsLimitCandidateUrl,
  fetchCaesarsBetsConfiguration,
  isCaesarsWafHtmlBody,
  parseCaesarsBetsConfiguration,
  runCaesarsAgent,
  summarizeCaesarsEndpointCatalog,
} from '../lib/operations/index.ts';

describe('Caesars American Wagering catalog + live path', () => {
  test('catalog classifies limit candidate and noise roles', () => {
    const summary = summarizeCaesarsEndpointCatalog();
    expect(summary.total).toBeGreaterThanOrEqual(15);
    expect(summary.limitCandidates.length).toBe(1);
    expect(summary.limitCandidates[0]).toContain('/sb/bets/configuration');
    expect(caesarsEndpointsByRole('telemetry').length).toBeGreaterThan(0);
    expect(caesarsEndpointsByRole('geocomply').length).toBeGreaterThan(0);
    expect(CAESARS_ENDPOINT_CATALOG.every(e => e.template.length > 0)).toBe(true);
  });

  test('LIVE_URL points at americanwagering bets/configuration (not api.caesars.com)', () => {
    expect(CAESARS_LIVE_URL).toBe(
      'https://api.americanwagering.com/regions/us/locations/nj/brands/czr/sb/bets/configuration'
    );
    expect(caesarsBetsConfigurationUrl('co')).toContain('/locations/co/brands/czr/sb/bets/configuration');
    expect(caesarsLimitCandidateUrl('nj')).toBe(CAESARS_LIVE_URL);
    expect(CAESARS_LIVE_URL).not.toContain('api.caesars.com');
  });

  test('WAF HTML detector matches CloudFront challenge bodies', () => {
    expect(
      isCaesarsWafHtmlBody(
        '<!DOCTYPE HTML><HTML><TITLE>ERROR: The request could not be satisfied</TITLE><H1>403 ERROR</H1>'
      )
    ).toBe(true);
    expect(isCaesarsWafHtmlBody('{"limits":[]}')).toBe(false);
  });

  test('parseCaesarsBetsConfiguration accepts generic limits[] and maxStake shapes', () => {
    const generic = parseCaesarsBetsConfiguration({
      limits: [
        {
          sport: 'basketball',
          market: 'match_winner',
          structure: 'straight',
          phase: 'pregame',
          maxBet: 1000,
          minBet: 1,
        },
      ],
    });
    expect(generic).toHaveLength(1);
    expect(generic[0]?.openingMaxUsd).toBe(1000);

    const nested = parseCaesarsBetsConfiguration({
      configurations: [
        {
          sportKey: 'soccer',
          marketType: 'moneyline',
          betType: 'parlay',
          maxStake: 250,
        },
      ],
    });
    expect(nested).toHaveLength(1);
    expect(nested[0]?.sport).toBe('soccer');
    expect(nested[0]?.market).toBe('match_winner');
    expect(nested[0]?.structure).toBe('parlay');
    expect(nested[0]?.openingMaxUsd).toBe(250);

    expect(parseCaesarsBetsConfiguration({ ff_enableRGLossLimits: false })).toHaveLength(0);
  });

  test('live fetch without cookie classifies WAF and agent falls back to fixture', async () => {
    const live = await fetchCaesarsBetsConfiguration({ location: 'co', timeoutMs: 12_000 });
    expect(['waf', 'http_error', 'network', 'empty', 'json']).toContain(live.kind);
    // Without session cookies we expect WAF in this environment.
    if (!Bun.env.CAESARS_SCRAPE_COOKIE && !Bun.env.CAESARS_WAF_TOKEN) {
      expect(live.kind).toBe('waf');
    }

    const agent = await runCaesarsAgent({
      live: true,
      location: 'co',
      observedAt: '2026-07-31T12:00:00.000Z',
      timeoutMs: 12_000,
    });
    expect(agent.ok).toBe(true);
    expect(agent.mode).toBe('fixture');
    expect(agent.observations.length).toBe(16);
    expect(agent.live?.url).toContain('/bets/configuration');
    expect(agent.error).toMatch(/WAF|live unavailable|fixture/i);
  });
});
