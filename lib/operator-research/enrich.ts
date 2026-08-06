// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
import { joinPath } from '../path-bun.ts';
import { detectStackFromHtml } from './detect-stack.ts';
import { storeEnrichEvidence } from './evidence.ts';
import { loadFixtureHtml, politeFetch, observeDns } from './fetch-classify.ts';
import { hostFromUrl, loadOperators } from './operators.ts';
import { EVIDENCE_DIR, ensureResearchDirs } from './paths.ts';
import { captureScreenshot } from './screenshot.ts';
import type { EnrichResult, SeedDomain } from './types.ts';

export type EnrichOptions = {
  screenshot?: boolean;
  fixtureFallback?: boolean;
  store?: boolean;
  taskId?: string; // brand-ok — opaque research/wire id
  workerId?: string; // brand-ok — opaque research/wire id
};

export async function enrichOne(
  seed: SeedDomain,
  options: EnrichOptions = {}
): Promise<EnrichResult> {
  await ensureResearchDirs();
  const taskId = options.taskId ?? `enrich-${Bun.randomUUIDv7()}`;
  const workerId = options.workerId ?? `local-${process.pid}`;
  const host = seed.host || hostFromUrl(seed.url);
  const operators = await loadOperators();
  const op = operators.find(o => o.id === seed.id || o.host === host) ?? null;

  const dns = await observeDns(host);
  const { observation: fetchObs, html } = await politeFetch(seed, {
    fixtureFallback: options.fixtureFallback !== false,
  });

  let htmlForStack = html;
  let stack = detectStackFromHtml(seed.url, htmlForStack);

  // Live interstitials / geo-blocks often return 403/empty shells — fall back to
  // curated fixture HTML so detect-stack + market observation stay research-useful.
  const shouldFixture =
    options.fixtureFallback !== false &&
    fetchObs.source === 'live' &&
    (!fetchObs.ok ||
      stack.provider === 'unknown' ||
      stack.confidence < 50 ||
      stack.marketsObserved.length === 0);
  if (shouldFixture) {
    const fixture = await loadFixtureHtml(seed.id);
    if (fixture) {
      htmlForStack = fixture.html;
      stack = detectStackFromHtml(seed.url, fixture.html);
      fetchObs.source = 'fixture';
      fetchObs.ok = true;
      fetchObs.status = fetchObs.status ?? 200;
      // MIME from Bun.file.type on the fixture path
      fetchObs.contentType = fixture.contentType;
      fetchObs.protocol = 'fixture';
      fetchObs.bytes = fixture.html.length;
      fetchObs.error = [
        fetchObs.error,
        'live HTML unusable for stack/markets; used fixture for detect-stack',
      ]
        .filter(Boolean)
        .join('; ');
    }
  }

  const htmlPath = joinPath(EVIDENCE_DIR, `${taskId}.html`);
  if (htmlForStack) await Bun.write(htmlPath, htmlForStack);
  fetchObs.htmlPath = htmlForStack ? htmlPath : undefined;

  let screenshot = {
    ok: false,
    source: 'none' as const,
    elapsedMs: 0,
  };
  if (options.screenshot !== false) {
    const shot = await captureScreenshot(seed.url, {
      subject: op?.identity ?? seed.id,
      allowPlaceholder: options.fixtureFallback !== false,
    });
    screenshot = shot.observation;
  }

  const result: EnrichResult = {
    taskId,
    workerId,
    operatorId: op?.id ?? seed.id,
    url: seed.url,
    host,
    identity: op?.identity ?? null,
    fetchedAt: new Date().toISOString(),
    dns,
    fetch: fetchObs,
    screenshot,
    stack,
  };

  if (options.store !== false) {
    storeEnrichEvidence(result);
  }
  return result;
}
