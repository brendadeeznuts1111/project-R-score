// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

const SHELL = 'public/portal/ops/index.html';
const DASH = 'public/portal/operations-dashboard.js';

describe('ops portal board', () => {
  test('shell has partner domain hero and jump host', async () => {
    const html = await Bun.file(SHELL).text();
    expect(html).toContain('data-domain-lanes="control"');
    expect(html).toContain('id="ops-gate"');
    expect(html).toContain('id="ops-baked"');
    expect(html).toContain('id="ops-jump"');
    expect(html).toContain('operations-dashboard');
    expect(html).toContain('/registry/ops-summary.json');
    expect(html).toContain('/portal/partners/');
    expect(html.match(/\/portal\/components\/notification\.js/g)).toHaveLength(1);
  });

  test('dashboard prioritizes partner desk pulse and loop outbox', async () => {
    const js = await Bun.file(DASH).text();
    expect(js).toContain('id="ops-partner-desk"');
    expect(js).toContain('Partner desk pulse');
    expect(js).toContain('ops-desk-metrics');
    expect(js).toContain('Outbox pending');
    expect(js).toContain('id="loop-grid"');
    expect(js).toContain("['Desk', 'ops-partner-desk']");
    expect(js).toContain("['Handshake', 'telegram-handshake']");
    // Partner domain panels appear before monorepo health harness block
    const desk = js.indexOf('id="ops-partner-desk"');
    const handshake = js.indexOf('id="telegram-handshake"');
    const partners = js.indexOf('id="ops-partners"');
    const health = js.indexOf('id="monorepo-health-panel"');
    expect(desk).toBeGreaterThan(-1);
    expect(handshake).toBeGreaterThan(desk);
    expect(partners).toBeGreaterThan(handshake);
    expect(health).toBeGreaterThan(partners);
  });

  test('renders the summary before loading optional proof artifacts', async () => {
    const js = await Bun.file(DASH).text();
    expect(js).toContain('await Promise.allSettled([');

    const liveSummary = js.indexOf("fetch('/api/operations/summary')");
    const snapshotSummary = js.indexOf("fetch('/registry/ops-summary.json')");
    const liveRender = js.indexOf('this.render();', liveSummary);
    const liveProofs = js.indexOf('this.loadVerificationArtifacts()', liveSummary);
    const snapshotRender = js.indexOf('this.render();', snapshotSummary);
    const snapshotProofs = js.indexOf('this.loadVerificationArtifacts()', snapshotSummary);

    expect(liveRender).toBeGreaterThan(liveSummary);
    expect(liveProofs).toBeGreaterThan(liveRender);
    expect(snapshotRender).toBeGreaterThan(snapshotSummary);
    expect(snapshotProofs).toBeGreaterThan(snapshotRender);
  });
});
