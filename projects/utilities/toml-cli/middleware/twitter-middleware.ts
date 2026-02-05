/**
 * Twitter Middleware for Bun.serve
 * HTTP middleware for Twitter API endpoints with compliance and rate limiting
 */

import { createTwitterComplianceMiddleware } from '../integrations/twitter-compliance.ts';
import { createTwitterClient } from '../integrations/twitter-client.ts';
import { createTwitterConfig } from '../config/twitter.config.ts';
import type { ComplianceCheck } from '../types/twitter.types';

/**
 * Twitter API middleware for Bun.serve
 */
export function twitterMiddleware(): (request: Request) => Promise<Response> {
  const complianceMiddleware = createTwitterComplianceMiddleware();
  const twitterConfig = createTwitterConfig('DEVELOPMENT'); // Default to development scope

  // Initialize Twitter client if config is available
  let twitterClient: ReturnType<typeof createTwitterClient> | null = null;
  if (twitterConfig) {
    twitterClient = createTwitterClient(twitterConfig);
  }

  return async (request: Request): Promise<Response> => {
    // First check compliance
    const complianceResult = await complianceMiddleware(request);
    if (complianceResult instanceof Response) {
      return complianceResult;
    }

    const url = new URL(request.url);
    const compliance = (request as any).compliance as ComplianceCheck;

    try {
      // Route to appropriate handler
      if (url.pathname === '/api/twitter/tweet' && request.method === 'POST') {
        return await handlePostTweet(request, twitterClient, compliance);
      }

      if (url.pathname === '/api/twitter/tweet' && request.method === 'GET') {
        return await handleGetTweet(request, twitterClient, compliance);
      }

      if (url.pathname === '/api/twitter/search' && request.method === 'GET') {
        return await handleSearchTweets(request, twitterClient, compliance);
      }

      if (url.pathname === '/api/twitter/timeline' && request.method === 'GET') {
        return await handleGetTimeline(request, twitterClient, compliance);
      }

      if (url.pathname === '/api/twitter/rate-limits' && request.method === 'GET') {
        return await handleGetRateLimits(request, twitterClient, compliance);
      }

      if (url.pathname === '/api/twitter/compliance' && request.method === 'GET') {
        return await handleGetCompliance(request);
      }

      if (url.pathname === '/api/twitter/thread' && request.method === 'POST') {
        return await handlePostThread(request, twitterClient, compliance);
      }

      if (url.pathname === '/api/twitter/media' && request.method === 'POST') {
        return await handleUploadMedia(request, twitterClient, compliance);
      }

      // Method not allowed
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Twitter middleware error:', error);

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

/**
 * Handle POST /api/twitter/tweet
 */
async function handlePostTweet(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { text, replyToId, mediaIds } = body;

  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'Tweet text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const tweet = await client.postTweet({
      text,
      replyToId,
      mediaIds,
    }, compliance);

    return new Response(JSON.stringify(tweet), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to post tweet',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /api/twitter/tweet
 */
async function handleGetTweet(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const tweetId = url.searchParams.get('id');

  if (!tweetId) {
    return new Response(JSON.stringify({ error: 'Tweet ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const tweet = await client.getTweet(tweetId, compliance);

    return new Response(JSON.stringify(tweet), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get tweet',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /api/twitter/search
 */
async function handleSearchTweets(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const count = url.searchParams.get('count');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Search query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const tweets = await client.searchTweets(query, {
      count: count ? parseInt(count) : undefined,
    }, compliance);

    return new Response(JSON.stringify({ tweets }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to search tweets',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /api/twitter/timeline
 */
async function handleGetTimeline(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const count = url.searchParams.get('count');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const tweets = await client.getUserTimeline(userId, {
      count: count ? parseInt(count) : undefined,
    }, compliance);

    return new Response(JSON.stringify({ tweets }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /api/twitter/rate-limits
 */
async function handleGetRateLimits(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rateLimits = await client.getApiRateLimitStatus(compliance);

    return new Response(JSON.stringify(rateLimits), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get rate limits',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /api/twitter/compliance
 */
async function handleGetCompliance(request: Request): Promise<Response> {
  const { twitterCompliance } = await import('../integrations/twitter-compliance.ts');
  const report = twitterCompliance.getComplianceReport();

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle POST /api/twitter/thread
 */
async function handlePostThread(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { tweets } = body;

  if (!Array.isArray(tweets) || tweets.length === 0) {
    return new Response(JSON.stringify({ error: 'Tweets array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const postedTweets = await client.postThread(tweets, compliance);

    return new Response(JSON.stringify({ tweets: postedTweets }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to post thread',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle POST /api/twitter/media
 */
async function handleUploadMedia(
  request: Request,
  client: ReturnType<typeof createTwitterClient> | null,
  compliance: ComplianceCheck
): Promise<Response> {
  if (!client) {
    return new Response(JSON.stringify({ error: 'Twitter client not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // For now, return placeholder - full implementation would handle FormData
    const mediaId = `media_${Date.now()}`;

    return new Response(JSON.stringify({ mediaId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to upload media',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}