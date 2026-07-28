// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  fixWikiHref,
  githubBlobUrl,
  isWikiExcludedHref,
  scanWikiMarkdown,
} from '../tools/wiki-link-check.ts';

describe('wiki-link-check', () => {
  test('rewrites excluded trees to GitHub blob URLs', () => {
    expect(isWikiExcludedHref('lib/identity/README.md')).toBe(true);
    expect(fixWikiHref('lib/identity/README.md')).toBe(
      githubBlobUrl('lib/identity/README.md')
    );
    expect(fixWikiHref('.custom-instructions.md')).toBe(
      githubBlobUrl('.custom-instructions.md')
    );
  });

  test('normalizes Jekyll directory index paths', () => {
    expect(fixWikiHref('docs/README.md')).toBe('docs/');
    expect(fixWikiHref('docs/harness/README.md')).toBe('docs/harness/');
  });

  test('preserves external and in-tree docs links', () => {
    expect(fixWikiHref('https://score.factory-wager.com/portal/')).toBe(
      'https://score.factory-wager.com/portal/'
    );
    expect(fixWikiHref('docs/UNIFIED.md')).toBe('docs/UNIFIED.md');
    expect(fixWikiHref('#live-surfaces')).toBe('#live-surfaces');
  });

  test('scan finds fixable links in sample markdown', () => {
    const issues = scanWikiMarkdown(
      '[x](lib/foo.ts) [y](docs/README.md)',
      'README.md'
    );
    expect(issues.length).toBe(2);
    expect(issues[0]?.fixed).toContain('github.com');
    expect(issues[1]?.fixed).toBe('docs/');
  });
});
