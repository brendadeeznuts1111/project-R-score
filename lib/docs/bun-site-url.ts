/**
 * Bun site URLs via all URLPatternInit URL components (protocol through hash).
 * No assembled `https://bun.com/...` literals for construction — set properties on URL.
 *
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern / URLPatternInit
 * @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — test/exec
 */

/** Canonical bun.com site fragments (URLPatternInit). */
export const BunComSite = {
  protocol: 'https',
  hostname: 'bun.com',
} as const satisfies Pick<URLPatternInit, 'protocol' | 'hostname'>;

/** Alias host bun.sh (same content; prefer bun.com in institutional refs). */
export const BunShSite = {
  protocol: 'https',
  hostname: 'bun.sh',
} as const satisfies Pick<URLPatternInit, 'protocol' | 'hostname'>;

export const MdnSite = {
  protocol: 'https',
  hostname: 'developer.mozilla.org',
} as const satisfies Pick<URLPatternInit, 'protocol' | 'hostname'>;

export const GitHubOvenSite = {
  protocol: 'https',
  hostname: 'github.com',
} as const satisfies Pick<URLPatternInit, 'protocol' | 'hostname'>;

/** Match /docs/* on bun.com|bun.sh (literal dots in hostname regex groups). */
export const BunDocsPattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: '(bun\\.com|bun\\.sh)',
  pathname: '/docs/:path*',
});

/** Match /blog index on bun.com|bun.sh */
export const BunBlogIndexPattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: '(bun\\.com|bun\\.sh)',
  pathname: '/blog',
});

/** Match /blog/:slug on bun.com|bun.sh */
export const BunBlogPattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: '(bun\\.com|bun\\.sh)',
  pathname: '/blog/:slug',
});

/** Match /reference/* on bun.com|bun.sh */
export const BunReferencePattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: '(bun\\.com|bun\\.sh)',
  pathname: '/reference/:path*',
});

/**
 * Parts-only canonical site loci (URLPatternInit).
 * Build hrefs with `hrefFromInit` — never assemble host strings by hand.
 */
export const CANONICAL_SOURCES = {
  blog: { ...BunComSite, pathname: '/blog' },
  docs: { ...BunComSite, pathname: '/docs' },
  reference: { ...BunComSite, pathname: '/reference' },
  llms: { ...BunComSite, pathname: '/docs/llms.txt' },
} as const satisfies Record<string, URLPatternInit>;

/** Match MDN Web API pages */
export const MdnWebApiPattern = new URLPattern({
  protocol: MdnSite.protocol,
  hostname: MdnSite.hostname,
  pathname: '/en-US/docs/Web/API/:name(.*)',
});

/**
 * Build an href from URLPatternInit-style components.
 * Bootstraps a URL then assigns each concrete protocol / username / password /
 * hostname / port / pathname / search / hash component.
 */
export function hrefFromInit(init: URLPatternInit): string {
  const u = new URL('http://localhost');
  const protocol = (init.protocol ?? 'https').replace(/:$/, '');
  u.protocol = `${protocol}:`;
  if (init.hostname != null && init.hostname !== '*') u.hostname = init.hostname;
  if (init.port != null && init.port !== '*' && init.port !== '') u.port = init.port;
  if (init.username != null && init.username !== '*') u.username = init.username;
  if (init.password != null && init.password !== '*') u.password = init.password;

  let pathname = init.pathname ?? '/';
  if (pathname !== '*' && !pathname.startsWith('/')) pathname = `/${pathname}`;
  if (pathname !== '*') u.pathname = pathname;

  if (init.search != null && init.search !== '*') {
    u.search = init.search.startsWith('?') ? init.search.slice(1) : init.search;
  }
  if (init.hash != null && init.hash !== '*') {
    u.hash = init.hash.startsWith('#') ? init.hash.slice(1) : init.hash;
  }
  return u.href;
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\.md$/i, '');
}

function stripHash(hash?: string): string | undefined {
  if (hash == null || hash === '') return undefined;
  return hash.replace(/^#/, '');
}

/** Split optional `#fragment` out of a path/slug argument. */
function splitHash(path: string, hash?: string): { path: string; hash?: string } {
  if (hash != null) return { path, hash: stripHash(hash) };
  const i = path.indexOf('#');
  if (i < 0) return { path };
  return { path: path.slice(0, i), hash: path.slice(i + 1) };
}

/** `https://bun.com/docs/<path>[#hash]` from pathname parts. */
export function bunDocs(path: string, hash?: string): string {
  const parts = splitHash(path, hash);
  return hrefFromInit({
    ...BunComSite,
    pathname: `/docs/${normalizePath(parts.path)}`,
    hash: parts.hash,
  });
}

/** `https://bun.com/blog/<slug>[#hash]` */
export function bunBlog(slug: string, hash?: string): string {
  const parts = splitHash(slug, hash);
  return hrefFromInit({
    ...BunComSite,
    pathname: `/blog/${normalizePath(parts.path)}`,
    hash: parts.hash,
  });
}

/** `https://bun.com/reference/<path>[#hash]` */
export function bunReference(path: string, hash?: string): string {
  const parts = splitHash(path, hash);
  return hrefFromInit({
    ...BunComSite,
    pathname: `/reference/${normalizePath(parts.path)}`,
    hash: parts.hash,
  });
}

/** `https://developer.mozilla.org/en-US/docs/Web/API/<name>` */
export function mdnWebApi(name: string): string {
  return hrefFromInit({
    ...MdnSite,
    pathname: `/en-US/docs/Web/API/${normalizePath(name)}`,
  });
}

/** Origin root for bun.com (trailing slash stripped). */
export function bunComOrigin(): string {
  return hrefFromInit({ ...BunComSite, pathname: '/' }).replace(/\/$/, '');
}

export function bunShOrigin(): string {
  return hrefFromInit({ ...BunShSite, pathname: '/' }).replace(/\/$/, '');
}

export type BunSiteKind = 'docs' | 'blog' | 'reference' | 'other';

export type ParsedBunSiteUrl = {
  kind: BunSiteKind;
  /** Path under the kind root (no leading slash). Docs omit the `docs/` prefix for GUIDE_EXAMPLES keys. */
  path: string;
  hash: string;
  hostname: string;
  protocol: string;
};

/**
 * Parse a bun.com|bun.sh URL with URLPattern.exec — returns component groups.
 * Docs paths drop the `docs/` prefix so GUIDE_EXAMPLES keys stay `guides/…` / `runtime/…`.
 */
export function parseBunSiteUrl(url: string): ParsedBunSiteUrl | null {
  const docs = BunDocsPattern.exec(url);
  if (docs) {
    const path = (docs.pathname.groups.path ?? '').replace(/\.md$/i, '');
    return {
      kind: 'docs',
      path,
      hash: docs.hash.input.replace(/^#/, ''),
      hostname: docs.hostname.input,
      protocol: docs.protocol.input,
    };
  }
  const blog = BunBlogPattern.exec(url);
  if (blog) {
    const slug = blog.pathname.groups.slug ?? '';
    const hash = blog.hash.input.replace(/^#/, '');
    return {
      kind: 'blog',
      path: hash ? `blog/${slug}#${hash}` : `blog/${slug}`,
      hash,
      hostname: blog.hostname.input,
      protocol: blog.protocol.input,
    };
  }
  const ref = BunReferencePattern.exec(url);
  if (ref) {
    const path = (ref.pathname.groups.path ?? '').replace(/\.md$/i, '');
    const hash = ref.hash.input.replace(/^#/, '');
    return {
      kind: 'reference',
      path: hash ? `reference/${path}#${hash}` : `reference/${path}`,
      hash,
      hostname: ref.hostname.input,
      protocol: ref.protocol.input,
    };
  }
  try {
    const u = new URL(url);
    if (u.hostname !== 'bun.com' && u.hostname !== 'bun.sh') return null;
    return {
      kind: 'other',
      path: u.pathname.replace(/^\//, '') + (u.hash ? u.hash : ''),
      hash: u.hash.replace(/^#/, ''),
      hostname: u.hostname,
      protocol: u.protocol.replace(/:$/, ''),
    };
  } catch {
    return null;
  }
}

/** GUIDE_EXAMPLES / TOKEN_GUIDE_PATH key from a full URL (URLPattern-based). */
export function guideKeyFromUrl(pageUrl: string, opts?: { keepHash?: boolean }): string {
  const parsed = parseBunSiteUrl(pageUrl);
  if (!parsed) {
    // non-bun: return empty — caller falls back
    return '';
  }
  if (parsed.kind === 'docs') {
    if (opts?.keepHash && parsed.hash) return `${parsed.path}#${parsed.hash}`;
    return parsed.path;
  }
  if (parsed.kind === 'blog' || parsed.kind === 'reference') {
    if (opts?.keepHash) return parsed.path; // already includes #hash when present
    return parsed.path.split('#')[0]!;
  }
  if (opts?.keepHash) return parsed.path;
  return parsed.path.split('#')[0]!;
}
