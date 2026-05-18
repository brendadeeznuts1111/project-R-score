/**
 * Twitter Client Wrapper
 * High-level wrapper for common Twitter operations with compliance integration
 */

import { TwitterApiClient, TwitterApiError } from './twitter-api.ts';
import { TwitterRateLimitManager } from './twitter-rate-limiter.ts';
import type {
  TwitterClientConfig,
  TweetData,
  TweetCreateRequest,
  MediaAttachment,
  ComplianceCheck
} from '../types/twitter.types';

/**
 * High-level Twitter client with compliance and rate limiting
 */
export class TwitterClient {
  private readonly apiClient: TwitterApiClient;
  private readonly rateLimiter: TwitterRateLimitManager;
  private readonly config: TwitterClientConfig;

  constructor(config: TwitterClientConfig) {
    this.config = config;
    this.apiClient = new TwitterApiClient(config);
    this.rateLimiter = new TwitterRateLimitManager(config.rateLimits, config.retryPolicy);
  }

  /**
   * Post a tweet with rate limiting and compliance checks
   */
  async postTweet(request: TweetCreateRequest, compliance?: ComplianceCheck): Promise<TweetData> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('tweet', async () => {
      return this.apiClient.postTweet(request);
    });
  }

  /**
   * Post a thread of tweets
   */
  async postThread(tweets: string[], compliance?: ComplianceCheck): Promise<TweetData[]> {
    this.checkCompliance(compliance, 'twitter');

    const postedTweets: TweetData[] = [];
    let replyToId: string | undefined;

    for (const tweetText of tweets) {
      const request: TweetCreateRequest = {
        text: tweetText,
        replyToId,
      };

      const tweet = await this.postTweet(request, compliance);
      postedTweets.push(tweet);
      replyToId = tweet.id;
    }

    return postedTweets;
  }

  /**
   * Get tweet by ID
   */
  async getTweet(tweetId: string, compliance?: ComplianceCheck): Promise<TweetData> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('read', async () => {
      return this.apiClient.getTweet(tweetId);
    });
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string, compliance?: ComplianceCheck): Promise<void> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('tweet', async () => {
      return this.apiClient.deleteTweet(tweetId);
    });
  }

  /**
   * Search tweets
   */
  async searchTweets(
    query: string,
    options: { count?: number; maxId?: string } = {},
    compliance?: ComplianceCheck
  ): Promise<TweetData[]> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('search', async () => {
      return this.apiClient.searchTweets(query, options);
    });
  }

  /**
   * Get user timeline
   */
  async getUserTimeline(
    userId: string,
    options: { count?: number; maxId?: string } = {},
    compliance?: ComplianceCheck
  ): Promise<TweetData[]> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('read', async () => {
      return this.apiClient.getUserTimeline(userId, options);
    });
  }

  /**
   * Upload media with rate limiting
   */
  async uploadMedia(
    mediaData: Buffer | File,
    options: { altText?: string; type?: 'image' | 'video' | 'gif' } = {},
    compliance?: ComplianceCheck
  ): Promise<string> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('media_upload', async () => {
      // Convert File to Buffer if needed
      const buffer = mediaData instanceof File ? Buffer.from(await mediaData.arrayBuffer()) : mediaData;
      return this.apiClient.uploadMedia(buffer, options.altText);
    });
  }

  /**
   * Post tweet with media
   */
  async postTweetWithMedia(
    text: string,
    mediaFiles: (Buffer | File)[],
    options: { altText?: string[]; replyToId?: string } = {},
    compliance?: ComplianceCheck
  ): Promise<TweetData> {
    this.checkCompliance(compliance, 'twitter');

    // Upload all media first
    const mediaIds: string[] = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      const altText = options.altText?.[i];
      const mediaId = await this.uploadMedia(mediaFile, { altText });
      mediaIds.push(mediaId);
    }

    // Post tweet with media
    const request: TweetCreateRequest = {
      text,
      mediaIds,
      replyToId: options.replyToId,
    };

    return this.postTweet(request, compliance);
  }

  /**
   * Follow a user
   */
  async followUser(userId: string, compliance?: ComplianceCheck): Promise<void> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('follow', async () => {
      // Implementation would call Twitter API follow endpoint
      throw new Error('Follow user not yet implemented');
    });
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string, compliance?: ComplianceCheck): Promise<void> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('unfollow', async () => {
      // Implementation would call Twitter API unfollow endpoint
      throw new Error('Unfollow user not yet implemented');
    });
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(operation: string): any {
    return this.rateLimiter.getStatus(operation);
  }

  /**
   * Get API rate limit status from Twitter
   */
  async getApiRateLimitStatus(compliance?: ComplianceCheck): Promise<any> {
    this.checkCompliance(compliance, 'twitter');

    return this.rateLimiter.execute('read', async () => {
      return this.apiClient.getRateLimitStatus();
    });
  }

  /**
   * Validate Twitter credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.rateLimiter.execute('read', async () => {
        // Try to get account settings to validate credentials
        const response = await fetch('https://api.twitter.com/1.1/account/settings.json', {
          headers: {
            'Authorization': `Bearer ${this.config.credentials.bearerToken || this.config.credentials.accessToken}`,
          },
        });
        return response.ok;
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check compliance before operation
   */
  private checkCompliance(compliance?: ComplianceCheck, feature: string = 'twitter'): void {
    if (!compliance) return;

    if (!compliance.allowed) {
      throw new TwitterApiError(
        403,
        `Twitter integration not allowed: ${compliance.restrictions.join(', ')}`,
        { compliance },
        false,
        false
      );
    }

    // Additional compliance checks can be added here
  }
}

/**
 * Factory function to create Twitter client
 */
export function createTwitterClient(config: TwitterClientConfig): TwitterClient {
  return new TwitterClient(config);
}

/**
 * Utility functions for Twitter operations
 */
export class TwitterUtils {
  /**
   * Validate tweet text length
   */
  static validateTweetText(text: string): { valid: boolean; length: number; remaining: number } {
    const length = text.length;
    const maxLength = 280;
    const valid = length <= maxLength;

    return {
      valid,
      length,
      remaining: Math.max(0, maxLength - length),
    };
  }

  /**
   * Split text into thread tweets
   */
  static createThreadTweets(text: string, maxLength: number = 280): string[] {
    const words = text.split(' ');
    const tweets: string[] = [];
    let currentTweet = '';

    for (const word of words) {
      const potentialTweet = currentTweet ? `${currentTweet} ${word}` : word;

      if (potentialTweet.length <= maxLength) {
        currentTweet = potentialTweet;
      } else {
        if (currentTweet) {
          tweets.push(currentTweet);
          currentTweet = word;
        } else {
          // Word itself is too long, need to split it
          const chunks = this.splitLongWord(word, maxLength);
          tweets.push(...chunks.slice(0, -1));
          currentTweet = chunks[chunks.length - 1];
        }
      }
    }

    if (currentTweet) {
      tweets.push(currentTweet);
    }

    return tweets;
  }

  /**
   * Split long word that exceeds tweet limit
   */
  private static splitLongWord(word: string, maxLength: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < word.length; i += maxLength) {
      chunks.push(word.slice(i, i + maxLength));
    }
    return chunks;
  }

  /**
   * Extract hashtags from text
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  }

  /**
   * Extract mentions from text
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex);
    return matches || [];
  }

  /**
   * Format tweet metrics for display
   */
  static formatMetrics(metrics: TweetData['metrics']): string {
    return `❤️ ${metrics.likeCount} 🔄 ${metrics.retweetCount} 💬 ${metrics.replyCount} 👁️ ${metrics.impressionCount || 0}`;
  }
}