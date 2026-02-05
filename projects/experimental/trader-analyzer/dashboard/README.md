# NEXUS Dev Dashboard

**Local development dashboard for monitoring integrations**

---

## Quick Start

Simply open `dashboard/index.html` in your browser:

```bash
# macOS
open dashboard/index.html

# Linux
xdg-open dashboard/index.html

# Windows
start dashboard/index.html

# Or just double-click the file
```

The dashboard works with the `file://` protocol - no server needed!

---

## Features

### ✅ Standalone Operation
- Works with `file://` protocol
- No ports or servers required
- Self-contained HTML/CSS/JS

### ✅ Integration Monitoring
- **API Server** - Health check and status
- **Telegram Bot** - Connection status and topics
- **System Metrics** - Basic system information
- **Message Logs** - Recent Telegram messages

### ✅ Auto Refresh
- Optional auto-refresh every 5 seconds
- Manual refresh button
- Last update timestamp

### ✅ Data Export/Import
- Export current dashboard state
- Load data from JSON files
- Works offline

---

## Usage

### Basic Usage

1. **Open Dashboard**
   ```bash
   open dashboard/index.html
   ```

2. **Connect to API** (optional)
   - Dashboard automatically tries to connect to `http://localhost:3000`
   - If API is running, it will show live data
   - If not, it works in standalone mode

3. **Auto Refresh**
   - Click "Start Auto Refresh" to enable 5-second updates
   - Click "Stop Auto Refresh" to disable

### Loading Data from Files

1. Click "Load from File"
2. Select a JSON file with dashboard data
3. Data will be displayed in the dashboard

**JSON Format:**
```json
{
  "telegram": {
    "topics": [
      {
        "message_thread_id": 2,
        "name": "Live Alerts"
      }
    ],
    "messages": [
      {
        "timestamp": "2025-01-04T12:00:00Z",
        "message": "Test message",
        "threadId": 2
      }
    ]
  }
}
```

### Exporting Data

1. Click "Export Data"
2. A JSON file will be downloaded
3. Contains current dashboard state

---

## API Integration

The dashboard automatically connects to `http://localhost:3000` if available:

**Endpoints Used:**
- `GET /health` - API health check
- `GET /discovery` - API endpoint discovery
- `GET /telegram/bot/status` - Telegram bot status
- `GET /telegram/topics` - Telegram topics list

**If API is offline:**
- Dashboard still works in standalone mode
- Shows "Offline" status
- Can load data from files

---

## File Structure

```
dashboard/
├── index.html          # Main dashboard (standalone)
├── README.md          # This file
└── data/              # Optional data files
    └── telegram-logs/ # Telegram log files
```

---

## Customization

### Change API URL

Edit `index.html` and modify:
```javascript
const API_BASE = 'http://localhost:3000';
```

### Change Refresh Interval

Edit `index.html` and modify:
```javascript
autoRefreshInterval = setInterval(refreshAll, 5000); // 5 seconds
```

### Add New Integrations

1. Add a new card in the HTML
2. Add a check function in JavaScript
3. Call it in `refreshAll()`

---

## Troubleshooting

### "Cannot connect to API"

**Solution:** This is normal if the API isn't running. The dashboard works in standalone mode.

### "CORS errors"

**Solution:** If accessing via `file://` protocol, CORS may block API calls. Options:
1. Use a local web server: `python -m http.server 8000` then open `http://localhost:8000/dashboard/index.html`
2. Load data from files instead
3. Use the standalone mode

### "No data showing"

**Solution:**
1. Ensure API is running: `bun run dev`
2. Check browser console for errors
3. Try loading data from file
4. Check API endpoints are accessible

---

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

**Note:** Some features may be limited in older browsers.

---

## Security

This dashboard is for **local development only**:
- No authentication required
- Connects to localhost only
- Safe to use with `file://` protocol
- No external network calls (except localhost API)

---

## See Also

- `TELEGRAM-CLI.md` - Telegram CLI tool
- `GOLDEN-SUPERGROUP.md` - Golden supergroup setup
- `src/cli/dashboard.ts` - Terminal dashboard
