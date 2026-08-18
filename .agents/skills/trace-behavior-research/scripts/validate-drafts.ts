#!/usr/bin/env bun

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// @see https://bun.com/reference/bun/Transpiler
// @see https://bun.com/reference/bun/YAML
// @see https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
// @see https://bun.com/docs/runtime/yaml#bun-yaml-parse

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const draftDir = valueOf('--draft-dir') ?? './trace-behavior-report/drafts';
const files = (await readdir(draftDir)).filter(file => file.endsWith('.draft.md')).sort();
const transpiler = new Bun.Transpiler({ loader: 'ts' });
let failures = 0;
for (const file of files) {
  const content = await Bun.file(join(draftDir, file)).text();
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  try {
    if (!frontmatter) throw new Error('missing YAML frontmatter');
    const metadata = Bun.YAML.parse(frontmatter[1]);
    if (typeof metadata !== 'object' || metadata === null || typeof metadata.name !== 'string')
      throw new Error('frontmatter requires name');
    for (const block of content.matchAll(/```(?:ts|tsx|js|jsx)\n([\s\S]*?)```/g))
      transpiler.transformSync(block[1], 'ts');
    console.log(`✅ ${file}`);
  } catch (error) {
    failures++;
    console.error(`❌ ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures > 0) process.exit(1);
console.log(`Validated ${files.length} draft(s) with Bun.Transpiler.`);
