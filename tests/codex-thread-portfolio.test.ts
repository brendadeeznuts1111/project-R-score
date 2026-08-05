// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
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
  test('keeps one index plus 24 contiguous ranked work threads', async () => {
    const portfolio = await loadPortfolio();
    expect(portfolio.threads).toHaveLength(25);
    expect(portfolio.threads.filter(thread => thread.rank === 0)).toHaveLength(1);
    expect(rankedWorkThreads(portfolio).map(thread => thread.rank)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1)
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

  test('keeps purpose-based titles concise and unique', async () => {
    const portfolio = await loadPortfolio();
    const titles = portfolio.threads.map(thread => thread.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.every(title => title.length <= 100)).toBe(true);
    expect(rankedWorkThreads(portfolio).every(thread => thread.title.startsWith(String(thread.rank).padStart(2, '0')))).toBe(
      true
    );
  });

  test('emits a complete Markdown bring-home table', async () => {
    const portfolio = await loadPortfolio();
    const markdown = formatThreadPortfolioMarkdown(portfolio);
    expect(markdown).toContain('# Project R Codex thread portfolio');
    expect(markdown).toContain('| INDEX | 100 | index | yes |');
    expect(markdown).toContain('01 · SHIPPED · Portal Performance');
    expect(markdown).toContain('24 · EMPTY · Unscoped Agent Thread');
    expect(markdown.match(/^\| (?:INDEX|\d+) \|/gm)).toHaveLength(25);
  });

  test('rejects duplicate opaque provider identifiers', async () => {
    const portfolio = await loadPortfolio();
    const duplicate = structuredClone(portfolio) as unknown as Record<string, unknown>;
    const threads = duplicate.threads as Array<Record<string, unknown>>;
    threads[1]!.threadId = threads[0]!.threadId;
    expect(() => parseThreadPortfolioWire(duplicate)).toThrow('duplicate Codex thread identifier');
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
