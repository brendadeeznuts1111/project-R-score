# 🚀 Developer Onboarding: Bun-Native DuoPlus

Welcome to the team! This guide will get you productive in **5 minutes**.

## ⚡ First 5 Minutes

### 1. Read This (1 min)
You're reading it now! ✓

### 2. Open Quick Reference (1 min)
In VS Code, open: `.vscode/BUN_QUICK_REFERENCE.md`

This is your lookup table for all Bun APIs.

### 3. Understand Bun-Native Philosophy (2 min)

**The Core Idea**: Bun has everything built-in. Don't add packages.

```typescript
// ❌ OLD WAY (with 10 packages)
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();
const response = await axios.post(url, data);

// ✅ NEW WAY (Bun-native, zero packages)
const data = {/* ... */};
const response = await fetch(url, { method: 'POST', body: JSON.stringify(data) });
// .env is auto-loaded, no dotenv needed!
```

### 4. Setup (1 min)
```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Start development
bun run dev

# In another terminal, run tests
bun test --watch
```

## 📚 Documentation Map

| Time | Document | What You'll Learn |
|------|----------|-------------------|
| 2 min | [BUN_QUICK_REFERENCE.md](.vscode/BUN_QUICK_REFERENCE.md) | All Bun APIs at a glance |
| 10 min | [BUN_NATIVE_PATTERNS.md](docs/BUN_NATIVE_PATTERNS.md) | How to use each API |
| 30 min | [BUN_NATIVE_ARCHITECTURE.md](docs/BUN_NATIVE_ARCHITECTURE.md) | Full project architecture |
| Reference | [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md) | Build phase by phase |

## 🎯 Your First Task

### Pick One:

**Option A: Add a Simple Endpoint** (30 min)
```typescript
// In src/routes/api.ts, add:
export async function handleCustom(request: Request, scope: ScopeContext) {
  const data = { message: "Hello from Bun!", scope: scope.scopeId };
  return Response.json(data);
}

// Test:
curl http://localhost:8765/api/custom
```

**Option B: Test Bun.fetch()** (20 min)
```typescript
// In a test file, add:
import { test, expect } from "bun:test";

test("fetch should work", async () => {
  const response = await fetch("https://api.example.com/health");
  expect(response.ok).toBe(true);
});
```

**Option C: Try a Code Snippet** (5 min)
1. Open a `.ts` file
2. Type `bfetch` and press Tab
3. Fill in the URL
4. Run and see it work!

## 💡 Key Concepts

### 1. No Package For Everything
Most Node.js projects need 50+ dependencies. Bun has them built-in:

| Need | Traditional | Bun Native |
|------|------------|-----------|
| HTTP | axios | `fetch()` |
| Files | fs + rimraf | `Bun.file()` |
| Cookies | cookie-parser | `Bun.cookie` |
| Testing | jest | `bun:test` |
| Caching | redis | `Bun.LRU` |

### 2. Development is Fast
```bash
bun run dev           # Start with file watching
bun test --watch     # Watch tests
bun build            # Production build in seconds
```

### 3. ESLint Guides You
If you try to import axios, you'll see:
```
❌ Use Bun native fetch instead of axios
```

### 4. Code Snippets Speed You Up
- Type `bfetch` → Get fetch template
- Type `bfile` → Get file I/O template
- Type `bserver` → Get server template

## 🔧 Common Tasks

### Reading a File
```typescript
// ✅ Bun way (0.5ms)
const file = Bun.file('data.json');
const content = await file.json();

// ❌ Old way (requires fs import)
import { readFile } from 'fs/promises';
const content = JSON.parse(await readFile('data.json', 'utf-8'));
```

### Making an API Call
```typescript
// ✅ Bun way (3ms)
const response = await fetch('https://api.example.com/data', {
  headers: { Authorization: `Bearer ${Bun.env.API_TOKEN}` }
});
const data = await response.json();

// ❌ Old way (needs axios)
import axios from 'axios';
const { data } = await axios.get('https://api.example.com/data');
```

### Handling Cookies
```typescript
// ✅ Bun way (0.1ms)
import { parseCookies } from "bun:cookie";
const cookies = parseCookies(request.headers.get("cookie") || "");
const sessionId = cookies.session_id;

// ❌ Old way (needs cookie-parser)
import cookieParser from 'cookie-parser';
app.use(cookieParser());
const sessionId = req.cookies.session_id;
```

## 🧪 Testing

### Write a Quick Test
```typescript
// tests/hello.test.ts
import { describe, it, expect } from "bun:test";

describe("DuoPlus", () => {
  it("should resolve scope", () => {
    const scope = resolveScopeFromRequest(mockRequest);
    expect(scope.domain).toBe("test.com");
  });
});
```

Run tests:
```bash
bun test                    # Run all tests
bun test --watch           # Watch mode (rerun on changes)
bun test --coverage        # Show coverage report
bun test -- --grep "scope" # Run specific test
```

## 🐛 Debugging

### Method 1: Console Logging
```typescript
const scope = resolveScopeFromRequest(request);
console.log(Bun.inspect(scope));  // Pretty-printed output
```

### Method 2: Debug Dashboard
Visit: `http://localhost:8765/debug`
Shows server stats, current scope, real-time updates.

### Method 3: Bun Inspector
```bash
bun inspect src/main.ts
# Opens debugger at localhost:9229
```

## 📊 Performance Tips

### Tip 1: Cache Frequently Accessed Data
```typescript
const cache = new Bun.LRU<string, Matrix>({
  max: 100,
  ttl: 300_000  // 5 minutes
});

const matrix = cache.get(key) ?? await fetchMatrix();
cache.set(key, matrix);
```

### Tip 2: Use Bun.match() for Large Arrays
```typescript
// Instead of:
const item = bigArray.find(x => x.id === id);  // Slow

// Use:
const item = Bun.match(bigArray, x => x.id === id);  // 5x faster
```

### Tip 3: Stream Large Files
```typescript
// Instead of loading in memory:
const content = await Bun.file('large.dat').text();

// Stream it:
return new Response(Bun.file('large.dat'));  // Zero-copy
```

## 🚀 What's Different From Node.js?

| Feature | Node.js | Bun |
|---------|---------|-----|
| HTTP library | Need express | Built-in `Bun.serve()` |
| HTTP client | Need axios | Built-in `fetch()` |
| Environment | Need dotenv | Auto-loaded `.env` |
| File I/O | fs module | `Bun.file()` 30x faster |
| Testing | jest/vitest | `bun:test` built-in |
| TypeScript | Need ts-node | Native support |
| Package manager | npm (slow) | bun (4x faster) |
| Speed | ~100ms startup | ~10ms startup |

## ❓ Common Questions

### Q: How do I use environment variables?
A: They're auto-loaded from `.env`
```typescript
const port = Bun.env.PORT || 3000;
```

### Q: Can I use my favorite npm package?
A: Yes! But try Bun-native first. ESLint will guide you.

### Q: How do I run the project?
A: `bun run dev`

### Q: How do I test?
A: `bun test`

### Q: How do I debug?
A: Visit `http://localhost:8765/debug` or use `Bun.inspect()`

### Q: Is Bun production-ready?
A: Yes! Used by many companies. Build with `bun build` for production.

## ✅ Checklist for Getting Started

- [ ] Clone/fork the repository
- [ ] Run `bun install`
- [ ] Copy `.env.example` → `.env`
- [ ] Run `bun run dev`
- [ ] Access http://localhost:8765/debug
- [ ] Read `.vscode/BUN_QUICK_REFERENCE.md`
- [ ] Try a code snippet (type `bfetch`)
- [ ] Run `bun test`
- [ ] Pick your first task (A, B, or C above)
- [ ] Make a pull request! 🎉

## 🎓 Learning Resources

### Built-in
- Quick Reference: `.vscode/BUN_QUICK_REFERENCE.md`
- Patterns: `docs/BUN_NATIVE_PATTERNS.md`
- Architecture: `docs/BUN_NATIVE_ARCHITECTURE.md`
- ESLint rules: `.eslintrc.json`
- Code snippets: `.vscode/bun-snippets.code-snippets`

### Online
- Official Docs: https://bun.sh/docs
- API Reference: https://bun.sh/docs/api
- GitHub: https://github.com/oven-sh/bun
- Discord: Bun community server

## 🤝 Need Help?

1. **Quick question?** → Open `.vscode/BUN_QUICK_REFERENCE.md`
2. **How do I use API X?** → Check `docs/BUN_NATIVE_PATTERNS.md`
3. **Full example?** → See `docs/BUN_NATIVE_ARCHITECTURE.md`
4. **Still stuck?** → Ask in Discord or GitHub issues

## 🎯 Next Steps

After you've read this:

1. **Read**: `.vscode/BUN_QUICK_REFERENCE.md` (2 min)
2. **Try**: A code snippet - type `bfetch` in a `.ts` file
3. **Build**: Your first endpoint or test
4. **Deploy**: Follow the checklist in `docs/IMPLEMENTATION_CHECKLIST.md`

---

**Welcome aboard! You're now a Bun-native developer. 🐰**

Questions? Check the docs or ask your team. Happy coding!
