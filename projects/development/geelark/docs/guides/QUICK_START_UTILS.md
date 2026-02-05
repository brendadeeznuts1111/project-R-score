# Quick Start - Bun Utilities Dashboard

## 🚀 Get Started in 3 Steps

### 1. Run Examples

```bash
# See all Bun utilities in action
bun run examples:utils

# Output includes:
# ✅ Bun.inspect.table() - Beautiful tables
# ✅ Bun.inspect.custom - Custom formatting
# ✅ Bun.deepEquals() - Deep equality
# ✅ Bun.escapeHTML() - HTML escaping
# ✅ Bun.stringWidth() - String width calculation
```

### 2. Start Enhanced Server

```bash
# Start with random port, hot reload, and connection inspection
bun run dashboard:serve:enhanced

# Features:
# 🔥 Random port allocation (no conflicts!)
# 🔥 Hot reloading (auto-restart on changes)
# 🔥 Connection inspection (beautiful tables)
# 🔥 Real-time metrics dashboard
```

**Server Output**:
```
╔════════════════════════════════════════════════════════════════╗
║  🚀 Geelark Dashboard Server - Enhanced Edition                   ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────┬─────────────────┐
│    (property)   │     Values      │
├─────────────────┼─────────────────┤
│   Server Uptime │     0m 05s      │
│       Port      │      3000       │
│   Connections   │        0        │
│ Total Requests  │         1       │
│   Memory Usage  │     128 MB      │
│   Hot Reloads   │        0        │
└─────────────────┴─────────────────┘

🔌 Active Connections:

No active connections

⏰ Uptime: 0m 05s
🔥 Hot Reloads: 0
📡 Server: http://localhost:3000
```

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Pretty metrics table (uses Bun.inspect.table!)
curl http://localhost:3000/api/metrics/pretty

# Pretty connections table
curl http://localhost:3000/api/connections/pretty

# Calculate string width (emoji aware!)
curl "http://localhost:3000/api/width?text=Hello%20%F0%9F%94%A5"
# Response: {"text":"Hello 🔥","width":8}

# Test deep equality
curl http://localhost:3000/api/equals
# Response: {"obj1 == obj2":true,"obj1 == obj3":false}

# Safe HTML output (XSS prevention)
curl http://localhost:3000/api/metrics/html
```

---

## 📚 What's Included

### Enhanced Server Features

✅ **Random Port Allocation**
- Automatically finds available port (3000-9000)
- No more "port already in use" errors
- Tries preferred port first, falls back to random

✅ **Hot Reloading**
- Watches `./src` and `./dashboard-react/src`
- Auto-restarts on file changes (debounced 300ms)
- WebSocket notification to clients
- Tracks reload count

✅ **Connection Inspection**
- Real-time connection table
- Shows IP, user agent, duration, requests, idle time
- Beautiful terminal tables with `Bun.inspect.table()`

✅ **Custom Inspect**
- Metrics formatted as tables
- Connections formatted as tables
- Uses `Bun.inspect.custom` symbol

✅ **Deep Equality**
- Compare server state snapshots
- Validate configuration changes
- Test equality in unit tests

✅ **HTML Escaping**
- XSS prevention
- Safe user content rendering
- Uses `Bun.escapeHTML()`

✅ **String Width**
- Accurate terminal alignment
- Emoji-aware width calculation
- Uses `Bun.stringWidth()`

---

## 🎯 NPM Scripts

| Script | Description |
|--------|-------------|
| `bun run examples:utils` | Run Bun utilities examples |
| `bun run examples:file-io` | Run File I/O examples |
| `bun run examples:all` | Run all examples |
| `bun run dashboard:serve:enhanced` | Start enhanced server |

---

## 🔌 WebSocket Client Example

```typescript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "connected") {
    console.log("✅ Connected to server");
    console.log("Metrics:", data.metrics);
  }

  if (data.type === "reload") {
    console.log("♻️  Server reloading...");
  }

  if (data.type === "echo") {
    console.log("📨 Echo:", data.message);
  }
};

// Send message
ws.send("Hello, server!");
```

---

## 📖 Documentation Links

- [Bun Utilities Dashboard Integration](./BUN_UTILS_DASHBOARD.md)
- [Bun.inspect.table() Guide](./BUN_INSPECT_TABLE.md)
- [Bun File I/O Guide](./BUN_FILE_IO.md)
- [bun run - Guide](./BUN_RUN_STDIN.md)

---

## 🧪 Testing

### Test Random Port Allocation

```bash
# Start multiple instances - no conflicts!
Terminal 1: bun run dashboard:serve:enhanced
Terminal 2: bun run dashboard:serve:enhanced
Terminal 3: bun run dashboard:serve:enhanced

# Each will get a different port:
# 3000, 3001, 3002, etc.
```

### Test Hot Reload

```bash
# Start server
bun run dashboard:serve:enhanced

# In another terminal, modify a watched file:
echo "// change" >> src/index.ts

# Server will auto-reload and notify WebSocket clients
```

### Test Connection Inspection

```bash
# Connect via WebSocket
wscat -c ws://localhost:3000/ws

# Server dashboard will show:
🔌 Active Connections:

┌──────┬─────────┬──────────────────┬───────────┬──────────┬──────┐
│ ID   │ IP      │ User Agent       │ Connected │ Requests │ Idle │
├──────┼─────────┼──────────────────┼───────────┼──────────┼──────┤
│ a1b2… │ ::1     │ wscat/1.0.0…    │ 0m 05s    │ 1        │ 0s   │
└──────┴─────────┴──────────────────┴───────────┴──────────┴──────┘
```

---

## 🎨 Customization

### Change Port Range

```typescript
// In dashboard-server-enhanced.ts
const CONFIG = {
  port: {
    min: 4000,  // Change min port
    max: 5000,  // Change max port
    preferred: 4000  // Change preferred port
  }
};
```

### Add Watch Paths

```typescript
// Add more paths to watch
const CONFIG = {
  hotReload: {
    enabled: true,
    watchPaths: [
      "./src",
      "./dashboard-react/src",
      "./config",  // Add custom paths
      "./tests"
    ]
  }
};
```

### Customize Dashboard

```typescript
// Add custom metrics to display
function printDashboard() {
  console.log("\n=== Custom Section ===\n");
  console.log(Bun.inspect.table(yourCustomData));
}
```

---

## ✅ Success Indicators

You'll know everything is working when you see:

1. ✅ Server starts without port conflicts
2. ✅ Dashboard displays beautiful tables
3. ✅ Hot reload activates on file changes
4. ✅ WebSocket connections show in table
5. ✅ API endpoints return pretty tables
6. ✅ String width calculations work with emoji
7. ✅ Deep equality comparisons work correctly
8. ✅ HTML escaping prevents XSS

---

## 🆘 Troubleshooting

### Port in use?

**Solution**: Enhanced server automatically finds available port

```bash
# Just start it - it will find an available port
bun run dashboard:serve:enhanced
```

### Hot reload not working?

**Solution**: Check file paths are correct

```typescript
// Ensure paths are relative to project root
watchPaths: ["./src", "./dashboard-react/src"]
```

### Tables not aligned?

**Solution**: Use `Bun.stringWidth()` for emoji

```typescript
// Wrong: uses string.length
const padding = 20 - str.length; // Breaks with emoji

// Correct: uses Bun.stringWidth()
const padding = 20 - Bun.stringWidth(str); // Works!
```

### XSS vulnerability?

**Solution**: Always escape user input

```typescript
// Wrong
const html = `<div>${userInput}</div>`;

// Correct
const html = `<div>${Bun.escapeHTML(userInput)}</div>`;
```

---

## 🎓 Next Steps

1. **Explore the examples**: `bun run examples:all`
2. **Read the documentation**: [BUN_UTILS_DASHBOARD.md](./BUN_UTILS_DASHBOARD.md)
3. **Customize the server**: Edit `dashboard-server-enhanced.ts`
4. **Build your own**: Use the utilities in your project

---

**Happy coding!** 🚀

**Sources**:
- [Bun.inspect.table](https://bun.com/reference/bun/inspect/table)
- [Bun Utils Docs](https://bun.com/docs/runtime/utils)
- [Bun v1.1.31 Release](https://bun.com/blog/bun-v1.1.31)
