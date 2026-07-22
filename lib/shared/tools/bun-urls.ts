#!/usr/bin/env bun
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPatternInit protocol/hostname
// lib/shared/tools/bun-urls.ts — canonical Bun-related URLs used by tooling
//
// Built from URLPatternInit components via lib/docs/bun-site-url.ts (no stringly full URLs).

import {
  BunComSite,
  BunShSite,
  GitHubOvenSite,
  bunComOrigin,
  bunDocs,
  bunShOrigin,
  hrefFromInit,
} from '../../docs/bun-site-url.ts';

export {
  BunComSite,
  BunShSite,
  BunDocsPattern,
  BunBlogPattern,
  BunReferencePattern,
  bunDocs,
  bunBlog,
  bunReference,
  mdnWebApi,
  hrefFromInit,
  parseBunSiteUrl,
  guideKeyFromUrl,
} from '../../docs/bun-site-url.ts';

export const BUN_DOMAIN = bunComOrigin();
export const BUN_SH_DOMAIN = bunShOrigin();

export const BUN_DOCS_ROOT = bunDocs('').replace(/\/$/, '');
export const BUN_SH_DOCS_ROOT = hrefFromInit({
  ...BunShSite,
  pathname: '/docs',
}).replace(/\/$/, '');

export const LLMS_URL = bunDocs('llms.txt');
export const BUN_SH_LLMS_URL = hrefFromInit({
  ...BunShSite,
  pathname: '/docs/llms.txt',
});

export const BUN_RSS_URL = hrefFromInit({ ...BunComSite, pathname: '/rss.xml' });
export const BUN_SH_RSS_URL = hrefFromInit({ ...BunShSite, pathname: '/rss.xml' });

export const BUN_BLOG_ROOT = hrefFromInit({ ...BunComSite, pathname: '/blog' }).replace(/\/$/, '');

export const BUN_GITHUB_REPO = hrefFromInit({
  ...GitHubOvenSite,
  pathname: '/oven-sh/bun',
}).replace(/\/$/, '');
export const BUN_GITHUB_RELEASES_URL = hrefFromInit({
  ...GitHubOvenSite,
  pathname: '/oven-sh/bun/releases',
}).replace(/\/$/, '');

/** Generic URL regex used by validator/status-checker tools. */
export const URL_REGEX = /https?:\/\/[^\s"')\)]+/g;
