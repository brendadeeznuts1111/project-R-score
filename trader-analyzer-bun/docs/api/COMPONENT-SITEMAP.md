# [COMPONENT.SITEMAP.RG] Component, CSS & Layer Reference Sitemap

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-COMPONENT-SITEMAP@0.1.0;instance-id=COMPONENT-SITEMAP-001;version=0.1.0}][PROPERTIES:{sitemap={value:"component-sitemap";@root:"ROOT-DOC";@chain:["BP-DOCS","BP-REFERENCE"];@version:"0.1.0"}}][CLASS:ComponentSitemap][#REF:v-0.1.0.BP.COMPONENT.SITEMAP.1.0.A.1.1.DOC.1.1]]`

## 1. Overview

**Code Reference**: `#REF:v-0.1.0.BP.COMPONENT.SITEMAP.1.0.A.1.1.DOC.1.1`

Comprehensive sitemap and reference for all components, CSS classes, and architectural layers in the NEXUS Trading Platform, organized using hierarchical 1.x.x.x numbering.

---

## 2. [CSS.CLASSES.RG] CSS Classes Reference

### 2.1. [CSS.LAYOUT.RG] Layout Classes

#### 2.1.1. [CSS.GRID.RG] Grid System
- **`.grid`** - Main grid container
  - `display: grid`
  - `grid-template-columns: repeat(auto-fit, minmax(350px, 1fr))`
  - `gap: 20px`
  - File: `dashboard/index.html:86`

- **`.architecture-grid`** - Architecture visualization grid
  - `display: grid`
  - `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`
  - `gap: 20px`
  - File: `dashboard/index.html:284`

#### 2.1.2. [CSS.CONTAINER.RG] Container Classes
- **`.header`** - Page header container
  - `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
  - `padding: 30px`
  - `border-radius: 12px`
  - File: `dashboard/index.html:46`

- **`.card`** - Card container component
  - `background: #1a1f3a`
  - `border-radius: 12px`
  - `padding: 25px`
  - `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3)`
  - File: `dashboard/index.html:93`

- **`.status-bar`** - Status bar container
  - `display: flex`
  - `gap: 15px`
  - `flex-wrap: wrap`
  - File: `dashboard/index.html:65`

### 2.2. [CSS.STATUS.RG] Status Classes

#### 2.2.1. [CSS.BADGES.RG] Status Badges
- **`.status-badge`** - Base status badge
  - `display: inline-block`
  - `padding: 6px 12px`
  - `border-radius: 20px`
  - File: `dashboard/index.html:124`

- **`.status-online`** - Online status
  - `background: #10b981`
  - `color: white`
  - File: `dashboard/index.html:133`

- **`.status-offline`** - Offline status
  - `background: #ef4444`
  - `color: white`
  - File: `dashboard/index.html:138`

- **`.status-warning`** - Warning status
  - `background: #f59e0b`
  - `color: white`
  - File: `dashboard/index.html:143`

- **`.status-unknown`** - Unknown status
  - `background: #6b7280`
  - `color: white`
  - File: `dashboard/index.html:148`

#### 2.2.2. [CSS.ITEMS.RG] Status Items
- **`.status-item`** - Status item container
  - `background: rgba(255, 255, 255, 0.1)`
  - `padding: 10px 20px`
  - `border-radius: 8px`
  - `backdrop-filter: blur(10px)`
  - File: `dashboard/index.html:72`

### 2.3. [CSS.ARCHITECTURE.RG] Architecture Visualization Classes

#### 2.3.1. [CSS.NODES.RG] Architecture Nodes
- **`.arch-node`** - Base architecture node
  - `background: #1a1f3a`
  - `border: 2px solid`
  - `border-radius: 8px`
  - `padding: 15px`
  - `font-family: 'Monaco', 'Menlo', 'Courier New', monospace`
  - File: `dashboard/index.html:291`

- **`.arch-node.class`** - Class node styling
  - `border-color: #00d4ff`
  - `border-width: 3px`
  - `background: linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)`
  - `box-shadow: 0 0 20px rgba(0, 212, 255, 0.3)`
  - File: `dashboard/index.html:307`

- **`.arch-node.interface`** - Interface node styling
  - `border-color: #00ff88`
  - `border-width: 3px`
  - `background: linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 255, 136, 0.05) 100%)`
  - `box-shadow: 0 0 20px rgba(0, 255, 136, 0.3)`
  - File: `dashboard/index.html:314`

- **`.arch-node.function`** - Function node styling
  - `border-color: #ff6b00`
  - `border-width: 3px`
  - `background: linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(255, 107, 0, 0.05) 100%)`
  - `box-shadow: 0 0 20px rgba(255, 107, 0, 0.3)`
  - File: `dashboard/index.html:321`

- **`.arch-node.property`** - Property node styling
  - `border-color: #ff00ff`
  - `border-width: 3px`
  - `background: linear-gradient(135deg, rgba(255, 0, 255, 0.15) 0%, rgba(255, 0, 255, 0.05) 100%)`
  - `box-shadow: 0 0 20px rgba(255, 0, 255, 0.3)`
  - File: `dashboard/index.html:328`

#### 2.3.2. [CSS.HEADERS.RG] Architecture Headers
- **`.arch-header`** - Architecture section header
  - File: `dashboard/index.html:335`

### 2.4. [CSS.NODE_TREE.RG] Node Tree Classes

#### 2.4.1. [CSS.NODE_ITEMS.RG] Node Items
- **`.node-tree`** - Node tree container
  - `font-family: 'Monaco', 'Menlo', 'Courier New', monospace`
  - `font-size: 0.9em`
  - `margin-left: 20px`
  - File: `dashboard/index.html` (inline styles)

- **`.node-item`** - Individual node item
  - `margin: 8px 0`
  - `padding: 10px`
  - `background: rgba(0, 212, 255, 0.05)`
  - `border-left: 3px solid #00d4ff`
  - `border-radius: 4px`
  - File: `dashboard/index.html` (inline styles)

- **`.node-item.has-tension`** - Node with tension
  - `border-left-color: #ff1744`
  - `background: rgba(255, 23, 68, 0.1)`
  - `box-shadow: 0 0 10px rgba(255, 23, 68, 0.3)`
  - File: `dashboard/index.html` (inline styles)

#### 2.4.2. [CSS.NODE_PROPERTIES.RG] Node Properties
- **`.node-header`** - Node header container
  - `display: flex`
  - `align-items: center`
  - `gap: 10px`
  - `margin-bottom: 8px`
  - File: `dashboard/index.html` (inline styles)

- **`.node-id`** - Node ID display
  - `color: #00d4ff`
  - `font-weight: 700`
  - `font-size: 1.05em`
  - File: `dashboard/index.html` (inline styles)

- **`.node-type`** - Node type badge
  - `color: #00ff88`
  - `font-size: 0.85em`
  - `padding: 2px 8px`
  - `background: rgba(0, 255, 136, 0.2)`
  - `border-radius: 4px`
  - File: `dashboard/index.html` (inline styles)

- **`.node-period`** - Node period display
  - `color: #ff6b00`
  - `font-weight: 600`
  - File: `dashboard/index.html` (inline styles)

- **`.node-properties`** - Properties container
  - `margin-top: 8px`
  - `padding-left: 15px`
  - `border-left: 2px solid rgba(255, 0, 255, 0.3)`
  - File: `dashboard/index.html` (inline styles)

- **`.node-prop`** - Individual property
  - `color: #ff00ff`
  - `font-size: 0.85em`
  - `margin: 4px 0`
  - File: `dashboard/index.html` (inline styles)

- **`.node-prop-name`** - Property name
  - `font-weight: 600`
  - File: `dashboard/index.html` (inline styles)

- **`.node-prop-value`** - Property value
  - `color: #4caf50`
  - `margin-left: 8px`
  - File: `dashboard/index.html` (inline styles)

- **`.node-children`** - Children container
  - `margin-left: 30px`
  - `margin-top: 10px`
  - `padding-left: 15px`
  - `border-left: 2px dashed rgba(0, 212, 255, 0.3)`
  - File: `dashboard/index.html` (inline styles)

#### 2.4.3. [CSS.TENSION.RG] Tension Badges
- **`.tension-badge`** - Tension badge base
  - `display: inline-block`
  - `padding: 4px 8px`
  - `border-radius: 12px`
  - `font-size: 0.75em`
  - `font-weight: 700`
  - `margin-left: 8px`
  - File: `dashboard/index.html` (inline styles)

- **`.tension-high`** - High severity tension
  - `background: #ff1744`
  - `color: #fff`
  - File: `dashboard/index.html` (inline styles)

- **`.tension-medium`** - Medium severity tension
  - `background: #ff6b00`
  - `color: #fff`
  - File: `dashboard/index.html` (inline styles)

- **`.tension-low`** - Low severity tension
  - `background: #ffeb3b`
  - `color: #000`
  - File: `dashboard/index.html` (inline styles)

### 2.5. [CSS.INFO.RG] Information Display Classes

#### 2.5.1. [CSS.ROWS.RG] Info Rows
- **`.info-row`** - Information row container
  - `display: flex`
  - `justify-content: space-between`
  - `padding: 12px 0`
  - `border-bottom: 1px solid rgba(255, 255, 255, 0.1)`
  - File: `dashboard/index.html:153`

- **`.info-label`** - Label text
  - `opacity: 0.7`
  - `font-size: 0.9em`
  - File: `dashboard/index.html:164`

- **`.info-value`** - Value text
  - `font-weight: 600`
  - `color: #667eea`
  - File: `dashboard/index.html:169`

#### 2.5.2. [CSS.LISTS.RG] List Classes
- **`.topic-list`** - Topic list container
  - `list-style: none`
  - `margin-top: 15px`
  - File: `dashboard/index.html:174`

- **`.topic-item`** - Topic item
  - `padding: 10px`
  - `background: rgba(255, 255, 255, 0.05)`
  - `border-radius: 6px`
  - `margin-bottom: 8px`
  - File: `dashboard/index.html:179`

- **`.topic-name`** - Topic name text
  - `font-weight: 500`
  - File: `dashboard/index.html:189`

- **`.topic-id`** - Topic ID text
  - `opacity: 0.6`
  - `font-size: 0.85em`
  - File: `dashboard/index.html:193`

### 2.6. [CSS.CONTROLS.RG] Control Classes

#### 2.6.1. [CSS.BUTTONS.RG] Button Classes
- **`.controls`** - Controls container
  - File: `dashboard/index.html:611`

- **`.secondary`** - Secondary button style
  - File: `dashboard/index.html:613`

### 2.7. [CSS.LOGS.RG] Log Display Classes

#### 2.7.1. [CSS.LOG_ENTRIES.RG] Log Entries
- **`.log-entry`** - Log entry container
  - `font-family: 'Monaco', 'Menlo', 'Courier New', monospace`
  - `font-size: 0.85em`
  - File: `dashboard/index.html:198`

### 2.8. [CSS.EMPTY.RG] Empty State Classes

#### 2.8.1. [CSS.EMPTY_STATE.RG] Empty State
- **`.empty-state`** - Empty state container
  - File: `dashboard/index.html:277`

---

## 3. [COMPONENTS.CLASSES.RG] Component Classes Reference

### 3.1. [COMPONENTS.TELEGRAM.RG] Telegram Integration Components

#### 3.1.1. [TELEGRAM.CLIENT.RG] Enhanced Telegram Client
- **Class**: `EnhancedTelegramClient`
- **File**: `src/telegram/client.ts`
- **Properties**:
  - `api: TelegramBotApi` - Base API client
  - `circuitBreaker: CircuitBreaker` - Circuit breaker instance
  - `rateLimiter: RateLimiter` - Rate limiter instance
  - `stats: TelegramClientStats` - Statistics tracker
  - `config: Required<TelegramClientConfig>` - Configuration
  - `requestQueue: Array<() => Promise<any>>` - Request queue
  - `processingQueue: boolean` - Queue processing flag
- **Methods**:
  - `sendMessage(message: TelegramMessage)` - Send message with retry
  - `sendMessageAsync(message: TelegramMessage)` - Async message sending
  - `processQueue()` - Process queued requests
  - `executeWithRetry<T>(fn: () => Promise<T>)` - Execute with retry logic
  - `updateStats(success: boolean, responseTime: number)` - Update statistics
  - `getStats(): TelegramClientStats` - Get current statistics
  - `resetStats(): void` - Reset statistics
  - `getApiClient(): TelegramBotApi` - Get base API client
  - `healthCheck()` - Health check method

#### 3.1.2. [TELEGRAM.MONITOR.RG] Telegram Integration Monitor
- **Class**: `TelegramIntegrationMonitor`
- **File**: `src/telegram/monitor.ts`
- **Properties**:
  - `client: EnhancedTelegramClient` - Enhanced client instance
  - `api: TelegramBotApi` - Base API instance
  - `chatId: string | null` - Chat ID
- **Methods**:
  - `getStatus(): Promise<IntegrationStatus>` - Get integration status
  - `quickHealthCheck(): Promise<boolean>` - Quick health check
  - `monitorStatus(intervalMs?: number): AsyncGenerator<IntegrationStatus>` - Monitor status stream

#### 3.1.3. [TELEGRAM.API.RG] Telegram Bot API
- **Class**: `TelegramBotApi`
- **File**: `src/api/telegram-ws.ts`
- **Properties**:
  - `botToken: string` - Bot token
  - `apiBase: string` - API base URL
- **Methods**:
  - `sendMessage(chatId, text, threadId?)` - Send message
  - `pinMessage(chatId, messageId, threadId?)` - Pin message
  - `unpinMessage(chatId, messageId, threadId?)` - Unpin message
  - `sendAndPin(chatId, text, threadId)` - Send and pin
  - `getForumTopics(chatId)` - Get forum topics
  - `createForumTopic(chatId, name, iconColor?, iconCustomEmojiId?)` - Create topic
  - `editForumTopic(chatId, messageThreadId, name?, iconCustomEmojiId?)` - Edit topic
  - `closeForumTopic(chatId, messageThreadId)` - Close topic
  - `reopenForumTopic(chatId, messageThreadId)` - Reopen topic
  - `deleteForumTopic(chatId, messageThreadId)` - Delete topic

#### 3.1.4. [TELEGRAM.RATE_LIMITER.RG] Rate Limiter
- **Class**: `RateLimiter`
- **File**: `src/telegram/client.ts`
- **Properties**:
  - `maxPerSecond: number` - Max requests per second
  - `maxPerMinute: number` - Max requests per minute
  - `requests: Array<number>` - Request timestamps
- **Methods**:
  - `canMakeRequest(): boolean` - Check if request allowed
  - `recordRequest(): void` - Record request timestamp

### 3.2. [COMPONENTS.RESEARCH.RG] Research Components

#### 3.2.1. [RESEARCH.TENSION.RG] Tension Detector
- **Class**: `SubMarketTensionDetector`
- **File**: `src/research/tension/tension-detector.ts`
- **Properties**:
  - `db: Database` - SQLite database
  - `monitoringInterval: Timer | null` - Monitoring interval timer
  - `THRESHOLDS: TensionThresholds` - Tension thresholds
- **Methods**:
  - `startMonitoring(intervalMs?: number)` - Start monitoring
  - `stopMonitoring()` - Stop monitoring
  - `getActiveTensions(eventId: string)` - Get active tensions
  - `resolveTension(tensionId: number)` - Resolve tension

#### 3.2.2. [RESEARCH.SITEMAP.RG] Node Sitemap Generator
- **Class**: `NodeSitemapGenerator`
- **File**: `src/research/sitemap.ts`
- **Properties**:
  - `db: Database` - SQLite database
- **Methods**:
  - `generateSitemap(eventId: string)` - Generate sitemap
  - `getNodeTree(eventId: string)` - Get node tree
  - `getAllChildren(nodeId: string, eventId: string)` - Get all children
  - `getTensionNodes(eventId: string)` - Get nodes with tensions
  - `getNodePath(nodeId: string, eventId: string)` - Get node path

### 3.3. [COMPONENTS.MCP.RG] MCP Components

#### 3.3.1. [MCP.SERVER.RG] MCP Server
- **Integration**: 4.0.0.0.0.0.0 Master Control Program & Alerting Subsystem
- **Class**: `MCPServer`
- **File**: `src/mcp/server.ts`
- **Properties**:
  - `tools: Map<string, MCPTool>` - Registered tools
  - `resources: Array<Resource>` - Registered resources
- **Methods**:
  - `registerTool(tool: MCPTool)` - Register tool
  - `registerTools(tools: MCPTool[])` - Register multiple tools
  - `registerResource(resource: Resource)` - Register resource
  - `listTools(): MCPTool[]` - List all tools
  - `listResources(): Resource[]` - List all resources
  - `executeTool(name: string, args: Record<string, any>)` - Execute tool
  - `getResource(uri: string)` - Get resource
  - `handleRequest(request: MCPRequest)` - Handle MCP request
  - `start()` - Start server (stdio mode)

#### 3.3.2. [MCP.UI_POLICY.RG] UI Policy Management Tools (8.0.0.0.0.0.0)
- **File**: `src/mcp/tools/ui-policy-management.ts`
- **Integration**: 4.0.0.0.0.0.0 MCP & Alerting Subsystem
- **Tools**:
  - `ui-policy-get-manifest` - Get manifest configuration
  - `ui-policy-get-metrics` - Get metrics and health
  - `ui-policy-validate-manifest` - Validate manifest file
  - `ui-policy-reload-manifest` - Hot-reload manifest
  - `ui-policy-get-feature-flags` - Get feature flag states
  - `ui-policy-check-health` - Health check with alerts

---

## 4. [LAYERS.ARCHITECTURE.RG] Architectural Layers

### 4.1. [LAYERS.APPLICATION.RG] Application Layer

#### 4.1.1. [LAYER.CLI.RG] CLI Tools Layer
- **Components**:
  - `src/cli/dashboard.ts` - Dashboard CLI
  - `src/cli/telegram.ts` - Telegram CLI
  - `src/cli/fetch.ts` - Data fetch CLI
  - `src/cli/security.ts` - Security CLI
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: Command-line interface tools

#### 4.1.2. [LAYER.API.RG] API Routes Layer
- **Components**:
  - `src/api/routes.ts` - Main API routes
  - `src/api/docs.ts` - API documentation
  - `src/api/telegram-ws.ts` - Telegram WebSocket
  - `src/api/discovery.ts` - API discovery
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: REST API endpoints

#### 4.1.3. [LAYER.DASHBOARD.RG] Dashboard Layer
- **Components**:
  - `dashboard/index.html` - Web dashboard
  - `dashboard/data/` - Dashboard data files
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: Web-based monitoring dashboard

#### 4.1.4. [LAYER.WEBSOCKET.RG] WebSocket Layer
- **Components**:
  - `src/api/telegram-ws.ts` - Telegram WebSocket server
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: Real-time communication

### 4.2. [LAYERS.CLIENT.RG] Client Container Layer

#### 4.2.1. [LAYER.ENHANCED_CLIENT.RG] Enhanced Client Container
- **Components**:
  - `EnhancedTelegramClient` - Enhanced client class
  - `RateLimiter` - Rate limiting
  - `CircuitBreaker` - Circuit breaker pattern
  - `Request Queue` - Request queuing
  - `Stats Tracker` - Statistics tracking
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: Enterprise-grade client with retry, rate limiting, circuit breaker

### 4.3. [LAYERS.MONITOR.RG] Monitor Container Layer

#### 4.3.1. [LAYER.INTEGRATION_MONITOR.RG] Integration Monitor Container
- **Components**:
  - `TelegramIntegrationMonitor` - Monitor class
  - `Health Check` - Health check functions
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: Integration health monitoring

### 4.4. [LAYERS.BASE.RG] Base API Container Layer

#### 4.4.1. [LAYER.BASE_API.RG] Base API Container
- **Components**:
  - `TelegramBotApi` - Base API class
  - `fetch() API` - HTTP requests (Bun API)
  - `URLSearchParams` - Query building (Bun API)
- **Color**: `#00d4ff` (Cyan)
- **Purpose**: Base API communication

### 4.5. [LAYERS.VM.RG] Bun Runtime VM Layer

#### 4.5.1. [LAYER.BUN_VM.RG] Bun Runtime VM
- **Components**:
  - `process.env` - Environment variables
  - `Bun.secrets` - Credential storage
  - `Bun.nanoseconds()` - High-precision timing
  - `Bun.sleep()` - Async delays
  - `Bun.file()` - File I/O
  - `Bun.write()` - File writing
  - `Bun.hash()` - Hashing
  - `Bun.randomUUIDv5()` - UUID generation
- **Color**: `#ffeb3b` (Yellow)
- **Purpose**: Bun native runtime APIs

### 4.6. [LAYERS.EXTERNAL.RG] External API Layer

#### 4.6.1. [LAYER.TELEGRAM_API.RG] External Telegram API
- **Components**:
  - `Telegram Bot API` - api.telegram.org
- **Color**: `#9c27b0` (Purple)
- **Purpose**: External Telegram Bot API

---

## 5. [INTERFACES.REFERENCE.RG] Interface Reference

### 5.1. [INTERFACES.TELEGRAM.RG] Telegram Interfaces

#### 5.1.1. [INTERFACE.TELEGRAM_MESSAGE.RG] Telegram Message
- **Interface**: `TelegramMessage`
- **File**: `src/telegram/client.ts`
- **Properties**:
  - `chatId: string | number` - Chat ID
  - `text: string` - Message text
  - `threadId?: number` - Thread ID (optional)
  - `pin?: boolean` - Pin message (optional)

#### 5.1.2. [INTERFACE.TELEGRAM_CLIENT_STATS.RG] Telegram Client Stats
- **Interface**: `TelegramClientStats`
- **File**: `src/telegram/client.ts`
- **Properties**:
  - `totalRequests: number` - Total requests
  - `successfulRequests: number` - Successful requests
  - `failedRequests: number` - Failed requests
  - `successRate: number` - Success rate (0-1)
  - `averageResponseTime: number` - Average response time (ms)
  - `circuitBreakerState: 'closed' | 'open' | 'half-open'` - Circuit breaker state

#### 5.1.3. [INTERFACE.INTEGRATION_STATUS.RG] Integration Status
- **Interface**: `IntegrationStatus`
- **File**: `src/telegram/monitor.ts`
- **Properties**:
  - `healthy: boolean` - Health status
  - `clientStats: TelegramClientStats` - Client statistics
  - `apiConnectivity: boolean` - API connectivity
  - `configuration: object` - Configuration status

### 5.2. [INTERFACES.RESEARCH.RG] Research Interfaces

#### 5.2.1. [INTERFACE.NODE_MANIFEST.RG] Node Manifest
- **Interface**: `NodeManifest`
- **File**: `src/research/sitemap.ts`
- **Properties**:
  - `nodeId: string` - Node ID
  - `eventId: string` - Event ID
  - `marketId: string` - Market ID
  - `bookmaker: string` - Bookmaker
  - `period: string` - Period
  - `baseLineType: string` - Base line type
  - `parentNodeId: string | null` - Parent node ID
  - `children: NodeManifest[]` - Child nodes
  - `properties: NodeProperties` - Node properties
  - `tensions: TensionEvent[]` - Tension events
  - `edges: Edge[]` - Graph edges
  - `depth: number` - Depth in tree
  - `path: string[]` - Path from root

#### 5.2.2. [INTERFACE.TENSION_EVENT.RG] Tension Event
- **Interface**: `TensionEvent`
- **File**: `src/research/tension/tension-detector.ts`
- **Properties**:
  - `tensionId?: number` - Tension ID
  - `tension_type: string` - Tension type
  - `severity: number` - Severity (1-10)
  - `nodes: string[]` - Involved nodes
  - `snapshot: any` - Snapshot data
  - `eventId?: string` - Event ID

---

## 6. [FUNCTIONS.REFERENCE.RG] Function Reference

### 6.1. [FUNCTIONS.TELEGRAM.RG] Telegram Functions

#### 6.1.1. [FUNCTION.GET_TELEGRAM_CLIENT.RG] Get Telegram Client
- **Function**: `getTelegramClient(config?: TelegramClientConfig)`
- **File**: `src/telegram/client.ts`
- **Returns**: `EnhancedTelegramClient`
- **Purpose**: Get or create Telegram client instance

#### 6.1.2. [FUNCTION.GET_TELEGRAM_MONITOR.RG] Get Telegram Monitor
- **Function**: `getTelegramMonitor()`
- **File**: `src/telegram/monitor.ts`
- **Returns**: `TelegramIntegrationMonitor`
- **Purpose**: Get or create Telegram monitor instance

### 6.2. [FUNCTIONS.RESEARCH.RG] Research Functions

#### 6.2.1. [FUNCTION.INITIALIZE_RESEARCH_SCHEMA.RG] Initialize Research Schema
- **Function**: `initializeResearchSchema(dbPath?: string)`
- **File**: `src/research/schema/sub-market-nodes.ts`
- **Returns**: `Database`
- **Purpose**: Initialize research database schema

---

## 7. [COLORS.REFERENCE.RG] Color Reference

### 7.1. [COLORS.PRIMARY.RG] Primary Colors

#### 7.1.1. [COLOR.CYAN.RG] Cyan (#00d4ff)
- **Usage**: Classes, primary elements, architecture nodes
- **HSL**: `hsl(188, 100%, 50%)`
- **Purpose**: Primary brand color, class definitions

#### 7.1.2. [COLOR.GREEN.RG] Green (#00ff88)
- **Usage**: Interfaces, success states, online status
- **HSL**: `hsl(150, 100%, 50%)`
- **Purpose**: Interface definitions, success indicators

#### 7.1.3. [COLOR.ORANGE.RG] Orange (#ff6b00)
- **Usage**: Functions, warnings, periods
- **HSL**: `hsl(25, 100%, 50%)`
- **Purpose**: Function definitions, warning states

#### 7.1.4. [COLOR.MAGENTA.RG] Magenta (#ff00ff)
- **Usage**: Properties, property names
- **HSL**: `hsl(300, 100%, 50%)`
- **Purpose**: Property definitions, property labels

#### 7.1.5. [COLOR.YELLOW.RG] Yellow (#ffeb3b)
- **Usage**: Bun APIs, runtime VM
- **HSL**: `hsl(51, 100%, 61%)`
- **Purpose**: Bun runtime APIs, VM layer

#### 7.1.6. [COLOR.PURPLE.RG] Purple (#9c27b0)
- **Usage**: External APIs, edges
- **HSL**: `hsl(291, 70%, 40%)`
- **Purpose**: External API references, graph edges

### 7.2. [COLORS.STATUS.RG] Status Colors

#### 7.2.1. [COLOR.SUCCESS.RG] Success Green (#10b981)
- **Usage**: Online status, success badges
- **HSL**: `hsl(160, 84%, 39%)`
- **Purpose**: Success states, online indicators

#### 7.2.2. [COLOR.ERROR.RG] Error Red (#ef4444)
- **Usage**: Offline status, errors, high severity tensions
- **HSL**: `hsl(0, 84%, 60%)`
- **Purpose**: Error states, offline indicators

#### 7.2.3. [COLOR.WARNING.RG] Warning Orange (#f59e0b)
- **Usage**: Warning status, medium severity tensions
- **HSL**: `hsl(38, 92%, 50%)`
- **Purpose**: Warning states, medium severity

---

## 8. [DEBUGGING.TOOLS.RG] Debugging & Development Tools

### 8.1. [DEBUGGING.CONSOLE_DEPTH.RG] Console Depth Debugging (7.0.0.0.0.0.0)

**Version**: 7.0.0.0.0.0.0  
**Status**: ✅ Integrated  
**Ripgrep Pattern**: `7\.0\.0\.0\.0\.0\.0|CONSOLE-DEPTH-DEBUGGING|--console-depth`

#### 8.1.1. [CONSOLE_DEPTH.CLI.RG] CLI Argument
- **Feature**: `--console-depth=<N>` CLI argument
- **File**: `package.json` (scripts), `docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md`
- **Purpose**: Control nested object display depth in console output
- **Syntax**: `bun --console-depth=<N> <script>` where `<N>` is a positive integer
- **Default**: Depth 2 (without flag) - truncates with `[Object]` placeholders
- **Usage Examples**:
  - `bun --console-depth=7 run script.ts` - Development (balanced visibility)
  - `bun --console-depth=5 run script.ts` - Production (performance optimized)
  - `bun --console-depth=10 run script.ts` - Deep debugging (maximum visibility)
  - `bun --console-depth=15 run script.ts` - Extreme debugging (for complex graphs)
- **Package.json Integration**:
  - `dev`: `--console-depth=7` (development mode)
  - `start`: `--console-depth=5` (production mode)
  - `test`: `--console-depth=7` (test mode)
  - `test:verbose`: `--console-depth=10` (verbose test output)
  - `debug:graph`: `--console-depth=15` (graph debugging)
  - `debug:anomaly`: `--console-depth=15` (anomaly pattern debugging)
  - `debug:ui-context`: `--console-depth=10` (UI context debugging)
  - `dashboard`: `--console-depth=5` (dashboard CLI)
  - `fetch`: `--console-depth=5` (data fetch CLI)
- **Affects**: `console.log()`, `console.error()`, `console.warn()`, `console.info()`, `console.debug()`

#### 8.1.2. [CONSOLE_DEPTH.ARRAY_FORMATTING.RG] Bun's Internal Array Formatting
- **Feature**: `inspect.custom.bun.array` (internal mechanism, not public API)
- **File**: `docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md`
- **Purpose**: Intelligent array formatting with type information and truncation
- **Behavior**:
  - Shows first few elements with full detail (respecting `--console-depth`)
  - Indicates total count if truncated (e.g., `... 15 more items`)
  - Displays element types for homogeneous arrays (e.g., `[MarketOfferingNode, MarketOfferingNode, ...]`)
  - Provides semantic richness even when depth limits truncate
  - Works automatically for all native arrays
- **Example Outputs**:
  - `[MarketOfferingNode, MarketOfferingNode, ..., 15 more items]` - Type-aware
  - `[CovertSteamEventRecord, CovertSteamEventRecord, ..., 12 more events]` - Count-aware
  - `[{ nodeId: 'betfair:123', ... }, ... 1,234 more items]` - Large array truncation
- **Hyper-Bun Use Cases**:
  - `MarketOfferingNode[]` arrays (market intelligence graphs)
  - `CovertSteamEventRecord[]` arrays (covert steam detection)
  - `line_movement_micro_v2[]` arrays (line movement records)
  - `UrlAnomalyPattern[]` arrays (URL anomaly patterns)
  - Performance metrics arrays (operation statistics)
- **Benefits**:
  - Rapid data structure comprehension
  - Reduced debugging overhead (no manual `slice()` needed)
  - Consistent Bun-native experience
  - Type information confirms expected data structures

#### 8.1.3. [CONSOLE_DEPTH.CUSTOM_CLASSES.RG] Custom Class Inspection
- **Feature**: `Bun.inspect.custom` Symbol (public API for custom classes)
- **File**: `src/utils/circular-buffer.ts`, `examples/demos/demo-console-depth.ts`, `src/utils/binary-tag-collection.ts`
- **Purpose**: Custom console representation for custom classes (escape hatch for complex objects)
- **Usage**: Define `[Bun.inspect.custom](depth: number, options: any): string` method on custom classes
- **Signature**:
  ```typescript
  [Bun.inspect.custom](depth: number, options: any): string {
    if (depth < 0) return `[ClassName]`; // Truncated representation
    // Return formatted string respecting depth parameter
  }
  ```
- **Implementation Examples**:
  - **MarketOfferingNode** (`examples/demos/demo-console-depth.ts`)
    - Shows: `nodeId`, `bookmaker`, `riskLevel`
    - Conditional: Full `analysis` if `depth > 3`
  - **CovertSteamEventRecord** (`examples/demos/demo-console-depth.ts`)
    - Shows: `eventId`, `pattern`, `severity`, `detectedAt` timestamp
    - Conditional: `metadata` if `depth > 2`
  - **CircularBuffer** (`src/utils/circular-buffer.ts`)
    - Advanced: Array formatting options (`oneline`, `structured`, `compact`, `expanded`)
    - Context-aware: Environment adaptation, sensitive data redaction
  - **BinaryTagCollection** (`src/utils/binary-tag-collection.ts`)
    - Shows: Tag count, cache size, tag summaries
- **Best Practices**:
  1. Show essential identifiers in concise format (`depth < 0`)
  2. Respect `depth` parameter to control nested property display
  3. Use consistent formatting across similar custom classes
  4. Keep it concise - aim for single-line representation when possible
  5. Leverage `Bun.inspect()` recursively for nested objects with adjusted depth
- **When to Use**:
  - Custom classes that appear frequently in debugging output
  - Complex objects with deep nesting that benefit from concise representation
  - Domain-specific objects where key identifiers are more valuable than full structure
  - Classes used in arrays where type information improves debugging clarity
- **Benefits**:
  - Concise representation with key identifiers (nodeId, eventId, etc.)
  - Respects `--console-depth` for nested properties
  - Works seamlessly with Bun's internal array formatting
  - Provides escape hatch for making complex objects equally debuggable
  - Type-aware display in arrays (e.g., `[MarketOfferingNode, MarketOfferingNode, ..., 15 more items]`)

#### 8.1.4. [CONSOLE_DEPTH.UTILITIES.RG] Console Depth Utilities

**File**: `src/utils/bun.ts` (Version 7.0.0.0.0.0.0)

**Functions**:
- **`inspect(value: unknown, options?: InspectOptions): string`**
  - Pretty print using `Bun.inspect`
  - Default depth: 4
  - Options: `colors`, `depth`, `sorted`, `compact`
  - Returns: Formatted string representation
  - Version: 7.0.0.0.0.0.0 - Enhanced with console depth control integration

- **`log(label: string, value: unknown, options?: InspectOptions): void`**
  - Log with Bun.inspect formatting
  - Respects `--console-depth` CLI argument
  - Output: `[label]` prefix with formatted value
  - Version: 7.0.0.0.0.0.0 - Respects --console-depth CLI argument

- **`debug(label: string, value: unknown): void`**
  - Debug log (development only, checks `NODE_ENV !== "production"`)
  - Uses depth 6 for comprehensive debugging output
  - Version: 7.0.0.0.0.0.0 - Uses depth 6 for comprehensive debugging output

**File**: `src/hyper-bun/console-enhancement.ts` (Version 7.0.0.0.0.0.0)

**Constants**:
- **`CONSOLE_CONFIG`** - Enhanced console configuration
  - `depth: 10` - Comprehensive debugging depth
  - `colors: true` - ANSI color support
  - `maxArrayLength: 100` - Array truncation limit
  - `maxStringLength: 1000` - String truncation limit
  - `sorted: true` - Sort object keys
  - Note: Works in conjunction with `--console-depth` CLI argument

**Functions**:
- **`createArrayInspector<T>(array: T[], options?): string`**
  - Custom array inspector for market data structures
  - Supports: `label`, `maxItems`, `itemFormatter`, `summaryFormatter`
  - Respects depth settings from `--console-depth` CLI argument
  - Version: 7.0.0.0.0.0.0 - Supports Bun.inspect.custom pattern

**Classes**:
- **`HyperBunLogger`** - Enhanced logger with custom formatters
  - Methods: `info()`, `success()`, `warn()`, `error()`, `debug()`, `performance()`
  - Market-specific: `marketAnalysis()`, `scanProgress()`, `anomalyDetected()`
  - Uses `CONSOLE_CONFIG` for formatting
  - Auto-detects data types and applies appropriate formatters

- **`MarketDataInspectors`** - Domain-specific inspectors for market data
  - `analysisResult()` - Market analysis results
  - `performanceStats()` - Performance statistics
  - `shadowGraph()` - Shadow graph data
  - `healthReport()` - System health reports
  - `jobStatuses()` - Scheduled job statuses
  - `scanResults()` - Market scan results

**Other Files with Custom Inspection**:
- `src/orca/aliases/bookmakers/inspectable-cache.ts` - `[inspect.custom]` for cache
- `src/canonical/inspectable-canonicalizer.ts` - `[inspect.custom]` for canonicalizer
- `src/cache/inspectable-api-manager.ts` - `[inspect.custom]` for API manager

#### 8.1.5. [CONSOLE_DEPTH.EXAMPLES.RG] Example Scripts

**File**: `examples/demos/demo-console-depth.ts`  
**Version**: 7.0.0.0.0.0.0  
**Ripgrep Pattern**: `EXAMPLE-CONSOLE-DEPTH-001|BP-EXAMPLE@7\.0\.0\.0\.0\.0\.0`

**Purpose**: Demonstrates console depth features with Hyper-Bun data structures

**Demonstrations**:
1. **Console Depth with Nested Objects**
   - Market intelligence node structure (7 levels deep)
   - Shows how `--console-depth` affects visibility
   - Examples: `--console-depth=3`, `--console-depth=5`, `--console-depth=7`

2. **Performance Statistics Display**
   - Nested statistical structures with distribution buckets
   - Anomaly detection details
   - Shows full structure with `--console-depth=6`

3. **Custom Array Inspector Implementation**
   - `MarketScanResults` class with `[Bun.inspect.custom]`
   - Respects `--console-depth` setting
   - Shows intelligent truncation with count

4. **Arbitrage Opportunity Structures**
   - Deeply nested market and calculation structures
   - Shows full profit/risk calculations with `--console-depth=7`

**Usage**:
```bash
# Run with different depths to see the difference
bun --console-depth=3 run examples/demos/demo-console-depth.ts
bun --console-depth=7 run examples/demos/demo-console-depth.ts
bun --console-depth=10 run examples/demos/demo-console-depth.ts
```

**Related Examples**:
- `examples/demos/demo-bun-inspect-custom.ts` - Basic `Bun.inspect.custom` usage
- `examples/demos/demo-console-features.ts` - Console features including depth
- `examples/demos/demo-advanced-circular-buffer.ts` - Advanced CircularBuffer inspection

#### 8.1.6. [CONSOLE_DEPTH.DOCUMENTATION.RG] Documentation References

**Main Documentation**: `docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md`
- Comprehensive guide (770+ lines)
- Sections: 7.1.0.0.0.0.0 (CLI argument), 7.2.0.0.0.0.0 (Array formatting)
- Includes: Integration examples, best practices, verification commands

**Cross-References**:
- **`docs/bun/BUN-UTILS.md`** - Bun.inspect() documentation
  - Section: "Console Depth Control"
  - Shows `Bun.inspect.custom` usage
  - Links to console depth debugging docs
- **`dashboard/index.html`** - Console depth section in dashboard
  - Location: Near Bun console colors reference
  - Includes usage examples and array formatting explanation
- **`public/registry.html`** - Console depth section in registry
  - Dedicated section with CLI examples
  - Custom class inspection guidance
  - Summary statement

**Ripgrep Patterns**:
```bash
# Version references
rg "7\.0\.0\.0\.0\.0\.0"

# Console depth usage
rg "console-depth|--console-depth"

# Custom inspectors
rg "Bun\.inspect\.custom|inspect\.custom"

# Example script
rg "EXAMPLE-CONSOLE-DEPTH-001|BP-EXAMPLE@7\.0\.0\.0\.0\.0\.0"
```

**Integration Points**:
- Package.json scripts (9 scripts with `--console-depth`)
- Utility functions (`src/utils/bun.ts`, `src/hyper-bun/console-enhancement.ts`)
- Example scripts (`examples/demos/demo-console-depth.ts`)
- HTML dashboards (`dashboard/index.html`, `public/registry.html`)
- Component sitemap (this file)

**Summary**: By leveraging `inspect.custom.bun.array` implicitly (and potentially `Bun.inspect.custom` explicitly for custom classes), Hyper-Bun's development team benefits from Bun's built-in intelligence for making complex data structures more manageable and understandable directly in console output.

---

## 9. [FRONTEND.CONFIG.RG] Frontend Configuration & Policy Subsystem (8.0.0.0.0.0.0)

**Version**: 8.0.0.0.0.0.0  
**Status**: ✅ Integrated  
**MCP Integration**: Section 4.1.0.0.0.0.0 under Master Control Program & Alerting Subsystem  
**Ripgrep Pattern**: `8\.0\.0\.0\.0\.0\.0|4\.1\.0\.0\.0\.0\.0|FRONTEND-CONFIG-POLICY|UIPolicyManager|ui-policy-manifest`

**Note**: This subsystem is integrated into the MCP & Alerting Subsystem (4.0.0.0.0.0.0) as section 4.1.0.0.0.0.0. See [4.0.0.0.0.0.0 MCP & Alerting Subsystem](./docs/4.0.0.0.0.0.0-MCP-ALERTING.md) for the integrated view.

### 9.1. [FRONTEND.MANIFEST.RG] HyperBunUIPolicyManifest

#### 9.1.1. [MANIFEST.DEFINITION.RG] Manifest Definition
- **File**: `config/ui-policy-manifest.yaml`
- **Format**: YAML (or JSON alternative)
- **Purpose**: Central, version-controlled declaration of UI policies and configurations
- **Schema Version**: 8.0.0.0.0.0.0
- **Sections**:
  - `metadata` - Manifest version and metadata
  - `ui_context_defaults` - Global UI context defaults
  - `feature_flags` - Feature flag management policies
  - `html_rewriter_policies` - HTMLRewriter transformation policies
  - `security_policies` - Security configuration
  - `performance_policies` - Performance optimization settings

#### 9.1.2. [MANIFEST.LOCATION.RG] Manifest Location
- **Primary**: `config/ui-policy-manifest.yaml`
- **Environment-Specific**: `config/ui-policy-manifest.{env}.yaml` (e.g., `.production.yaml`, `.development.yaml`)
- **JSON Alternative**: `config/ui-policy-manifest.json`

#### 9.1.3. [MANIFEST.SCHEMA.RG] Schema Structure
- **Metadata**: Version, last_updated, description, schema_version
- **UI Context Defaults**: apiBaseUrl (AUTO_DETECT), debugMode, defaultUserRole
- **Feature Flags**: enabled, description, dependencies, requires_env
- **HTMLRewriter Policies**:
  - `inject_context_script` - Context injection policy
  - `data_feature_pruning` - Feature flag pruning
  - `data_access_pruning` - RBAC pruning
  - `dynamic_content_implantation` - Dynamic content policies
- **Security Policies**: CSP, XSS protection, context validation
- **Performance Policies**: Metrics, caching, logging

### 9.2. [FRONTEND.POLICY_MANAGER.RG] UIPolicyManager Service

#### 9.2.1. [POLICY_MANAGER.SERVICE.RG] Service Class
- **File**: `src/services/ui-policy-manager.ts`
- **Class**: `UIPolicyManager`
- **Pattern**: Singleton
- **Version**: 8.0.0.0.0.0.0
- **Purpose**: Load, parse, validate, and apply UI Policy Manifest

#### 9.2.2. [POLICY_MANAGER.METHODS.RG] Core Methods
- **`getInstance(manifestPath?)`** - Get singleton instance
- **`getFeatureFlags(runtimeOverrides?)`** - Resolve feature flags with overrides
- **`getHTMLRewriterPolicies()`** - Get transformation policies
- **`buildUIContext(request, runtimeFlags?)`** - Build HyperBunUIContext
- **`isTransformationEnabled(transformation)`** - Check if transformation enabled
- **`getSecurityPolicies()`** - Get security policies
- **`getPerformancePolicies()`** - Get performance policies
- **`reload()`** - Hot-reload manifest (optional)
- **`getMetadata()`** - Get manifest metadata

#### 9.2.3. [POLICY_MANAGER.FEATURES.RG] Features
- **Load & Parse**: Bun-native file APIs (YAML/JSON)
- **Schema Validation**: Basic validation (full schema validation optional)
- **Policy Resolution**: Combines manifest defaults + env vars + runtime overrides
- **Environment Detection**: Auto-detects environment-specific manifests
- **Hot Reload**: Optional manifest reloading without restart

### 9.3. [FRONTEND.VALIDATION.RG] Manifest Validation (8.2.6.0.0.0.0)

#### 9.3.1. [VALIDATION.SCRIPT.RG] Validation Script
- **File**: `scripts/validate-ui-policy-manifest.ts`
- **Purpose**: Comprehensive manifest validation with YAML/JSON parsing, type checking, and schema validation
- **Usage**:
  - `bun run validate:manifest` - Basic validation
  - `bun run validate:manifest <path>` - Custom path validation
  - `bun run validate:manifest:ci` - CI/CD validation (non-zero exit on error)
- **Features**:
  - YAML/JSON parsing validation
  - Required sections check
  - Type validation (booleans, arrays, objects)
  - Schema version check
  - Warning for missing optional fields
  - Detailed error messages

### 9.4. [FRONTEND.INTEGRATION.RG] Integration Points

#### 9.4.1. [INTEGRATION.REWRITER.RG] UIContextRewriter Integration
- **File**: `src/services/ui-context-rewriter.ts`
- **Changes**: Accepts optional `policies` parameter
- **Behavior**: Uses policies if provided, falls back to options
- **Backward Compatible**: Works with or without policies

#### 9.4.2. [INTEGRATION.ROUTES.RG] Route Handler Integration
- **File**: `src/index.ts` (registry.html route)
- **File**: `scripts/dashboard-server.ts` (dashboard server)
- **Pattern**: 
  ```typescript
  const policyManager = UIPolicyManager.getInstance();
  const context = await policyManager.buildUIContext(request, runtimeFlags);
  const policies = await policyManager.getHTMLRewriterPolicies();
  const rewriter = new UIContextRewriter(context, {}, policies);
  ```

### 9.5. [FRONTEND.BENEFITS.RG] Strategic Benefits

#### 9.5.1. [BENEFITS.DECLARATIVE.RG] Declarative Control
- Human-readable YAML configuration
- Separates configuration from code logic
- Non-developer configuration possible

#### 9.5.2. [BENEFITS.CENTRALIZED.RG] Centralized Policy Management
- Single source of truth for UI policies
- Consistent behavior across interfaces
- Single update point

#### 9.5.3. [BENEFITS.AUDITABILITY.RG] Enhanced Auditability
- Version-controlled policy changes
- Clear audit trail in git
- Rollback capability

#### 9.5.4. [BENEFITS.DEPLOYABILITY.RG] Dynamic Deployability
- Zero-downtime policy updates
- A/B testing via policy changes
- Emergency kill switches

#### 9.5.5. [BENEFITS.DEVEX.RG] Improved Developer Experience
- Clear manifest documentation
- Self-documenting policies
- Faster onboarding

#### 9.5.6. [BENEFITS.SECURITY.RG] Stronger Security Posture
- Explicit RBAC permissions
- Defense in depth
- Security policy audit trail

---

## 10. [SEARCH.PATTERNS.RG] Search Patterns

### 8.1. [SEARCH.CSS.RG] CSS Class Search
```bash
# Find all CSS classes
rg "\.(grid|card|status|arch-node)" dashboard/index.html

# Find specific CSS class
rg "\.status-badge" dashboard/index.html

# Find architecture node classes
rg "\.arch-node\." dashboard/index.html
```

### 8.2. [SEARCH.COMPONENTS.RG] Component Search
```bash
# Find all classes
rg "export class" src/

# Find Telegram components
rg "class.*Telegram" src/

# Find research components
rg "class.*Research|class.*Tension|class.*Sitemap" src/
```

### 10.3. [SEARCH.LAYERS.RG] Layer Search
```bash
# Find application layer
rg "Application Layer|CLI Tools|API Routes|Dashboard" dashboard/index.html

# Find client container
rg "Enhanced Client Container|EnhancedTelegramClient" dashboard/index.html

# Find Bun VM
rg "Bun Runtime VM|Bun\." src/
```

### 10.4. [SEARCH.DEBUGGING.RG] Debugging Tools Search
```bash
# Find console depth references
rg "7\.0\.0\.0\.0\.0\.0|console-depth|--console-depth"

# Find custom inspectors
rg "Bun\.inspect\.custom|inspect\.custom"

# Find console depth utilities
rg "inspect\(|log\(|debug\(" src/utils/bun.ts
```

### 10.5. [SEARCH.FRONTEND_CONFIG.RG] Frontend Configuration Search
```bash
# Find frontend config policy references
rg "8\.0\.0\.0\.0\.0\.0|FRONTEND-CONFIG-POLICY|UIPolicyManager"

# Find manifest references
rg "ui-policy-manifest|HyperBunUIPolicyManifest"

# Find policy manager usage
rg "UIPolicyManager\.getInstance|buildUIContext|getHTMLRewriterPolicies"
```

### 10.6. [SEARCH.SNAPSHOTS.RG] Snapshot Search
```bash
# Find all snapshot files
find . -name "*.snap" -type f

# Find __snapshots__ directories
find . -type d -name "__snapshots__"

# Find snapshot test files
rg "toMatchSnapshot|toMatchInlineSnapshot" test/

# Find snapshot examples
rg "snapshot-examples|SNAPSHOTS" test/
```

---

## 11. [TESTING.SNAPSHOTS.RG] Test Snapshot Storage

### 11.1. [SNAPSHOTS.LOCATION.RG] Snapshot File Locations

#### 11.1.1. [SNAPSHOTS.DIRECTORY.RG] Snapshot Directory Structure
- **Location**: `__snapshots__/` directory next to each test file
- **Format**: `__snapshots__/<test-file-name>.test.ts.snap`
- **Example**: `test/snapshot-examples.test.ts` → `test/__snapshots__/snapshot-examples.test.ts.snap`
- **Created**: Automatically on first test run with `toMatchSnapshot()`

#### 11.1.2. [SNAPSHOTS.TYPES.RG] Snapshot Types

**File-based Snapshots**:
- **Location**: `__snapshots__/` directory
- **Format**: `.snap` files (JavaScript modules)
- **Content**: Exported test snapshots
- **Example Structure**:
  ```javascript
  exports[`test name`] = `snapshot content`;
  exports[`another test`] = `another snapshot`;
  ```
- **File**: `test/__snapshots__/snapshot-examples.test.ts.snap`

**Inline Snapshots**:
- **Location**: Embedded directly in test file
- **Format**: Template literals in test code
- **Example**: `expect(data).toMatchInlineSnapshot(\`...\`)`
- **File**: Same as test file (no separate snapshot file)
- **Auto-updated**: Bun automatically updates test file on first run

#### 11.1.3. [SNAPSHOTS.EXAMPLES.RG] Snapshot Examples File
- **Test File**: `test/snapshot-examples.test.ts`
- **Snapshot File**: `test/__snapshots__/snapshot-examples.test.ts.snap` (created on first run)
- **Purpose**: Comprehensive snapshot testing examples
- **Documentation**: `docs/BUN-1.3-TEST-IMPROVEMENTS.md`
- **Coverage**:
  - Basic snapshots (file-based)
  - Inline snapshots (auto-indentation)
  - Error snapshots
  - Variable substitution in test.each
  - Snapshot normalization
  - Function output snapshots
  - Best practices

#### 11.1.4. [SNAPSHOTS.UTILITIES.RG] Snapshot Utilities
- **File**: `test/harness.ts`
- **Function**: `normalizeBunSnapshot(output, tempDir?)`
- **Purpose**: Normalize output for snapshot testing
- **Features**:
  - Trims whitespace
  - Normalizes line endings (`\r\n` → `\n`)
  - Replaces temp directory paths with `<TEMP_DIR>`
  - Normalizes timestamps to `<TIMESTAMP>`
  - Cross-platform path normalization (`\` → `/`)

#### 11.1.5. [SNAPSHOTS.CONFIG.RG] Snapshot Configuration
- **File**: `bunfig.toml` (lines 385-444)
- **Documentation**: Snapshot testing configuration and examples
- **Update Command**: `bun test --update-snapshots` or `bun test -u`
- **CI Mode**: Errors on new snapshots without `--update-snapshots` flag
- **Auto-indentation**: Bun 1.3+ automatically indents inline snapshots

### 11.2. [SNAPSHOTS.HEAP.RG] Heap Snapshots (Memory Profiling)

**Note**: Different from test snapshots - these are memory profiling snapshots.

- **Location**: `./data/` directory
- **Format**: `*.heapsnapshot` files
- **API Endpoint**: `GET /api/debug/snapshots`
- **Purpose**: Memory profiling and debugging
- **Usage**: Open in Chrome DevTools Memory tab
- **Generation**: `Bun.generateHeapSnapshot()`
- **Example**: `./data/heap-2025-01-15.heapsnapshot`

---

## 12. Status
```bash
# Find console depth references
rg "7\.0\.0\.0\.0\.0\.0|console-depth|--console-depth"

# Find custom inspectors
rg "Bun\.inspect\.custom|inspect\.custom"

# Find console depth utilities
rg "inspect\(|log\(|debug\(" src/utils/bun.ts
```

---

## 10. Status

**Status**: ✅ Component sitemap complete

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX

**Coverage**:
- ✅ CSS Classes (50+ classes documented)
- ✅ Component Classes (10+ classes documented)
- ✅ Interfaces (5+ interfaces documented)
- ✅ Functions (5+ functions documented)
- ✅ Architectural Layers (6 layers documented)
- ✅ Color Reference (10+ colors documented)
- ✅ Debugging Tools (Console Depth Debugging 7.0.0.0.0.0.0)
- ✅ Frontend Configuration (Frontend Config & Policy Subsystem 8.0.0.0.0.0.0)
- ✅ Test Snapshots (Storage locations and examples documented)
