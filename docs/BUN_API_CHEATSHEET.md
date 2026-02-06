# 📚 Bun API Cheatsheet

Complete reference of Bun-native APIs for replacing Node.js modules.

## 🎯 Quick Migration Reference

| Node.js Module | Bun Replacement |
|----------------|-----------------|
| `fs` | `Bun.file()`, `Bun.write()` |
| `child_process` | `Bun.spawn()`, `Bun.spawnSync()` |
| `crypto` (hashing) | `Bun.hash()`, `Bun.password` |
| `http`/`https` | `Bun.serve()` |
| `zlib` | `Bun.gzipSync()`, `Bun.deflateSync()` |
| `path` | `Bun.fileURLToPath()` |
| `util.promisify` | Native Promises |

---

## 📁 File I/O

### Read Files

```typescript
// ❌ Node.js
import { readFileSync } from 'fs';
const text = readFileSync('file.txt', 'utf8');
const json = JSON.parse(readFileSync('data.json', 'utf8'));

// ✅ Bun
const text = await Bun.file('file.txt').text();
const json = await Bun.file('data.json').json();
const bytes = await Bun.file('file.bin').bytes();
const stream = Bun.file('file.txt').stream();
```

### Write Files

```typescript
// ❌ Node.js
import { writeFileSync } from 'fs';
writeFileSync('file.txt', 'Hello World');
writeFileSync('data.json', JSON.stringify(data, null, 2));

// ✅ Bun
await Bun.write('file.txt', 'Hello World');
await Bun.write('data.json', JSON.stringify(data, null, 2));
await Bun.write('file.bin', new Uint8Array([1, 2, 3]));
```

### Check Existence

```typescript
// ❌ Node.js
import { existsSync } from 'fs';
if (existsSync('file.txt')) { ... }

// ✅ Bun
if (await Bun.file('file.txt').exists()) { ... }
```

### File Stats

```typescript
const file = Bun.file('file.txt');
const size = file.size;
const type = file.type;
const lastModified = file.lastModified;
```

---

## 🔄 Child Processes

### Spawn Process

```typescript
// ❌ Node.js
import { spawn } from 'child_process';
const proc = spawn('bun', ['script.ts'], { stdio: 'inherit' });
proc.on('exit', (code) => console.log(`Exit: ${code}`));

// ✅ Bun
const proc = Bun.spawn(['bun', 'script.ts'], {
  stdio: ['inherit', 'inherit', 'inherit'],
});
const exitCode = await proc.exited;
console.log(`Exit: ${exitCode}`);
```

### Spawn with Output

```typescript
// ✅ Bun
const proc = Bun.spawn(['ls', '-la'], {
  stdio: ['inherit', 'pipe', 'pipe'],
});
const text = await new Response(proc.stdout).text();
```

### Synchronous Spawn

```typescript
// ✅ Bun
const result = Bun.spawnSync(['bun', '--version']);
console.log(result.stdout?.toString());
```

---

## 🔐 Hashing & Passwords

### Fast Hashing

```typescript
// ❌ Node.js
import crypto from 'crypto';
const hash = crypto.createHash('sha256').update(data).digest('hex');

// ✅ Bun
const hashBuffer = await Bun.hash(data, 'sha256');
const hash = Buffer.from(hashBuffer).toString('hex');

// Available algorithms: 'sha256', 'sha512', 'blake3', etc.
```

### Password Hashing

```typescript
// ❌ Node.js (pbkdf2)
import crypto from 'crypto';
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

// ✅ Bun (bcrypt/argon2)
const hashed = await Bun.password.hash(password, {
  algorithm: 'bcrypt', // or 'argon2id', 'argon2d', 'argon2i'
  cost: 10,
});

const isValid = await Bun.password.verify(password, hashed);
```

### CryptoHasher (Streaming)

```typescript
const hasher = new Bun.CryptoHasher('sha256');
hasher.update('chunk1');
hasher.update('chunk2');
const hash = hasher.digest('hex');
```

---

## 🌐 HTTP Server

### Basic Server

```typescript
// ❌ Node.js
import http from 'http';
http.createServer((req, res) => {
  res.end('Hello World');
}).listen(3000);

// ✅ Bun
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello World');
  },
});
```

### With Routes

```typescript
Bun.serve({
  port: 3000,
  routes: {
    '/': () => new Response('Home'),
    '/api/users': () => Response.json({ users: [] }),
    '/api/users/:id': (req) => {
      const id = req.params.id;
      return Response.json({ id });
    },
  },
});
```

### WebSocket Server

```typescript
Bun.serve({
  port: 3000,
  websocket: {
    open(ws) {
      ws.subscribe('room');
    },
    message(ws, message) {
      ws.publish('room', message);
    },
  },
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response('WebSocket server');
  },
});
```

---

## 🗜️ Compression

```typescript
// Compress
const compressed = Bun.gzipSync('Hello World');
const deflated = Bun.deflateSync('Hello World');
const zstdCompressed = Bun.zstdCompressSync('Hello World');

// Decompress
const decompressed = Bun.gunzipSync(compressed);
const inflated = Bun.inflateSync(deflated);
const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
```

---

## 🧵 Utilities

### Sleep

```typescript
// ❌ Node.js
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ Bun
await Bun.sleep(1000); // milliseconds
Bun.sleepSync(1000);   // synchronous
```

### High-Resolution Timing

```typescript
const start = Bun.nanoseconds();
// ... do work ...
const elapsed = Bun.nanoseconds() - start;
```

### Deep Equality

```typescript
// ❌ Node.js
JSON.stringify(a) === JSON.stringify(b);

// ✅ Bun
Bun.deepEquals(a, b);
```

### Inspect

```typescript
console.log(Bun.inspect({ a: 1, b: 2 }, { colors: true }));

// Table
console.log(Bun.inspect.table(data, ['col1', 'col2']));
```

### String Utilities

```typescript
// Escape HTML
const safe = Bun.escapeHTML('<script>alert("xss")</script>');
// &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

// String width (Unicode-aware)
const width = Bun.stringWidth('Hello 👋'); // 7

// Line index
const line = Bun.indexOfLine(text, 5); // Find start of 5th line
```

---

## 🌐 Network

### TCP Server

```typescript
const server = Bun.listen({
  hostname: 'localhost',
  port: 3000,
  socket: {
    open(socket) {
      socket.write('Hello');
    },
    data(socket, data) {
      socket.write(data);
    },
  },
});
```

### TCP Client

```typescript
const socket = await Bun.connect({
  hostname: 'localhost',
  port: 3000,
  socket: {
    open(socket) {
      socket.write('Hello');
    },
    data(socket, data) {
      console.log('Received:', data);
    },
  },
});
```

### WebSocket Client

```typescript
const ws = new WebSocket('wss://echo.websocket.org');
ws.onopen = () => ws.send('Hello');
ws.onmessage = (e) => console.log(e.data);
```

---

## 🗄️ Databases

### SQLite

```typescript
import { Database } from 'bun:sqlite';

const db = new Database('app.db');
db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');

const query = db.query('SELECT * FROM users WHERE id = ?');
const user = query.get(1);
```

### PostgreSQL

```typescript
import { sql } from 'bun';

const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Redis

```typescript
const client = new Bun.RedisClient('redis://localhost:6379');
await client.set('key', 'value');
const value = await client.get('key');
```

---

## 🧪 Testing

```typescript
import { test, expect } from 'bun:test';

test('addition', () => {
  expect(1 + 1).toBe(2);
});

test('async', async () => {
  const result = await fetch('https://api.example.com');
  expect(result.status).toBe(200);
});
```

Run tests:
```bash
bun test
bun test --watch
bun test --coverage
```

---

## 📦 Module Resolution

### Resolve Module

```typescript
const path = Bun.resolveSync('./module.ts', import.meta.dir);
```

### Plugins

```typescript
Bun.plugin({
  name: 'My Plugin',
  setup(build) {
    build.onResolve({ filter: /^\.\/\.env$/ }, (args) => ({
      path: args.path,
      namespace: 'env',
    }));
  },
});
```

---

## 🎯 Other Useful APIs

### Environment

```typescript
// Same as process.env but typed
const apiKey = Bun.env.API_KEY;

// Bun version info
console.log(Bun.version);    // "1.3.9"
console.log(Bun.revision);   // commit hash
```

### Glob

```typescript
const glob = new Bun.Glob('**/*.ts');
for await (const file of glob.scan('./src')) {
  console.log(file);
}
```

### Semver

```typescript
const version = Bun.semver.parse('1.2.3');
const satisfies = Bun.semver.satisfies('1.2.3', '^1.0.0');
```

### TOML

```typescript
const data = Bun.TOML.parse(tomlString);
```

### Colors

```typescript
const hex = Bun.color('hsl(120, 100%, 50%)', 'hex');     // #00ff00
const ansi = Bun.color('#00ff00', 'ansi');                // ANSI escape code
```

### UUID

```typescript
const uuid = Bun.randomUUIDv7(); // UUID v7 with timestamp
```

### Path to File URL

```typescript
const fileUrl = Bun.pathToFileURL('/path/to/file');
const path = Bun.fileURLToPath('file:///path/to/file');
```

---

## 🔗 Quick Reference by Task

| Task | Bun API |
|------|---------|
| Read file | `Bun.file(path).text()` |
| Write file | `Bun.write(path, data)` |
| Spawn process | `Bun.spawn([cmd, args])` |
| Hash data | `Bun.hash(data, 'sha256')` |
| Hash password | `Bun.password.hash(pw)` |
| Start HTTP server | `Bun.serve({ port, fetch })` |
| Compress | `Bun.gzipSync(data)` |
| Sleep | `Bun.sleep(ms)` |
| Deep equal | `Bun.deepEquals(a, b)` |
| High-res time | `Bun.nanoseconds()` |
| SQLite | `new Database('db.sqlite')` |
| Parse TOML | `Bun.TOML.parse(str)` |
| Glob files | `new Bun.Glob(pattern)` |
| Escape HTML | `Bun.escapeHTML(str)` |

---

## 📚 Resources

- [Bun Documentation](https://bun.sh/docs)
- [API Reference](https://bun.sh/docs/api/utils)
- [File I/O](https://bun.sh/docs/api/file-io)
- [HTTP Server](https://bun.sh/docs/api/http)
- [SQLite](https://bun.sh/docs/api/sqlite)
