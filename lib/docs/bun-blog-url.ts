// @see https://bun.com/docs/runtime/xml — Bun.XML.parse compact shape
// @see https://bun.com/rss.xml — release posts
// @see https://bun.com/blog — /blog/bun-vX.Y vs /blog/release-notes/bun-vX.Y.Z
/**
 * Bun blog / RSS / sitemap URL + pubDate shape helpers.
 *
 * Official surfaces disagree on path form:
 *   RSS / marketing:  https://bun.com/blog/bun-v1.4
 *   Sitemap notes:    https://bun.com/blog/release-notes/bun-v1.4.0
 * Both resolve; prefer the RSS/marketing form for inventories and knowledge.
 */
import { bunBlog } from './bun-site-url.ts';

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
/** `/blog/bun-v1.4`, `/blog/bun-v1.3.14`, `/blog/release-notes/bun-v1.4.0` */
const BLOG_VERSION_RE = /\/blog\/(?:release-notes\/)?bun-v(\d+\.\d+(?:\.\d+)?)\/?(?:[?#]|$)/i;

/** Expand `1.4` → `1.4.0`; leave three-part alone. */
export function expandBunMinorVersion(version: string): string {
  const cleaned = version.trim().replace(/^v/i, '');
  const parts = cleaned.split('.');
  if (parts.length === 2 && parts.every(part => /^\d+$/.test(part))) {
    return `${parts[0]}.${parts[1]}.0`;
  }
  return cleaned;
}

/** Version from a Bun blog or release-notes URL, or null when not a versioned post. */
export function versionFromBunBlogUrl(url: string): string | null {
  const match = BLOG_VERSION_RE.exec(url);
  if (!match) return null;
  const expanded = expandBunMinorVersion(match[1]!);
  return VERSION_PATTERN.test(expanded) ? expanded : null;
}

/**
 * Canonical marketing/RSS blog URL for a release version.
 * Major≥1 patch 0 → `/blog/bun-vX.Y`; otherwise `/blog/bun-vX.Y.Z`.
 */
export function blogUrlForReleaseVersion(version: string): string {
  const normalized = expandBunMinorVersion(version);
  if (!VERSION_PATTERN.test(normalized)) {
    throw new Error(`Invalid Bun release version ${JSON.stringify(version)}`);
  }
  const [major, minor, patch] = normalized.split('.').map(part => Number(part));
  const slug =
    major !== undefined && minor !== undefined && patch === 0 && major >= 1
      ? `bun-v${major}.${minor}`
      : `bun-v${normalized}`;
  return bunBlog(slug);
}

/**
 * Map any known Bun blog loc (RSS, sitemap release-notes, bun.sh) → canonical bun.com URL.
 * Returns null for non-versioned posts (`/blog/bun-in-rust`, …).
 */
export function canonicalizeBunBlogUrl(url: string): string | null {
  const version = versionFromBunBlogUrl(url);
  if (!version) return null;
  return blogUrlForReleaseVersion(version);
}

/**
 * Accept RSS, sitemap release-notes, bun.sh, or trailing-slash forms when they
 * resolve to `version`; return the marketing/RSS canonical URL.
 */
export function requireCanonicalBunBlogUrl(url: string, version: string): string {
  const fromUrl = versionFromBunBlogUrl(url);
  const canonical = canonicalizeBunBlogUrl(url);
  if (!fromUrl || !canonical || fromUrl !== version) {
    throw new Error(`url is not an official Bun release post for ${version}`);
  }
  return canonical;
}

/** Bun.XML compact mode: repeated elements → array; a single element → object. */
export function parseXmlElementList(value: unknown): Array<Record<string, unknown>> {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter(
      (row): row is Record<string, unknown> => row !== null && typeof row === 'object'
    );
  }
  if (typeof value === 'object') return [value as Record<string, unknown>];
  return [];
}

/** Bun.XML scalar / `#text` → trimmed string. */
export function parseXmlText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (typeof value === 'object' && value !== null && '#text' in value) {
    return parseXmlText((value as { '#text': unknown })['#text']);
  }
  return '';
}

/** RSS `pubDate` (RFC822) → canonical ISO-8601 (`…Z`). */
export function parseRssPubDateToIso(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}
