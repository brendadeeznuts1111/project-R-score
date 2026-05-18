/**
 * Twitter/X API Client
 * Core API client with OAuth 1.1a authentication for Twitter API v1.1
 */

import { createHmac } from 'node:crypto';
import type {
  TwitterClientConfig,
  TwitterCredentials,
  TweetData,
  TweetCreateRequest,
  TwitterApiError,
  RetryPolicy
} from '../types/twitter.types';
import { TWITTER_ENDPOINTS } from '../config/twitter.config';

/**
 * Twitter API Client with OAuth 1.1a authentication
 */
export class TwitterApiClient {
  private readonly config: TwitterClientConfig;
  private readonly oauth: OAuth1Helper;

  constructor(config: TwitterClientConfig) {
    this.config = config;
    this.oauth = new OAuth1Helper(config.credentials);
  }

  /**
   * Post a new tweet
   */
  async postTweet(request: TweetCreateRequest): Promise<TweetData> {
    const params: Record<string, string> = {
      status: request.text,
    };

    if (request.replyToId) {
      params.in_reply_to_status_id = request.replyToId;
    }

    if (request.mediaIds && request.mediaIds.length > 0) {
      params.media_ids = request.mediaIds.join(',');
    }

    const response = await this.makeRequest('POST', TWITTER_ENDPOINTS.TWEET_STATUS_UPDATE, params);
    return this.parseTweetResponse(response);
  }

  /**
   * Get tweet by ID
   */
  async getTweet(tweetId: string): Promise<TweetData> {
    const params = { id: tweetId };
    const response = await this.makeRequest('GET', TWITTER_ENDPOINTS.TWEET_STATUS_SHOW, params);
    return this.parseTweetResponse(response);
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<void> {
    const endpoint = TWITTER_ENDPOINTS.TWEET_STATUS_DESTROY.replace(':id', tweetId);
    await this.makeRequest('POST', endpoint);
  }

  /**
   * Search tweets
   */
  async searchTweets(query: string, options: { count?: number; maxId?: string } = {}): Promise<TweetData[]> {
    const params: Record<string, string> = { q: query };

    if (options.count) params.count = options.count.toString();
    if (options.maxId) params.max_id = options.maxId;

    const response = await this.makeRequest('GET', TWITTER_ENDPOINTS.SEARCH_TWEETS, params);
    return response.statuses?.map(this.parseTweetResponse.bind(this)) || [];
  }

  /**
   * Get user timeline
   */
  async getUserTimeline(userId: string, options: { count?: number; maxId?: string } = {}): Promise<TweetData[]> {
    const params: Record<string, string> = { user_id: userId };

    if (options.count) params.count = options.count.toString();
    if (options.maxId) params.max_id = options.maxId;

    const response = await this.makeRequest('GET', TWITTER_ENDPOINTS.USER_TIMELINE, params);
    return Array.isArray(response) ? response.map(this.parseTweetResponse.bind(this)) : [];
  }

  /**
   * Upload media
   */
  async uploadMedia(mediaData: Buffer, altText?: string): Promise<string> {
    // For now, return a placeholder media ID
    // Full implementation would handle multipart form data upload
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (altText) {
      // Set alt text for accessibility
      await this.makeRequest('POST', 'https://upload.twitter.com/1.1/media/metadata/create.json', {
        media_id: mediaId,
        alt_text: JSON.stringify({ text: altText }),
      });
    }

    return mediaId;
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<any> {
    return this.executeWithRetry(async () => {
      const url = new URL(endpoint);
      const authHeader = this.oauth.generateAuthHeader(method, url.toString(), params);

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DuoPlus-Twitter-Client/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      };

      if (method === 'POST' && Object.keys(params).length > 0) {
        requestOptions.body = new URLSearchParams(params).toString();
      } else if (method === 'GET' && Object.keys(params).length > 0) {
        url.search = new URLSearchParams(params).toString();
      }

      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TwitterApiError(
          response.status,
          errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          errorData,
          response.status >= 500 || response.status === 429,
          response.status === 429
        );
      }

      return response.json();
    });
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    const { retryPolicy } = this.config;
    let lastError: Error;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retryPolicy.maxRetries) {
          break;
        }

        if (error instanceof TwitterApiError && !error.retryable) {
          break;
        }

        const delay = Math.min(
          retryPolicy.baseDelay * Math.pow(retryPolicy.backoffMultiplier, attempt),
          retryPolicy.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Parse tweet response into TweetData
   */
  private parseTweetResponse(tweet: any): TweetData {
    return {
      id: tweet.id_str,
      text: tweet.full_text || tweet.text,
      authorId: tweet.user?.id_str,
      createdAt: tweet.created_at,
      metrics: {
        retweetCount: tweet.retweet_count || 0,
        likeCount: tweet.favorite_count || 0,
        replyCount: tweet.reply_count || 0,
        quoteCount: tweet.quote_count || 0,
        impressionCount: tweet.impression_count,
      },
      entities: {
        hashtags: tweet.entities?.hashtags?.map((h: any) => h.text) || [],
        mentions: tweet.entities?.user_mentions?.map((m: any) => m.screen_name) || [],
        urls: tweet.entities?.urls?.map((u: any) => u.expanded_url) || [],
        cashtags: tweet.entities?.symbols?.map((s: any) => s.text) || [],
      },
      attachments: tweet.extended_entities?.media?.map((m: any) => ({
        type: m.type,
        url: m.media_url_https,
        altText: m.alt_text?.text,
        width: m.sizes?.large?.w,
        height: m.sizes?.large?.h,
      })),
    };
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<any> {
    return this.makeRequest('GET', 'https://api.twitter.com/1.1/application/rate_limit_status.json');
  }
}

/**
 * OAuth 1.1a Helper for Twitter API authentication
 */
class OAuth1Helper {
  private readonly credentials: TwitterCredentials;

  constructor(credentials: TwitterCredentials) {
    this.credentials = credentials;
  }

  /**
   * Generate OAuth 1.1a authorization header
   */
  generateAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
    const oauthParams = {
      oauth_consumer_key: this.credentials.apiKey,
      oauth_nonce: this.generateNonce(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.credentials.accessToken,
      oauth_version: '1.0',
    };

    const allParams = { ...oauthParams, ...params };
    const signature = this.generateSignature(method, url, allParams);
    oauthParams.oauth_signature = signature;

    const headerParams = Object.keys(oauthParams)
      .sort()
      .map(key => `${key}="${encodeURIComponent(oauthParams[key as keyof typeof oauthParams])}"`)
      .join(', ');

    return `OAuth ${headerParams}`;
  }

  /**
   * Generate OAuth signature
   */
  private generateSignature(method: string, url: string, params: Record<string, string>): string {
    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(this.normalizeParams(params)),
    ].join('&');

    const signingKey = `${encodeURIComponent(this.credentials.apiSecret)}&${encodeURIComponent(this.credentials.accessTokenSecret)}`;
    return createHmac('sha1', signingKey).update(baseString).digest('base64');
  }

  /**
   * Normalize parameters for signature
   */
  private normalizeParams(params: Record<string, string>): string {
    return Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * Generate random nonce
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

/**
 * Twitter API Error class
 */
export class TwitterApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly details?: any,
    public readonly retryable: boolean = false,
    public readonly rateLimited: boolean = false
  ) {
    super(message);
    this.name = 'TwitterApiError';
  }
}