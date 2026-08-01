// @see https://bun.com/docs/test — bun:test
/**
 * Regression: seat desk portal panels stay wired (Wave 1 exit).
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import { describe, expect, test } from 'bun:test';

describe('seat desk portal wiring', () => {
  test('ops dashboard embeds seat panel + partner-message table', async () => {
    const js = await Bun.file('public/portal/operations-dashboard.js').text();
    expect(js).toContain('seat-capital-desk');
    expect(js).toContain('seat-partner-message-table');
    expect(js).toContain('/registry/seat-capital-desk.json');
    expect(js).toContain('/portal/partners/#section:partner-message');
  });

  test('partners board has partner-message section + seat bake load', async () => {
    const html = await Bun.file('public/portal/partners/index.html').text();
    expect(html).toContain('section:partner-message');
    expect(html).toContain('partner-message-tbody');
    expect(html).toContain('seat-capital-desk.json');
    expect(html).toContain('seat:desk:partner-message');
  });

  test('dashboard plane-card links ops seat panel', async () => {
    const js = await Bun.file('public/portal/dashboard-app.js').text();
    expect(js).toContain('seat-capital-desk');
    expect(js).toContain('/portal/ops/#seat-capital-desk');
  });
});
