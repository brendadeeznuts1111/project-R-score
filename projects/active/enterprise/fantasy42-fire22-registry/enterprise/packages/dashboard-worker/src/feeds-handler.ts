/**
 * RSS/Atom Feeds Handler for Cloudflare Workers
 *
 * Serves RSS and Atom feeds for Fire22 Dashboard
 */

import { feedsContent, getFeedContent, getAvailableFeeds as getFeeds } from './feeds-content';

/**
 * Handle RSS/Atom feed requests
 */
export function handleFeedsRequest(path: string): Response {
  // Extract feed file name from path
  const feedPath = path.replace('/feeds/', '').replace('/src/feeds/', '').replace(/^\//, '');

  const feedFile = feedPath || 'index.html';

  // Check if feed exists
  const feedContent = getFeedContent(feedFile);
  if (!feedContent) {
    return new Response('Feed not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Determine content type
  let contentType = 'text/html';
  if (feedFile.endsWith('.xml')) {
    if (feedFile.includes('atom')) {
      contentType = 'application/atom+xml';
    } else {
      contentType = 'application/rss+xml';
    }
  }

  // Return feed content
  return new Response(feedContent, {
    status: 200,
    headers: {
      'Content-Type': contentType + '; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Feed-Source': 'Fire22 Dashboard Worker',
    },
  });
}

/**
 * Get list of available feeds
 */
export function getAvailableFeeds(): string[] {
  return getFeeds();
}

/**
 * Check if a feed exists
 */
export function feedExists(feedName: string): boolean {
  return getFeedContent(feedName) !== undefined;
}
