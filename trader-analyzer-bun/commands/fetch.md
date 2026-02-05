# Fetch CLI

**11.4.0.0.0.0.0: Trade Data Import & Exchange Integration**

Trade data import and exchange integration CLI.

**Cross-Reference:**
- `7.5.2.0.0.0.0` → Bun.file() for file reading
- `7.5.4.0.0.0.0` → Bun.write() for file writing
- `7.5.5.0.0.0.0` → Standard streams (stdin/stdout/stderr)

## 11.4.0.1.0.0.0: Usage

```bash
bun run fetch <command> [options]
```

## 11.4.0.2.0.0.0: Commands

### 11.4.1.0.0.0.0: Data Import

#### `import <file> [name]`

Import trades from CSV/JSON file.

**Arguments:**
- `<file>` - File path (CSV or JSON)
- `[name]` - Optional stream name

**Example:**
```bash
bun run fetch import bitmex_executions.csv "BitMEX Trades"
```

### 11.4.2.0.0.0.0: Exchange API Integration

#### `api <exchange> <key> <secret> [symbol]`

Fetch trades from exchange API.

**Arguments:**
- `<exchange>` - Exchange name (e.g., `binance`, `bitmex`)
- `<key>` - API key
- `<secret>` - API secret
- `[symbol]` - Trading pair (e.g., `BTC/USD`)

**Example:**
```bash
bun run fetch api binance YOUR_KEY YOUR_SECRET BTC/USD
```

### 11.4.2.1.0.0.0: Sync Latest Trades

#### `sync`

Fetch latest trades from saved API credentials.

**Example:**
```bash
bun run fetch sync
```

### 11.4.1.1.0.0.0: Stream Management

#### `streams`

List all trade streams.

**Example:**
```bash
bun run fetch streams
```

### 11.4.1.2.0.0.0: Statistics & Analytics

#### `stats [--from] [--to]`

Show trading statistics.

**Options:**
- `--from <date>` - Start date (ISO format)
- `--to <date>` - End date (ISO format)

**Examples:**
```bash
bun run fetch stats
bun run fetch stats --from=2025-01-01 --to=2025-01-31
```

#### `profile`

Show trader profile analysis.

**Example:**
```bash
bun run fetch profile
```

#### `mm`

Show market-making statistics.

**Example:**
```bash
bun run fetch mm
```

### 11.4.2.2.0.0.0: Prediction Markets

#### `polymarket <address>`

Fetch trades from Polymarket.

**Example:**
```bash
bun run fetch polymarket 0x1234...
```

#### `kalshi <email> <password>`

Fetch trades from Kalshi.

**Example:**
```bash
bun run fetch kalshi user@example.com password
```

#### `markets [platform]`

List prediction markets.

**Options:**
- `[platform]` - Filter by platform (`polymarket`, `kalshi`)

**Examples:**
```bash
bun run fetch markets
bun run fetch markets polymarket
```

### 11.4.1.3.0.0.0: Stream Cleanup

#### `clear [id]`

Remove trade stream(s).

**Arguments:**
- `[id]` - Stream ID (if omitted, clears all)

**Examples:**
```bash
bun run fetch clear stream-123
bun run fetch clear  # Clear all
```

## 11.4.3.0.0.0.0: Supported Exchanges

- **CCXT Exchanges:** Binance, BitMEX, Coinbase, etc.
- **Polymarket:** Prediction markets
- **Kalshi:** Prediction markets
- **Deribit:** Options and futures

## 11.4.4.0.0.0.0: File Formats

### 11.4.4.1.0.0.0: CSV Format

Expected columns:
- `timestamp` - Trade timestamp
- `price` - Trade price
- `size` - Trade size
- `side` - Buy/Sell
- `symbol` - Trading pair

### 11.4.4.2.0.0.0: JSON Format

Expected structure:
```json
[
  {
    "timestamp": 1234567890,
    "price": 50000,
    "size": 0.1,
    "side": "buy",
    "symbol": "BTC/USD"
  }
]
```

## 11.4.5.0.0.0.0: Examples

```bash
# Import from CSV
bun run fetch import bitmex_executions.csv

# Fetch from Binance
bun run fetch api binance KEY SECRET BTC/USD

# Sync latest trades
bun run fetch sync

# View statistics
bun run fetch stats --from=2025-01-01

# View trader profile
bun run fetch profile

# List markets
bun run fetch markets polymarket
```

## 11.4.6.0.0.0.0: Implementation Details

- Uses `Bun.file()` for file I/O
- Supports multiple exchange providers
- Stores streams in SQLite database
- Provides analytics and statistics

## 11.4.7.0.0.0.0: See Also

- [Fetch Source](../src/cli/fetch.ts)
- [Providers](../src/providers/)
- [Analytics](../src/analytics/)
