#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/blog/bun-v1.3.12 — bun ./file.md
/**
 * Terminal-first render of the cron contract.
 *
 * Prefer this over raw `bun ./docs/harness/cron.md` so FactoryWager theme
 * applies (TTY columns, NO_COLOR, OSC 8). Same file either way.
 *
 *   bun run docs:cron
 */
import { ansiMarkdown } from '../lib/console-depth';
import { joinPath } from '../lib/path-bun';

const file = joinPath(import.meta.dir, '../docs/harness/cron.md');
const md = await Bun.file(file).text();
process.stdout.write(ansiMarkdown(md));
process.stdout.write('\n');
