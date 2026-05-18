---
name: bun-security-hardening
description: Event delegation, data sanitization, memory leak prevention, zero-disk mocks (OWASP aligned)
user-invocable: false
version: 1.1.0
---

# Security Hardening Patterns

## 1. Event Delegation

Replace inline `onclick` with data attributes:

```html
<!-- Before -->
<button onclick="deleteUser('123')">Delete</button>

<!-- After -->
<button data-action="deleteUser" data-param="123">Delete</button>
```

```typescript
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const param = btn.dataset.param;

  if (typeof window[action] === 'function') {
    try { window[action](param); }
    catch (err) { console.error(`Action ${action} failed:`, err); }
  }
});
```

**With permissions:**
```typescript
const PERMS = { deleteData: ['admin'], viewDetails: ['user', 'admin'] };

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!PERMS[action]?.includes(getUserRole())) return;

  window[action]?.(btn.dataset.param);
});
```

## 2. Prototype Pollution Prevention

```typescript
function sanitizeData(obj: unknown, depth = 0): unknown {
  if (depth > 10 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeData(item, depth + 1));

  const DANGEROUS = ['__proto__', 'constructor', 'prototype'];
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS.includes(key)) { console.warn(`Blocked: ${key}`); continue; }
    clean[key] = typeof value === 'object' ? sanitizeData(value, depth + 1) : value;
  }
  return clean;
}

// Usage: Always sanitize external JSON
const data = sanitizeData(await fetch('/api/data').then(r => r.json()));
```

## 3. Memory Leak Prevention

```typescript
// Track intervals for cleanup
const intervals = new Map<string, Timer>();

function registerInterval(name: string, fn: () => void, ms: number) {
  if (intervals.has(name)) clearInterval(intervals.get(name)!);
  intervals.set(name, setInterval(fn, ms));
}

function cleanup() {
  intervals.forEach(clearInterval);
  intervals.clear();
}

window.addEventListener('beforeunload', cleanup);

// Pause when hidden
document.addEventListener('visibilitychange', () => {
  document.hidden ? cleanup() : startIntervals();
});
```

## Complete Example

```typescript
// 1. Event delegation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) window[btn.dataset.action]?.(btn.dataset.param);
});

// 2. Sanitize all external data
async function loadData() {
  return sanitizeData(await fetch('/api/data').then(r => r.json()));
}

// 3. Track & cleanup intervals
let dataInterval: Timer | null = null;
const start = () => { dataInterval = setInterval(loadData, 5000); };
const stop = () => { if (dataInterval) clearInterval(dataInterval); dataInterval = null; };
window.addEventListener('beforeunload', stop);
```

## Testing

```typescript
import { it, expect } from "bun:test";

it("sanitizeData blocks __proto__", () => {
  const malicious = { __proto__: { isAdmin: true }, data: "safe" };
  const clean = sanitizeData(malicious);
  expect(clean.__proto__).toBeUndefined();
  expect(clean.data).toBe("safe");
});

it("sanitizeData handles nested", () => {
  const malicious = { nested: { __proto__: { x: 1 }, ok: "y" } };
  const clean = sanitizeData(malicious);
  expect(clean.nested.__proto__).toBeUndefined();
  expect(clean.nested.ok).toBe("y");
});
```

## 4. Zero-Disk Test Mocks

Use Bun's virtual `files` option to test without temp files - no cleanup, no path traversal risks:

```typescript
import { it, expect } from "bun:test";

it("build processes user input safely", async () => {
  // No temp files created - entirely in-memory
  const { outputs, success } = await Bun.build({
    entrypoints: ["/virtual/user-input.ts"],
    files: {
      "/virtual/user-input.ts": `
        // Simulate user-provided code
        export const userConfig = ${JSON.stringify({ key: "safe-value" })};
      `,
    },
  });

  expect(success).toBe(true);
  // No files to sanitize or clean up
});

it("mock external API responses", async () => {
  const { outputs } = await Bun.build({
    entrypoints: ["/virtual/app.ts"],
    files: {
      "/virtual/app.ts": `
        import { mockFetch } from './mock.ts';
        export const data = await mockFetch('/api/sensitive');
      `,
      "/virtual/mock.ts": `
        // No real network calls, no temp files
        export const mockFetch = (url: string) =>
          Promise.resolve({ ok: true, data: "mocked" });
      `,
    },
  });
});
```

### Why Zero-Disk Matters

- **Path traversal**: Traditional Mocks: Temp file can be attacked — Zero-Disk: No files exist
- **Cleanup failure**: Traditional Mocks: Sensitive data persists — Zero-Disk: Nothing to clean
- **Race conditions**: Traditional Mocks: File read during test — Zero-Disk: Memory-only
- **Permission issues**: Traditional Mocks: Disk write may fail — Zero-Disk: No I/O needed

---

## OWASP Coverage

- **A1 Injection** — sanitizeData() - remove dangerous keys
- **A3 XSS** — Event delegation - no inline handlers
- **A5 Broken AC** — Permission checks in delegation
- **A6 Sec Misconfig** — Zero-disk mocks - no temp file exposure
- **A8 Insecure Deser** — Safe JSON parsing, no eval()
