// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  findMissingLocalPortfolioReferences,
  formatThreadPortfolioMarkdown,
  parseThreadPortfolioWire,
  rankedWorkThreads,
  type ThreadPortfolio,
} from '../tools/codex-thread-portfolio.ts';

const PORTFOLIO_PATH = new URL('../tools/codex-thread-portfolio.json', import.meta.url).pathname;

async function loadPortfolio(): Promise<ThreadPortfolio> {
  return parseThreadPortfolioWire((await Bun.file(PORTFOLIO_PATH).json()) as unknown);
}

describe('Codex thread portfolio', () => {
  test('keeps one index plus 36 contiguous ranked root threads', async () => {
    const portfolio = await loadPortfolio();
    expect(portfolio.schemaVersion).toBe(3);
    expect(portfolio.scope.rootThreadCount).toBe(37);
    expect(portfolio.threads).toHaveLength(37);
    expect(portfolio.threads.filter(thread => thread.rank === 0)).toHaveLength(1);
    expect(rankedWorkThreads(portfolio).map(thread => thread.rank)).toEqual(
      Array.from({ length: 36 }, (_, index) => index + 1)
    );
  });

  test('pins only the index and top five work threads', async () => {
    const portfolio = await loadPortfolio();
    expect(
      portfolio.threads
        .filter(thread => thread.pin)
        .map(thread => thread.rank)
        .sort((a, b) => a - b)
    ).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('keeps stable references and purpose-based titles concise and unique', async () => {
    const portfolio = await loadPortfolio();
    const titles = portfolio.threads.map(thread => thread.title);
    const refs = portfolio.threads.map(thread => thread.ref).sort();
    expect(new Set(titles).size).toBe(titles.length);
    expect(refs).toEqual(
      Array.from({ length: 37 }, (_, index) => `RTH-${String(index + 1).padStart(3, '0')}`)
    );
    expect(titles.every(title => title.length <= 60)).toBe(true);
    expect(
      portfolio.threads.every(thread =>
        thread.title.startsWith(
          `${thread.ref} · ${thread.state.toUpperCase().replace('CLOSED-UNMERGED', 'CLOSED')} · ${thread.lane.toUpperCase()} · `
        )
      )
    ).toBe(true);
  });

  test('maps relationships and durable references to known RTH entries', async () => {
    const portfolio = await loadPortfolio();
    const refs = new Set(portfolio.threads.map(thread => thread.ref));
    expect(
      portfolio.threads.every(thread => thread.relatedRefs.every(ref => refs.has(ref)))
    ).toBe(true);
    expect(
      portfolio.threads
        .filter(thread => thread.quality !== 'empty')
        .every(thread => thread.references.length > 0)
    ).toBe(true);
    expect(
      portfolio.threads
        .flatMap(thread => thread.references)
        .filter(reference => reference.kind === 'thread')
        .every(reference => refs.has(reference.target as `RTH-${string}`))
    ).toBe(true);
  });

  test('gives every used lane a resolvable entrypoint and explicit boundary', async () => {
    const portfolio = await loadPortfolio();
    const usedLanes = new Set(portfolio.threads.map(thread => thread.lane));
    expect(
      [...usedLanes].every(
        lane =>
          portfolio.lanes[lane].entrypoint.length > 0 &&
          portfolio.lanes[lane].boundary.length > 0
      )
    ).toBe(true);
    expect(await findMissingLocalPortfolioReferences(portfolio)).toEqual([]);
  });

  test('uses app-server title transport for every current root thread', async () => {
    const portfolio = await loadPortfolio();
    expect(portfolio.threads.filter(thread => thread.titleTransport === 'state-only')).toEqual([]);
  });

  test('emits a complete Markdown bring-home table', async () => {
    const portfolio = await loadPortfolio();
    const markdown = formatThreadPortfolioMarkdown(portfolio);
    expect(markdown).toContain('# Project R Codex thread portfolio');
    expect(markdown).toContain('| INDEX | RTH-025 | 100 | production | index | project | yes |');
    expect(markdown).toContain('RTH-024 · SHIPPED · PORTAL · Performance');
    expect(markdown).toContain('RTH-001 · PUSHED · BUN · Install Platform');
    expect(markdown).toContain('RTH-026 · MERGED · DOMAIN · Authority & Backlog');
    expect(markdown.match(/^\| (?:INDEX|\d+) \|/gm)).toHaveLength(37);
  });

  test('rejects duplicate provider SessionIds', async () => {
    const portfolio = await loadPortfolio();
    const duplicate = structuredClone(portfolio) as unknown as Record<string, unknown>;
    const threads = duplicate.threads as Array<Record<string, unknown>>;
    threads[1]!.sessionId = threads[0]!.sessionId;
    expect(() => parseThreadPortfolioWire(duplicate)).toThrow('duplicate Codex SessionId');
  });

  test('rejects duplicate stable RTH references', async () => {
    const portfolio = await loadPortfolio();
    const duplicate = structuredClone(portfolio) as unknown as Record<string, unknown>;
    const threads = duplicate.threads as Array<Record<string, unknown>>;
    threads[1]!.ref = threads[0]!.ref;
    expect(() => parseThreadPortfolioWire(duplicate)).toThrow(
      'duplicate Project R thread reference'
    );
  });

  test('rejects pin drift below the top five', async () => {
    const portfolio = await loadPortfolio();
    const drifted = structuredClone(portfolio) as unknown as Record<string, unknown>;
    const threads = drifted.threads as Array<Record<string, unknown>>;
    threads.find(thread => thread.rank === 5)!.pin = false;
    threads.find(thread => thread.rank === 6)!.pin = true;
    expect(() => parseThreadPortfolioWire(drifted)).toThrow(
      'only the top five ranked work threads may be pinned'
    );
  });
});
