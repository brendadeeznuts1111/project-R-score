# Security CLI

**11.5.0.0.0.0.0: Security Testing & SRI Generation**

Security testing, header analysis, and SRI (Subresource Integrity) generation.

**Cross-Reference:**
- `7.2.x.x.x.x.x` → Cryptographic Operations (Bun.CryptoHasher)
- `7.5.2.0.0.0.0` → Bun.file() for file operations
- `7.5.4.0.0.0.0` → Bun.write() for manifest generation

## 11.5.0.1.0.0.0: Usage

```bash
bun security <command> [subcommand] [options]
```

## 11.5.0.2.0.0.0: Commands

### 11.5.1.0.0.0.0: Penetration Testing

#### 11.5.1.1.0.0.0: `pentest web`

Run web penetration test.

**Options:**
- `--target=<url>` - Target URL (required)
- `--json` - Output as JSON
- `--verbose, -v` - Verbose output

**Example:**
```bash
bun security pentest web --target=https://example.com
```

#### 11.5.1.2.0.0.0: `pentest api`

Run API penetration test.

**Options:**
- `--openapi=<file>` - OpenAPI specification file
- `--fuzz` - Enable fuzzing
- `--json` - Output as JSON
- `--verbose, -v` - Verbose output

**Example:**
```bash
bun security pentest api --openapi=./api.yaml --fuzz
```

#### 11.5.1.3.0.0.0: `pentest quick`

Quick security scan.

**Options:**
- `--target=<url>` - Target URL
- `--json` - Output as JSON
- `--verbose, -v` - Verbose output

**Example:**
```bash
bun security pentest quick --target=https://example.com
```

### 11.5.2.0.0.0.0: Security Headers

#### 11.5.2.1.0.0.0: `headers analyze`

Analyze security headers.

**Options:**
- `--url=<url>` - URL to analyze (required)
- `--json` - Output as JSON
- `--verbose, -v` - Verbose output

**Example:**
```bash
bun security headers analyze --url=https://example.com
```

#### 11.5.2.2.0.0.0: `headers optimize`

Get optimization recommendations.

**Options:**
- `--url=<url>` - URL to analyze
- `--json` - Output as JSON

**Example:**
```bash
bun security headers optimize --url=https://example.com
```

#### 11.5.2.3.0.0.0: `headers impl`

Generate implementation code.

**Options:**
- `--framework=<name>` - Framework (e.g., `hono`, `express`)
- `--json` - Output as JSON

**Example:**
```bash
bun security headers impl --framework=hono
```

### 11.5.3.0.0.0.0: Subresource Integrity (SRI)

#### 11.5.3.1.0.0.0: `sri generate`

Generate SRI hashes for files.

**Options:**
- `--files=<pattern>` - File pattern (e.g., `dist/*.js,dist/*.css`)
- `--algorithm=<alg>` - Hash algorithm (`sha256`, `sha384`, `sha512`)
- `--output=<file>` - Output manifest file
- `--json` - Output as JSON

**Example:**
```bash
bun security sri generate --files="dist/*.js,dist/*.css"
```

#### 11.5.3.2.0.0.0: `sri verify`

Verify files against manifest.

**Options:**
- `--manifest=<file>` - Manifest file path
- `--files=<pattern>` - File pattern to verify
- `--json` - Output as JSON

**Example:**
```bash
bun security sri verify --manifest=sri.json --files="dist/*.js"
```

#### 11.5.3.3.0.0.0: `sri enforce`

Update HTML files with SRI attributes.

**Options:**
- `--manifest=<file>` - Manifest file path
- `--html=<pattern>` - HTML file pattern
- `--json` - Output as JSON

**Example:**
```bash
bun security sri enforce --manifest=sri.json --html="dist/*.html"
```

#### 11.5.3.4.0.0.0: `sri hash`

Hash a single file.

**Options:**
- `--file=<path>` - File path (required)
- `--algorithm=<alg>` - Hash algorithm (`sha256`, `sha384`, `sha512`)

**Example:**
```bash
bun security sri hash --file=dist/app.js --algorithm=sha384
```

## 11.5.5.0.0.0.0: Options

- `--help, -h` - Show help message
- `--json` - Output as JSON
- `--verbose, -v` - Verbose output

## 11.5.6.0.0.0.0: Examples

```bash
# Web penetration test
bun security pentest web --target=https://example.com

# API penetration test with fuzzing
bun security pentest api --openapi=./api.yaml --fuzz

# Quick security scan
bun security pentest quick --target=https://example.com

# Analyze security headers
bun security headers analyze --url=https://example.com

# Get header optimization recommendations
bun security headers optimize --url=https://example.com

# Generate SRI hashes
bun security sri generate --files="dist/*.js,dist/*.css"

# Verify files against manifest
bun security sri verify --manifest=sri.json

# Update HTML with SRI
bun security sri enforce --manifest=sri.json --html="dist/*.html"

# Hash single file
bun security sri hash --file=dist/app.js
```

## 11.5.4.0.0.0.0: Output Formats

### 11.5.4.1.0.0.0: Text Output (Default)

Human-readable text output with colors and formatting.

### 11.5.4.2.0.0.0: JSON Output

Use `--json` flag for machine-readable JSON output.

**Example:**
```bash
bun security pentest web --target=https://example.com --json
```

## 11.5.7.0.0.0.0: Implementation Details

- Uses `Bun.file()` for file I/O
- Supports multiple hash algorithms
- Generates SRI manifests
- Updates HTML files automatically

## 11.5.8.0.0.0.0: See Also

- [Security Source](../src/cli/security.ts)
- [Security Module](../src/security/)
- [SRI Documentation](../docs/)
