#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Terminal brief for the registry-integrity spine tenant runbook.
 *
 *   bun run docs:tenant-registry-integrity
 */
import { ansiMarkdown } from '../lib/console-depth';
import { joinPath } from '../lib/path-bun';

const file = joinPath(import.meta.dir, '../docs/harness/tenants/registry-integrity.md');
process.stdout.write(ansiMarkdown(await Bun.file(file).text()));
process.stdout.write('\n');
