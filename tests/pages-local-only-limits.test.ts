// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';

const STUBS = [
  'functions/api/agents/v1/limits/record.ts',
  'functions/api/limits/analyze.ts',
  'functions/api/limits/predictions.ts',
] as const;

describe('Pages local-only limits contract', () => {
  test('record/analyze/predictions stubs declare plane + reason', async () => {
    for (const path of STUBS) {
      const src = await Bun.file(path).text();
      expect(src).toContain("mode: 'snapshot'");
      expect(src).toContain("plane: 'local-sqlite'");
      expect(src).toContain("reason: 'bun:sqlite'");
      expect(src).toContain('503');
      expect(src).toContain('docs/harness/tenants/partner-limits.md');
    }
  });

  test('limits board surfaces baseline provenance + Caesars WAF', async () => {
    const html = await Bun.file('public/portal/limits/index.html').text();
    expect(html).toContain('id="baseline-provenance"');
    expect(html).toContain('ops.limits.baseline_tier');
    expect(html).toContain('loadBaselineProvenance');
    expect(html).toContain('caesars-scrape-endpoints.json');
    expect(html).toContain('CAESARS_SCRAPE_COOKIE');
    expect(html).toContain('scrape.wire');
  });
});
