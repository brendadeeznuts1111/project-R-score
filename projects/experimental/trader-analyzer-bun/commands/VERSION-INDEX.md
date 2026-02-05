# CLI Commands Version Index

**11.0.0.0.0.0.0: Complete Version Reference**

Complete index of all version numbers used in CLI command documentation.

## Version Statistics

- **Total Versions:** 124
- **Documentation Files:** 11
- **Major Commands:** 8 (11.1-11.8)
- **Sub-categories:** 30+
- **Individual Commands:** 60+

### Version Distribution by File

- `README.md`: 26 versions
- `dashboard.md`: 21 versions
- `telegram.md`: 20 versions
- `security.md`: 17 versions
- `fetch.md`: 12 versions
- `mcp.md`: 9 versions
- `management.md`: 7 versions
- `github.md`: 5 versions
- `password.md`: 3 versions
- `VERSIONING.md`: 53 versions (system documentation)
- `VERSION-INDEX.md`: 113 versions (this index)

## Complete Version Tree

### 11.0.0.0.0.0.0: CLI Commands Subsystem (Root)

- `11.0.1.0.0.0.0` - CLI Argument Parsing
- `11.0.2.0.0.0.0` - Environment Variables
- `11.0.3.0.0.0.0` - Bun.shell Integration
- `11.0.4.0.0.0.0` - Bun.file() Operations
- `11.0.5.0.0.0.0` - Bun.spawn() Integration

### 11.1.0.0.0.0.0: Telegram Management

- `11.1.1.0.0.0.0` - Message Management
  - `11.1.1.1.0.0.0` - send command
  - `11.1.1.2.0.0.0` - list-topics command
  - `11.1.1.3.0.0.0` - discover-topics command
  - `11.1.1.4.0.0.0` - history command
- `11.1.2.0.0.0.0` - Topic Management
  - `11.1.2.1.0.0.0` - create-topic command
  - `11.1.2.2.0.0.0` - edit-topic command
  - `11.1.2.3.0.0.0` - close-topic command
  - `11.1.2.4.0.0.0` - reopen-topic command
  - `11.1.2.5.0.0.0` - delete-topic command
- `11.1.3.0.0.0.0` - Covert Steam Alerts
  - `11.1.3.1.0.0.0` - covert-steam send command
  - `11.1.3.2.0.0.0` - covert-steam format command
  - `11.1.3.3.0.0.0` - covert-steam list-topics command
  - `11.1.3.4.0.0.0` - covert-steam test-credentials command
  - `11.1.3.5.0.0.0` - covert-steam severity-info command
- `11.1.4.0.0.0.0` - Environment Variables
- `11.1.5.0.0.0.0` - Logging

### 11.2.0.0.0.0.0: MCP Tools Execution

- `11.2.1.0.0.0.0` - Tool Listing
- `11.2.2.0.0.0.0` - Tool Execution
- `11.2.3.0.0.0.0` - Tool Categories
  - `11.2.3.1.0.0.0` - Bun Tooling Tools
  - `11.2.3.2.0.0.0` - Shell Tools
  - `11.2.3.3.0.0.0` - Documentation Tools
  - `11.2.3.4.0.0.0` - Research Tools
  - `11.2.3.5.0.0.0` - Bun Utils Tools

### 11.3.0.0.0.0.0: Live Dashboard

- `11.3.1.0.0.0.0` - Options
- `11.3.2.0.0.0.0` - Keyboard Controls
  - `11.3.2.1.0.0.0` - Navigation
  - `11.3.2.2.0.0.0` - Views
- `11.3.3.0.0.0.0` - Features
- `11.3.4.0.0.0.0` - Data Sources
- `11.3.5.0.0.0.0` - Sharp Books Registry
- `11.3.6.0.0.0.0` - Environment Variables
- `11.3.7.0.0.0.0` - Views
  - `11.3.7.1.0.0.0` - Overview (Default)
  - `11.3.7.2.0.0.0` - Arbitrage View (`a`)
  - `11.3.7.3.0.0.0` - Streams View (`s`)
  - `11.3.7.4.0.0.0` - Trading View (`w`)
  - `11.3.7.5.0.0.0` - Sports Betting View (`o`)
  - `11.3.7.6.0.0.0` - Bot View (`b`)
  - `11.3.7.7.0.0.0` - Tools View (`t`)
  - `11.3.7.8.0.0.0` - Metrics View (`m`)
  - `11.3.7.9.0.0.0` - Logs View (`l`)
  - `11.3.7.10.0.0.0` - Rankings View (`k`)

### 11.4.0.0.0.0.0: Data Import

- `11.4.1.0.0.0.0` - Data Import
  - `11.4.1.1.0.0.0` - Stream Management (streams command)
  - `11.4.1.2.0.0.0` - Statistics & Analytics (stats, profile, mm commands)
  - `11.4.1.3.0.0.0` - Stream Cleanup (clear command)
- `11.4.2.0.0.0.0` - Exchange API Integration
  - `11.4.2.1.0.0.0` - Sync Latest Trades (sync command)
  - `11.4.2.2.0.0.0` - Prediction Markets (polymarket, kalshi, markets commands)
- `11.4.3.0.0.0.0` - Supported Exchanges
- `11.4.4.0.0.0.0` - File Formats
  - `11.4.4.1.0.0.0` - CSV Format
  - `11.4.4.2.0.0.0` - JSON Format

### 11.5.0.0.0.0.0: Security Testing

- `11.5.1.0.0.0.0` - Penetration Testing
  - `11.5.1.1.0.0.0` - pentest web command
  - `11.5.1.2.0.0.0` - pentest api command
  - `11.5.1.3.0.0.0` - pentest quick command
- `11.5.2.0.0.0.0` - Security Headers
  - `11.5.2.1.0.0.0` - headers analyze command
  - `11.5.2.2.0.0.0` - headers optimize command
  - `11.5.2.3.0.0.0` - headers impl command
- `11.5.3.0.0.0.0` - Subresource Integrity (SRI)
  - `11.5.3.1.0.0.0` - sri generate command
  - `11.5.3.2.0.0.0` - sri verify command
  - `11.5.3.3.0.0.0` - sri enforce command
  - `11.5.3.4.0.0.0` - sri hash command
- `11.5.4.0.0.0.0` - Output Formats
  - `11.5.4.1.0.0.0` - Text Output (Default)
  - `11.5.4.2.0.0.0` - JSON Output

### 11.6.0.0.0.0.0: System Management

- `11.6.1.0.0.0.0` - Service Management
  - `11.6.1.1.0.0.0` - status command
  - `11.6.1.2.0.0.0` - start command
  - `11.6.1.3.0.0.0` - stop command
  - `11.6.1.4.0.0.0` - restart command

### 11.7.0.0.0.0.0: GitHub Integration

- `11.7.1.0.0.0.0` - Repository Management
  - `11.7.1.1.0.0.0` - repo command
- `11.7.2.0.0.0.0` - Issue Management
  - `11.7.2.1.0.0.0` - issue command

### 11.8.0.0.0.0.0: Password Utilities

- `11.8.1.0.0.0.0` - Password Generation
  - `11.8.1.1.0.0.0` - generate command

## Version Lookup

### By Command Name

| Command | Version | File |
|---------|---------|------|
| telegram send | `11.1.1.1.0.0.0` | telegram.md |
| telegram list-topics | `11.1.1.2.0.0.0` | telegram.md |
| telegram create-topic | `11.1.2.1.0.0.0` | telegram.md |
| mcp list | `11.2.1.0.0.0.0` | mcp.md |
| mcp exec | `11.2.2.0.0.0.0` | mcp.md |
| dashboard | `11.3.0.0.0.0.0` | dashboard.md |
| fetch import | `11.4.1.0.0.0.0` | fetch.md |
| fetch api | `11.4.2.0.0.0.0` | fetch.md |
| security pentest web | `11.5.1.1.0.0.0` | security.md |
| security sri generate | `11.5.3.1.0.0.0` | security.md |
| management status | `11.6.1.1.0.0.0` | management.md |
| github repo | `11.7.1.1.0.0.0` | github.md |
| password generate | `11.8.1.1.0.0.0` | password.md |

## Cross-Reference Matrix

All commands reference related subsystems:

- `7.0.0.0.0.0.0` → Bun Runtime Utilities
- `7.4.x.x.x.x.x` → Process & Execution (Bun.spawn, Bun.shell)
- `7.5.x.x.x.x.x` → File & Stream Operations (Bun.file, Bun.write)
- `9.1.1.x.x.x.x` → Telegram Integration
- `10.0.0.0.0.0.0` → Authentication & Session Management
- `6.0.0.0.0.0.0` → Market Intelligence Visualization

## Version Format Rules

1. **Major Command**: `11.X.0.0.0.0.0` (X = 1-8)
2. **Sub-category**: `11.X.Y.0.0.0.0` (Y increments per sub-category)
3. **Feature Group**: `11.X.Y.Z.0.0.0` (Z increments per feature)
4. **Sub-feature**: `11.X.Y.Z.A.0.0` (A increments per sub-feature)
5. **Implementation**: `11.X.Y.Z.A.B.0` (B increments per implementation)
6. **Variant**: `11.X.Y.Z.A.B.C` (C increments per variant)

## See Also

- [README.md](./README.md) - Commands overview
- [VERSIONING.md](./VERSIONING.md) - Versioning system documentation
- [Bun Runtime Utilities](../src/runtime/bun-native-utils-complete.ts) - Version `7.0.0.0.0.0.0`
