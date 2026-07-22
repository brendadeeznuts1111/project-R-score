/**
 * Social metadata extraction via HTMLRewriter (Open Graph, Twitter, fallbacks).
 *
 * Live pipeline: fetchPage → extractSocialMetadataFromResponse (no prior .text()).
 * Offline / fixtures: extractSocialMetadataFromHtml / new Response(html).
 *
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 * @see https://bun.com/docs/runtime/html-rewriter
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 */

import { fetchPage, stripUrlFragment } from './fetch-page.ts';

/** Guide `SocialMetadata` — Open Graph (+ Twitter / title fallbacks). */
export type SocialMetadata = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
};

const SOCIAL_KEYS = new Set<keyof SocialMetadata>([
  'title',
  'description',
  'image',
  'url',
  'siteName',
  'type',
]);

/**
 * Map wire OG/Twitter property tails onto `SocialMetadata` fields.
 * Guide does `replace("og:", "")` which leaves `site_name` — normalize to `siteName`.
 */
export function normalizeSocialKey(raw: string): keyof SocialMetadata | undefined {
  const camel = raw.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return SOCIAL_KEYS.has(camel as keyof SocialMetadata)
    ? (camel as keyof SocialMetadata)
    : undefined;
}

/**
 * Extract social metadata from an already-fetched Response.
 * When `baseUrl` is set, relative `image` values are resolved against it.
 *
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 */
export async function extractSocialMetadataFromResponse(
  response: Response,
  baseUrl?: string
): Promise<SocialMetadata> {
  const metadata: SocialMetadata = {};
  let titleFallback = '';

  const applyOg = (attr: string | null, content: string | null, prefer = true) => {
    if (!attr?.startsWith('og:') || !content) return;
    const key = normalizeSocialKey(attr.replace(/^og:/, ''));
    if (!key) return;
    if (prefer || !metadata[key]) metadata[key] = content;
  };

  const rewriter = new HTMLRewriter()
    .on('meta[property^="og:"]', {
      element(el) {
        applyOg(el.getAttribute('property'), el.getAttribute('content'));
      },
    })
    // bun.com blog ships name="og:…" (not property=)
    .on('meta[name^="og:"]', {
      element(el) {
        applyOg(el.getAttribute('name'), el.getAttribute('content'));
      },
    })
    .on('meta[name^="twitter:"]', {
      element(el) {
        const name = el.getAttribute('name');
        const content = el.getAttribute('content');
        if (!name || !content) return;
        const key = normalizeSocialKey(name.replace(/^twitter:/, ''));
        if (key && !metadata[key]) metadata[key] = content;
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        const content = el.getAttribute('content');
        if (content && !metadata.description) metadata.description = content;
      },
    })
    .on('title', {
      text(chunk) {
        titleFallback += chunk.text;
      },
    });

  await rewriter.transform(response).blob();

  if (!metadata.title && titleFallback.trim()) {
    metadata.title = titleFallback.trim();
  }

  if (metadata.image && baseUrl && !metadata.image.startsWith('http')) {
    try {
      metadata.image = new URL(metadata.image, baseUrl).href;
    } catch {
      // keep relative
    }
  }

  return metadata;
}

/**
 * Convenience for offline tests — accepts raw HTML.
 * The live pipeline uses the Response variant to avoid buffering.
 */
export async function extractSocialMetadataFromHtml(
  html: string,
  baseUrl?: string
): Promise<SocialMetadata> {
  return extractSocialMetadataFromResponse(new Response(html), baseUrl);
}

/**
 * Live convenience: fetchPage → extractSocialMetadataFromResponse.
 * Prefer the two-step form at call sites when you also need the HTML body.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 */
export async function extractSocialMetadata(url: string): Promise<SocialMetadata> {
  const cleaned = stripUrlFragment(url);
  const response = await fetchPage(cleaned, { timeoutMs: 10_000 });
  return extractSocialMetadataFromResponse(response, cleaned);
}
