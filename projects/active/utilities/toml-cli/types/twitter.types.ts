/**
 * Twitter/X API Integration Types
 * Comprehensive TypeScript type definitions for Twitter API v1.1 and v2
 */

// Core API Types
export interface TwitterCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly accessToken: string;
  readonly accessTokenSecret: string;
  readonly bearerToken?: string;
}

export interface TwitterClientConfig {
  readonly credentials: TwitterCredentials;
  readonly rateLimits: RateLimitConfig;
  readonly retryPolicy: RetryPolicy;
  readonly timeout: number;
}

// Tweet Data Structures
export interface TweetData {
  readonly id: string;
  readonly text: string;
  readonly authorId: string;
  readonly createdAt: string;
  readonly metrics: TweetMetrics;
  readonly entities: TweetEntities;
  readonly attachments?: MediaAttachment[];
}

export interface TweetMetrics {
  readonly retweetCount: number;
  readonly likeCount: number;
  readonly replyCount: number;
  readonly quoteCount: number;
  readonly impressionCount?: number;
}

export interface TweetEntities {
  readonly hashtags: string[];
  readonly mentions: string[];
  readonly urls: string[];
  readonly cashtags?: string[];
}

// Media and Attachment Types
export interface MediaAttachment {
  readonly type: 'image' | 'video' | 'gif';
  readonly url: string;
  readonly altText?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface TweetCreateRequest {
  readonly text: string;
  readonly replyToId?: string;
  readonly quoteTweetId?: string;
  readonly mediaIds?: string[];
  readonly poll?: PollData;
  readonly scheduledAt?: Date;
}

export interface PollData {
  readonly options: string[];
  readonly durationMinutes: number;
}

// Rate Limiting and Compliance Types
export interface RateLimitConfig {
  readonly tweetsPerHour: number;
  readonly tweetsPerDay: number;
  readonly mediaUploadsPerHour: number;
  readonly followsPerDay: number;
  readonly unfollowsPerDay: number;
}

export interface ComplianceCheck {
  readonly scope: DeploymentScope;
  readonly feature: 'twitter';
  readonly allowed: boolean;
  readonly limits: ResourceLimits;
  readonly restrictions: string[];
}

// Error Handling Types
export interface TwitterApiError {
  readonly code: number;
  readonly message: string;
  readonly details?: any;
  readonly retryable: boolean;
  readonly rateLimited: boolean;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

// Import required types from scoping matrix
import type { DeploymentScope, ResourceLimits } from '../data/scopingMatrix';