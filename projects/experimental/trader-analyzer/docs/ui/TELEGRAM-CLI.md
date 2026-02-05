# Telegram Group Management CLI

**Comprehensive CLI tool for managing Telegram supergroups with logging and thread management**

---

## Quick Start

```bash
# Show help
bun run telegram help

# Send a message
bun run telegram send "Hello world!" --topic 2 --pin

# List topics
bun run telegram list-topics

# View message history
bun run telegram history --limit=20
```

---

## Features

### ✅ Message Management
- Send messages to any topic/thread
- Pin messages automatically
- Full message logging (JSONL format)
- Message history with filtering

### ✅ Topic Discovery
- Discover valid topics by testing thread IDs
- List forum topics (if API available)
- Thread ID management

### ✅ Topic Management
- Create new forum topics
- Edit topic names and icons
- Close/reopen topics
- Delete topics

### ✅ Changelog & RSS Feed Integration
- Post git changelog to Telegram (Topic 6)
- Post RSS feed updates (Topic 7)
- Automated monitoring service
- CI/CD integration support

### ✅ Logging
- All actions logged to `data/telegram-logs/telegram-YYYY-MM-DD.jsonl`
- Searchable message history
- Filter by topic/thread ID
- Success/failure tracking

---

## Commands

### Send Message

```bash
bun run telegram send "Your message" [--topic <id>] [--pin]
```

**Examples:**
```bash
# Send to general chat
bun run telegram send "Hello!"

# Send to topic 2
bun run telegram send "Hello topic 2!" --topic 2

# Send and pin to topic 6
bun run telegram send "Important update" --topic 6 --pin
```

---

### List Topics

```bash
bun run telegram list-topics
```

Lists all forum topics in the supergroup (if API supports it).

---

### Discover Topics

```bash
bun run telegram discover-topics [--max=<n>]
```

Tests thread IDs from 1 to N to find valid topics. Default max: 20.

**Example:**
```bash
# Test topics 1-50
bun run telegram discover-topics --max=50
```

---

### Message History

```bash
bun run telegram history [--limit=<n>] [--topic=<id>]
```

View logged message history.

**Examples:**
```bash
# Last 50 messages
bun run telegram history

# Last 10 messages
bun run telegram history --limit=10

# Messages from topic 2
bun run telegram history --topic=2

# Last 5 messages from topic 6
bun run telegram history --topic=6 --limit=5
```

---

### Create Topic

```bash
bun run telegram create-topic "Topic Name" [--color=<0-5>] [--emoji=<emoji_id>]
```

**Examples:**
```bash
# Simple topic
bun run telegram create-topic "New Topic"

# With color (0-5)
bun run telegram create-topic "Sports" --color=3

# With custom emoji
bun run telegram create-topic "Crypto" --emoji=🎯
```

---

### Edit Topic

```bash
bun run telegram edit-topic <thread_id> [--name="New Name"] [--emoji=<emoji_id>]
```

**Examples:**
```bash
# Rename topic 5
bun run telegram edit-topic 5 --name="Updated Name"

# Change emoji for topic 2
bun run telegram edit-topic 2 --emoji=🚀
```

---

### Close Topic

```bash
bun run telegram close-topic <thread_id>
```

**Example:**
```bash
bun run telegram close-topic 5
```

---

### Reopen Topic

```bash
bun run telegram reopen-topic <thread_id>
```

**Example:**
```bash
bun run telegram reopen-topic 5
```

---

### Delete Topic

```bash
bun run telegram delete-topic <thread_id>
```

**Example:**
```bash
bun run telegram delete-topic 5
```

---

## Changelog & RSS Feed

### Post Changelog

Post recent git commits to the Changelog topic (Topic 6):

```bash
# Post last 5 commits
bun run telegram:changelog

# Post last 10 commits
bun run telegram:changelog 10

# Post to custom topic
bun run telegram:changelog 5 8
```

### Post RSS Feed

Post RSS feed items to the CI/CD & RSS Feed topic (Topic 7):

```bash
# Post last 5 RSS items
bun run telegram:rss

# Post last 10 RSS items
bun run telegram:rss 10

# Filter by category (e.g., CI/CD)
bun run telegram:rss 5 7 ci
```

### Feed Monitor Service

Start automated monitoring service:

```bash
# Start monitoring (checks every hour for changelog, every 30min for RSS)
bun run feed-monitor start

# Or use alias
bun run telegram:monitor
```

See [Changelog & RSS Feed Documentation](./docs/TELEGRAM-CHANGELOG-RSS.md) for details.

---

## Logging

All actions are automatically logged to JSONL files:

**Location:** `data/telegram-logs/telegram-YYYY-MM-DD.jsonl`

**Log Format:**
```json
{
  "timestamp": "2025-01-04T12:34:56.789Z",
  "threadId": 2,
  "messageId": 80,
  "message": "Your message",
  "pinned": true,
  "success": true,
  "error": null
}
```

**Customize log directory:**
```bash
export TELEGRAM_LOG_DIR=/path/to/logs
bun run telegram send "Message"
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot API token | ✅ Yes |
| `TELEGRAM_CHAT_ID` | Supergroup chat ID | ✅ Yes |
| `TELEGRAM_LOG_DIR` | Log directory path | ❌ No (default: `data/telegram-logs`) |

**Loading from Bun.secrets:**
The CLI automatically tries to load credentials from `Bun.secrets` if environment variables are not set:
- `nexus.telegram.botToken`
- `nexus.telegram.chatId`

---

## Examples

### Daily Workflow

```bash
# Check what topics exist
bun run telegram discover-topics --max=30

# Send daily update to topic 2
bun run telegram send "📊 Daily stats update..." --topic 2 --pin

# Check recent messages
bun run telegram history --limit=10
```

### Topic Management

```bash
# Create a new topic for alerts
bun run telegram create-topic "Alerts" --color=1

# Send to the new topic (check thread ID from create output)
bun run telegram send "Alert system active" --topic 7 --pin

# Later, rename it
bun run telegram edit-topic 7 --name="Trading Alerts"
```

### Debugging

```bash
# View all messages from topic 2
bun run telegram history --topic=2

# Test if topic 15 exists
bun run telegram send "Test" --topic 15
```

---

## Integration with API

The CLI uses the same `TelegramBotApi` class as the API endpoints, so all actions are consistent:

- CLI: `bun run telegram send "Message" --topic 2`
- API: `POST /telegram/topics/2/send {"message": "Message"}`

Both use the same logging system and authentication.

---

## Troubleshooting

### "TELEGRAM_BOT_TOKEN not set"
Set the environment variable or configure Bun.secrets:
```bash
export TELEGRAM_BOT_TOKEN=your_token
```

### "Could not fetch topics via API"
The `getForumTopics` API may not be available if:
- The bot doesn't have admin permissions
- The supergroup isn't configured as a forum
- Telegram API limitations

You can still use topics by specifying `--topic <id>` directly.

### "No messages found" in history
The log file is created on first message. Send a test message first.

---

## See Also

- API Endpoints: `/telegram/topics/*` in `src/api/routes.ts`
- TelegramBotApi: `src/api/telegram-ws.ts`
- WebSocket Server: `src/api/telegram-ws.ts` (TelegramWebSocketServer)
