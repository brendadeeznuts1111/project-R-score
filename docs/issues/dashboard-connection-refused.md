# Dashboard Dev Server Intermittently Returns ERR_CONNECTION_REFUSED

## Summary
During dashboard development, the server intermittently becomes unreachable on `localhost:3099`, causing browser requests to fail with `net::ERR_CONNECTION_REFUSED`.

## Environment
- Bun watch mode: `bun --watch run scripts/search-benchmark-dashboard.ts --port 3099 --no-cookies --no-hot-reload`
- macOS
- Chrome

## Repro
1. Start dashboard in watch mode.
2. Trigger edit/restart cycles or rapid refresh loops.
3. Open `http://localhost:3099/dashboard`.

## Actual
- Request fails before HTTP response.
- HAR shows:
  - `status: 0`
  - `_error: net::ERR_CONNECTION_REFUSED`

## Expected
- Server remains consistently listening on `:3099` through watch restarts.

## Acceptance Criteria
- No connection-refused blips during normal watch-mode edits.
- Optional readiness check endpoint documents startup state.

