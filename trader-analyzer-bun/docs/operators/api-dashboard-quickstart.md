# 1.9.0.0.0.0.0: API-Dashboard-Portal Quick Start for Operators

**Version**: 1.9.0.0.0.0.0  
**Component**: Operator Quick Reference Guide  
**Status**: ✅ Complete  
**Date**: 2024-12-06

**Ripgrep Pattern**: `1\.9\.0\.0\.0\.0\.0|api-dashboard-quickstart|operator.*quick.*reference`

---

## 1.9.1.0.0.0.0: Starting the Full Stack

This section provides commands for launching all necessary Hyper-Bun MLGS components using `tmuxinator`.

### 1.9.1.1.0.0.0: Terminal 1: Start Main Server

Executes the main HyperBun MLGS server via the tmuxinator 'server' window.

```bash
# Cross-reference: 1.7.1.0.0.0.0 Server Window
./scripts/tmux-mlgs.sh server
# Inside tmux: bun run dev
```

### 1.9.1.2.0.0.0: Terminal 2: Open Dashboard

Launches the dashboard in a dedicated Chromium instance via the tmuxinator 'dashboard' window.

```bash
# Cross-reference: 1.7.2.0.0.0.0 Dashboard Window
./scripts/tmux-mlgs.sh dashboard
# Inside tmux: chromium --app=http://localhost:3000
```

### 1.9.1.3.0.0.0: Terminal 3: Monitor Logs

Activates real-time log monitoring via the tmuxinator 'logs' window.

```bash
# Cross-reference: 1.7.4.0.0.0.0 Logs Window
./scripts/tmux-mlgs.sh logs
```

---

## 1.9.2.0.0.0.0: Key API Endpoints Reference

This table provides a quick reference for essential API endpoints used by the dashboard and other operational tools.

| Endpoint | Method | Usage | Example | Cross-reference |
|----------|--------|-------|---------|-----------------|
| `/api/v1/graph` | GET | Get correlation graph data | `?eventId=NFL-20241207-1345` | `1.2.3.0.0.0.0` |
| `/api/v1/logs` | GET | Query historical audit logs | `?level=WARN&limit=50` | `1.2.4.0.0.0.0` |
| `/api/v1/auth/login` | POST | Operator authentication | `{"username": "op", "password": "secure_password"}` | `1.2.1.0.0.0.0` |
| `/api/v1/secrets/:server/:type` | DELETE | Delete a stored secret | `/secrets/nexus/api-key` | `1.2.2.0.0.0.0` |
| `/ws/logs` | WS | Real-time log stream via WebSocket | Connect with WebSocket client | `1.3.0.0.0.0.0` |
| `/health` | GET | Server health check | `curl http://localhost:3000/health` | `1.6.2.0.0.0.0` |

---

## 1.9.3.0.0.0.0: Dashboard Features Overview

This section highlights the main functionalities of the HyperBun MLGS Operations Portal.

### 1.9.3.1.0.0.0: Real-Time Log Streaming

- Automatic reconnect with exponential backoff (`1.5.2.0.0.0.0`)
- Filter by level, search by text (`1.5.13.0.0.0.0`)
- Clear logs with Ctrl+L (Planned/Future: Add button)
- Export logs: Click "Export" button (Planned/Future: Adds client-side functionality)

**Cross-References**:
- `1.3.0.0.0.0.0` - Real-Time WebSocket Logs
- `1.5.4.0.0.0.0` - Log Rendering
- `1.5.5.0.0.0.0` - Log Count Updates

### 1.9.3.2.0.0.0: Graph Visualization (Multi-Layer Correlation Graph)

- Drag nodes to rearrange (vis.Network feature)
- Click node to see details (Planned/Future: `deeplink_url` support via `4.2.2.2.0.0.0.6.5`)
- Auto-refresh every 5 seconds (`1.5.6.0.0.0.0`)
- Search event ID: Enter in top input (`1.5.7.0.0.0.0`)

**Cross-References**:
- `4.2.2.0.0.0.0` - Multi-Layer Correlation Graph
- `1.2.3.0.0.0.0` - Graph API Route
- `1.5.6.0.0.0.0` - Graph Visualization Setup

### 1.9.3.3.0.0.0: Metrics Panel

- Switch time ranges: 1m, 5m, 15m, 1h (Planned/Future: Client-side filtering logic)
- Hover for tooltips (vis.Network feature)
- Red values indicate threshold breaches (CSS styling `1.8.6.1.0.0.0`)

**Cross-References**:
- `1.5.8.0.0.0.0` - Metrics Polling
- `1.1.7.0.0.0.0` - Metrics Collection
- `1.10.0.0.0.0.0` - Bun System Metrics

### 1.9.3.4.0.0.0: Debug Panel (`7.3.0.0.0.0.0 Hyper-Bun Deep Console Inspector`)

- **Move**: Drag header (`1.5.9.0.0.0.0`)
- **Resize**: Drag bottom-right corner (`1.5.9.0.0.0.0`)
- **Reset**: Click ↻ button (`1.5.9.0.0.0.0`)
- **State persists**: Across refreshes (`1.5.10.0.0.0.0` & `1.5.11.0.0.0.0`)

**Cross-References**:
- `7.3.0.0.0.0.0` - Hyper-Bun Deep Console Inspector
- `1.5.9.0.0.0.0` - Debug Panel Integration
- `1.8.20.0.0.0.0` - Debug Panel Styles

---

## 1.9.4.0.0.0.0: Tmux Key Bindings for Workspace Navigation

This section provides essential `Ctrl-Space` (default `tmux` prefix) key bindings for efficient navigation within the HyperBun MLGS `tmuxinator` workspace.

```bash
Ctrl-Space + S  # Switch to server window (1.7.1.0.0.0.0)
Ctrl-Space + D  # Switch to dashboard window (1.7.2.0.0.0.0)
Ctrl-Space + M  # Switch to monitoring window (1.7.3.0.0.0.0)
Ctrl-Space + L  # Switch to logs window (1.7.4.0.0.0.0)
Ctrl-Space + A  # Switch to API console window (1.7.5.0.0.0.0)
```

**Cross-References**:
- `1.7.0.0.0.0.0` - Tmux Integration
- `config/.tmuxinator.yml` - Configuration file

---

## 1.9.5.0.0.0.0: Emergency Procedures & Troubleshooting

This guide provides immediate steps for common operational issues encountered with HyperBun MLGS.

### 1.9.5.1.0.0.0: WebSocket Disconnected

1. Check server health: `curl http://localhost:3000/health` (Cross-reference: `1.6.2.0.0.0.0`)
2. Check logs: Look for `HBWS-*` codes (Cross-reference: `1.3.0.0.0.0.0` Real-Time WebSocket Logs)
3. Reconnect dashboard: Refresh dashboard (F5) (Cross-reference: `1.5.2.0.0.0.0` WebSocket Setup)

**Ripgrep**: `rg "HBWS-001|HBWS-002|HBWS-003|HBWS-004" logs/`

### 1.9.5.2.0.0.0: Slow Graph Generation (>1s)

1. Check metrics panel: Look for red values (`1.9.3.3.0.0.0`).
2. Check database: `sqlite3 /var/lib/hyperbun/production.db "SELECT COUNT(*) FROM multi_layer_correlations"` (Cross-reference: `1.6.1.1.0.0.0` Database Initialization).
3. Scale horizontally: `bun run deploy:scale --workers=8` (External deployment script).

**Cross-References**:
- `1.2.3.0.0.0.0` - Graph API Route
- `4.2.2.0.0.0.0` - Multi-Layer Correlation Graph Logic
- `1.1.2.4.0.0.0` - Slow Request Warning

### 1.9.5.3.0.0.0: Unauthorized Access

1. Check security audit log: `grep HBSE logs/security.log` (Cross-reference: `1.1.3.1.0.0.0` Audit Log Error).
2. Rotate secrets: `bun run secrets:rotate` (Uses `Bun.secrets` (`9.1.1.1.1.1.0`) and `1.2.2.0.0.0.0` Secrets API Route).
3. Block IP: Update `config/firewall.sh` (External OS configuration).

**Cross-References**:
- `1.1.3.0.0.0.0` - Error Handler
- `1.2.2.0.0.0.0` - Secrets API Route
- `9.1.1.1.1.1.0` - Bun.secrets API

---

## 1.9.6.0.0.0.0: Quick Command Reference

### Start Services

```bash
# Full stack startup
tmuxinator start hyperbun-mlgs

# Individual windows
tmuxinator start hyperbun-mlgs -n server
tmuxinator start hyperbun-mlgs -n dashboard
tmuxinator start hyperbun-mlgs -n monitoring
tmuxinator start hyperbun-mlgs -n logs
tmuxinator start hyperbun-mlgs -n api
```

### API Testing

```bash
# Health check
curl http://localhost:3000/health

# Get correlation graph
curl "http://localhost:3000/api/v1/graph?eventId=NFL-20241207-1345"

# Query audit logs
curl "http://localhost:3000/api/v1/logs?level=WARN&limit=50"
```

### WebSocket Testing

```bash
# Using wscat (if installed)
wscat -c ws://localhost:3000/ws/logs

# Using curl (for testing)
curl --include \
  --no-buffer \
  --header "Connection: Upgrade" \
  --header "Upgrade: websocket" \
  --header "Sec-WebSocket-Key: test" \
  --header "Sec-WebSocket-Version: 13" \
  http://localhost:3000/ws/logs
```

---

## Related Documentation

- [1.0.0.0.0.0.0 API-Dashboard-Portal Integration](../1.0.0.0.0.0.0-API-DASHBOARD-PORTAL-INTEGRATION.md) - Complete integration documentation
- [1.7.0.0.0.0.0 Tmux Integration](../1.0.0.0.0.0.0-API-DASHBOARD-PORTAL-INTEGRATION.md#17000000-tmux-integration-config-tmuxinatoryml) - Tmux workspace configuration
- [4.2.2.0.0.0.0 Multi-Layer Correlation Graph](../4.0.0.0.0.0.0-MCP-ALERTING.md#42200000-multi-layer-correlation-graph---developer-dashboard) - Graph logic documentation
- [7.3.0.0.0.0.0 Hyper-Bun Deep Console Inspector](../7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md#73000000-hyper-bun-deep-console-inspector-deepconsolelogt) - Debug panel integration

---

**Ripgrep Pattern**: `1\.9\.0\.0\.0\.0\.0|api-dashboard-quickstart|operator.*quick.*reference`
