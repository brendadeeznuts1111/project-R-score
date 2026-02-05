# ripgrep Log Discovery Cheat Sheet

## Quick Commands

```bash
# Find all occurrences of a specific log code
rg "HBMO-002"

# Find errors only
rg "\| ERROR \|"

# Find logs from specific source
rg "\| MarketOfferingService \|"

# Find logs within time range (requires timestamp format)
rg "2025-12-07.*\| ERROR \|"

# Find logs with correlation ID
rg "corr=[a-f0-9-]+"

# Search in log files only
rg "HBMO-001" ./logs/*.log

# Case-insensitive search for warnings
rg -i "warn"

# Show context around matches
rg -C 3 "HBCB-002"

# Count occurrences
rg -c "\| ERROR \|"
```

## Common Patterns

```bash
# All market offering errors today
rg "HBMO.*\| ERROR \|" ./logs/hyper-bun-$(date +%Y-%m-%d).log

# Performance issues in last hour
rg "HBPERF.*duration=[5-9][0-9]{2,}" ./logs/*.log

# Security warnings
rg "HBSEC.*\| WARN \|"

# Circuit breaker events
rg "HBCB-002" --stats

# Find unregistered log codes
rg "logger\.[a-z]+\('([A-Z]{2,}-[0-9]{3})'" -r '$1' | sort | uniq
```

## Integration with Documentation

1. See log code in console: `HBMO-002`

2. Look up documentation:

   ```bash
   cat docs/logging/log-codes.md | rg -A 10 "HBMO-002"
   ```

3. Find code usage:

   ```bash
   rg "HBMO-002" src/
   ```

4. Find in logs:

   ```bash
   rg "HBMO-002" logs/
   ```

## Advanced ripgrep Patterns

```bash
# Find all log codes used in a file
rg -o "[A-Z]{2,}-[0-9]{3}" src/services/market-offering-service.ts | sort | uniq

# Find logs with specific data fields
rg "bookmaker.*pinnacle" logs/

# Find slow operations (duration > 1000ms)
rg "duration.*[1-9][0-9]{3,}" logs/

# Find all FATAL logs
rg "\| FATAL \|" logs/

# Find logs from last 5 minutes (requires timestamp parsing)
rg "$(date -d '5 minutes ago' +%Y-%m-%d.*%H:%M)" logs/
```

## Documentation Header Patterns

```bash
# Find all headers with .RG tags (grepable format)
rg "\[.*\.RG\]" docs/

# Find main sections (## X.)
rg "^##\s+\d+\.\s+\[.*\.RG\]" docs/

# Find subsections (### X.X.)
rg "^###\s+\d+\.\d+\.\s+\[.*\.RG\]" docs/patterns/STRUCTURE-BENEATH-CHAOS.md

# Find headers by domain
rg "\[PATTERN\." docs/
rg "\[PROOF\." docs/
rg "\[BASEL\." docs/
rg "\[ARCHITECTURE\." docs/

# Find all numbered headers
rg "^#+\s+\d+\.\s+\[.*\.RG\]" docs/

# Count headers in a file
rg -c "\[.*\.RG\]" docs/patterns/STRUCTURE-BENEATH-CHAOS.md
```
