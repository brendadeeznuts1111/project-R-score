# Bun Data API Integration

Complete integration of Bun's data management APIs:
- **Bun.Cookie** / **Bun.CookieMap** - Cookie management
- **Bun.color** - CSS color processing
- **Bun.env** - Prefixed environment variables
- **Headers** - HTTP header case preservation

## Bun.Cookie & Bun.CookieMap

Bun provides native cookie management:

```typescript
import { cookieManager } from './lib/cloudflare';

// Set cookie
cookieManager.set('session', 'abc123', {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
});

// Get cookie
const cookie = cookieManager.get('session');
console.log(cookie.name);   // 'session'
console.log(cookie.value);  // 'abc123'
console.log(cookie.secure); // true

// Serialize for HTTP header
const header = cookieManager.serialize('session');
// session=abc123; Path=/; Secure; HttpOnly; SameSite=Strict
```

### CLI Usage

```bash
# Set cookie with options
bun run cf-data.ts cookie-set session abc123 --secure --httpOnly

# Get cookie
bun run cf-data.ts cookie-get session

# List all cookies
bun run cf:data:cookie-list

# Delete cookie
bun run cf-data.ts cookie-delete session
```

## Bun.color

CSS color processing with Bun.color:

```typescript
import { colorManager } from './lib/cloudflare';

// Parse color
const parsed = colorManager.parse('red');
console.log(parsed); // 'red'

// Get brand colors
const primary = colorManager.brandColor('primary');
// hsl(217 91% 60%)

const primaryWithAlpha = colorManager.brandColor('primary', 0.8);
// hsla(217 91% 60%, 0.8)

// Generate CSS variables
const cssVars = colorManager.generateCSSVariables();
// :root {
//   --color-primary: hsl(217 91% 60%);
//   --color-secondary: hsl(190 80% 45%);
//   ...
// }
```

### CLI Usage

```bash
# Parse color
bun run cf:data:color-parse red

# Get brand color with alpha
bun run cf-data.ts color-brand primary 0.8

# Create gradient
bun run cf-data.ts color-gradient red blue green
```

## Prefixed Environment Variables

Organize environment variables with prefixes:

```typescript
import { createPrefixedEnv } from './lib/cloudflare';

// Create prefixed env manager
const env = createPrefixedEnv('FW');

// Set variable
env.set('API_KEY', 'secret123');
// Sets: FW_API_KEY=secret123

// Get variable
const key = env.get('API_KEY');
// Reads: FW_API_KEY

// Get with default
const timeout = env.getOrDefault('TIMEOUT', '5000');

// Get typed values
const port = env.getNumber('PORT');
const debug = env.getBoolean('DEBUG');

// Get all with prefix
const all = env.getAll();
// { API_KEY: 'secret123', TIMEOUT: '5000', ... }
```

### CLI Usage

```bash
# Set prefixed variable
bun run cf-data.ts env-set FW API_KEY secret123

# Get prefixed variable
bun run cf-data.ts env-get FW API_KEY

# List all with prefix
bun run cf:data:env-list FW
```

## Header Management

HTTP header management with case preservation:

```typescript
import { headerManager } from './lib/cloudflare';

// Create headers (case preserved)
const headers = headerManager.create({
  'Authorization': 'Bearer token',
  'Content-Type': 'application/json',
  'X-Custom-Header': 'value',
});

// Cloudflare-specific headers
const cfHeaders = headerManager.createCFHeaders('api-token');

// Telemetry headers
const telemetry = headerManager.createTelemetryHeaders({
  version: '1.0.0',
  platform: 'bun',
});
// x-telemetry-version: 1.0.0
// x-telemetry-platform: bun
```

### CLI Usage

```bash
# Create standard headers
bun run cf-data.ts header-create

# Create Cloudflare headers
bun run cf:data:header-cf my-api-token

# Create telemetry headers
bun run cf-data.ts header-telemetry
```

## Unified Data CLI

Combine all data APIs:

```typescript
import { createDataCLI } from './lib/cloudflare';

const dataCLI = createDataCLI({ prefix: 'FW_CLI' });

// Store session data
// (stores in cookies + env)
dataCLI.storeSession({
  api_token: 'token',
  account_id: 'account',
  theme: 'professional',
});

// Retrieve session
const session = dataCLI.getSession();

// Create API headers
const headers = dataCLI.createAPIHeaders('token', {
  version: '1.0.0',
});
```

### CLI Usage

```bash
# Store and retrieve session
bun run cf-data.ts data-session
```

## Integration Examples

### Complete Data Flow

```bash
# 1. Set environment variables
bun run cf-data.ts env-set FW API_KEY your-key
bun run cf-data.ts env-set FW ACCOUNT_ID your-account

# 2. Set session cookie
bun run cf-data.ts cookie-set session $(date +%s) --secure --httpOnly

# 3. Create API headers
bun run cf:data:header-cf your-key

# 4. Use brand colors
bun run cf-data.ts color-brand primary

# 5. Store complete session
bun run cf-data.ts data-session
```

### Programmatic Usage

```typescript
import {
  createDataCLI,
  cookieManager,
  colorManager,
  createPrefixedEnv,
} from './lib/cloudflare';

// Initialize
const dataCLI = createDataCLI({ prefix: 'FW' });
const env = createPrefixedEnv('FW');

// Store credentials securely
dataCLI.storeSession({
  api_token: env.get('API_KEY'),
  account_id: env.get('ACCOUNT_ID'),
});

// Use cookies for auth
cookieManager.set('auth', token, {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
});

// Create styled output with brand colors
const headerStyle = colorManager.brandColor('primary');
const errorStyle = colorManager.brandColor('error');

// Generate CSS for dashboard
const css = colorManager.generateCSSVariables();
```

## API Reference

### BunCookieManager

| Method | Description |
|--------|-------------|
| `set(name, value, options)` | Set cookie |
| `get(name)` | Get cookie object |
| `has(name)` | Check if exists |
| `delete(name)` | Delete cookie |
| `getAll()` | Get all cookies |
| `clear()` | Clear all cookies |
| `serialize(name)` | Serialize to header string |
| `parse(header)` | Parse Cookie header |

### BunColorManager

| Method | Description |
|--------|-------------|
| `parse(color)` | Parse with Bun.color |
| `brandColor(type, alpha?)` | Get brand color |
| `generateCSSVariables()` | Generate CSS vars |
| `gradient(colors, direction?)` | Create gradient |

### PrefixedEnvManager

| Method | Description |
|--------|-------------|
| `get(name)` | Get variable |
| `getOrDefault(name, default)` | Get with fallback |
| `getNumber(name)` | Get as number |
| `getBoolean(name)` | Get as boolean |
| `getAll()` | Get all with prefix |
| `set(name, value)` | Set variable |
| `has(name)` | Check if exists |

### BunHeaderManager

| Method | Description |
|--------|-------------|
| `create(headers)` | Create Headers object |
| `createCFHeaders(token)` | Cloudflare API headers |
| `createTelemetryHeaders(data)` | Telemetry headers |
| `toObject(headers)` | Convert to object |

## Package.json Scripts

```json
{
  "cf:data": "bun run scripts/domain/cf-data-cli.ts",
  "cf:data:cookie-set": "bun run scripts/domain/cf-data-cli.ts cookie-set",
  "cf:data:cookie-list": "bun run scripts/domain/cf-data-cli.ts cookie-list",
  "cf:data:color-parse": "bun run scripts/domain/cf-data-cli.ts color-parse",
  "cf:data:env-list": "bun run scripts/domain/cf-data-cli.ts env-list",
  "cf:data:header-cf": "bun run scripts/domain/cf-data-cli.ts header-cf"
}
```

## Bun API Features

| Feature | API | Status |
|---------|-----|--------|
| Cookies | `Bun.Cookie`, `Bun.CookieMap` | ✅ Stable |
| Colors | `Bun.color` | ✅ Stable |
| Environment | `Bun.env` | ✅ Stable |
| Headers | `Headers` | ✅ Stable |
| Header Case | `fetch()` preserves case | ✅ v1.3.7+ |
