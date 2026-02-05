# 🔥 Fire22 Dashboard Worker - API, Types, and Classes Expansion Plan

This document provides a detailed expansion of the APIs, types, and classes
within the `dashboard-worker/src` directory, visualized through Mermaid diagrams
for better understanding and architectural planning.

## Table of Contents

1.  [Core API Services](#core-api-services)
    - [Fire22ApiClient (`fire22-api.ts`)](#fire22apiclient-fire22-apits)
    - [EnhancedJWTAuthService (`jwt-auth-worker-enhanced.ts`)](#enhancedjwtauthservice-jwt-auth-worker-enhancedts)
2.  [Business Logic & Management Systems](#business-logic--management-systems)
    - [BalanceManager (`balance-management.ts`)](#balancemanager-balance-managementts)
    - [BusinessManagementSystem (`business-management.ts`)](#businessmanagementsystem-business-managementts)
    - [P2PQueueAPIEnhanced (`p2p-queue-api-enhanced.ts`)](#p2pqueueapienhanced-p2p-queue-api-enhancedts)
    - [Fire22TelegramBot (`telegram-bot.ts`)](#fire22telegrambot-telegram-botts)
3.  [Configuration & Global Types](#configuration--global-types)
    - [AppConfig (`config.ts`)](#appconfig-configts)
    - [Constants (`constants-definitions.ts`)](#constants-constants-definitionsts)
    - [Global Types (`types.ts`)](#global-types-typests)
4.  [Inter-Component Relationships](#inter-component-relationships)
5.  [Data Flow Diagrams](#data-flow-diagrams)

---

## Core API Services

### Fire22ApiClient (`fire22-api.ts`)

The `Fire22ApiClient` is responsible for all communication with the external
Fire22 API. It handles authentication, request formatting, and response parsing.

```mermaid
classDiagram
    class Fire22ApiClient {
        -String baseURL
        -String authToken
        -String webhookSecret
        -String sessionCookie
        -Map~String, String~ defaultHeaders
        -Number timeout
        -Number maxRetries
        -Boolean enableLogging

        +constructor(envConfig: EnvConfig)
        +async request(endpoint: String, options: RequestOptions): Promise~ApiResponse~
        +async get(endpoint: String, params?: Object): Promise~ApiResponse~
        +async post(endpoint: String, data: Object): Promise~ApiResponse~
        +async put(endpoint: String, data: Object): Promise~ApiResponse~
        +async delete(endpoint: String): Promise~ApiResponse~
        +setAuthToken(token: String): void
        +setSessionCookie(cookie: String): void
        +async authenticate(credentials: Credentials): Promise~AuthResponse~
        +async refreshAuthToken(): Promise~boolean~
        +handleError(error: Error): ApiError
        -buildUrl(endpoint: String, params?: Object): String
        -parseResponse(response: Response): Promise~ApiResponse~
    }

    class RequestOptions {
        +String method
        +Object? data
        +Object? headers
        +Number? timeout
    }

    class ApiResponse {
        +Boolean success
        +Any? data
        +String? error
        +Number status
        +String message
    }

    class ApiError extends Error {
        +Number code
        +String details
        +Object? originalError
    }

    Fire22ApiClient --> RequestOptions : uses
    Fire22ApiClient --> ApiResponse : returns
    Fire22ApiClient --> ApiError : throws
```

**Key Responsibilities:**

- **API Communication:** Centralizes all HTTP requests to the Fire22 backend.
- **Authentication Management:** Handles JWT tokens and session cookies for
  secure API access.
- **Error Handling:** Provides a standardized way to handle and log API errors.
- **Request/Response Interception:** Allows for pre-processing of requests and
  post-processing of responses (e.g., logging, caching).

**Usage Example:**

```typescript
const client = new Fire22ApiClient({
  apiUrl: Bun.env.FIRE22_API_URL,
  token: Bun.env.FIRE22_TOKEN,
  webhookSecret: Bun.env.FIRE22_WEBHOOK_SECRET,
});

const response = await client.get('/players');
if (response.success) {
  console.log(response.data);
} else {
  console.error('API Error:', response.error);
}
```

### EnhancedJWTAuthService (`jwt-auth-worker-enhanced.ts`)

This service provides a comprehensive JWT-based authentication system, designed
to run as a Cloudflare Worker. It includes user management, session handling,
rate limiting, and audit logging.

```mermaid
classDiagram
    class EnhancedJWTAuthService {
        -AuthConfig config
        -Map~String, User~ users
        -Map~String, Session~ sessions
        -Map~String, AuditLog[]~ auditLogs
        -RateLimiter rateLimiter
        -SecurityManager securityManager

        +constructor(config: AuthConfig)
        +async handleRequest(request: Request): Promise~Response~
        +async login(credentials: LoginCredentials): Promise~AuthResponse~
        +async verifyToken(token: String): Promise~EnhancedJWTPayload~
        +async refreshToken(refreshToken: String): Promise~AuthResponse~
        +async logout(token: String): Promise~SuccessResponse~
        +async getUserInfo(userId: String): Promise~User | null~
        +async getAuditLogs(limit?: Number): Promise~AuditLog[]~
        +async revokeToken(token: String): Promise~SuccessResponse~
        +async getHealth(): Promise~HealthStatus~
        -generateJWT(user: User): String
        -verifyJWT(token: String): EnhancedJWTPayload | null
        -hashPassword(password: String): String
        -verifyPassword(password: String, hash: String): Boolean
        -logAudit(action: String, userId: String, success: Boolean, details?: Object): void
    }

    class AuthConfig {
        +String jwtSecret
        +String issuer
        +String audience
        +Number tokenExpiry
        +Number refreshTokenExpiry
        +Number maxLoginAttempts
        +Number lockoutDuration
        +Number rateLimitWindow
        +Number rateLimitMax
        +Boolean enableAuditLogging
    }

    class User {
        +String id
        +String username
        +String passwordHash
        +String role
        +Boolean isActive
        +Date createdAt
        +Date lastLogin
        +Number failedLoginAttempts
        +Date? lockedUntil
    }

    class Session {
        +String id
        +String userId
        +String jti
        +Date createdAt
        +Date expiresAt
        +Date lastAccessed
        +String ipAddress
        +String userAgent
        +Boolean isActive
    }

    class EnhancedJWTPayload {
        +String sub
        +String username
        +String role
        +String jti
        +String sessionId
        +String ipAddress
        +String deviceFingerprint
        +Number iat
        +Number exp
    }

    class AuditLog {
        +String id
        +String userId
        +String username
        +String action
        +Boolean success
        +String ipAddress
        +String userAgent
        +Object? details
        +Date timestamp
    }

    EnhancedJWTAuthService --> AuthConfig : configures
    EnhancedJWTAuthService --> User : manages
    EnhancedJWTAuthService --> Session : manages
    EnhancedJWTAuthService --> AuditLog : generates
    EnhancedJWTAuthService --> EnhancedJWTPayload : creates/verifies
```

**Key Responsibilities:**

- **User Authentication:** Securely authenticates users using JWTs.
- **Session Management:** Tracks active user sessions, including device
  fingerprinting and last access times.
- **Security:** Implements rate limiting, account lockout, and audit logging to
  protect against common attacks.
- **Token Lifecycle:** Manages JWT creation, verification, and refresh
  mechanisms.
- **Admin Functions:** Provides endpoints for user management, audit log review,
  and token revocation.

**Usage Example (as a Cloudflare Worker):**

```typescript
// In wrangler.toml
// name = "auth-worker"
// main = "jwt-auth-worker-enhanced.ts"

// In jwt-auth-worker-enhanced.ts
const authService = new EnhancedJWTAuthService({
  jwtSecret: Bun.env.JWT_SECRET,
  // ... other config
});

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return authService.handleRequest(request);
  },
};
```

---

## Business Logic & Management Systems

### BalanceManager (`balance-management.ts`)

The `BalanceManager` is responsible for tracking and managing player balances,
including credit limits, outstanding balances, and transaction history.

```mermaid
classDiagram
    class BalanceManager {
        -Map~String, PlayerBalance~ playerBalances
        -Map~String, Transaction[]~ transactionHistory
        -Number defaultCreditLimit
        -Number maxOutstandingBalance

        +constructor(config?: BalanceConfig)
        +getPlayerBalance(playerId: String): PlayerBalance | null
        +updatePlayerBalance(playerId: String, amount: Number, type: 'credit' | 'debit', description: String): TransactionResult
        +setCreditLimit(playerId: String, limit: Number): Boolean
        +getTransactionHistory(playerId: String, limit?: Number): Transaction[]
        +calculateOutstandingBalance(playerId: String): Number
        +getAvailableCredit(playerId: String): Number
        +processWagerSettlement(playerId: String, wagerId: String, outcome: 'win' | 'lose' | 'push', amount: Number): TransactionResult
        +processDeposit(playerId: String, amount: Number, method: String): TransactionResult
        +processWithdrawal(playerId: String, amount: Number, method: String): TransactionResult
        -validateTransaction(playerId: String, amount: Number, type: 'credit' | 'debit'): Boolean
        -recordTransaction(transaction: Transaction): void
    }

    class PlayerBalance {
        +String playerId
        +Number currentBalance
        +Number creditLimit
        +Number outstandingBalance
        +Number lifetimeVolume
        +Date lastUpdated
    }

    class Transaction {
        +String id
        +String playerId
        +String type 'deposit' | 'withdrawal' | 'wager' | 'win' | 'loss' | 'adjustment'
        +Number amount
        +Number balanceBefore
        +Number balanceAfter
        +String description
        +String? referenceId
        +Date timestamp
        +String status 'pending' | 'completed' | 'failed'
    }

    class TransactionResult {
        +Boolean success
        +Transaction? transaction
        +String? error
        +PlayerBalance? newBalance
    }

    class BalanceConfig {
        +Number defaultCreditLimit
        +Number maxOutstandingBalance
        +Number maxTransactionAmount
    }

    BalanceManager --> PlayerBalance : manages
    BalanceManager --> Transaction : records
    BalanceManager --> TransactionResult : returns
    BalanceManager --> BalanceConfig : uses
```

**Key Responsibilities:**

- **Balance Tracking:** Maintains real-time player balances.
- **Transaction Processing:** Handles deposits, withdrawals, wager settlements,
  and adjustments.
- **Credit Management:** Enforces credit limits and calculates available credit.
- **History & Reporting:** Provides a complete transaction history for players.

**Usage Example:**

```typescript
const balanceManager = new BalanceManager({ defaultCreditLimit: 1000 });

// Process a deposit
const depositResult = balanceManager.processDeposit(
  'player123',
  500,
  'credit_card'
);
if (depositResult.success) {
  console.log(
    `Deposit successful. New balance: ${depositResult.newBalance?.currentBalance}`
  );
}

// Settle a wager
const settlementResult = balanceManager.processWagerSettlement(
  'player123',
  'wager456',
  'win',
  200
);
```

### BusinessManagementSystem (`business-management.ts`)

This system manages the business aspects of the platform, including VIP tiers,
affiliate programs, commission calculations, and user groups.

```mermaid
classDiagram
    class BusinessManagementSystem {
        -Map~String, VIPTier~ vipTiers
        -Map~String, UserGroup~ groups
        -Map~String, AffiliateProgram~ affiliatePrograms
        -Map~String, UserLink~ userLinks
        -CommissionConfig commissionConfig

        +constructor(config?: CommissionConfig)
        // VIP Management
        +getAllVIPTiers(): VIPTier[]
        +getUserVIPTier(userId: String): VIPTier | null
        +assignUserToVIPTier(userId: String, tierName: String): Boolean
        +calculateVIPBenefits(userId: String): VIPBenefits
        // Group Management
        +createGroup(name: String, type: String, settings: GroupSettings): UserGroup
        +addUserToGroup(userId: String, groupId: String): Boolean
        +removeUserFromGroup(userId: String, groupId: String): Boolean
        +getUserGroups(userId: String): UserGroup[]
        // Affiliate Management
        +createAffiliateProgram(name: String, structure: CommissionStructure): AffiliateProgram
        +calculateCommission(userId: String, handle: Number, volume: Number, riskScore: Number, complianceScore: Number, performanceMetrics: Object): CommissionResult
        +createUserLink(userId: String, linkType: 'referral' | 'affiliate' | 'vip'): String
        +trackReferral(referrerId: String, referredId: String): Boolean
        // Reporting
        +generateCommissionReport(period: String): CommissionReport[]
        +getGroupPerformance(groupId: String): GroupPerformance
    }

    class VIPTier {
        +String name
        +Number level
        +Number minBalance
        +Number minVolume
        +Number commissionRate
        +Number bonusMultiplier
        +String[] benefits
    }

    class UserGroup {
        +String id
        +String name
        +String type 'vip' | 'affiliate' | 'agent' | 'custom'
        +String[] members
        +GroupSettings settings
    }

    class GroupSettings {
        +Number maxMembers
        +Boolean autoApprove
        +String[] permissions
    }

    class AffiliateProgram {
        +String id
        +String name
        +CommissionStructure commissionStructure
        +ReferralReward[] referralRewards
    }

    class CommissionStructure {
        +Number baseRate
        +VolumeTier[] volumeTiers
        +PerformanceBonus[] performanceBonuses
    }

    class VolumeTier {
        +Number minVolume
        +Number maxVolume
        +Number commissionRate
        +Number bonusMultiplier
    }

    class PerformanceBonus {
        +String description
        +Number bonus
    }

    class ReferralReward {
        +Number level
        +Number commission
        +Number bonus
    }

    class CommissionResult {
        +String period
        +Number handle
        +Number commission
        +Number bonuses
        +Number adjustments
        +Number totalPayout
        +String status 'pending' | 'approved' | 'paid'
        +Date calculatedAt
        +Date? paidAt
    }

    class UserLink {
        +String userId
        +String linkType
        +String linkCode
        +Date createdAt
        +Number clicks
        +Number conversions
    }

    BusinessManagementSystem --> VIPTier : defines
    BusinessManagementSystem --> UserGroup : manages
    BusinessManagementSystem --> AffiliateProgram : manages
    BusinessManagementSystem --> CommissionResult : calculates
    BusinessManagementSystem --> UserLink : creates
```

**Key Responsibilities:**

- **VIP Program Management:** Defines VIP tiers, assigns users, and calculates
  benefits.
- **User Grouping:** Organizes users into groups for targeted management and
  permissions.
- **Affiliate & Referral System:** Manages affiliate programs, tracks referrals,
  and calculates commissions.
- **Commission Engine:** A complex engine for calculating commissions based on
  various factors like handle, volume, risk, and performance.

**Usage Example:**

```typescript
const businessSystem = new BusinessManagementSystem();

// Assign a user to VIP
businessSystem.assignUserToVIPTier('player789', 'Gold');

// Calculate monthly commission
const commission = businessSystem.calculateCommission(
  'agent456',
  50000, // handle
  150000, // volume
  0.92, // risk score
  98, // compliance score
  { newCustomers: 15 } // performance metrics
);
console.log(`Total commission payout: $${commission.totalPayout}`);
```

### P2PQueueAPIEnhanced (`p2p-queue-api-enhanced.ts`)

The `P2PQueueAPIEnhanced` manages a peer-to-peer queue system, primarily for
matching withdrawal and deposit requests. It integrates with a pattern system
for optimization and includes Telegram notifications.

```mermaid
classDiagram
    class P2PQueueAPIEnhanced {
        -WithdrawalQueueSystem queueSystem
        -PatternSystem? patternSystem
        -P2POptimizationConfig optimizationConfig
        -Map~String, any~ performanceMetrics
        -Map~String, any~ patternCache

        +constructor(env: Env, patternSystem?: PatternSystem)
        // Queue Operations
        +async addWithdrawalToQueue(withdrawal: Omit~P2PQueueItemEnhanced, 'id' | 'createdAt' | 'status'~): Promise~String~
        +async addDepositToQueue(deposit: Omit~P2PQueueItemEnhanced, 'id' | 'createdAt' | 'status'~): Promise~String~
        +async getQueueItems(filters?: QueueFilters): Promise~P2PQueueItemEnhanced[]~
        +async getQueueStats(): Promise~P2PQueueStats~
        +async processMatching(): Promise~P2PMatchResult[]~
        // Pattern & Optimization
        +async applyOptimizationPatterns(item: P2PQueueItemEnhanced, type: 'withdrawal' | 'deposit'): Promise~P2PQueueItemEnhanced~
        +async getPerformanceMetrics(): Promise~any~
        // Telegram Integration
        +async notifyTelegram(event: String, data: any): Promise~void~
        +async storeTelegramData(queueItem: P2PQueueItem, data: any): Promise~void~
        // Internal
        -async storeEnhancedMetadata(queueItem: P2PQueueItem, enhancedItem: P2PQueueItemEnhanced): Promise~void~
    }

    class P2PQueueItemEnhanced {
        +String id
        +String type 'withdrawal' | 'deposit'
        +String customerId
        +Number amount
        +String paymentType
        +String paymentDetails
        +Number priority
        +String status 'pending' | 'matched' | 'processing' | 'completed' | 'failed'
        +Date createdAt
        +String? matchedWith
        +String? notes
        // Telegram fields
        +String? telegramGroupId
        +String? telegramChatId
        +String? telegramChannel
        +String? telegramUsername
        +String? telegramId
        // Pattern metadata
        +PatternMetadata? patternMetadata
        +MatchingCriteria? matchingCriteria
    }

    class PatternMetadata {
        +String[] processingPatterns
        +PerformanceMetrics performanceMetrics
        +OptimizationFlags optimizationFlags
    }

    class PerformanceMetrics {
        +Number patternExecutionTime
        +Number patternSuccessRate
        +Number patternCacheHits
    }

    class OptimizationFlags {
        +Boolean useStreaming
        +Boolean useCaching
        +Boolean useParallelProcessing
    }

    class MatchingCriteria {
        +String[] preferredPaymentTypes
        +Number amountTolerance
        +String timePreference 'immediate' | 'flexible' | 'scheduled'
        +String riskProfile 'low' | 'medium' | 'high'
    }

    class P2PMatchResult {
        +String id
        +String withdrawalId
        +String depositId
        +Number amount
        +Number matchScore
        +Number processingTime
        +String status 'pending' | 'processing' | 'completed' | 'failed'
        +Date createdAt
        +Date? completedAt
        +String? notes
        +MatchMetadata? matchMetadata
    }

    class MatchMetadata {
        +Number patternScore
        +String[] optimizationApplied
        +Number processingEfficiency
    }

    class P2PQueueStats {
        +Number totalItems
        +Number pendingWithdrawals
        +Number pendingDeposits
        +Number matchedPairs
        +Number averageWaitTime
        +Number processingRate
        +Number successRate
        +Date lastUpdated
        +PatternMetrics? patternMetrics
    }

    class PatternMetrics {
        +Number totalPatternExecutions
        +Number averagePatternExecutionTime
        +Number patternSuccessRate
        +Number cacheHitRate
        +Number optimizationImpact
    }

    class P2POptimizationConfig {
        +PatternConfig patterns
        +ThresholdConfig thresholds
        +StrategyConfig strategies
    }

    class PatternConfig {
        +Boolean useStreaming
        +Boolean useCaching
        +Boolean useParallelProcessing
        +Boolean usePredictiveMatching
        +Boolean useRiskAnalysis
    }

    class ThresholdConfig {
        +Number maxProcessingTime
        +Number minMatchScore
        +Number maxQueueSize
        +Number maxConcurrentMatches
    }

    class StrategyConfig {
        +String matchOptimization 'speed' | 'accuracy' | 'balanced'
        +String queueOptimization 'fifo' | 'priority' | 'smart'
        +String riskOptimization 'conservative' | 'moderate' | 'aggressive'
    }

    P2PQueueAPIEnhanced --> P2PQueueItemEnhanced : manages
    P2PQueueAPIEnhanced --> P2PMatchResult : creates
    P2PQueueAPIEnhanced --> P2PQueueStats : generates
    P2PQueueAPIEnhanced --> P2POptimizationConfig : uses
```

**Key Responsibilities:**

- **Queue Management:** Handles the lifecycle of P2P queue items (withdrawals
  and deposits).
- **Intelligent Matching:** Matches withdrawal requests with deposit requests
  based on various criteria, potentially using a pattern system for
  optimization.
- **Performance Monitoring:** Tracks metrics related to queue processing,
  pattern execution, and matching efficiency.
- **Integration:** Notifies users via Telegram about queue events and stores
  relevant data.

**Usage Example:**

```typescript
const p2pQueue = new P2PQueueAPIEnhanced(env, patternSystem);

// Add a withdrawal to the queue
const withdrawalId = await p2pQueue.addWithdrawalToQueue({
  customerId: 'user123',
  amount: 1000,
  paymentType: 'bank_transfer',
  paymentDetails: '...',
  telegramChatId: 'user123_telegram_id',
});

// Get current queue stats
const stats = await p2pQueue.getQueueStats();
console.log(`Pending withdrawals: ${stats.pendingWithdrawals}`);
```

### Fire22TelegramBot (`telegram-bot.ts`)

The `Fire22TelegramBot` provides a rich interface for users to interact with the
Fire22 system via Telegram. It handles commands, notifications, and integrates
with various management systems.

```mermaid
classDiagram
    class Fire22TelegramBot {
        -TelegramBot bot
        -TelegramBotConfig config
        -Map~Number, any~ userSessions
        -Map~String, Function~ commandHandlers
        -BusinessManagementSystem businessSystem
        -LiveCasinoManagementSystem liveCasinoSystem
        -SportsBettingManagementSystem sportsBettingSystem
        -UnifiedAPIHandler? apiHandler
        -Env? env
        -Boolean isRunning

        +constructor(config: TelegramBotConfig)
        +setAPIHandler(apiHandler: UnifiedAPIHandler, env: Env): void
        +async start(): void
        +async stop(): void
        +getStatus(): BotStatus
        // Message Handling
        +async handleMessage(message: TelegramMessage): void
        +async sendMessage(chatId: Number, text: String, parseMode?: 'HTML' | 'Markdown'): void
        +async sendNotificationByUsername(username: String, message: String): void
        +async sendNotificationById(telegramId: Number, message: String): void
        +async notifyAdmins(message: String): void
        // Command Handlers (examples)
        +private async handleStart(message: TelegramMessage): void
        +private async handleHelp(message: TelegramMessage): void
        +private async handleBalance(message: TelegramMessage): void
        +private async handleAdmin(message: TelegramMessage): void
        +private async handleVIP(message: TelegramMessage): void
        // ... other handlers for /wagers, /profile, /casino, /sports, etc.
        // Internal
        -private initializeCommandHandlers(): void
        -private isUserAllowed(username: String): Boolean
        -private isAdminUser(username: String): Boolean
        -private async getUserByTelegramUsername(username: String): Promise~any~
    }

    class TelegramBotConfig {
        +String token
        +String? webhookUrl
        +String[]? allowedUsers
        +String[]? adminUsers
        +NotificationSettings notificationSettings
    }

    class NotificationSettings {
        +Boolean wagerUpdates
        +Boolean balanceChanges
        +Boolean systemAlerts
        +Boolean weeklyReports
    }

    class TelegramMessage {
        +Number message_id
        +TelegramUser from
        +TelegramChat chat
        +Number date
        +String? text
        +any[]? entities
    }

    class TelegramUser {
        +Number id
        +String? username
        +String? first_name
        +String? last_name
        +Boolean is_bot
        +String? language_code
    }

    class TelegramChat {
        +Number id
        +String type
        +String? title
        +String? username
    }

    class BotStatus {
        +Boolean isRunning
        +TelegramBotConfig config
        +Number userSessions
        +Number commandHandlers
    }

    Fire22TelegramBot --> TelegramBotConfig : uses
    Fire22TelegramBot --> BusinessManagementSystem : integrates
    Fire22TelegramBot --> LiveCasinoManagementSystem : integrates
    Fire22TelegramBot --> SportsBettingManagementSystem : integrates
    Fire22TelegramBot --> TelegramMessage : processes
    Fire22TelegramBot --> BotStatus : provides
```

**Key Responsibilities:**

- **Command Processing:** Handles a wide array of commands for user interaction,
  from basic info (`/start`, `/help`) to specific business functions
  (`/balance`, `/vip`, `/casino`).
- **User Management:** Tracks user sessions and manages access control (allowed
  users, admin users).
- **System Integration:** Acts as a frontend to other systems like
  `BusinessManagementSystem`, `LiveCasinoManagementSystem`, etc., fetching data
  and presenting it to users.
- **Notification System:** Proactively sends notifications to users about
  balance changes, wager updates, system alerts, etc.
- **Admin Interface:** Provides admin-only commands for system management,
  broadcasting messages, and viewing statistics.

**Usage Example:**

```typescript
const botConfig: TelegramBotConfig = {
  token: Bun.env.BOT_TOKEN,
  adminUsers: ['admin_username'],
  allowedUsers: ['user1', 'user2'],
  notificationSettings: {
    wagerUpdates: true,
    balanceChanges: true,
    systemAlerts: true,
    weeklyReports: true,
  },
};

const bot = new Fire22TelegramBot(botConfig);
bot.setAPIHandler(unifiedApiHandler, env); // Assuming unifiedApiHandler and env are available
await bot.start();
```

---

## Configuration & Global Types

### AppConfig (`config.ts`)

`AppConfig` centralizes all configuration for the application, loading values
from environment variables and providing validation.

```mermaid
classDiagram
    class AppConfig {
        +DatabaseConfig database
        +BotConfig bot
        +Fire22Config fire22
        +AuthConfig auth
        +StripeConfig stripe
        +CommunicationConfig communication
        +SystemConfig system
    }

    class DatabaseConfig {
        +String name
        +String id
    }

    class BotConfig {
        +String token
        +String cashierToken
    }

    class Fire22Config {
        +String apiUrl
        +String token
        +String webhookSecret
    }

    class AuthConfig {
        +String jwtSecret
        +String adminPassword
    }

    class StripeConfig {
        +String secretKey
        +String webhookSecret
    }

    class CommunicationConfig {
        +String sendgridApiKey
        +String twilioAccountSid
        +String twilioAuthToken
    }

    class SystemConfig {
        +String cronSecret
        +String nodeEnv
        +Boolean verboseFetch
        +Number maxHttpRequests
    }

    class ConfigManager {
        -AppConfig? globalConfig
        +createConfig(): AppConfig
        +getConfig(): AppConfig
        +resetConfig(): void
        +validateConfig(config: AppConfig): String[]
        +getEnvironmentConfig(): Partial~AppConfig~
    }

    ConfigManager --> AppConfig : creates/manages
    AppConfig --> DatabaseConfig : contains
    AppConfig --> BotConfig : contains
    AppConfig --> Fire22Config : contains
    AppConfig --> AuthConfig : contains
    AppConfig --> StripeConfig : contains
    AppConfig --> CommunicationConfig : contains
    AppConfig --> SystemConfig : contains
```

**Key Responsibilities:**

- **Centralized Configuration:** Provides a single source of truth for all
  application settings.
- **Environment Variable Loading:** Securely loads configuration from
  environment variables, with fallbacks for optional settings.
- **Validation:** Ensures that all required configuration is present and valid
  (e.g., correct formats for secrets).
- **Environment-Specific Settings:** Allows for overriding configurations based
  on the `NODE_ENV` (development, test, production).

**Usage Example:**

```typescript
import { getConfig, validateConfig } from './config';

const config = getConfig();
const errors = validateConfig(config);

if (errors.length > 0) {
  console.error('Configuration errors:', errors);
  process.exit(1);
}

console.log(`Database Name: ${config.database.name}`);
console.log(`Bot Token: ${config.bot.token.substring(0, 10)}...`);
```

### Constants (`constants-definitions.ts`)

This file defines a comprehensive set of constants used throughout the
application, using a `DEFINE` system for build-time optimization and type
safety.

```mermaid
graph TD
    A[Constants Definitions] --> B[Color Constants]
    A --> C[System Configuration Constants]
    A --> D[Breakpoint Constants]
    A --> E[Status Constants]
    A --> F[Permission Constants]
    A --> G[Validation Constants]
    A --> H[Game Constants]
    A --> I[Commission Constants]
    A --> J[Feature Flags]
    A --> K[HTTP Status Constants]
    A --> L[Analytics Constants]
    A --> M[CSS Constants]
    A --> N[Error/Success Message Constants]

    subgraph B [Color Constants]
        B1(FIRE22_PRIMARY_MAIN)
        B2(FIRE22_SECONDARY_MAIN)
        B3(FIRE22_SUCCESS_COLOR)
        B4(FIRE22_BG_PRIMARY)
        B5(FIRE22_TEXT_PRIMARY)
    end

    subgraph C [System Configuration Constants]
        C1(API_TIMEOUT)
        C2(CACHE_DEFAULT_TTL)
        C3(DB_MAX_CONNECTIONS)
        C4(JWT_EXPIRY)
    end

    subgraph D [Breakpoint Constants]
        D1(BREAKPOINT_SM)
        D2(BREAKPOINT_MD)
        D3(BREAKPOINT_LG)
    end

    subgraph E [Status Constants]
        E1(STATUS_BUILD_PENDING)
        E2(STATUS_QUEUE_COMPLETED)
        E3(STATUS_HEALTH_OK)
    end

    subgraph F [Permission Constants]
        F1(PERM_CUSTOMER_PLACE_BETS)
        F2(PERM_AGENT_MANAGE_CUSTOMERS)
        F3(PERM_ADMIN_MANAGE_SYSTEM)
    end

    subgraph G [Validation Constants]
        G1(LIMIT_MIN_BET)
        G2(THRESHOLD_VIP)
        G3(TIMEOUT_SESSION_EXPIRY)
    end

    subgraph H [Game Constants]
        H1(SPORTS_FOOTBALL)
        H2(CASINO_BLACKJACK)
        H3(BET_TYPE_PARLAY)
    end

    subgraph I [Commission Constants]
        I1(COMMISSION_SPORTS_DEFAULT)
        I2(COMMISSION_BRONZE)
        I3(COMMISSION_PERFORMANCE_BONUS)
    end

    subgraph J [Feature Flags]
        J1(FEATURE_P2P_QUEUE)
        J2(FEATURE_LIVE_CASINO)
        J3(FEATURE_AI_MATCHING)
    end

    subgraph K [HTTP Status Constants]
        K1(HTTP_OK)
        K2(HTTP_UNAUTHORIZED)
        K3(HTTP_INTERNAL_SERVER_ERROR)
    end

    subgraph L [Analytics Constants]
        L1(ANALYTICS_PERIOD_DAILY)
        L2(ANALYTICS_METRIC_REVENUE)
        L3(ANALYTICS_AGG_SUM)
    end

    subgraph M [CSS Constants]
        M1(SPACING_MD)
        M2(RADIUS_LG)
        M3(SHADOW_MD)
    end

    subgraph N [Error/Success Message Constants]
        N1(ERROR_INVALID_CREDENTIALS)
        N2(SUCCESS_CREATED)
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#e6f7ff,stroke:#333,stroke-width:1px
    style C fill:#e6f7ff,stroke:#333,stroke-width:1px
    style D fill:#e6f7ff,stroke:#333,stroke-width:1px
    style E fill:#e6f7ff,stroke:#333,stroke-width:1px
    style F fill:#e6f7ff,stroke:#333,stroke-width:1px
    style G fill:#e6f7ff,stroke:#333,stroke-width:1px
    style H fill:#e6f7ff,stroke:#333,stroke-width:1px
    style I fill:#e6f7ff,stroke:#333,stroke-width:1px
    style J fill:#e6f7ff,stroke:#333,stroke-width:1px
    style K fill:#e6f7ff,stroke:#333,stroke-width:1px
    style L fill:#e6f7ff,stroke:#333,stroke-width:1px
    style M fill:#e6f7ff,stroke:#333,stroke-width:1px
    style N fill:#e6f7ff,stroke:#333,stroke-width:1px
```

**Key Responsibilities:**

- **Standardization:** Ensures consistent use of values (e.g., color codes, API
  timeouts, status strings) across the entire application.
- **Maintainability:** Makes it easy to update values in one place without
  having to search and replace throughout the codebase.
- **Build-Time Optimization:** The `DEFINE` system allows build tools to inline
  constants, potentially improving performance.
- **Type Safety:** Provides strongly-typed constants, reducing the risk of typos
  or incorrect values.
- **Discoverability:** Groups related constants together (e.g.,
  `CONSTANTS.COLORS`, `CONSTANTS.HTTP`), making them easy to find and use.

**Usage Example:**

```typescript
import {
  FIRE22_PRIMARY_MAIN,
  API_TIMEOUT,
  HTTP_OK,
} from './constants-definitions';

// Styling
const primaryColor = FIRE22_PRIMARY_MAIN; // '#fdbb2d'

// API Call
const response = await fetch(url, { timeout: API_TIMEOUT });

// Response Handling
if (response.status === HTTP_OK) {
  // Handle success
}
```

### Global Types (`types.ts`)

`types.ts` centralizes all TypeScript type definitions, promoting consistency
and reusability across the project.

```mermaid
classDiagram
    class CacheEntry~T~ {
        +T data
        +Number expires
    }

    class RequestWithServices extends Request {
        +Fire22Cache cache
        +Fire22ApiService fire22ApiService
    }

    interface Fire22ApiService {
        +String baseURL
        +String authToken
        +String sessionCookie
    }

    interface Fire22CacheInterface {
        +get~T~(key: String, factory: () => Promise~T~, ttl?: Number): Promise~T~
        +query~T~(sql: String, params?: any[], ttl?: Number): Promise~T[]~
        +getStats(): CacheStats
    }

    class ApiResponse~T~ {
        +Boolean success
        +T? data
        +String? error
        +String? message
        +String? timestamp
    }

    class HealthResponse extends ApiResponse {
        +String status 'OK' | 'WARNING' | 'ERROR'
        +Number health_score
        +Number? total_agents
        +Number? agents_with_errors
    }

    class SystemHealthResponse extends ApiResponse {
        +String status 'OK' | 'WARNING' | 'ERROR'
        +Number system_health_score
        +Number response_time
        +Number critical_issues
        +HealthCheck[] checks
        +HealthSummary summary
    }

    class HealthCheck {
        +String name
        +String status 'OK' | 'WARNING' | 'ERROR'
        +String? details
        +String? error
    }

    class HealthSummary {
        +Number healthy
        +Number total
        +String status 'OK' | 'WARNING' | 'ERROR'
        +String[]? recommendations
    }

    class CacheStats {
        +Number cacheSize
        +Number cacheHits
        +Number cacheMisses
        +String hitRate
    }

    class Agent {
        +String agent_id
        +String? master_agent_id
        +Record~String, Boolean~ permissions
        +CommissionRates commissionRates
        +AgentStatus status
    }

    class CommissionRates {
        +Number inet
        +Number casino
        +Number propBuilder
    }

    class AgentStatus {
        +Boolean isActive
        +String? lastActivity
    }

    class AgentConfig {
        +String agent_id
        +String master_agent_id
        +String | Number allow_place_bet
        +Number commission_percent
        +Number max_wager
        // ... other fields
    }

    class ValidationSummary {
        +Number valid_permissions
        +Number valid_commission_rates
        +Number has_required_fields
        +Number valid_max_wager_type
    }

    class AgentValidationDetail {
        +String agent_id
        +String status 'OK' | 'ERROR'
        +Number score
        +String[] errors
    }

    class Env {
        +any DB // D1Database
        +String BOT_TOKEN
        +String CASHIER_BOT_TOKEN
        +String JWT_SECRET
        +String ADMIN_PASSWORD
        // ... other env vars
    }

    CacheEntry --> Fire22CacheInterface : used by
    RequestWithServices --> Fire22Cache : includes
    RequestWithServices --> Fire22ApiService : includes
    ApiResponse --> HealthResponse : inherited by
    ApiResponse --> SystemHealthResponse : inherited by
    SystemHealthResponse --> HealthCheck : contains
    SystemHealthResponse --> HealthSummary : contains
    Fire22CacheInterface --> CacheStats : returns
    Agent --> CommissionRates : has
    Agent --> AgentStatus : has
```

**Key Responsibilities:**

- **Type Safety:** Provides strong typing for data structures, API responses,
  and environment variables, catching errors at compile time.
- **Code Reusability:** Centralizes common types so they can be imported and
  used across different modules.
- **Documentation:** Type definitions serve as a form of documentation, clearly
  outlining the shape of data expected by functions and returned by APIs.
- **Consistency:** Ensures that different parts of the application use the same
  type for the same concept (e.g., `ApiResponse`).

**Usage Example:**

```typescript
import { ApiResponse, Agent, Env } from './types';

interface PlayerData {
  id: string;
  name: string;
}

async function fetchPlayer(
  playerId: string,
  env: Env
): Promise<ApiResponse<PlayerData>> {
  // ... implementation
  return {
    success: true,
    data: { id: playerId, name: 'John Doe' },
    timestamp: new Date().toISOString(),
  };
}

function processAgent(agent: Agent) {
  if (agent.status.isActive) {
    console.log(`Processing active agent: ${agent.agent_id}`);
  }
}
```

---

## Inter-Component Relationships

This diagram illustrates how the major components interact with each other.

```mermaid
graph TD
    subgraph "User Interface"
        UI[Web Dashboard / HTML Files]
        TG[Telegram Bot]
    end

    subgraph "API Layer"
        FAPI[Fire22ApiClient]
        AUTH[EnhancedJWTAuthService]
    end

    subgraph "Business Logic"
        BM[BalanceManager]
        BMS[BusinessManagementSystem]
        P2Q[P2PQueueAPIEnhanced]
        LCMS[LiveCasinoManagementSystem]
        SBMS[SportsBettingManagementSystem]
    end

    subgraph "Configuration & Types"
        CONF[AppConfig]
        CONST[Constants]
        TYPES[Global Types]
    end

    subgraph "Data Persistence"
        DB[(Database D1/SQLite)]
        CACHE[(Cache)]
    end

    UI --> FAPI
    UI --> AUTH
    TG --> BMS
    TG --> LCMS
    TG --> SBMS
    TG --> BM

    FAPI --> CONF
    AUTH --> CONF
    BM --> CONF
    BMS --> CONF
    P2Q --> CONF

    FAPI --> TYPES
    AUTH --> TYPES
    BM --> TYPES
    BMS --> TYPES
    P2Q --> TYPES
    LCMS --> TYPES
    SBMS --> TYPES

    BM --> DB
    BMS --> DB
    P2Q --> DB
    LCMS --> DB
    SBMS --> DB
    AUTH --> DB

    BM --> CACHE
    FAPI --> CACHE
    P2Q --> CACHE

    BMS --> CONST
    P2Q --> CONST
    UI --> CONST

    style UI fill:#f9f,stroke:#333,stroke-width:2px
    style TG fill:#f9f,stroke:#333,stroke-width:2px
    style FAPI fill:#e6f7ff,stroke:#333,stroke-width:1px
    style AUTH fill:#e6f7ff,stroke:#333,stroke-width:1px
    style BM fill:#e6f7ff,stroke:#333,stroke-width:1px
    style BMS fill:#e6f7ff,stroke:#333,stroke-width:1px
    style P2Q fill:#e6f7ff,stroke:#333,stroke-width:1px
    style LCMS fill:#e6f7ff,stroke:#333,stroke-width:1px
    style SBMS fill:#e6f7ff,stroke:#333,stroke-width:1px
    style CONF fill:#ffe6e6,stroke:#333,stroke-width:1px
    style CONST fill:#ffe6e6,stroke:#333,stroke-width:1px
    style TYPES fill:#ffe6e6,stroke:#333,stroke-width:1px
    style DB fill:#e6ffe6,stroke:#333,stroke-width:1px
    style CACHE fill:#e6ffe6,stroke:#333,stroke-width:1px
```

**Key Interactions:**

- **UI/API Layer:** The Web Dashboard and Telegram Bot initiate requests to the
  API layer (`Fire22ApiClient`, `EnhancedJWTAuthService`).
- **API/Business Logic:** The API layer calls upon the business logic components
  (`BalanceManager`, `BusinessManagementSystem`, etc.) to perform core
  operations.
- **Configuration:** All components rely on `AppConfig` for their settings and
  `Global Types` for type safety. `Constants` are used for standardized values.
- **Data Persistence:** Business logic components interact with the database for
  persistent storage and the cache for performance optimization.
- **Telegram Integration:** The `Fire22TelegramBot` acts as an alternative UI,
  directly interacting with several business logic systems to provide
  information and receive commands.

---

## Data Flow Diagrams

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Web UI
    participant AUTH as EnhancedJWTAuthService
    participant DB as Database
    participant CONF as AppConfig

    User->>UI: Enters Credentials
    UI->>AUTH: POST /auth/login (credentials)
    AUTH->>CONF: Get JWT Secret
    CONF-->>AUTH: jwtSecret
    AUTH->>DB: Find User by Username
    DB-->>AUTH: User Record
    alt Valid Credentials
        AUTH->>AUTH: Verify Password
        AUTH->>AUTH: Generate JWT
        AUTH->>DB: Update Last Login & Audit Log
        AUTH-->>UI: 200 OK {token, user}
        UI-->>User: Login Successful
    else Invalid Credentials
        AUTH->>DB: Log Failed Attempt
        AUTH-->>UI: 401 Unauthorized
        UI-->>User: Login Failed
    end
```

### 2. Placing a Wager (via P2P Queue)

```mermaid
sequenceDiagram
    actor User
    participant UI as Web UI
    participant FAPI as Fire22ApiClient
    participant P2Q as P2PQueueAPIEnhanced
    participant BM as BalanceManager
    participant TG as TelegramBot
    participant DB as Database

    User->>UI: Places Wager
    UI->>FAPI: POST /wagers (wagerData)
    FAPI->>P2Q: addWithdrawalToQueue()
    P2Q->>BM: getPlayerBalance()
    BM->>DB: Query Balance
    DB-->>BM: PlayerBalance
    BM-->>P2Q: PlayerBalance
    alt Sufficient Funds
        P2Q->>P2Q: Apply Optimization Patterns
        P2Q->>DB: Store Queue Item & Metadata
        P2Q->>TG: notifyTelegram('withdrawal_added')
        TG-->>User: Telegram Notification
        P2Q->>P2Q: processMatching()
        alt Match Found
            P2Q->>DB: Update Queue Items (Matched)
            P2Q->>BM: updatePlayerBalance (Debit)
            BM->>DB: Update Balance & Record Transaction
            P2Q->>TG: notifyTelegram('wager_matched')
            TG-->>User: Telegram Notification
        else No Match
            P2Q->>DB: Update Queue Item (Pending)
        end
        P2Q-->>FAPI: Success {queueItemId}
        FAPI-->>UI: 200 OK
        UI-->>User: Wager Placed
    else Insufficient Funds
        P2Q-->>FAPI: Error "Insufficient Funds"
        FAPI-->>UI: 400 Bad Request
        UI-->>User: Error Message
    end
```

### 3. Commission Calculation (Monthly)

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Admin Dashboard
    participant BMS as BusinessManagementSystem
    participant DB as Database
    participant TG as TelegramBot

    Admin->>UI: Request Monthly Commission Report
    UI->>BMS: generateCommissionReport('monthly')
    BMS->>DB: Get All Agents
    DB-->>BMS: Agent List
    loop For Each Agent
        BMS->>DB: Get Agent's Handle, Volume, etc.
        DB-->>BMS: Agent Performance Data
        BMS->>BMS: calculateCommission()
        BMS->>DB: Store Commission Result
    end
    BMS->>DB: Get All Commission Results for Period
    DB-->>BMS: CommissionReport[]
    BMS-->>UI: CommissionReport[]
    UI-->>Admin: Display Report

    alt Notify Agents
        Admin->>UI: Click "Notify Agents"
        UI->>BMS: getAgentsWithCommission()
        BMS->>DB: Get Agents with Positive Commission
        DB-->>BMS: Agent List
        loop For Each Agent
            BMS->>TG: sendNotificationByUsername()
            TG-->>Agent: Telegram Notification
        end
    end
```

This expansion plan provides a comprehensive overview of the
`dashboard-worker/src` directory, detailing the structure, responsibilities, and
interactions of its key components. The Mermaid diagrams offer a visual
representation that can aid in understanding the architecture and planning
future developments.
