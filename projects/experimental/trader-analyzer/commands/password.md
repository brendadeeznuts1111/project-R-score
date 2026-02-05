# Password CLI

**11.8.0.0.0.0.0: Password Generation Utilities**

Password generation and management utilities.

**Cross-Reference:**
- `7.2.x.x.x.x.x` → Cryptographic Operations
- `7.2.1.0.0.0.0` → UUID generation (similar pattern)

## 11.8.0.1.0.0.0: Usage

```bash
bun run password <command> [options]
```

## 11.8.0.2.0.0.0: Commands

### 11.8.1.0.0.0.0: Password Generation

#### 11.8.1.1.0.0.0: `generate [options]`

Generate a secure password.

**Options:**
- `--length=<n>` - Password length (default: 16)
- `--no-symbols` - Exclude symbols
- `--no-numbers` - Exclude numbers
- `--no-uppercase` - Exclude uppercase letters
- `--no-lowercase` - Exclude lowercase letters

**Examples:**
```bash
# Generate default password
bun run password generate

# Generate 32-character password
bun run password generate --length=32

# Generate alphanumeric only
bun run password generate --no-symbols
```

## 11.8.2.0.0.0.0: Implementation Details

- Uses `Bun.CryptoHasher` for secure random generation
- Configurable character sets
- Cryptographically secure

## 11.8.3.0.0.0.0: Examples

```bash
# Generate secure password
bun run password generate

# Generate long password
bun run password generate --length=64

# Generate simple password (no symbols)
bun run password generate --no-symbols
```

## 11.8.4.0.0.0.0: See Also

- [Password Source](../src/cli/password.ts)
