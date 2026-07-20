#!/usr/bin/env bun
// @see https://bun.com/docs
// lib/shared/tools/bun-urls.ts — canonical Bun-related URLs used by tooling
//
// Centralizes hardcoded Bun URLs duplicated across tools/ and scripts/.

export const BUN_DOMAIN = 'https://bun.com';
export const BUN_SH_DOMAIN = 'https://bun.sh';

export const BUN_DOCS_ROOT = `${BUN_DOMAIN}/docs`;
export const BUN_SH_DOCS_ROOT = `${BUN_SH_DOMAIN}/docs`;

export const LLMS_URL = `${BUN_DOCS_ROOT}/llms.txt`;
export const BUN_SH_LLMS_URL = `${BUN_SH_DOCS_ROOT}/llms.txt`;

export const BUN_RSS_URL = `${BUN_DOMAIN}/rss.xml`;
export const BUN_SH_RSS_URL = `${BUN_SH_DOMAIN}/rss.xml`;

export const BUN_BLOG_ROOT = `${BUN_DOMAIN}/blog`;

export const BUN_GITHUB_REPO = 'https://github.com/oven-sh/bun';
export const BUN_GITHUB_RELEASES_URL = `${BUN_GITHUB_REPO}/releases`;

/** Generic URL regex used by validator/status-checker tools. */
export const URL_REGEX = /https?:\/\/[^\s"')\)]+/g;
