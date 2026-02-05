## Brief overview
  Guidelines for maintaining and evolving the 'Empire Pro' Unified Infrastructure, focusing on the synergy between Bun-native performance, RBAC security, enterprise secrets management, and real-time observability.

## Architectural Synergy
  - **Unified API Backbone**: All infrastructure metrics must flow through the standardized v2.1.0 (Elysia) API. Use the standard response envelope {success, data, error, metadata} for all endpoints.
  - **Bun-Native First**: Prioritize Bun's native `S3Client` for R2 storage, `Bun.serve` for dashboard delivery, and `Bun.zstdCompressSync` for data efficiency.
  - **Enterprise Secrets Integration**: All infrastructure components must use `Bun.secrets` with `CRED_PERSIST_ENTERPRISE` for secure credential management and per-user isolation.
  - **Platform-Aware Architecture**: Utilize platform detection to adapt infrastructure behavior based on OS capabilities (Credential Manager, Keychain, Secret Service).
  - **CLI-UI Parity**: Every dashboard tool call must have a direct CLI equivalent (e.g., `empire storage audit`). Maintain the "CLI Trigger Bar" in dashboards to provide transparency for automation actions.

## Security & Governance
  - **RBAC Enforcement**: Use the `PERMISSIONS` matrix in `src/rbac/permissions.ts`. Every infrastructure request must verify explicit permissions (e.g., `ops:metrics`, `storage:read`).
  - **Scope Isolation**: Strictly adhere to the organizational scoping policy (ENTERPRISE vs DEVELOPMENT). Ensure scope is propagated from the Serving Domain down to the R2 Bucket prefix.
  - **Per-User Secrets Isolation**: All infrastructure credentials must use `CRED_PERSIST_ENTERPRISE` flag to prevent cross-user secret access in multi-user environments.
  - **Platform-Specific Security**: Leverage OS-native security features:
    - Windows: Credential Manager with enterprise scoping
    - macOS: Keychain with per-user access controls
    - Linux: Secret Service with user isolation

## Observability Standards
  - **Real-Time Telemetry**: Dashboards must integrate Git history (repo status), system loss (log tailing), and external health (Bun RSS) to provide a complete operational picture.
  - **Platform Health Monitoring**: Include platform capability metrics and storage backend status in observability dashboards.
  - **Secrets Health Tracking**: Monitor secrets storage health, accessibility, and scoping validation across all platforms.
  - **Automated Drifting**: Maintain the "Sync Health" logic that compares local data mirrors against remote Cloudflare R2 counts.
  - **Advanced Server Controls**: Utilize `server.reload()` for zero-downtime updates and granular `server.timeout()` per request type (standard API vs heavy exports).

## UI/UX Preferences
  - **High-Density Data**: Use glassmorphism and collapsible Tailwind components to handle high-density metric views without visual congestion.
  - **Platform Status Indicators**: Display current platform, storage backend, and secrets scoping status prominently in infrastructure dashboards.
  - **Pinned Tracking**: Maintain persistence for "Favorite" metrics using the localized Pinned Bar system.
  - **Omni-Search**: Group global CMD+K search results by functional area (Navigation, Maintenance, Tooling, Platform).

## Infrastructure Testing
  - **Cross-Platform Validation**: All infrastructure components must pass platform capabilities tests (`tests/platform-capabilities.test.ts`).
  - **Secrets Integration Testing**: Validate enterprise secrets management with comprehensive scoping tests (`tests/secrets-scoping.test.ts`).
  - **Health Check Automation**: Implement automated health checks (`monitoring/secrets-health-check.ts`) for continuous infrastructure validation.
  - **Performance Benchmarking**: Regular infrastructure performance validation using setup-check and platform-specific benchmarks.
