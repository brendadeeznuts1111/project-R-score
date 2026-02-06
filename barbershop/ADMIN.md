# Admin Flow

## Entry Point

- URL: `http://localhost:3000/admin`
- WebSocket stream: `ws://localhost:3000/admin/ws?key=godmode123`

## Primary Journey

1. Open admin dashboard and verify live stream connection.
2. Watch financial cards update from completed tickets.
3. Monitor active sessions and telemetry events.
4. Validate barber status transitions during login and completion flow.

## Related Endpoints

- `GET /admin/data`: latest sessions, telemetry, and financial snapshot
- `GET /admin/orders`: bundled checkout orders with tip breakdown by barber
- `GET /docs`: documentation index
- `GET /docs/manifest`: current demo manifest (TOML)
- `GET /docs/manifest.json`: parsed manifest (Bun TOML loader)

## Demo Notes

- Keep admin open while running client + barber interactions for full end-to-end visibility.
- If telemetry appears stale, refresh `/admin/data` to confirm backend updates.
