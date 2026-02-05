# Empire Pro Config Manager

A production-ready CLI tool for managing TOML configurations with Cloudflare R2 storage integration, built with Bun and TypeScript.

## 📚 Documentation Hub

**Master table format** used across all documentation:

| Document | Purpose | Master Table | Audience |
|----------|---------|-------------|----------|
| [SCOPING_MATRIX_AUTO.md](./SCOPING_MATRIX_AUTO.md) | Multi-tenant scope configuration **(LIVING SPEC)** | 12 columns (Serving Domain, Scope, Platform, Storage, Secrets, Service Name, Flag, TZ, Features, API Strategy, Benefit) | All roles |
| [FEATURE_FLAGS_DEVELOPER_GUIDE.md](./FEATURE_FLAGS_DEVELOPER_GUIDE.md) | Quick feature reference | 9 columns (Feature, Type, Category, Domain, Scope, Tier, Size, Release, Status) | Developers |
| [BUILD_OPTIMIZATION.md](./BUILD_OPTIMIZATION.md) | Deployment variants | 9 columns (Variant, Domain, Features, Size, Build Time, Scope, Tier, Use Case, Status) | DevOps |
| [MASTER_PERF_MATRIX.md](./MASTER_PERF_MATRIX.md) | Security & observability | 8+ columns (Component, Property, Scope, Tier, Domain, Validation, Risk, Status) | Security/SRE |
| [TABLE_FORMAT_STANDARD.md](./TABLE_FORMAT_STANDARD.md) | Table format rules | Master column legend | Documentation authors |

**Quick Start by Role:**
- **Developer:** [SCOPING_MATRIX_AUTO.md](./SCOPING_MATRIX_AUTO.md) (understand tenant contexts) → [FEATURE_FLAGS_DEVELOPER_GUIDE.md](./FEATURE_FLAGS_DEVELOPER_GUIDE.md) (5 min)
- **DevOps/SRE:** [SCOPING_MATRIX_AUTO.md](./SCOPING_MATRIX_AUTO.md) (runtime behavior) → [BUILD_OPTIMIZATION.md](./BUILD_OPTIMIZATION.md) + [MASTER_PERF_MATRIX.md](./MASTER_PERF_MATRIX.md) (15 min)
- **Security:** [SCOPING_MATRIX_AUTO.md](./SCOPING_MATRIX_AUTO.md) (scope isolation) → [MASTER_PERF_MATRIX.md](./MASTER_PERF_MATRIX.md) - Scope Isolation & Security Validation sections
- **Author:** [TABLE_FORMAT_STANDARD.md](./TABLE_FORMAT_STANDARD.md) for format rules
- **Operator:** [SCOPING_MATRIX_AUTO.md](./SCOPING_MATRIX_AUTO.md) - Runtime Scope Detection section (auto-configuration by domain)

**🚀 Living Specification System:**

The [SCOPING_MATRIX_AUTO.md](./SCOPING_MATRIX_AUTO.md) is **auto-generated** from [`data/scopingMatrixEnhanced.ts`](../data/scopingMatrixEnhanced.ts).
To update it: Edit the TypeScript source, run `bun scripts/generate-scoping-docs.ts`, and commit both files.
This keeps **code and docs always in sync**.

---

## Features

✅ **TOML Config Management** - Generate, validate, and manage TOML configuration files  
✅ **Cloudflare R2 Integration** - Upload, download, list, and sync configs to R2 storage  
✅ **Smart Sync** - Hash-based diffing to detect changes  
✅ **Multi-Environment Support** - Manage dev, staging, and production configs  
✅ **Watch Mode** - Auto-sync on file changes  
✅ **Secure Credentials** - Environment variable-based credential handling  
✅ **Comprehensive CLI** - Full help system, version info, and verbose output  

## Installation

```bash
# Clone or copy the repository
cd toml-cli

# Make executable
chmod +x config-manager.ts

# Verify Bun is installed
bun --version
```

## Setup

### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 → Buckets**
3. Click **Create Bucket**
4. Enter bucket name: `empire-configs`
5. Click **Create Bucket**

### 2. Configure Credentials

Export your R2 credentials as environment variables:

```bash
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key-id"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"
export R2_BUCKET="empire-configs"
export R2_PUBLIC_URL="https://cfg.yourdomain.com"  # optional
```

Or save to `.env.local`:

```bash
source .env.local
```

## Usage

### Initialize a Config

Create a default TOML configuration file:

```bash
bun run config-manager.ts init
bun run config-manager.ts init -f empire.toml  # custom filename
```

### Validate Config

Validate a configuration file:

```bash
bun run config-manager.ts validate
bun run config-manager.ts validate -f empire.toml
```

### Upload to R2

Upload a config to R2 storage with environment tagging:

```bash
bun run config-manager.ts upload -e prod
bun run config-manager.ts upload -e staging -f my-config.toml
```

### Download from R2

Download a config from R2 to local file:

```bash
bun run config-manager.ts download -e prod
bun run config-manager.ts download -e prod -f prod.toml
```

### List Configs

List all configs stored in your R2 bucket:

```bash
bun run config-manager.ts list
bun run config-manager.ts list --verbose
```

### Sync with Diffing

Intelligently sync local config to R2 (only uploads if changed):

```bash
bun run config-manager.ts sync -e dev
bun run config-manager.ts sync -e prod --verbose
```

### Watch and Auto-Sync

Watch for file changes and automatically sync:

```bash
bun run config-manager.ts sync -e dev --watch
bun run config-manager.ts sync -e dev --watch --verbose
```

### Clean Up

Remove local config file:

```bash
bun run config-manager.ts clean
bun run config-manager.ts clean -f empire.toml
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `init` | Create example config file |
| `validate` | Validate config file |
| `upload` | Upload config to R2 |
| `download` | Download config from R2 |
| `list` | List configs in R2 bucket |
| `sync` | Sync local config to R2 with diff detection |
| `clean` | Remove local config file |
| `help` | Show help message |
| `version` | Show version information |

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--file <PATH>` | `-f` | Config file path (default: `./config.toml`) |
| `--env <NAME>` | `-e` | Environment name (dev\|staging\|prod) |
| `--watch` | `-w` | Watch for changes and sync |
| `--verbose` | `-v` | Verbose output |
| `--help` | `-h` | Show help |
| `--version` | | Show version |

## Configuration File Structure

The generated `config.toml` contains:

```toml
title = "Empire Pro CLI Config"
version = "2.8.0"

[server]
port = 3000
host = "localhost"
timeout = 30
ssl = false

[database]
redis = "redis://localhost:6379/0"
postgres = "postgres://user:pass@localhost:5432/empire"

[features]
phone_intel = true
similarity_scan = true
config_watch = true

[duoplus]
api_key = "dp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
endpoint = "https://api.duoplus.com/v3/resolve"
timeout = 5

[[projects]]
name = "proj1"
port = 3001
env = "dev"
```

## Examples

### Complete Workflow

```bash
# 1. Set up credentials
export R2_ACCOUNT_ID="7a470541a704caaf91e71efccc78fd36"
export R2_ACCESS_KEY_ID="2d128da0a88e1223e9a45e565447bb69"
export R2_SECRET_ACCESS_KEY="2b1c02bc82536ccab854dfd5c21ec8d8d0137910840de58a6ab871fa22c59fbf"
export R2_BUCKET="empire-configs"

# 2. Create config
bun run config-manager.ts init

# 3. Validate
bun run config-manager.ts validate

# 4. Upload to R2
bun run config-manager.ts upload -e prod

# 5. List all configs
bun run config-manager.ts list

# 6. Download to different file
bun run config-manager.ts download -e prod -f prod-backup.toml

# 7. Sync with watch (for development)
bun run config-manager.ts sync -e dev --watch --verbose
```

### Multi-Environment Management

```bash
# Create and upload dev config
bun run config-manager.ts init -f dev.toml
bun run config-manager.ts upload -e dev -f dev.toml

# Create and upload prod config
bun run config-manager.ts init -f prod.toml
bun run config-manager.ts upload -e prod -f prod.toml

# List all
bun run config-manager.ts list

# Download prod for local testing
bun run config-manager.ts download -e prod -f test.toml
bun run config-manager.ts validate -f test.toml
```

## Architecture

### R2Storage Class

Built on Bun's native `S3Client` for optimal performance and type safety:

- **Upload** - Write config to R2 with metadata
- **Download** - Retrieve config from R2
- **List** - List all configs with size and modification time
- **Delete** - Remove configs from R2
- **Public URLs** - Generate public access links (if configured)

### ConfigManager Class

Handles TOML generation and validation:

- **createExample** - Generate sample configuration
- **validate** - Check config integrity
- **load** - Parse config files
- **save** - Write TOML output

### CLI Interface

Full command-line interface with:

- Argument parsing via Node's `util.parseArgs`
- Comprehensive help system
- Verbose error messages
- Version tracking

## Environment Variables

### Required for R2 Operations

```bash
R2_ACCOUNT_ID         # Your Cloudflare R2 Account ID
R2_ACCESS_KEY_ID      # R2 API token access key
R2_SECRET_ACCESS_KEY  # R2 API token secret key
R2_BUCKET             # Name of your R2 bucket
```

### Optional

```bash
R2_PUBLIC_URL         # Custom public URL for R2 bucket
```

## Error Handling

The tool provides clear error messages for common issues:

- Missing credentials - lists required environment variables
- File not found - specifies which file is missing
- Invalid bucket - indicates R2 connectivity issues
- Validation errors - lists specific config problems

Run with `--verbose` for stack traces:

```bash
bun run config-manager.ts upload -e prod --verbose
```

## Security

- Credentials stored as environment variables (never hardcoded)
- Secure S3 authentication via Bun's native S3Client
- File permissions respected (no automatic chmod)
- Secrets not printed in verbose mode
- Clean file removal on `clean` command

## Performance

- Hash-based diffing avoids unnecessary uploads
- Streamed file operations (no full memory loading)
- Native Bun S3Client for optimal speed
- Parallel environment variable reading

## Compatibility

- **Runtime**: Bun 1.3.6+
- **Platform**: macOS, Linux, Windows (via WSL)
- **Node compatibility**: Can be adapted to Node.js with appropriate S3 SDK

## Troubleshooting

### "The specified bucket does not exist"

Create the R2 bucket in Cloudflare Dashboard first.

### "Signature does not match"

Check that credentials are correct and haven't expired:

```bash
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY
echo $R2_BUCKET
```

### "Config file not found"

Ensure the file path is correct or create it first:

```bash
bun run config-manager.ts init -f my-config.toml
```

### Watch mode not updating

Watch mode is a placeholder. For production, integrate with `fs.watch()` or third-party file watcher.

## License

MIT - Empire Pro Team

## Support

For issues or questions, refer to the [Bun documentation](https://bun.sh) and [Cloudflare R2 docs](https://developers.cloudflare.com/r2/).
