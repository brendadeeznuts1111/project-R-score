# Dashboard SSE Reconnect Noise Across Restarts

## Summary
The dashboard SSE channel (`/api/dev-events`) produced noisy errors during restarts (for example `ERR_INCOMPLETE_CHUNKED_ENCODING`) even when core APIs remained healthy.

## Environment
- Dashboard tab left open across server restarts.
- Hot reload enabled/disabled across iterations.
- Chrome devtools network/console open.

## Repro
1. Open dashboard.
2. Restart server.
3. Observe console and network panel.

## Actual
- Stale SSE request errors appear.
- Follow-up `404`/chunked errors can occur depending on mode.

## Expected
- SSE shutdown/restart behavior is quiet and graceful.
- No red console noise for expected reconnect transitions.

## Acceptance Criteria
- No uncaught SSE errors during restart.
- If hot reload is disabled, client does not attempt SSE (or receives no-op stream cleanly).

