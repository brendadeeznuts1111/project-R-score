---
name: quick-tools
description: Quick utilities - time, date, math, conversions, UUIDs, hashes
metadata: {"clawdbot":{"emoji":"🔧","os":["darwin","linux"],"always":true}}
---

# Quick Tools Skill

Fast utilities for common tasks.

## Time & Date

```bash
# Current time (various formats)
date                          # Full date/time
date +%H:%M                   # 14:30
date +%Y-%m-%d                # 2026-01-14
date +%s                      # Unix timestamp
date -r 1705234567            # From timestamp

# Timezone conversions
TZ="America/New_York" date    # EST/EDT
TZ="Europe/London" date       # GMT/BST
TZ="Asia/Tokyo" date          # JST

# Time difference
echo "$(( $(date +%s) - $(date -d '2026-01-01' +%s) )) seconds since Jan 1"
```

## Math & Calculations

```bash
# Basic math
echo $((5 + 3))               # 8
echo $((100 / 7))             # 14 (integer)
echo "scale=2; 100/7" | bc    # 14.28 (decimal)

# Percentages
echo "scale=2; 45/200*100" | bc  # 22.50%

# Unit conversions with bc
echo "scale=2; 100 * 1.60934" | bc    # km to miles
echo "scale=2; 32 * 9/5 + 32" | bc    # C to F
```

## Conversions

### Temperature
| From | To | Formula |
|------|-----|---------|
| °C | °F | (C × 9/5) + 32 |
| °F | °C | (F - 32) × 5/9 |

### Distance
| From | To | Multiply by |
|------|-----|-------------|
| miles | km | 1.60934 |
| km | miles | 0.621371 |
| feet | meters | 0.3048 |

### Weight
| From | To | Multiply by |
|------|-----|-------------|
| lbs | kg | 0.453592 |
| kg | lbs | 2.20462 |

### Data
| From | To | Value |
|------|-----|-------|
| KB | bytes | × 1024 |
| MB | bytes | × 1048576 |
| GB | bytes | × 1073741824 |

## UUID & Random

```bash
# UUID v4
uuidgen | tr '[:upper:]' '[:lower:]'

# Random string (base64)
openssl rand -base64 32

# Random hex
openssl rand -hex 16

# Random number (1-100)
echo $((RANDOM % 100 + 1))

# Random password
openssl rand -base64 12 | tr -d '/+='
```

## Hashing

```bash
# MD5
echo -n "text" | md5

# SHA256
echo -n "text" | shasum -a 256

# SHA512
echo -n "text" | shasum -a 512

# File hash
shasum -a 256 /path/to/file
```

## Encoding

```bash
# Base64 encode
echo -n "hello" | base64

# Base64 decode
echo "aGVsbG8=" | base64 -d

# URL encode
python3 -c "import urllib.parse; print(urllib.parse.quote('hello world'))"

# URL decode
python3 -c "import urllib.parse; print(urllib.parse.unquote('hello%20world'))"

# JSON escape
echo '{"key": "value with \"quotes\""}' | jq -c .
```

## IP & Network

```bash
# Public IP
curl -s ifconfig.me
curl -s ipinfo.io/ip

# Local IP (macOS)
ipconfig getifaddr en0

# DNS lookup
dig +short google.com
nslookup google.com

# Check if host is up
ping -c 1 -W 1 google.com > /dev/null && echo "up" || echo "down"
```

## Quick Lookups

```bash
# Dictionary (via API)
curl -s "https://api.dictionaryapi.dev/api/v2/entries/en/hello" | jq '.[0].meanings[0].definitions[0].definition'

# Exchange rates
curl -s "https://api.exchangerate-api.com/v4/latest/USD" | jq '.rates.EUR'
```

## Response Formats

### Time Query
```
Current Time
────────────────────
Local:    2:30:45 PM PST
UTC:      10:30:45 PM
Unix:     1705267845

Other Zones:
  New York:  5:30 PM EST
  London:    10:30 PM GMT
  Tokyo:     7:30 AM JST (+1 day)
```

### Conversion
```
Conversion: 100°F → °C
Result: 37.78°C
Formula: (100 - 32) × 5/9
```

### UUID/Random
```
UUID: 550e8400-e29b-41d4-a716-446655440000
Type: v4 (random)
```

## Example Interactions

**User:** "What time is it in Tokyo?"
```
Tokyo (JST)
────────────────────
Time: 7:30 AM (tomorrow)
Date: January 15, 2026
Offset: UTC+9

Your time: 2:30 PM PST (January 14)
Difference: +17 hours
```

**User:** "Convert 72°F to Celsius"
```
72°F = 22.22°C

Formula: (72 - 32) × 5/9 = 22.22
```

**User:** "Generate a UUID"
```
UUID: 550e8400-e29b-41d4-a716-446655440000
```

**User:** "Hash 'password123'"
```
Input: password123

MD5:    482c811da5d5b4bc6d497ffa98491e38
SHA256: ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
```

**User:** "What's 15% of 250?"
```
15% of 250 = 37.5
```

**User:** "Random password"
```
Generated password: Kx9mP2vQ8nL4
Length: 12 characters
Charset: alphanumeric
```

## Triggers

Respond to:
- "what time", "current time"
- "time in [city]"
- "convert [X] to [Y]"
- "generate uuid", "new uuid"
- "random number", "random password"
- "hash [text]", "md5", "sha256"
- "base64 encode/decode"
- "what's X% of Y"
- "calculate [expression]"
- "my ip", "public ip"
