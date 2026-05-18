# Twitter/X API Integration Implementation Plan

## Overview
Implement comprehensive Twitter/X API integration for the virtual device orchestration system, enabling automated social media management through the DuoPlus Scoping Matrix compliance framework.

This integration will provide tweet posting, monitoring, engagement tracking, and management capabilities while maintaining BUN-NATIVE principles and seamless integration with existing messaging, email, and scoping matrix systems. The implementation must handle rate limiting, error recovery, media attachments, and advanced tweet features within the compliance boundaries defined by the scoping matrix.

## Types

### Core API Types
```typescript
// Twitter API authentication and client types
interface TwitterCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly accessToken: string;
  readonly accessTokenSecret: string;
  readonly bearerToken?: string;
}

interface TwitterClientConfig {
  readonly credentials: TwitterCredentials;
  readonly rateLimits: RateLimitConfig;
  readonly retryPolicy: RetryPolicy;
  readonly timeout: number;
}

// Tweet data structures
interface TweetData {
  readonly id: string;
  readonly text: string;
  readonly authorId: string;
  readonly createdAt: string;
  readonly metrics: TweetMetrics;
  readonly entities: TweetEntities;
  readonly attachments?: MediaAttachment[];
}

interface TweetMetrics {
  readonly retweetCount: number;
  readonly likeCount: number;
  readonly replyCount: number;
  readonly quoteCount: number;
  readonly impressionCount?: number;
}

interface TweetEntities {
  readonly hashtags: string[];
  readonly mentions: string[];
  readonly urls: string[];
  readonly cashtags?: string[];
}

// Media and attachment types
interface MediaAttachment {
  readonly type: 'image' | 'video' | 'gif';
  readonly url: string;
  readonly altText?: string;
  readonly width?: number;
  readonly height?: number;
}

interface TweetCreateRequest {
  readonly text: string;
  readonly replyToId?: string;
  readonly quoteTweetId?: string;
  readonly mediaIds?: string[];
  readonly poll?: PollData;
  readonly scheduledAt?: Date;
}

interface PollData {
  readonly options: string[];
  readonly durationMinutes: number;
}

// Rate limiting and compliance types
interface RateLimitConfig {
  readonly tweetsPerHour: number;
  readonly tweetsPerDay: number;
  readonly mediaUploadsPerHour: number;
  readonly followsPerDay: number;
  readonly unfollowsPerDay: number;
}

interface ComplianceCheck {
  readonly scope: DeploymentScope;
  readonly feature: 'twitter';
  readonly allowed: boolean;
  readonly limits: ResourceLimits;
  readonly restrictions: string[];
}

// Error handling types
interface TwitterApiError {
  readonly code: number;
  readonly message: string;
  readonly details?: any;
  readonly retryable: boolean;
  readonly rateLimited: boolean;
}

interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}
```

## Files

### New Files to Create
- `integrations/twitter-api.ts` - Core Twitter API client implementation
- `integrations/twitter-client.ts` - High-level Twitter operations wrapper
- `integrations/twitter-media.ts` - Media upload and management utilities
- `integrations/twitter-webhook.ts` - Webhook handling for real-time updates
- `integrations/twitter-scheduler.ts` - Tweet scheduling and queue management
- `integrations/twitter-analytics.ts` - Engagement tracking and analytics
- `integrations/twitter-compliance.ts` - Scoping matrix integration
- `integrations/twitter-rate-limiter.ts` - Rate limiting implementation
- `integrations/twitter-cache.ts` - Response caching and optimization
- `config/twitter.config.ts` - Twitter-specific configuration
- `types/twitter.types.ts` - TypeScript type definitions
- `utils/twitter-utils.ts` - Utility functions for Twitter operations
- `middleware/twitter-middleware.ts` - Bun.serve middleware for Twitter routes
- `scripts/setup-twitter.ts` - Twitter API setup and testing script
- `tests/unit/twitter-api.test.ts` - Unit tests for Twitter API
- `tests/integration/twitter-integration.test.ts` - Integration tests
- `docs/TWITTER_INTEGRATION.md` - Comprehensive documentation

### Files to Modify
- `data/scopingMatrix.ts` - Add Twitter-specific rate limits and features
- `server/middleware/compliance.ts` - Add Twitter compliance checking
- `config/scope.config.ts` - Add Twitter configuration context
- `utils/matrixValidator.ts` - Add Twitter validation rules
- `scripts/demo-scoping.ts` - Add Twitter demo endpoints
- `package.json` - Add Twitter API dependencies
- `.env.example` - Add Twitter API environment variables

## Functions

### New Functions to Implement
- `createTwitterClient(config: TwitterClientConfig): TwitterClient` - Factory for Twitter API client
- `postTweet(request: TweetCreateRequest): Promise<TweetData>` - Post a new tweet
- `getTweet(tweetId: string): Promise<TweetData>` - Retrieve tweet by ID
- `deleteTweet(tweetId: string): Promise<void>` - Delete a tweet
- `searchTweets(query: string, options?: SearchOptions): Promise<TweetData[]>` - Search tweets
- `getUserTimeline(userId: string, options?: TimelineOptions): Promise<TweetData[]>` - Get user timeline
- `uploadMedia(file: File, altText?: string): Promise<string>` - Upload media attachment
- `createThread(tweets: string[]): Promise<TweetData[]>` - Create tweet thread
- `scheduleTweet(request: TweetCreateRequest, scheduleAt: Date): Promise<string>` - Schedule tweet
- `getTweetAnalytics(tweetId: string): Promise<TweetMetrics>` - Get engagement metrics
- `followUser(userId: string): Promise<void>` - Follow a user
- `unfollowUser(userId: string): Promise<void>` - Unfollow a user
- `validateTwitterCredentials(credentials: TwitterCredentials): Promise<boolean>` - Validate API credentials
- `checkTwitterRateLimits(): Promise<RateLimitStatus>` - Check current rate limit status
- `handleTwitterError(error: TwitterApiError): Promise<boolean>` - Error handling and retry logic

### Functions to Modify
- `getScopeContext()` in `config/scope.config.ts` - Add Twitter configuration
- `validateMatrixCompliance()` in `utils/matrixValidator.ts` - Add Twitter validation
- `complianceMiddleware()` in `server/middleware/compliance.ts` - Add Twitter checking

## Classes

### New Classes to Implement
- `TwitterApiClient` - Core API client with OAuth 1.1a authentication
- `TwitterRateLimiter` - Rate limiting with exponential backoff
- `TwitterMediaManager` - Media upload and optimization
- `TwitterScheduler` - Tweet scheduling and queue management
- `TwitterAnalytics` - Engagement tracking and reporting
- `TwitterWebhookHandler` - Real-time webhook processing
- `TwitterComplianceChecker` - Scoping matrix integration
- `TwitterErrorHandler` - Comprehensive error handling and recovery
- `TwitterCache` - Response caching with TTL and invalidation

### Classes to Extend
- `ScopingMatrix` in `data/scopingMatrix.ts` - Add Twitter-specific rules
- `ComplianceMiddleware` in `server/middleware/compliance.ts` - Add Twitter routes

## Dependencies

### New Dependencies to Add
- `oauth-1.0a: ^2.2.6` - OAuth 1.1a authentication for Twitter API v1.1
- `axios: ^1.6.0` - HTTP client for API requests (alternative to fetch for OAuth)
- `form-data: ^4.0.0` - Multipart form data for media uploads
- `node-cron: ^3.0.3` - Tweet scheduling and automation
- `ioredis: ^5.3.2` - Redis for rate limiting and caching (optional)
- `@types/oauth-1.0a: ^2.2.5` - TypeScript types for OAuth
- `@types/form-data: ^2.5.0` - TypeScript types for form data

### Development Dependencies
- `@types/node-cron: ^3.0.3` - TypeScript types for cron
- `twitter-api-v2: ^1.15.0` - Alternative Twitter API client for comparison

## Testing

### Test Files to Create
- `tests/unit/twitter-api.test.ts` - Unit tests for API functions
- `tests/unit/twitter-client.test.ts` - Client wrapper tests
- `tests/unit/twitter-media.test.ts` - Media upload tests
- `tests/unit/twitter-rate-limiter.test.ts` - Rate limiting tests
- `tests/integration/twitter-integration.test.ts` - Full integration tests
- `tests/bench/twitter-performance.benchmark.ts` - Performance benchmarks

### Test Coverage Requirements
- API authentication and error handling
- Rate limiting and retry logic
- Media upload and attachment handling
- Tweet scheduling and threading
- Compliance validation integration
- Webhook processing and real-time updates
- Caching behavior and invalidation
- Cross-platform compatibility

## Implementation Order

1. **Setup Project Structure** - Create all new files and directories
2. **Implement Core Types** - Define all TypeScript interfaces and types
3. **Add Dependencies** - Install required packages and update package.json
4. **Create Twitter API Client** - Implement OAuth authentication and basic API calls
5. **Implement Rate Limiting** - Add rate limiting with exponential backoff
6. **Add Media Support** - Implement media upload and attachment handling
7. **Create High-Level Client** - Build wrapper for common Twitter operations
8. **Add Scheduling System** - Implement tweet scheduling and queue management
9. **Integrate Compliance** - Connect with scoping matrix for feature gating
10. **Add Analytics** - Implement engagement tracking and reporting
11. **Create Webhooks** - Add real-time webhook processing
12. **Add Error Handling** - Comprehensive error recovery and logging
13. **Implement Caching** - Add response caching and optimization
14. **Create Middleware** - Add Bun.serve middleware for Twitter routes
15. **Add Configuration** - Update scoping matrix and environment variables
16. **Write Tests** - Comprehensive unit and integration tests
17. **Add Documentation** - Complete API documentation and examples
18. **Performance Testing** - Benchmarks and optimization
19. **Demo Integration** - Add Twitter endpoints to demo server
20. **Final Validation** - End-to-end testing and compliance verification