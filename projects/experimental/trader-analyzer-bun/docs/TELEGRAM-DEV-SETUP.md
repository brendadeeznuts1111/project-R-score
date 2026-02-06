# Telegram Integration & Mini App Development Guide
**Document ID: 9.1.1.0.0.0.0** | **Last Updated: 2025-01-06**
**Cross-Reference Hub: See `6.1.1.2.2.x.x` for HTMLRewriter UI Context Injection**

---

## 9.1.1.1.0: Secure Telegram Bot Foundation

### 9.1.1.1.1: Secret Management via Bun.secrets
```typescript
// @see 6.1.1.2.2.1.2.1 for apiBaseUrl derivation pattern
// @see src/telegram/covert-steam-sender.ts for implementation (9.1.1.1.1.1.0)
// @see src/telegram/constants.ts for TELEGRAM_SECRETS constants (9.1.1.1.1.0.0)

// Credential loading priority (per 9.1.1.1.1.1.0 and 9.1.1.1.1.2.0):
// 1. Bun.secrets (preferred, secure OS-native storage)
// 2. Environment variables (fallback for development/CI)

// Implementation pattern from src/telegram/covert-steam-sender.ts:
import { TELEGRAM_SECRETS } from "./telegram/constants";

async function loadTelegramCredentials() {
  let botToken: string | undefined;
  let chatId: string | undefined;

  try {
    // Bun.secrets is async in Bun 1.3+
    if (typeof Bun !== "undefined" && Bun.secrets) {
      botToken = await Bun.secrets.get({
        service: TELEGRAM_SECRETS.SERVICE,  // "nexus"
        name: TELEGRAM_SECRETS.BOT_TOKEN,    // "telegram.botToken"
      });
      chatId = await Bun.secrets.get({
        service: TELEGRAM_SECRETS.SERVICE,
        name: TELEGRAM_SECRETS.CHAT_ID,      // "telegram.chatId"
      });
    }
  } catch (error) {
    // Bun.secrets might not be available, fall back to env vars
    console.warn("⚠️  Bun.secrets not available, falling back to environment variables");
  }

  // Fallback to environment variables per 9.1.1.1.1.2.0
  botToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
  chatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not found. " +
      "Set using: bun secret set telegram.botToken 'your_token'"
    );
  }

  return { botToken, chatId };
}

// Webhook secret generation (if needed)
const WEBHOOK_SECRET = Bun.secrets?.TELEGRAM_WEBHOOK_SECRET || crypto.randomUUID();
```

**Cross-System Formula:**
- **HTMLRewriter injects:** `window.HYPERBUN_UI_CONTEXT.apiBaseUrl` (see 6.1.1.2.2.2.1.0)
- **Telegram Mini App receives:** `window.Telegram.WebApp.initDataUnsafe.start_param` (see 9.1.1.2.1.3)
- **Synthesis:** Mini App constructs API calls using injected context + Telegram auth (see 9.1.1.2.1.4)

**Implementation Reference:**
- Secret loading: `src/telegram/covert-steam-sender.ts` - `loadCovertSteamTelegramCredentials()` (9.1.1.1.1.1.0)
- Constants: `src/telegram/constants.ts` - `TELEGRAM_SECRETS` (9.1.1.1.1.0.0)
- Service name: `"nexus"` (from `TELEGRAM_SECRETS.SERVICE`)
- Secret names: `"telegram.botToken"`, `"telegram.chatId"` (from `TELEGRAM_SECRETS`)

**Setting Secrets:**
```bash
# Set bot token
bun secret set telegram.botToken "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# Set chat ID
bun secret set telegram.chatId "-1001234567890"

# Verify secrets are set
bun secret list | grep telegram
```
- Service name: `"nexus"` (from `TELEGRAM_SECRETS.SERVICE`)
- Secret names: `"telegram.botToken"`, `"telegram.chatId"` (from `TELEGRAM_SECRETS`)

**Setting Secrets:**
```bash
# Set bot token
bun secret set telegram.botToken "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# Set chat ID
bun secret set telegram.chatId "-1001234567890"

# Verify secrets are set
bun secret list | grep telegram
```

---

## 9.1.1.2.0: Trading UI Telegram Mini App Architecture

### 9.1.1.2.1: Mini App as UIContext Consumer
The Mini App is a **privileged UIContext receiver** that operates within Telegram's iframe sandbox.

```typescript
// src/telegram/mini-app-context.ts
/**
 * 9.1.1.2.1.0: Telegram-specific extension of HyperBunUIContext.
 * Inherits all properties from 6.1.1.2.2.1.2.0 and adds Telegram auth metadata.
 * @see 6.1.1.2.2.1.2.0 for base context interface
 */
export interface TelegramMiniAppContext extends HyperBunUIContext {
  /** 9.1.1.2.1.1: Telegram authentication hash for request signing */
  telegramAuthHash: string;
  /** 9.1.1.2.1.2: User's Telegram ID for RBAC federation */
  telegramUserId: number;
  /** 9.1.1.2.1.3: Start parameter for deep-linked scenarios (e.g., bookmaker-specific routing) */
  startParam?: string;
}

/**
 * 9.1.1.2.1.4: Injects combined Hyper-Bun + Telegram context into Mini App window.
 * Must be called AFTER HTMLRewriter's 6.1.1.2.2.2.1.0 injection and BEFORE Mini App initialization.
 * @example 9.1.1.2.2.0.0: Cross-System Context Merge Verification
 * // Test Formula:
 * // 1. Open Mini App with start_param="bookmaker:bet365"
 * // 2. Execute in Telegram WebApp console: `window.HYPERBUN_UI_CONTEXT.startParam === "bookmaker:bet365"`
 * // 3. Expected Result: `true` (context merged correctly)
 */
export function injectTelegramContext(baseContext: HyperBunUIContext): void {
  const telegramData = window.Telegram?.WebApp?.initDataUnsafe;
  if (!telegramData) {
    throw new Error('9.1.1.2.1.5: Telegram WebApp not available');
  }

  const combinedContext: TelegramMiniAppContext = {
    ...baseContext,
    telegramAuthHash: telegramData.hash,
    telegramUserId: telegramData.user?.id || 0,
    startParam: telegramData.start_param,
    // Override userRole based on Telegram authentication
    userRole: deriveRoleFromTelegram(telegramData.user?.id)
  };

  // 9.1.1.2.2.0.1: Atomic context replacement (HTMLRewriter's injection is base)
  Object.defineProperty(window, 'HYPERBUN_UI_CONTEXT', {
    value: Object.freeze(combinedContext),
    writable: false,
    configurable: false
  });
}
```

---

## 9.1.1.3.0: Modular Service Integration

### 9.1.1.3.1: Dynamic Bookmaker Routing via UIContext
```typescript
// src/telegram/bookmaker-router.ts
/**
 * 9.1.1.3.1.0: Routes Mini App requests to bookmaker-specific endpoints using UIContext.
 * Reads `startParam` (e.g., "bookmaker:bet365") to determine API route suffix.
 * @see 6.1.1.2.2.1.2.1 for apiBaseUrl usage pattern
 * @see 9.1.1.2.1.3 for startParam definition
 */
export class BookmakerRouter {
  private readonly context: TelegramMiniAppContext;

  constructor() {
    this.context = (window as any).HYPERBUN_UI_CONTEXT;
    if (!this.context) {
      throw new Error('9.1.1.3.1.1: UIContext not injected (see 6.1.1.2.2.2.1.0)');
    }
  }

  /**
   * 9.1.1.3.1.2: Constructs bookmaker-specific API endpoint.
   * @example
   * // Given apiBaseUrl="https://api.hyperbun.com" and startParam="bookmaker:bet365"
   * // Returns: "https://api.hyperbun.com/v1/bookmakers/bet365/odds"
   */
  getOddsEndpoint(): string {
    const bookmaker = this.context.startParam?.replace('bookmaker:', '');
    if (!bookmaker) {
      throw new Error('9.1.1.3.1.3: No bookmaker in start_param');
    }
    return `${this.context.apiBaseUrl}/v1/bookmakers/${bookmaker}/odds`;
  }
}
```

---

## 9.1.1.4.0: Advanced Message Formatting & GitHub Integration

### 9.1.1.4.1: HTMLRewriter-Powered Preview Generation
```typescript
// src/telegram/github-webhook-handler.ts
/**
 * 9.1.1.4.1.0: Generates Telegram-formatted deployment notifications using HTMLRewriter.
 * Reuses 6.1.1.2.2.2.4.0 timestamp implantation logic for consistent formatting.
 * @see 6.1.1.2.2.2.4.0 for timestamp formatting pattern
 */
export async function generateDeployMessage(commitSha: string): Promise<string> {
  // Use HTMLRewriter to parse and format GitHub's HTML payload
  const rewriter = new HTMLRewriter()
    .on('[data-server-timestamp]', {
      element: (el) => {
        el.setInnerContent(new Date().toISOString()); // Mirrors 6.1.1.2.2.2.4.0
      }
    });

  const html = `<b>Deploying commit:</b> <code>${commitSha}</code>\n` +
               `<i>Server time:</i> <span data-server-timestamp></span>`;

  const formatted = await rewriter.transform(new Response(html)).text();
  return formatted;
}
```

---

## 9.1.1.5.0: Deep-Linked Message RFC (Hyper-Bun Extension)

### 9.1.1.5.1: RFC Schema
```text
start_param format: "action:target:params"

Examples:
- "bookmaker:bet365:odds/live"
- "dashboard:shadowGraph:timeframe=1h" (see 6.1.1.2.2.1.2.2)
- "alert:covertSteam:severity=high" (see 9.1.1.9.2.3.0)
```

**Cross-Reference Validation:**
```bash
# Verify all start_param actions have corresponding UIContext features
rg -o "start_param=\"\w+:\w+:\w+\"" public/mini-app.html | while read line; do
  action=$(echo $line | cut -d: -f2)
  rg -q "featureFlags.*$action.*true" src/api/routes.ts || echo "Missing feature flag: $action"
done
```

---

## 9.1.1.6.0: Testing & Verification Formulas

### 9.1.1.6.1: Cross-System Integration Test Matrix

| Test ID | HTMLRewriter Component | Telegram Component | Verification Command | Expected Result |
|---------|------------------------|-------------------|---------------------|-----------------|
| `9.1.1.6.1.0` | `6.1.1.2.2.2.1.0` | `9.1.1.2.1.0` | `rg -c "telegramUserId" src/telegram/mini-app-context.ts` | `6` (found in code) |
| `9.1.1.6.1.1` | `6.1.1.2.2.1.2.1` | `9.1.1.3.1.2` | `bun test test/telegram/bookmaker-router.test.ts` | All 6 tests pass |
| `9.1.1.6.1.2` | `6.1.1.2.2.1.2.3` | `9.1.1.2.1.4` | `rg -A5 "deriveRoleFromTelegram" src/telegram/mini-app-context.ts` | Shows RBAC mapping |

---

## 9.1.1.7.0: Ripgrep Discovery Patterns

### 9.1.1.7.1: Finding All Cross-System References
```bash
# Discover every file that references BOTH systems
rg -l "6\.1\.1\.2\.2\.\d+\.\d+" | xargs rg -l "9\.1\.1\.\d+\.\d+\.\d+"

# Expected: src/telegram/mini-app-context.ts (shows integration point)

# Find orphaned documentation (referenced in docs but not code)
for doc in $(rg -o "9\.1\.1\.\d+\.\d+\.\d+" docs/TELEGRAM-DEV-SETUP.md | sort -u); do
  rg -q "$doc" src/ || echo "Orphaned doc ref: $doc"
done
```

---

## 9.1.1.8.0: Production Deployment Checklist

### 9.1.1.8.1: Pre-Flight Cross-System Validation
```bash
#!/bin/bash
# 9.1.1.8.1.0: Validate UIContext injection before Telegram bot startup

# 1. Verify HTMLRewriter service is responsive
curl -f http://localhost:3001/registry.html >/dev/null || exit 1

# 2. Check UIContext contains required fields for Mini App
curl -s http://localhost:3001/mini-app | rg -q "apiBaseUrl.*featureFlags" || exit 1

# 3. Ensure Telegram secrets are loaded
bun -e "console.log(Bun.secrets.TELEGRAM_BOT_TOKEN?.length > 0)" || exit 1

# 4. Semantic cross-reference integrity
rg "6\.1\.1\.2\.2\.2\.1\.0" src/telegram/mini-app-context.ts || exit 1

echo "9.1.1.8.1.1: Cross-system validation passed"
```

---

## Cross-System Integration Summary

The `9.x.x.x.x.x.x` and `6.1.1.2.2.x.x` numbering schemes create a **bidirectional navigable architecture**:

1. **Forward Reference**: Telegram docs (`9.1.1.2.1.0`) → Implementation (`6.1.1.2.2.1.2.0`)
2. **Backward Trace**: Code comment (`6.1.1.2.2.2.1.0`) → Telegram consumer (`9.1.1.2.1.4`)
3. **Ripgrep Unification**: `rg "6\.1\.1\.2\.2\.\d+\.\d+|9\.1\.1\.\d+\.\d+\.\d+" --type ts --type html` finds all integration points in a single command

This makes Hyper-Bun's architecture **mechanically auditable** - every cross-system dependency is a searchable, testable, numbered contract.
