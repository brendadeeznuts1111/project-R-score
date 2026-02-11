# Bun TypedArray Documentation Portal

## Base URL Pattern
All typed array documentation follows this pattern:
```
https://bun.sh/docs/runtime/binary-data#typedarray
```

## Quick Start
```bash
# Clone and install
git clone <repo>
cd bun-typedarray-docs
bun install

# Start the server
bun run dev

# Access endpoints
curl http://example.com/api/typedarray/urls
```

## Fetch Examples (Bun Native Pattern)
```javascript
// Example 1: Basic fetch (from Bun docs)
const response = await fetch("https://bun.sh/docs/runtime/binary-data#typedarray");
console.log(response.status); // => 200
const text = await response.text();

// Example 2: Fetch JSON data
const urlResponse = await fetch("http://example.com/api/typedarray/urls");
const data = await urlResponse.json();
console.log(data.base); // => "https://bun.sh/docs/runtime/binary-data#typedarray"

// Example 3: Fetch RSS feed
const rssResponse = await fetch("http://example.com/feed/rss");
const rssXml = await rssResponse.text();
```

## Available Endpoints
| Endpoint | Description | Example |
|----------|-------------|---------|
| `/docs/typedarray` | TypedArray documentation | `GET /docs/typedarray#methods` |
| `/api/fetch` | Fetch API examples | `GET /api/fetch` |
| `/api/typedarray/urls` | All typed array URLs | `GET /api/typedarray/urls` |
| `/feed/rss` | RSS feed (XML) | `GET /feed/rss` |
| `/feed/json` | JSON feed | `GET /feed/json` |

## Development
```bash
# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## Project Policies
- Import boundaries and allowed package roots: `/Users/nolarose/Projects/docs/IMPORT_BOUNDARIES.md`
