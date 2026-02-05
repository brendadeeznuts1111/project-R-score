# 🏗️ Fire22 Workspace Architecture Visuals

## 📊 Overall System Architecture

```mermaid
graph TB
    subgraph "Fire22 Workspace Ecosystem"
        PS[📊 Pattern System<br/>69.5KB]
        AC[🔌 API Client<br/>15.4KB]
        CD[🎯 Core Dashboard<br/>187.1KB]
        SB[🎲 Sports Betting<br/>28.1KB]
        TI[📱 Telegram Integration<br/>64.2KB]
        BS[🔧 Build System<br/>Node.js]
    end

    subgraph "External Systems"
        F22[Fire22 API]
        TG[Telegram Bot API]
        CF[Cloudflare Workers]
        D1[D1 Database]
        KV[KV Storage]
        R2[R2 Storage]
    end

    PS --> CD
    AC --> CD
    AC --> SB
    AC --> TI
    CD --> SB
    CD --> TI

    AC <--> F22
    TI <--> TG
    CD --> CF
    SB --> CF
    TI --> CF
    AC --> D1
    CD --> KV
    CD --> R2

    style PS fill:#e1f5fe
    style AC fill:#f3e5f5
    style CD fill:#fff3e0
    style SB fill:#e8f5e8
    style TI fill:#fff8e1
    style BS fill:#fce4ec
```

---

## 1. 📊 Pattern System Workspace (`@fire22/pattern-system`)

### 🎯 Purpose & Responsibilities

- **Core Function**: Advanced pattern weaver system with streaming capabilities
- **Primary Role**: Provides reusable patterns for file processing, streaming,
  security, and automation
- **Architecture Pattern**: Foundation layer - zero dependencies

### 📦 Properties & Configuration

```yaml
Name: "@fire22/pattern-system"
Size Target: 800KB (Actual: 69.5KB ✅)
Compression: 64.6%
Target Platform: Cloudflare Workers
Memory Limit: 256MB
CPU Time Limit: 50ms
Dependencies: None (Foundation layer)
```

### 🔄 Data Flow Architecture

```mermaid
graph LR
    subgraph "Pattern System Core"
        PR[Pattern Registry]
        PW[Pattern Weaver]
        PC[Pattern Connector]
        SW[Shell Weaver]
        PU[Pattern Utils]
    end

    subgraph "Pattern Categories"
        F[📂 File Patterns]
        S[🐚 Shell Patterns]
        T[📊 Table Patterns]
        SC[🔐 Security Patterns]
        ST[🌊 Stream Patterns]
    end

    subgraph "Outputs"
        CD[Core Dashboard]
        API[API Client]
        BUILD[Build Tools]
    end

    PR --> PW
    PW --> PC
    PC --> SW
    PW --> F
    PW --> S
    PW --> T
    PW --> SC
    PW --> ST

    F --> CD
    S --> BUILD
    T --> CD
    SC --> API
    ST --> CD

    style PR fill:#e3f2fd
    style PW fill:#f1f8e9
    style PC fill:#fff3e0
```

### 🏷️ Core Types & Interfaces

```typescript
interface PatternWeaver {
  patterns: Map<string, PatternHandler>;
  registry: PatternRegistry;
  applyPattern<T>(pattern: string, context: T): Promise<PatternResult<T>>;
}

interface PatternRegistry {
  patterns: Record<string, string>;
  connections: Map<string, string[]>;
  getPatternsForContext(context: string): string[];
}

type PatternCategories =
  | 'LOADER'
  | 'STYLER'
  | 'TABULAR'
  | 'SECURE'
  | 'TIMING'
  | 'BUILDER'
  | 'SHELL'
  | 'STREAM'
  | 'FILESYSTEM'
  | 'UTILITIES';
```

---

## 2. 🔌 API Client Workspace (`@fire22/api-client`)

### 🎯 Purpose & Responsibilities

- **Core Function**: Fire22 API integration and data management
- **Primary Role**: Handles all external API communication, data transformation,
  and caching
- **Architecture Pattern**: Service layer - depends on core dashboard

### 📦 Properties & Configuration

```yaml
Name: "@fire22/api-client"
Size Target: 400KB (Actual: 15.4KB ✅)
Compression: 70.0%
Target Platform: Cloudflare Workers
Memory Limit: 128MB
CPU Time Limit: 30ms
Dependencies: ["@fire22/core-dashboard"]
Bindings: [D1: fire22_db, KV: api_cache, SECRETS: fire22_api_key]
```

### 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "API Client Layer"
        FC[Fire22 Config]
        AC[API Client]
        RH[Request Handler]
        RL[Rate Limiter]
        WV[Webhook Verifier]
    end

    subgraph "Data Models"
        AG[Agent Model]
        US[User Model]
        TX[Transaction Model]
        WG[Wager Model]
        RP[Report Model]
    end

    subgraph "External APIs"
        F22[Fire22 API]
        DB[(Fire22 DB)]
    end

    subgraph "Storage & Cache"
        D1[(D1 Database)]
        KV[(KV Cache)]
    end

    FC --> AC
    AC --> RH
    RH --> RL
    RH --> WV
    AC --> AG
    AC --> US
    AC --> TX
    AC --> WG
    AC --> RP

    RH <--> F22
    RH <--> DB
    AC --> D1
    AC --> KV

    style AC fill:#e8eaf6
    style F22 fill:#ffecb3
    style D1 fill:#e0f2f1
    style KV fill:#fce4ec
```

### 🏷️ Core Types & Interfaces

```typescript
interface Fire22Config {
  apiUrl: string;
  token: string;
  webhookSecret: string;
  rateLimit: { maxRequests: number; windowMs: number };
  timeout: number;
}

interface Fire22Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  balance: number;
  currency: string;
  commission: number;
  createdAt: string;
  updatedAt: string;
}

interface Fire22APIClient {
  authenticate(): Promise<AuthResult>;
  getAgent(id: string): Promise<Fire22Agent>;
  getLiveWagers(agentId: string): Promise<Fire22Wager[]>;
  getWeeklyFigures(agentId: string): Promise<WeeklyReport>;
  processWebhook(payload: unknown): Promise<WebhookResult>;
}
```

---

## 3. 🎯 Core Dashboard Workspace (`@fire22/core-dashboard`)

### 🎯 Purpose & Responsibilities

- **Core Function**: Main dashboard functionality and UI
- **Primary Role**: Central orchestrator, UI rendering, and business logic
  coordination
- **Architecture Pattern**: Application layer - orchestrates pattern system and
  API client

### 📦 Properties & Configuration

```yaml
Name: "@fire22/core-dashboard"
Size Target: 500KB (Actual: 187.1KB ✅)
Compression: 64.2%
Target Platform: Cloudflare Workers
Memory Limit: 128MB
CPU Time Limit: 30ms
Dependencies: ["@fire22/pattern-system", "@fire22/api-client"]
Bindings: [D1: dashboard_db, KV: config_cache, R2: assets_bucket]
```

### 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Core Dashboard Layer"
        UI[Dashboard UI]
        RC[Request Controller]
        BL[Business Logic]
        DM[Data Manager]
        CF[Config Manager]
    end

    subgraph "Dependencies"
        PS[Pattern System]
        AC[API Client]
    end

    subgraph "UI Components"
        KPI[KPI Dashboard]
        TAB[Data Tables]
        CHT[Charts & Graphs]
        ALT[Alerts & Notifications]
    end

    subgraph "Storage"
        D1[(Dashboard DB)]
        KV[(Config Cache)]
        R2[(Assets)]
    end

    UI --> RC
    RC --> BL
    BL --> DM
    DM --> CF
    BL --> PS
    BL --> AC

    UI --> KPI
    UI --> TAB
    UI --> CHT
    UI --> ALT

    DM --> D1
    CF --> KV
    UI --> R2

    style UI fill:#f3e5f5
    style BL fill:#e8f5e8
    style PS fill:#e1f5fe
    style AC fill:#fff3e0
```

### 🏷️ Core Types & Interfaces

```typescript
interface DashboardConfig {
  theme: 'light' | 'dark' | 'fire22';
  refreshInterval: number;
  enableRealTime: boolean;
  defaultView: 'overview' | 'agents' | 'reports';
}

interface DashboardState {
  currentUser: User | null;
  selectedAgent: string | null;
  timeRange: TimeRange;
  filters: DashboardFilters;
  realTimeEnabled: boolean;
}

interface KPIData {
  totalVolume: number;
  activeUsers: number;
  pendingWagers: number;
  todaysRevenue: number;
  conversionRate: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}
```

---

## 4. 🎲 Sports Betting Workspace (`@fire22/sports-betting`)

### 🎯 Purpose & Responsibilities

- **Core Function**: Sports betting and live casino management
- **Primary Role**: Handles betting logic, casino games, and business rule
  enforcement
- **Architecture Pattern**: Domain layer - specialized business logic

### 📦 Properties & Configuration

```yaml
Name: "@fire22/sports-betting"
Size Target: 600KB (Actual: 28.1KB ✅)
Compression: 70.0%
Target Platform: Cloudflare Workers
Memory Limit: 256MB
CPU Time Limit: 30ms
Dependencies: ["@fire22/api-client", "@fire22/core-dashboard"]
Bindings: [D1: betting_db, KV: betting_cache, QUEUE: betting_events]
```

### 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Sports Betting Core"
        SBM[Sports Betting Manager]
        LCM[Live Casino Manager]
        BM[Business Manager]
        RM[Risk Manager]
        OM[Odds Manager]
    end

    subgraph "Game Types"
        SPT[Sports Events]
        CSN[Casino Games]
        LIV[Live Betting]
        FUT[Futures]
    end

    subgraph "Business Logic"
        BR[Betting Rules]
        CR[Commission Rules]
        LM[Limit Management]
        RK[Risk Assessment]
    end

    subgraph "Storage & Events"
        BD[(Betting DB)]
        BC[(Betting Cache)]
        EQ[(Event Queue)]
    end

    SBM --> SPT
    SBM --> LIV
    SBM --> FUT
    LCM --> CSN
    BM --> BR
    BM --> CR
    BM --> LM
    RM --> RK

    SBM --> BD
    LCM --> BC
    RM --> EQ

    style SBM fill:#e8f5e8
    style LCM fill:#fff3e0
    style BM fill:#f3e5f5
    style RM fill:#ffebee
```

### 🏷️ Core Types & Interfaces

```typescript
interface SportsBettingManager {
  placeBet(bet: BetRequest): Promise<BetResult>;
  getLiveOdds(eventId: string): Promise<Odds>;
  calculatePayout(bet: Bet, outcome: Outcome): number;
  validateBet(bet: BetRequest): ValidationResult;
}

interface LiveCasinoManager {
  joinTable(tableId: string, userId: string): Promise<TableJoinResult>;
  placeCasinoBet(bet: CasinoBetRequest): Promise<CasinoBetResult>;
  getTableStatus(tableId: string): Promise<TableStatus>;
}

interface BetRequest {
  userId: string;
  agentId: string;
  eventId: string;
  betType: 'straight' | 'parlay' | 'teaser' | 'futures';
  amount: number;
  odds: number;
  selections: BetSelection[];
}
```

---

## 5. 📱 Telegram Integration Workspace (`@fire22/telegram-integration`)

### 🎯 Purpose & Responsibilities

- **Core Function**: Telegram bot and P2P queue system
- **Primary Role**: User communication, notifications, and peer-to-peer
  transaction queuing
- **Architecture Pattern**: Integration layer - handles external messaging

### 📦 Properties & Configuration

```yaml
Name: "@fire22/telegram-integration"
Size Target: 350KB (Actual: 64.2KB ✅)
Compression: 64.9%
Target Platform: Cloudflare Workers
Memory Limit: 128MB
CPU Time Limit: 30ms
Dependencies: ["@fire22/api-client"]
Bindings: [D1: telegram_db, KV: telegram_cache, QUEUE: p2p_messages, SECRETS: telegram_bot_token]
```

### 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Telegram Integration"
        TB[Telegram Bot]
        CB[Command Handler]
        MQ[Message Queue]
        P2P[P2P Queue System]
        NT[Notification Service]
    end

    subgraph "Bot Features"
        AC[Account Commands]
        BC[Betting Commands]
        RC[Report Commands]
        SC[Support Commands]
    end

    subgraph "P2P System"
        PQ[P2P Queue]
        MT[Match Engine]
        TX[Transaction Handler]
        ES[Event Stream]
    end

    subgraph "External & Storage"
        TG[Telegram API]
        TD[(Telegram DB)]
        TC[(Telegram Cache)]
        PM[(P2P Messages)]
    end

    TB --> CB
    CB --> MQ
    MQ --> P2P
    P2P --> NT

    CB --> AC
    CB --> BC
    CB --> RC
    CB --> SC

    P2P --> PQ
    PQ --> MT
    MT --> TX
    TX --> ES

    TB <--> TG
    MQ --> TD
    P2P --> TC
    PQ --> PM

    style TB fill:#e3f2fd
    style P2P fill:#f1f8e9
    style TG fill:#ffecb3
```

### 🏷️ Core Types & Interfaces

```typescript
interface TelegramBot {
  sendMessage(chatId: string, message: string): Promise<void>;
  sendKeyboard(
    chatId: string,
    message: string,
    keyboard: InlineKeyboard
  ): Promise<void>;
  handleCommand(
    command: string,
    userId: string,
    params: string[]
  ): Promise<void>;
  processWebhook(update: TelegramUpdate): Promise<void>;
}

interface P2PQueueSystem {
  addOrder(order: P2POrder): Promise<P2POrderResult>;
  matchOrders(buyOrder: P2POrder, sellOrder: P2POrder): Promise<P2PMatch>;
  getOrderBook(currency: string): Promise<P2POrderBook>;
  processTransaction(transaction: P2PTransaction): Promise<TransactionResult>;
}

interface P2POrder {
  id: string;
  userId: string;
  type: 'buy' | 'sell';
  currency: string;
  amount: number;
  rate: number;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  createdAt: string;
}
```

---

## 6. 🔧 Build System Workspace (`@fire22/build-system`)

### 🎯 Purpose & Responsibilities

- **Core Function**: Build automation, benchmarking, and tooling
- **Primary Role**: Development tools, CI/CD, performance monitoring, and
  deployment automation
- **Architecture Pattern**: Infrastructure layer - Node.js tooling

### 📦 Properties & Configuration

```yaml
Name: '@fire22/build-system'
Target Platform: Node.js (Not Cloudflare Workers)
Dependencies: ['mitata', '@types/bun', 'typescript']
Includes: ['scripts/', 'bench/', 'build.ts', 'tsconfig.json']
Purpose: Development & Build Tools Only
```

### 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Build System Core"
        WO[Workspace Orchestrator]
        SB[SMOL Builder]
        DR[Dependency Resolver]
        PA[Performance Analyzer]
        MP[Multi-Publisher]
    end

    subgraph "Build Tools"
        BC[Build Compiler]
        TS[Type Checker]
        LT[Linter]
        TT[Test Runner]
        BM[Benchmarker]
    end

    subgraph "Publishing"
        CF[Cloudflare Registry]
        NP[NPM Registry]
        PR[Private Registry]
        VR[Version Manager]
    end

    subgraph "Monitoring"
        PM[Performance Monitor]
        HA[Health Analyzer]
        BR[Build Reporter]
    end

    WO --> SB
    SB --> DR
    DR --> PA
    PA --> MP

    SB --> BC
    BC --> TS
    TS --> LT
    LT --> TT
    TT --> BM

    MP --> CF
    MP --> NP
    MP --> PR
    MP --> VR

    PA --> PM
    PM --> HA
    HA --> BR

    style WO fill:#fce4ec
    style SB fill:#e8f5e8
    style CF fill:#fff3e0
```

---

## 🔗 Workspace Dependency Graph

```mermaid
graph TB
    subgraph "Dependency Hierarchy"
        PS[Pattern System<br/>Foundation Layer]
        AC[API Client<br/>Service Layer]
        CD[Core Dashboard<br/>Application Layer]
        SB[Sports Betting<br/>Domain Layer]
        TI[Telegram Integration<br/>Integration Layer]
        BS[Build System<br/>Infrastructure Layer]
    end

    PS --> CD
    PS --> AC
    AC --> CD
    AC --> SB
    AC --> TI
    CD --> SB
    CD --> TI

    BS -.-> PS
    BS -.-> AC
    BS -.-> CD
    BS -.-> SB
    BS -.-> TI

    style PS fill:#e1f5fe
    style AC fill:#f3e5f5
    style CD fill:#fff3e0
    style SB fill:#e8f5e8
    style TI fill:#fff8e1
    style BS fill:#fce4ec
```

## 📊 Size & Performance Comparison

| Workspace               | Target Size | Actual Size    | Compression | Performance    |
| ----------------------- | ----------- | -------------- | ----------- | -------------- |
| 📊 Pattern System       | 800KB       | **69.5KB** ✅  | 64.6%       | Foundation     |
| 🔌 API Client           | 400KB       | **15.4KB** ✅  | 70.0%       | Service        |
| 🎯 Core Dashboard       | 500KB       | **187.1KB** ✅ | 64.2%       | Application    |
| 🎲 Sports Betting       | 600KB       | **28.1KB** ✅  | 70.0%       | Domain         |
| 📱 Telegram Integration | 350KB       | **64.2KB** ✅  | 64.9%       | Integration    |
| 🔧 Build System         | N/A         | Node.js        | N/A         | Infrastructure |

**Total Optimized Size**: 364.2KB (vs 57MB monolith = **99.4% reduction**)

---

## 🎯 Key Architectural Principles

### 1. **Layered Architecture**

- **Foundation**: Pattern System (no dependencies)
- **Service**: API Client (depends on core)
- **Application**: Core Dashboard (orchestrates everything)
- **Domain**: Sports Betting (specialized business logic)
- **Integration**: Telegram (external communication)
- **Infrastructure**: Build System (development tools)

### 2. **Dependency Flow**

- Bottom-up dependency resolution
- No circular dependencies
- Clear separation of concerns
- Optimal build order calculated

### 3. **Size Optimization**

- All workspaces under target size
- 99.4% size reduction achieved
- High compression ratios (64-70%)
- Tree-shaking and dead code elimination

### 4. **Cloudflare Workers Optimized**

- Memory limits: 128-256MB per workspace
- CPU time limits: 30-50ms per request
- Edge-optimized deployment
- D1, KV, R2, and Queue bindings

This architecture provides a scalable, maintainable, and highly optimized
workspace system for the Fire22 platform.
