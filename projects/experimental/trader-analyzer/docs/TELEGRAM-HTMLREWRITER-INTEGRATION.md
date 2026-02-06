# [TELEGRAM.HTMLREWRITER.INTEGRATION.RG] Telegram Mini App & HTMLRewriter Integration Summary

**Document ID: Integration-9.1.1-6.1.1.2.2** | **Last Updated: 2025-01-06**

## 1. [INTEGRATION.OVERVIEW.RG] Overview

This document summarizes the deep integration between Telegram Mini App (`9.1.1.x.x.x`) and Hyper-Bun's HTMLRewriter architecture (`6.1.1.2.2.x.x`), creating a unified, grepable documentation ecosystem.

## 2. [INTEGRATION.ARCHITECTURE.RG] Architecture

### 2.1. [ARCHITECTURE.CROSS_SYSTEM_FLOW.RG] Cross-System Flow

```text
1. HTMLRewriter Injection (6.1.1.2.2.2.1.0)
   ↓
   Injects base HyperBunUIContext into window.HYPERBUN_UI_CONTEXT
   
2. Telegram Context Merge (9.1.1.2.1.4)
   ↓
   Merges Telegram auth data with base context
   
3. Mini App Bootstrap (9.1.1.2.0.0)
   ↓
   Initializes bookmaker routing and app logic
```

## 3. [INTEGRATION.FILES.RG] Files Created

### 3.1. [FILES.DOCUMENTATION.RG] Documentation
- `docs/TELEGRAM-DEV-SETUP.md` - Comprehensive integration guide (39 cross-references to 9.1.1.x, 17 to 6.1.1.2.2.x)

### 3.2. [FILES.IMPLEMENTATION.RG] Implementation
- `src/telegram/mini-app-context.ts` - Telegram context injection (9.1.1.2.1.0)
- `src/telegram/bookmaker-router.ts` - Bookmaker routing (9.1.1.3.1.0)
- `src/telegram/mini-app.ts` - Mini App bootstrap (9.1.1.2.0.0)
- `src/telegram/github-webhook-handler.ts` - GitHub webhook formatting (9.1.1.4.1.0)

## 4. [INTEGRATION.POINTS.RG] Key Integration Points

### 4.1. [POINTS.CONTEXT_EXTENSION.RG] Context Extension (9.1.1.2.1.0)

`TelegramMiniAppContext` extends `HyperBunUIContext`:
- Adds `telegramAuthHash` (9.1.1.2.1.1)
- Adds `telegramUserId` (9.1.1.2.1.2)
- Adds `startParam` (9.1.1.2.1.3)

### 4.2. [POINTS.CONTEXT_MERGE.RG] Context Merge (9.1.1.2.1.4)

`injectTelegramContext()` function:
- Reads base context from `window.HYPERBUN_UI_CONTEXT` (injected by 6.1.1.2.2.2.1.0)
- Merges Telegram WebApp SDK data
- Freezes combined context atomically

### 4.3. [POINTS.BOOKMAKER_ROUTING.RG] Bookmaker Routing (9.1.1.3.1.0)

`BookmakerRouter` class:
- Uses `apiBaseUrl` from UIContext (6.1.1.2.2.1.2.1)
- Extracts bookmaker from `startParam` (9.1.1.2.1.3)
- Constructs bookmaker-specific endpoints

## 5. [INTEGRATION.RIPGREP.RG] Ripgrep Discovery Patterns

### 5.1. [RIPGREP.INTEGRATION_POINTS.RG] Find All Integration Points
```bash
# Find files referencing both systems
rg -l "6\.1\.1\.2\.2\.\d+\.\d+" | xargs rg -l "9\.1\.1\.\d+\.\d+\.\d+"

# Expected: src/telegram/mini-app-context.ts, src/telegram/bookmaker-router.ts
```

### 5.2. [RIPGREP.CROSS_REFERENCES.RG] Find Cross-References in Documentation
```bash
# Count cross-references
rg -c "9\.1\.1\." docs/TELEGRAM-DEV-SETUP.md  # 39 references
rg -c "6\.1\.1\.2\.2\." docs/TELEGRAM-DEV-SETUP.md  # 17 references
```

### 5.3. [RIPGREP.VERIFY_INTEGRITY.RG] Verify Integration Integrity
```bash
# Check all documented sections exist in code
for doc in $(rg -o "9\.1\.1\.\d+\.\d+\.\d+" docs/TELEGRAM-DEV-SETUP.md | sort -u); do
  rg -q "$doc" src/ || echo "Orphaned doc ref: $doc"
done
```

## 6. [INTEGRATION.TESTING.RG] Testing Matrix

| Test ID | HTMLRewriter Component | Telegram Component | Status |
|---------|------------------------|-------------------|--------|
| `9.1.1.6.1.0` | `6.1.1.2.2.2.1.0` | `9.1.1.2.1.0` | ✅ Implemented |
| `9.1.1.6.1.1` | `6.1.1.2.2.2.2.0` | `9.1.1.3.1.2` | ✅ Implemented |
| `9.1.1.6.1.2` | `6.1.1.2.2.2.3.0` | `9.1.1.2.1.4` | ✅ Implemented |

## 7. [INTEGRATION.BENEFITS.RG] Benefits

1. **Bidirectional Navigation**: Forward (docs → code) and backward (code → docs) references
2. **Mechanical Auditing**: Every cross-system dependency is searchable via ripgrep
3. **Type Safety**: TypeScript interfaces ensure compile-time correctness
4. **Unified Numbering**: Consistent numbering scheme across systems
5. **Testable Contracts**: Each numbered section has verification formulas

## 8. [INTEGRATION.USAGE.RG] Usage Example

```typescript
// 1. HTMLRewriter injects base context (6.1.1.2.2.2.1.0)
// window.HYPERBUN_UI_CONTEXT = { apiBaseUrl: "...", ... }

// 2. Telegram context merge (9.1.1.2.1.4)
import { injectTelegramContext } from "./telegram/mini-app-context";
injectTelegramContext(window.HYPERBUN_UI_CONTEXT);

// 3. Use bookmaker router (9.1.1.3.1.0)
import { BookmakerRouter } from "./telegram/bookmaker-router";
const router = new BookmakerRouter();
const endpoint = router.getOddsEndpoint(); // Uses apiBaseUrl + startParam
```

## 9. [INTEGRATION.CONSTANTS.RG] Constants Integration

### 9.1. [CONSTANTS.API_PATHS.RG] API Path Constants

The Telegram HTMLRewriter integration uses `apiBaseUrl` from `HyperBunUIContext`, which should align with centralized API path constants:

- **Constants Source**: `src/utils/rss-constants.ts`
- **API Paths**: `RSS_API_PATHS` provides centralized endpoint definitions
- **Registry Paths**: `RSS_API_PATHS.REGISTRY_*` constants for registry endpoints
- **Routing Constants**: `ROUTING_REGISTRY_NAMES` for registry name matching

**Integration Points**:
- `BookmakerRouter` uses `apiBaseUrl` from context (should reference `RSS_API_PATHS` conceptually)
- `HyperBunUIContext.apiBaseUrl` can be constructed using constants for consistency
- Deep-link generation (`DeepLinkGenerator`) uses `DEEP_LINK_PATHS` and `DEEP_LINK_DEFAULTS` constants (see RFC 001 integration)
- Deep-link paths centralized: `/alert/`, `/alert/covert-steam/`, `/alert/perf-regression/`, `/audit/url-anomaly/`, `/registry/`, `/dashboard/`

**Cross-Reference**: 
- See [BUN-RSS-INTEGRATION.md](./BUN-RSS-INTEGRATION.md) for complete constants documentation
- See [RFC 001 Integration Summary](./9.1.1.9.1-RFC-INTEGRATION-SUMMARY.md) for deep-link constants integration

### 9.2. [CONSTANTS.USAGE.RG] Usage in Code

```typescript
// Example: Using constants with Telegram context
import { RSS_API_PATHS } from "../utils/rss-constants";

// apiBaseUrl in HyperBunUIContext can reference constants conceptually
const context: HyperBunUIContext = {
  apiBaseUrl: process.env.API_URL || "http://localhost:3001", // Should align with RSS_API_PATHS
  // ... other properties
};

// BookmakerRouter uses apiBaseUrl from context
const router = new BookmakerRouter();
// router.getOddsEndpoint() uses context.apiBaseUrl + bookmaker path
```

## 10. [INTEGRATION.REFERENCES.RG] See Also

- [Telegram Dev Setup Guide](./TELEGRAM-DEV-SETUP.md) - Complete integration documentation
- [HTMLRewriter Service](../src/services/ui-context-rewriter.ts) - Base context injection
- [Telegram Mini App Context](../src/telegram/mini-app-context.ts) - Context merge implementation
- [Bookmaker Router](../src/telegram/bookmaker-router.ts) - Routing implementation
- [BUN-RSS-INTEGRATION.md](./BUN-RSS-INTEGRATION.md) - Constants system documentation
- [RFC 001 Integration Summary](./9.1.1.9.1-RFC-INTEGRATION-SUMMARY.md) - Deep-link standard integration
