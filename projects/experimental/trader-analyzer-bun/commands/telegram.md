# Telegram CLI

**11.1.0.0.0.0.0: Telegram Supergroup Management & Alert System**

Telegram supergroup management and alert system CLI.

**Cross-Reference:**
- `9.1.1.x.x.x.x` → Telegram Integration Subsystem
- `7.5.2.0.0.0.0` → Bun.file() for log file operations
- `7.5.4.0.0.0.0` → Bun.write() for log writing
- `10.0.0.0.0.0.0` → Authentication & Session Management

## 11.1.0.1.0.0.0: Usage

```bash
bun run telegram <command> [options]
```

## 11.1.0.2.0.0.0: Commands

### 11.1.1.0.0.0.0: Message Management

#### 11.1.1.1.0.0.0: `send <message> [options]`

Send a message to the Telegram supergroup.

**Options:**
- `--topic <id>` - Send to specific topic/thread
- `--pin` - Pin the message

**Examples:**
```bash
bun run telegram send "Hello, world!"
bun run telegram send "Alert!" --topic 2 --pin
```

#### 11.1.1.2.0.0.0: `list-topics`

List all forum topics in the supergroup.

**Example:**
```bash
bun run telegram list-topics
```

#### 11.1.1.3.0.0.0: `discover-topics [--max=<n>]`

Discover valid topics by testing thread IDs.

**Options:**
- `--max=<n>` - Maximum thread ID to test (default: 20)

**Example:**
```bash
bun run telegram discover-topics --max=50
```

#### 11.1.1.4.0.0.0: `history [options]`

View message history.

**Options:**
- `--limit=<n>` - Number of messages to show (default: 50)
- `--topic=<id>` - Filter by topic ID

**Examples:**
```bash
bun run telegram history
bun run telegram history --topic=2 --limit=10
```

### 11.1.2.0.0.0.0: Topic Management

#### 11.1.2.1.0.0.0: `create-topic <name> [options]`

Create a new forum topic.

**Options:**
- `--color=<0-5>` - Icon color (0-5)
- `--emoji=<emoji_id>` - Custom emoji icon

**Example:**
```bash
bun run telegram create-topic "New Topic" --color=3
```

#### 11.1.2.2.0.0.0: `edit-topic <thread_id> [options]`

Edit an existing topic.

**Options:**
- `--name="New Name"` - Update topic name
- `--emoji=<emoji_id>` - Update emoji icon

**Example:**
```bash
bun run telegram edit-topic 5 --name="Updated Name"
```

#### 11.1.2.3.0.0.0: `close-topic <thread_id>`

Close a topic (makes it read-only).

**Example:**
```bash
bun run telegram close-topic 5
```

#### 11.1.2.4.0.0.0: `reopen-topic <thread_id>`

Reopen a closed topic.

**Example:**
```bash
bun run telegram reopen-topic 5
```

#### 11.1.2.5.0.0.0: `delete-topic <thread_id>`

Delete a topic permanently.

**Example:**
```bash
bun run telegram delete-topic 5
```

### 11.1.3.0.0.0.0: Covert Steam Alerts

#### 11.1.3.1.0.0.0: `covert-steam send <event_id> [options]`

Send a Covert Steam alert.

**Options:**
- `--timestamp=<ms>` - Detection timestamp (default: now)
- `--bookmaker=<name>` - Bookmaker name
- `--node=<node_id>` - Source dark node ID
- `--severity=<0-10>` - Impact severity score
- `--topic=<id>` - Topic ID (default: 2)
- `--pin` - Pin message (auto if severity >= 9)
- `--no-pin` - Don't pin message

**Example:**
```bash
bun run telegram covert-steam send "NFL-2025-001" --severity=9.5 --bookmaker="DraftKings"
```

#### 11.1.3.2.0.0.0: `covert-steam format <event_id> [options]`

Format alert without sending (preview).

**Options:**
- `--timestamp=<ms>` - Detection timestamp
- `--bookmaker=<name>` - Bookmaker name
- `--node=<node_id>` - Source dark node ID
- `--severity=<0-10>` - Impact severity score

**Example:**
```bash
bun run telegram covert-steam format "NFL-2025-001" --severity=7.5
```

#### 11.1.3.3.0.0.0: `covert-steam list-topics`

List available topics for routing.

**Example:**
```bash
bun run telegram covert-steam list-topics
```

#### 11.1.3.4.0.0.0: `covert-steam test-credentials`

Test Telegram credentials.

**Example:**
```bash
bun run telegram covert-steam test-credentials
```

#### 11.1.3.5.0.0.0: `covert-steam severity-info <score>`

Get severity level information.

**Example:**
```bash
bun run telegram covert-steam severity-info 9.5
```

## 11.1.4.0.0.0.0: Environment Variables

- `TELEGRAM_BOT_TOKEN` - Bot token (required)
- `TELEGRAM_CHAT_ID` - Chat/supergroup ID (required)
- `TELEGRAM_LOG_DIR` - Log directory (optional, default: `data/telegram-logs`)

## 11.1.5.0.0.0.0: Logging

All actions are logged to: `data/telegram-logs/telegram-YYYY-MM-DD.jsonl`

Set `TELEGRAM_LOG_DIR` to customize the log directory.

## 11.1.6.0.0.0.0: Examples

```bash
# Send a simple message
bun run telegram send "Hello!"

# Send to a topic with pin
bun run telegram send "Important alert!" --topic 2 --pin

# List all topics
bun run telegram list-topics

# Discover valid topics
bun run telegram discover-topics --max=50

# View history for a topic
bun run telegram history --topic=2 --limit=10

# Create a new topic
bun run telegram create-topic "New Topic" --color=3

# Send Covert Steam alert
bun run telegram covert-steam send "NFL-2025-001" --severity=9.5 --bookmaker="DraftKings"
```

## 11.1.7.0.0.0.0: Implementation Details

- Uses `Bun.file()` for file I/O (log files)
- Uses `node:fs/promises.mkdir()` for directory creation
- All file operations are async
- Logs are stored in JSONL format

## 11.1.8.0.0.0.0: See Also

- [Telegram API](../src/api/telegram-ws.ts)
- [Covert Steam Alerts](../src/telegram/covert-steam-alert.ts)
