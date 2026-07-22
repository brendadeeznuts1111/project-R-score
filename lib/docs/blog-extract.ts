/**
 * Blog HTML extraction: article body + fetch URL fragment strip.
 * Social metadata lives in `extract-metadata.ts` (social-metadata-boundaries).
 *
 * @see https://bun.com/docs/runtime/html-rewriter
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URL.hash / fragment
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 */

import {
  extractSocialMetadata as fetchSocialMetadata,
  type SocialMetadata,
} from './extract-metadata.ts';

export type { SocialMetadata } from './extract-metadata.ts';
export {
  extractSocialMetadataFromHtml,
  extractSocialMetadataFromResponse,
} from './extract-metadata.ts';

/** @deprecated Prefer `SocialMetadata`. */
export type OpenGraphTags = SocialMetadata;

/** Drop `#fragment` so fetch never sends a fragment to the server. */
export function stripUrlFragment(url: string): string {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

/**
 * Fetch `url` (fragment stripped) and extract social metadata.
 */
export async function extractSocialMetadata(url: string): Promise<SocialMetadata> {
  return fetchSocialMetadata(stripUrlFragment(url));
}

const CONTENT_SELECTORS = ['article', '[role="main"]', '.prose', '.content'] as const;

/**
 * Extract post body text, preferring semantic selectors over full body.
 * Excludes site nav/footer when `article` / `[role=main]` / `.prose` / `.content` exists.
 */
export async function extractArticleText(html: string): Promise<string> {
  for (const selector of CONTENT_SELECTORS) {
    const text = await collectText(html, selector);
    if (text.trim()) return text.trim();
  }
  return (await collectText(html, 'body')).trim();
}

async function collectText(html: string, selector: string): Promise<string> {
  let text = '';
  await new HTMLRewriter()
    .on(selector, {
      text(chunk) {
        text += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();
  return text;
}
