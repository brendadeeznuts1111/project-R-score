## Brief overview
  Guidelines for maintaining and evolving the 'Empire Pro' Unified Infrastructure, focusing on the synergy between Bun-native performance, RBAC security, and real-time observability.

## Architectural Synergy
  - **Unified API Backbone**: All infrastructure metrics must flow through the standardized v2.1.0 (Elysia) API. Use the standard response envelope {success, data, error, metadata} for all endpoints.
  - **Bun-Native First**: Prioritize Bun's native `S3Client` for R2 storage, `Bun.serve` for dashboard delivery, and `Bun.zstdCompressSync` for data efficiency.
  - **CLI-UI Parity**: Every dashboard tool call must have a direct CLI equivalent (e.g., `empire storage audit`). Maintain the "CLI Trigger Bar" in dashboards to provide transparency for automation actions.

## Security & Governance
  - **RBAC Enforcement**: Use the `PERMISSIONS` matrix in `src/rbac/permissions.ts`. Every infrastructure request must verify explicit permissions (e.g., `ops:metrics`, `storage:read`).
  - **Scope Isolation**: Strictly adhere to the organizational scoping policy (ENTERPRISE vs DEVELOPMENT). Ensure scope is propagated from the Serving Domain down to the R2 Bucket prefix.

## Observability Standards
  - **Real-Time Telemetry**: Dashboards must integrate Git history (repo status), system loss (log tailing), and external health (Bun RSS) to provide a complete operational picture.
  - **Automated Drifting**: Maintain the "Sync Health" logic that compares local data mirrors against remote Cloudflare R2 counts.
  - **Advanced Server Controls**: Utilize `server.reload()` for zero-downtime updates and granular `server.timeout()` per request type (standard API vs heavy exports).

## UI/UX Preferences
  - **High-Density Data**: Use glassmorphism and collapsible Tailwind components to handle high-density metric views without visual congestion.
  - **Pinned Tracking**: Maintain persistence for "Favorite" metrics using the localized Pinned Bar system.
  - **Omni-Search**: Group global CMD+K search results by functional area (Navigation, Maintenance, Tooling).
