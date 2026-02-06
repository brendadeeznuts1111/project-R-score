# 🌐 Custom Hostname Setup for Nebula-Flow™

The API dashboard server is now configured to listen on `0.0.0.0:3000`, which means it's accessible via:

- ✅ `http://localhost:3000` (works immediately)
- ⏳ `http://nebula.local:3000` (requires /etc/hosts setup)

## Setup Custom Hostname (Optional)

To access the dashboard using the custom hostname `nebula.local`, run this command in your terminal:

```bash
echo "127.0.0.1 nebula.local" | sudo tee -a /etc/hosts
echo "127.0.0.1 api.duoplus.local" | sudo tee -a /etc/hosts
```

You'll be prompted for your password. After that, you can access:

- 🌐 **Dashboard**: http://nebula.local:3000
- 🔌 **API**: http://api.duoplus.local:3000

## Verify Setup

Check that the hostnames are configured:

```bash
grep -E "nebula.local|api.duoplus.local" /etc/hosts
```

You should see:
```text
127.0.0.1 nebula.local
127.0.0.1 api.duoplus.local
```

## Server Configuration

The web-app server is configured with:

```javascript
const server = Bun.serve({
    hostname: "0.0.0.0",  // Listen on all interfaces
    port: 3000,
    // ... rest of config
});
```

This allows the server to be accessed from:
- `localhost:3000`
- `127.0.0.1:3000`
- `nebula.local:3000` (after /etc/hosts setup)
- Any other hostname that resolves to 127.0.0.1

## Start the Server

```bash
bun web-app/server.js
```

Or use the npm script:

```bash
bun run dashboard
```

## Features Available

✅ Real-time profit ticker (Pulsar™)
✅ Lightning Network metrics
✅ Device management
✅ Atlas database
✅ System logs
✅ Configuration panel
✅ WebSocket live updates
✅ CSV import/export
✅ Excel export

Enjoy! 🚀

