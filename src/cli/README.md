# HAR CLI Tool

A comprehensive command-line tool for capturing, enhancing, and analyzing HTTP Archive (HAR) files.

## Features

- 🎬 **Capture**: Record HTTP traffic with a built-in proxy server
- 🔧 **Enhance**: Add security analysis and performance metrics to existing HARs
- 📊 **Analyze**: Generate detailed reports in JSON, table, or HTML formats
- 🔄 **Diff**: Compare two HAR files and detect performance regressions
- 🚨 **Lint**: Check HAR files against web performance best practices
- 🌐 **Serve**: View HAR analysis in a web dashboard

## Installation

```bash
# Make executable
chmod +x src/cli/har-cli.ts

# Or run directly with Bun
bun src/cli/har-cli.ts --help
```

## Commands

### capture

Start a capture server to record HTTP traffic:

```bash
# Capture for 30 seconds
bun har-cli.ts capture --duration 30

# Capture on specific port
bun har-cli.ts capture --port 8080 --output traffic.har

# Manual capture (Ctrl+C to stop)
bun har-cli.ts capture --output my-capture.har
```

### enhance

Add security analysis and performance metrics to an existing HAR:

```bash
bun har-cli.ts enhance traffic.har --output enhanced.har
```

Enhancements include:
- Security headers analysis (HSTS, CSP, etc.)
- Performance metrics (TTFB grades, size grades)
- Protocol detection

### analyze

Generate detailed analysis reports:

```bash
# Default table format
bun har-cli.ts analyze traffic.har

# JSON output
bun har-cli.ts analyze traffic.har --format json

# HTML report
bun har-cli.ts analyze traffic.har --format html
```

### diff

Compare two HAR files and detect regressions:

```bash
bun har-cli.ts diff baseline.har current.har
```

Detects:
- Added/removed requests
- Response time changes
- Size increases
- Error rate changes

### lint

Check HAR against best practices:

```bash
bun har-cli.ts lint traffic.har
```

Lint rules:
- `no-http`: Insecure HTTP warnings
- `slow-response`: Requests > 1 second
- `large-payload`: Responses > 1MB
- `no-compression`: Missing gzip/brotli
- `no-cache`: Missing cache headers
- `error-status`: 4xx/5xx responses

### serve

Start a web server to view HAR analysis:

```bash
bun har-cli.ts serve traffic.har --port 8080
```

Endpoints:
- `/` - HTML dashboard
- `/api/har` - Raw HAR JSON
- `/api/stats` - Statistics JSON

## Examples

### Performance Testing Workflow

```bash
# 1. Capture baseline
curl http://localhost:3000/api/baseline
bun har-cli.ts capture --duration 10 --output baseline.har

# 2. Make changes to your code...

# 3. Capture current
curl http://localhost:3000/api/current
bun har-cli.ts capture --duration 10 --output current.har

# 4. Compare and detect regressions
bun har-cli.ts diff baseline.har current.har

# 5. Generate HTML report
bun har-cli.ts analyze current.har --format html
```

### CI/CD Integration

```bash
# Lint HAR in CI pipeline
bun har-cli.ts lint traffic.har || exit 1

# Check for regressions with thresholds
bun har-cli.ts diff baseline.har current.har
```

## Output Formats

### Table Format (Default)

```
═══════════════════════════════════════════════════════════
                    HAR ANALYSIS REPORT
═══════════════════════════════════════════════════════════

📈 PERFORMANCE
  Requests: 150 | Size: 2.3MB | Compression: 68.5%
  Avg Response: 245ms | Avg TTFB: 120ms

🔒 SECURITY
  HTTPS: 145/150 | HTTP/2: 120 | Cookies: 45/50 secure

🚨 LINT: ✅ PASSED
  Errors: 0 | Warnings: 3 | Info: 12
```

### JSON Format

```json
{
  "stats": {
    "totalRequests": 150,
    "totalSize": 2411724,
    "compressionRatio": 0.685,
    "avgResponseTime": 245.5,
    "domains": ["example.com", "cdn.example.com"]
  },
  "lint": {
    "passed": true,
    "summary": { "errors": 0, "warnings": 3, "info": 12 }
  }
}
```

### HTML Format

Generates a complete HTML dashboard with:
- Performance metrics cards
- Security summary
- Lint issues table
- Status code breakdown

## Integration with har-enhancer

This CLI uses the `har-enhancer` library for all HAR operations:

```typescript
import {
  enhanceHar,
  diffHar,
  detectRegressions,
  analyzeCookies,
  lintHar,
} from '../utils/har-enhancer';
```
