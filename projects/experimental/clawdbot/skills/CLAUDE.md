# Skills API Server

## Quick Start
```bash
bun run src/api-server.ts
# Dashboard: http://localhost:3002/dashboard?key=dev-key
```

## Project Structure
```
skills/
├── src/
│   ├── api-server.ts      # Main server + dashboard (~2500 LOC)
│   ├── skills.ts          # Skill registry
│   ├── packager.ts        # Packaging utilities
│   ├── version-manager.ts # Version management
│   ├── pty/               # PTY terminal management
│   ├── debugger/          # Debug recording/replay
│   └── security/          # PTY session security
├── skills/                # Individual skill implementations
│   ├── weather/
│   ├── 1password/
│   └── ...
└── package.json
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/skills` | List all skills |
| GET | `/api/metrics` | Execution metrics |
| GET | `/api/logs` | Server logs |
| POST | `/api/skills/:id/execute` | Execute skill |
| DELETE | `/api/logs` | Clear logs |

## Dashboard Components
- **Header**: SCOPE badge, version tooltip, system tension ring, live indicator, quick stats
- **Stats Grid**: Total execs, success rate, avg time, terminals, hourly stats, uptime, CPU
- **Sparklines**: 24h execution and error rate trends
- **Skills List**: Status indicators (ready/env/bin)
- **Logs Panel**: Filterable by level/category/search, expandable details
- **Terminal Sessions**: Active PTY tracking

## Environment Variables
- `SKILL_API_KEYS` / `API_KEYS` - Comma-separated API keys (default: `dev-key`)
- `DEBUG=1` - Enable verbose logging
- `PORT` - Server port (default: 3002)

## Development Notes
- Dashboard is embedded HTML in `api-server.ts` (search for `const dashboardHTML`)
- Metrics are in-memory with 200-entry ring buffer for logs
- WebSocket support for real-time execution
- Tailscale detection for remote access URLs
