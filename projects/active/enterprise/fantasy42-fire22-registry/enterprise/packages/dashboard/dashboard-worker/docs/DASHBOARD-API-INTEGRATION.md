# 🔥 Fire22 Dashboard API Integration Guide

## Overview

Complete mapping of dashboard menu components to API endpoints, workspace
packages, and system integrations.

## Dashboard Menu Structure & API Mapping

### 🏠 Core Navigation

#### Dashboard (`data-action="get-dashboard"`)

- **API Endpoint**: `GET /api/dashboard`
- **Controller**: `src/api/controllers/admin.controller.ts`
- **Workspace**: `@fire22-core-dashboard`
- **Features**: Main overview with KPIs, real-time metrics
- **Telegram Command**: `/admin` (admin users)

#### Messaging (`data-action="get-messaging"`)

- **API Endpoint**: `GET /api/messaging`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Integration**: Telegram bot notifications
- **Features**: Internal messaging system
- **Telegram Command**: N/A (admin panel)

### 📊 Financial Operations

#### Weekly Figures (`data-action="get-weekly-figure"`)

- **API Endpoint**: `GET /api/manager/getWeeklyFigureByAgent`
- **Controller**: `src/api/controllers/manager.controller.ts`
- **Database**: Agent performance metrics
- **Features**: Agent performance reports, commission tracking
- **Telegram Command**: `/stats` (admin users)

#### Pending (`data-action="get-pending"`)

- **API Endpoint**: `GET /api/manager/getLiveWagers`
- **Controller**: `src/api/controllers/manager.controller.ts`
- **Features**: Pending wagers, transaction queue
- **Integration**: P2P queue system
- **Telegram Command**: `/wagers`

#### Cashier (`data-action="get-transactions"`)

- **API Endpoint**: `GET /api/transactions`
- **Controller**: `src/api/controllers/financial.controller.ts`
- **Workspace**: `@fire22-telegram-integration` (P2P queue)
- **Features**: Transaction processing, balance management
- **Telegram Command**: `/balance`

### 👥 User Management

#### Customer Admin (`data-action="get-customer-admin"`)

- **API Endpoint**: `GET /api/customers`
- **Controller**: `src/api/controllers/customer.controller.ts`
- **Database**: Players table with Fire22 integration
- **Features**: Customer management, balance tracking
- **Telegram Command**: `/profile`, `/register`

#### Agent Admin (`data-action="get-agent-management"`)

- **API Endpoint**: `GET /api/agents`
- **Controller**: `src/api/agents.ts`
- **Features**: Agent hierarchy, commission rates, permissions
- **Database**: Agents, agent_summary, agent_permissions tables
- **Telegram Commands**: `/commission`, `/affiliate`, `/link`

#### Add Customer (`data-action="add-account"`)

- **API Endpoint**: `POST /api/customers`
- **Controller**: `src/api/controllers/customer.controller.ts`
- **Features**: New customer registration
- **Telegram Command**: `/register`

### 🎮 Gaming Operations

#### Game Admin (`data-action="get-game-admin"`)

- **API Endpoint**: `GET /api/games`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Workspace**: `@fire22-sports-betting`
- **Features**: Game configuration, sports betting management
- **Telegram Commands**: `/casino`, `/sports`

### 📈 Reporting & Analytics

#### Agent Performance (`data-action="get-agent-performance"`)

- **API Endpoint**: `GET /api/agents/performance`
- **Controller**: `src/api/agents.ts`
- **Features**: Commission calculations, performance metrics
- **Telegram Command**: `/commission`

#### Analysis (`data-action="get-analysis"`)

- **API Endpoint**: `GET /api/analytics`
- **Controller**: `src/api/controllers/admin.controller.ts`
- **Features**: Data analytics, business intelligence
- **Integration**: Business management system

#### IP Tracker (`data-action="get-ip-tracker"`)

- **API Endpoint**: `GET /api/security/ip-tracker`
- **Controller**: `src/api/controllers/admin.controller.ts`
- **Features**: Security monitoring, location tracking
- **Workspace**: `@fire22-security-registry`

#### Transaction History (`data-action="get-transaction-history"`)

- **API Endpoint**: `GET /api/transactions/history`
- **Controller**: `src/api/controllers/financial.controller.ts`
- **Features**: Financial audit trails, transaction tracking
- **Telegram Command**: `/wagers` (user transactions)

#### Collections (`data-action="get-settled-figure"`)

- **API Endpoint**: `GET /api/financial/collections`
- **Controller**: `src/api/controllers/financial.controller.ts`
- **Features**: Settlement tracking, collection reports

### 🛠️ Tools & Utilities

#### Bet Ticker (`data-action="get-bet-ticker"`)

- **API Endpoint**: `GET /api/betting/ticker`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Features**: Live betting activity feed
- **Integration**: Sports betting system

#### Ticketwriter (`data-action="get-lines"` `data-type="place-bets"`)

- **API Endpoint**: `POST /api/betting/place`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Features**: Bet placement interface
- **Workspace**: `@fire22-sports-betting`

#### Sportsbook Lines (`data-action="get-lines"` `data-type="sportbook"`)

- **API Endpoint**: `GET /api/sportsbook/lines`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Features**: Betting line management
- **Telegram Commands**: `/sports-events`, `/sports-rates`

#### Scores (`data-action="get-scores"`)

- **API Endpoint**: `GET /api/sportsbook/scores`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Features**: Live score tracking
- **Integration**: Sports betting system

### 💰 Financial Management

#### Billing (`data-action="get-agent-billing"`)

- **API Endpoint**: `GET /api/billing`
- **Controller**: `src/api/controllers/financial.controller.ts`
- **Features**: Agent commission billing, payout management
- **Telegram Command**: `/commission`

#### 3rd Party Limits (`data-action="live-betting-new"`)

- **API Endpoint**: `GET /api/betting/limits`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Features**: External betting limits management

### ⚙️ System Management

#### Rules (`data-action="get-rules"`)

- **API Endpoint**: `GET /api/system/rules`
- **Controller**: `src/api/controllers/admin.controller.ts`
- **Features**: Business rules, system configuration

#### Contact (`data-action="get-contact"`)

- **API Endpoint**: `GET /api/system/contact`
- **Controller**: `src/api/controllers/other.controller.ts`
- **Features**: Support contact management

#### Settings (`onclick="$('.modal#update-settings').modal('show')"`)

- **API Endpoint**: `PUT /api/user/settings`
- **Controller**: `src/api/controllers/auth.controller.ts`
- **Features**: User preferences, system configuration
- **Telegram Command**: `/settings`

#### Logout (`data-action="sign-out"`)

- **API Endpoint**: `POST /api/auth/logout`
- **Controller**: `src/api/controllers/auth.controller.ts`
- **Features**: Session termination, security cleanup

## Workspace Package Integration

### Core Packages

#### @fire22-api-client

- **Purpose**: Fire22 API integration client
- **Integration**: All external Fire22 API calls
- **Files**:
  - `src/fire22-api.ts` - Main API client
  - `src/fire22-config.ts` - Configuration management

#### @fire22-api-consolidated

- **Purpose**: Consolidated API controller system
- **Integration**: Main dashboard API endpoints
- **Files**: Mirror structure of `src/api/` with compiled outputs

#### @fire22-core-dashboard

- **Purpose**: Core dashboard functionality
- **Integration**: Main dashboard interface
- **Files**:
  - `src/dashboard.html` - Main dashboard template
  - `src/worker.ts` - Cloudflare Worker integration

#### @fire22-sports-betting

- **Purpose**: Sports betting and casino management
- **Integration**: Gaming operations, VIP management
- **Files**:
  - `src/sports-betting-management.ts`
  - `src/live-casino-management.ts`
  - `src/business-management.ts`

#### @fire22-telegram-integration

- **Purpose**: Telegram bot and P2P queue system
- **Integration**: Mobile dashboard access, notifications
- **Files**:
  - `src/telegram-bot.ts` - Main bot implementation
  - `src/p2p-queue-api.ts` - Transaction matching
  - `src/queue-system.ts` - Queue management

#### @fire22-security-registry

- **Purpose**: Security scanning and registry management
- **Integration**: Security monitoring, threat detection
- **Files**:
  - `src/scanner/SecurityScanner.ts`
  - `src/registry/Fire22Registry.ts`

## Database Schema Integration

### Core Tables

#### Agents System

```sql
-- Agent hierarchy and management
agents (agent_id, agent_name, master_agent_id, status, commission_rates)
agent_summary (performance metrics, credit limits)
agent_permissions (granular access control)
agent_config_history (audit trail)
agent_performance (commission calculations)
```

#### Customer System

```sql
-- Customer management
players (customer_id, name, balance, telegram_username)
customer_transactions (transaction history)
customer_balances (real-time balance tracking)
```

#### Financial System

```sql
-- Commission and billing
commissions (agent commission records)
transactions (financial transaction log)
billing (agent billing records)
settlements (completed transactions)
```

### API Endpoint Patterns

#### RESTful Conventions

- `GET /api/resource` - List all
- `GET /api/resource/:id` - Get specific
- `POST /api/resource` - Create new
- `PUT /api/resource/:id` - Update existing
- `DELETE /api/resource/:id` - Remove

#### Fire22 Specific Endpoints

- `POST /api/manager/getLiveWagers` - Fire22 API format
- `POST /api/manager/getWeeklyFigureByAgent` - Fire22 API format
- `GET /api/fire22/customers` - External API integration
- `GET /api/debug/permissions-matrix` - Debug endpoints

## Security Integration

### Authentication Flow

1. **Dashboard Login** → `POST /api/auth/login`
2. **JWT Token** → Stored in session/localStorage
3. **API Requests** → Bearer token authentication
4. **Permission Check** → Agent hierarchy validation

### Rate Limiting

- **Middleware**: `src/api/middleware/rateLimit.middleware.ts`
- **Configuration**: Per-endpoint rate limits
- **Integration**: Cloudflare Workers rate limiting

### Security Scanning

- **Package**: `@fire22-security-registry`
- **Integration**: Real-time threat detection
- **Monitoring**: IP tracking, user behavior analysis

## Performance Optimization

### Caching Strategy

- **Database**: Query result caching
- **API**: Response caching with TTL
- **CDN**: Cloudflare edge caching
- **Real-time**: Server-Sent Events for live updates

### Load Balancing

- **Cloudflare**: Global load balancing
- **Workers**: Distributed processing
- **Database**: Connection pooling

## Monitoring & Analytics

### System Health

- **Endpoint**: `GET /health`
- **Integration**: Matrix health system
- **Alerts**: Telegram notifications for admins

### Performance Metrics

- **KPIs**: Dashboard performance indicators
- **Commission Tracking**: Real-time calculations
- **User Analytics**: Activity monitoring

## Development Workflow

### Testing Strategy

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full workflow testing
- **Performance Tests**: Load testing

### Deployment Process

1. **Development**: Local Bun environment
2. **Testing**: Automated test suites
3. **Staging**: Cloudflare Workers preview
4. **Production**: Cloudflare Workers deployment

## Troubleshooting Guide

### Common Issues

1. **API Connection Failures**: Check Fire22 API status
2. **Permission Errors**: Verify agent hierarchy
3. **Database Timeouts**: Check connection pool
4. **Telegram Bot Issues**: Verify webhook configuration

### Debug Endpoints

- `GET /api/debug/permissions-matrix` - Permission debugging
- `GET /api/health` - System health check
- `GET /api/debug/performance` - Performance metrics

## Next Steps

1. **Enhanced Documentation**: Complete API documentation with examples
2. **Integration Testing**: Comprehensive workflow testing
3. **Performance Optimization**: Query optimization and caching
4. **Security Hardening**: Enhanced authentication and monitoring
5. **Mobile Integration**: Enhanced Telegram bot features
