#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Terminal brief for the reference-discovery tenant runbook.
 *
 *   bun run docs:reference-discovery
 */
import { ansiMarkdown } from '../lib/console-depth';
import { joinPath } from '../lib/path-bun';

const file = joinPath(import.meta.dir, '../docs/harness/tenants/reference-discovery.md');
process.stdout.write(ansiMarkdown(await Bun.file(file).text()));
process.stdout.write('\n');
