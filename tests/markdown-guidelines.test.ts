// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options
// @see https://bun.com/docs/runtime/markdown#tag-filter — GFM tag filtering
import { describe, expect, test } from 'bun:test';
import {
  checkGuidelineMarkdown,
  inspectGuidelineMarkdown,
} from '../tools/markdown-guidelines.ts';

describe('canonical Markdown guidance', () => {
  test('uses the repository preset for navigable GFM output', () => {
    const inspection = inspectGuidelineMarkdown(`# Guide

www.example.com

| Rule | State |
| --- | --- |
| format | ~~missing~~ done |

- [x] parsed

<script>alert('no')</script>
`);
    expect(inspection.html).toContain('<h1 id="guide"><a href="#guide">Guide</a></h1>');
    expect(inspection.html).toContain('<a href="http://www.example.com">www.example.com</a>');
    expect(inspection.html).toContain('<table>');
    expect(inspection.html).toContain('<del>missing</del>');
    expect(inspection.html).toContain('type="checkbox"');
    expect(inspection.html).not.toContain('<script>');
  });

  test('keeps repeated rendered heading IDs unique', () => {
    const inspection = inspectGuidelineMarkdown('# Same\n\n# Same\n');
    expect(inspection.headingIds).toEqual(['same', 'same-1']);
    expect(inspection.duplicateHeadingIds).toEqual([]);
  });

  test('renders the Project R agent entrypoint through the shared preset', async () => {
    const checks = await checkGuidelineMarkdown(['AGENTS.md']);
    expect(checks).toEqual([
      { path: 'AGENTS.md', headings: expect.any(Number), duplicateHeadingIds: [] },
    ]);
    expect(checks[0]!.headings).toBeGreaterThan(0);
  });
});
