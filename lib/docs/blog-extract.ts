/**
 * Blog HTML extraction: article body text via HTMLRewriter.
 * Fragment strip + page fetch: `fetch-page.ts` (fetch-page-boundaries).
 * Social metadata: `extract-metadata.ts` (social-metadata-boundaries).
 *
 * @see https://bun.com/docs/runtime/html-rewriter
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#streaming-response-bodies
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
 * Extract post body text from a Response in one HTMLRewriter pass.
 * Prefers semantic selectors over full body (no Response.clone — live fetch bodies
 * often cannot be multi-piped).
 */
export async function extractArticleTextFromResponse(response: Response): Promise<string> {
  const buckets: Record<string, string> = Object.fromEntries(CONTENT_SELECTORS.map(s => [s, '']));
  let body = '';

  let rewriter = new HTMLRewriter();
  for (const selector of CONTENT_SELECTORS) {
    rewriter = rewriter.on(selector, {
      text(chunk) {
        buckets[selector]! += chunk.text;
      },
    });
  }
  rewriter = rewriter.on('body', {
    text(chunk) {
      body += chunk.text;
    },
  });

  await rewriter.transform(response).text();

  for (const selector of CONTENT_SELECTORS) {
    const text = buckets[selector]!.trim();
    if (text) return text;
  }
  return body.trim();
}

/**
 * Offline / string path — wrap HTML in a Response (no network).
 */
export async function extractArticleText(html: string): Promise<string> {
  return extractArticleTextFromResponse(new Response(html));
}
