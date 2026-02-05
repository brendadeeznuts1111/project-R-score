# Telegram Naming Standards

**Standardized naming conventions for Telegram integration**

---

## Overview

This document defines the standardized naming conventions for all Telegram-related code, configuration, and environment variables.

---

## Variable Naming (Code)

### camelCase for Variables

**Standard:**
- `chatId`: `string | number` - Chat/supergroup ID
- `threadId`: `number` - Topic/thread ID (preferred)
- `topicId`: `number` - Alias for threadId (deprecated, use threadId)
- `messageId`: `number` - Telegram message ID
- `botToken`: `string` - Bot API token

**Examples:**
```typescript
const chatId = process.env.TELEGRAM_CHAT_ID;
const threadId = 2;
const messageId = result.result?.message_id;
```

---

## API Parameter Naming (Telegram Bot API)

### snake_case for API Parameters

**Standard:**
- `chat_id`: `string | number` - Chat/supergroup ID
- `message_thread_id`: `number` - Topic/thread ID (optional)
- `message_id`: `number` - Message ID
- `bot_token`: `string` - Bot API token (in URL)

**Examples:**
```typescript
const params = new URLSearchParams({
  chat_id: String(chatId),
  message_thread_id: String(threadId),
  text: message,
});
```

---

## Environment Variables

### UPPER_SNAKE_CASE

**Standard Variables:**
- `TELEGRAM_BOT_TOKEN` - Bot API token (required)
- `TELEGRAM_CHAT_ID` - Chat/supergroup ID (required)
- `TELEGRAM_LIVE_TOPIC_ID` - Default live topic thread ID (optional)
- `TELEGRAM_LOG_DIR` - Log directory path (optional)

**Deprecated:**
- `TELEGRAM_SUPERGROUP_ID` - Use `TELEGRAM_CHAT_ID` instead

**Examples:**
```bash
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_CHAT_ID="-1001234567890"
export TELEGRAM_LIVE_TOPIC_ID="2"
```

---

## Bun.secrets Keys

### Service: `nexus`

**Standard Keys:**
- `telegram.botToken` - Bot API token
- `telegram.chatId` - Chat/supergroup ID
- `telegram.liveTopicId` - Default live topic thread ID

**Examples:**
```typescript
const botToken = await Bun.secrets.get({
  service: "nexus",
  name: "telegram.botToken",
});
```

---

## Constants

### UPPER_SNAKE_CASE for Constants

**Location:** `src/telegram/constants.ts`

**Standard Constants:**
- `TELEGRAM_ENV.*` - Environment variable names
- `TELEGRAM_SECRETS.*` - Bun.secrets keys
- `TELEGRAM_DEFAULTS.*` - Default values
- `GOLDEN_SUPERGROUP_CONFIG` - Golden supergroup template

**Examples:**
```typescript
import { TELEGRAM_ENV, TELEGRAM_SECRETS } from "./telegram/constants";

const botToken = process.env[TELEGRAM_ENV.BOT_TOKEN];
```

---

## Function/Method Naming

### camelCase for Functions

**Standard Patterns:**
- `sendMessage(chatId, text, threadId?)` - Send message
- `pinMessage(chatId, messageId, threadId?)` - Pin message
- `getForumTopics(chatId)` - Get topics
- `createForumTopic(chatId, name, ...)` - Create topic

**Examples:**
```typescript
async function sendMessage(
  chatId: string | number,
  text: string,
  threadId?: number,
): Promise<TelegramBotApiResponse> {
  // ...
}
```

---

## Type/Interface Naming

### PascalCase for Types

**Standard Types:**
- `TelegramBotApiResponse` - API response type
- `GoldenSupergroupConfig` - Golden supergroup config
- `MessageLog` - Message log entry
- `TelegramConfig` - Configuration type

**Examples:**
```typescript
interface TelegramConfig {
  botToken: string;
  chatId: string;
  logDir: string;
}
```

---

## File Naming

### kebab-case.ts for Files

**Standard Files:**
- `telegram-ws.ts` - WebSocket server
- `telegram-bot.ts` - Bot state management
- `telegram.ts` - CLI tool
- `golden-supergroup.ts` - Golden supergroup setup
- `constants.ts` - Constants

---

## Migration Guide

### From Old Naming to New

**Variables:**
- `chat_id` → `chatId`
- `thread_id` → `threadId`
- `topic_id` → `threadId` (deprecated)
- `message_id` → `messageId`

**Environment Variables:**
- `TELEGRAM_SUPERGROUP_ID` → `TELEGRAM_CHAT_ID`

**API Parameters:**
- Keep `chat_id`, `message_thread_id`, `message_id` (Telegram API standard)

---

## Examples

### ✅ Correct Usage

```typescript
// Variables
const chatId = process.env.TELEGRAM_CHAT_ID;
const threadId = 2;

// API call
const params = new URLSearchParams({
  chat_id: String(chatId),        // snake_case for API
  message_thread_id: String(threadId),
});

// Function call
await api.sendMessage(chatId, text, threadId);  // camelCase for code
```

### ❌ Incorrect Usage

```typescript
// Don't mix naming conventions
const chat_id = process.env.TELEGRAM_CHAT_ID;  // ❌ Use chatId
const thread_id = 2;                           // ❌ Use threadId

// Don't use deprecated names
const topicId = 2;  // ❌ Use threadId instead
```

---

## See Also

- `NAMING-CONVENTIONS.md` - General naming conventions
- `src/telegram/constants.ts` - Standard constants
- `TELEGRAM-CLI.md` - CLI tool documentation
