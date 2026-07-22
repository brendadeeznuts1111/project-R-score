/**
 * Blog HTML extraction: article body text via HTMLRewriter.
 * Fragment strip + page fetch: `fetch-page.ts` (fetch-page-boundaries).
 * Social metadata: `extract-metadata.ts` (social-metadata-boundaries).
 *
 * @see https://bun.com/docs/runtime/html-rewriter
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
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
export { fetchPage, stripUrlFragment, type FetchPageOptions } from './fetch-page.ts';

/** @deprecated Prefer `SocialMetadata`. */
export type OpenGraphTags = SocialMetadata;

/**
 * Live convenience: fetchPage → extractSocialMetadataFromResponse.
 * Prefer the two-step form when you also need the HTML body.
 */
export async function extractSocialMetadata(url: string): Promise<SocialMetadata> {
  return fetchSocialMetadata(url);
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
