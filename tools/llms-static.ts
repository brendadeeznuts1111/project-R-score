#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://llmstxt.org — llms.txt convention
/**
 * Static llms.txt mirror for Cloudflare Pages.
 *
 * serve-public computes llms.txt / llms-full.txt / portal/*.md live; Pages
 * needs static files. This generator writes them from the SAME sources
 * (lib/http/llms-txt.ts + lib/http/portal-markdown.ts) so local and Pages
 * never drift. Run after content changes:
 *
 *   bun tools/llms-static.ts
 *
 * Also wired into tools/ops-snapshot.ts (runs every snapshot).
 */

import { llmsFullTxtBody, llmsTxtBody, PORTAL_MD_SLUGS } from '../lib/http/llms-txt.ts';
import { portalMarkdownRaw } from '../lib/http/portal-markdown.ts';

export async function writeLlmsStatic(): Promise<string[]> {
  const written: string[] = [];

  await Bun.write('public/llms.txt', llmsTxtBody());
  written.push('public/llms.txt');

  await Bun.write('public/llms-full.txt', llmsFullTxtBody(portalMarkdownRaw));
  written.push('public/llms-full.txt');

  for (const slug of PORTAL_MD_SLUGS) {
    const path = `public/portal/${slug}.md`;
    await Bun.write(path, portalMarkdownRaw(slug));
    written.push(path);
  }

  return written;
}

if (import.meta.main) {
  const written = await writeLlmsStatic();
  console.log(`✅ llms static mirror: ${written.length} files`);
  for (const w of written) console.log(`   ${w}`);
}
