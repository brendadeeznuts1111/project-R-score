#!/usr/bin/env bun
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Scaffold a feedback→ratchet lesson markdown stub under docs/harness/lessons/.
 *
 *   bun scripts/harness-lesson.ts --title="doc-refs annotate loop"
 */
import { flagValue } from './lib/cli-args';
import { ensureDir, joinPath, writeText } from './lib/fs-bun';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function main(): Promise<number> {
  const title = flagValue('title') || flagValue('t');
  if (!title) {
    console.error('usage: bun scripts/harness-lesson.ts --title="…"');
    return 2;
  }
  const dir = joinPath(process.cwd(), 'docs/harness/lessons');
  await ensureDir(dir);
  const stamp = new Date().toISOString().slice(0, 10);
  const path = joinPath(dir, `${stamp}-${slugify(title)}.md`);
  const body = `# Lesson: ${title}

- **Finding:**
- **Repair:**
- **Earliest owner:** type | lint | skill | doc-map | script-gate | proof
- **Ratchet:**
- **Keep / revise / drop:**

See [FEEDBACK.md](../FEEDBACK.md).
`;
  await writeText(path, body);
  console.info(`Wrote ${path}`);
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
