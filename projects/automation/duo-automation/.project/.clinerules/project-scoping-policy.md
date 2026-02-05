## Brief overview
  Guidelines for managing multi-tenant organizational scoping within the DuoPlus automation system, enhanced with enterprise-grade secrets management and platform-aware isolation.

## Scoping architecture
  - **Auto-Detection**: Scope must be automatically derived from the serving domain using the standard matrix:
    - `apple.factory-wager.com` -> **ENTERPRISE**
    - `dev.apple.factory-wager.com` -> **DEVELOPMENT**
    - `localhost` -> **LOCAL-SANDBOX**
  - **Propagation**: The `UnifiedDashboardLauncher` must propagate the detected scope to all children dashboard processes via `DASHBOARD_SCOPE` environment variable and `--scope` CLI argument.
  - **Platform-Aware Scoping**: Use platform detection to determine optimal scoping strategy:
    - Windows: ENTERPRISE scoping with Credential Manager
    - macOS/Linux: USER scoping with Keychain/Secret Service
    - Fallback: LOCAL scoping for unsupported platforms

## Storage isolation
  - **Path Physical Partitioning**: Every storage operation in R2/S3 must use scope-based path isolation (e.g., `enterprise/accounts/...`).
  - **Manager Integration**: Use the `BunR2AppleManager.getScopedKey()` method to ensure consistent path prefixing across all system components.
  - **Local Mirroring**: Maintain scope directory structures in the local `data/` mirror to prevent development data collisions.
  - **Per-User Secrets Isolation**: All secrets must use `CRED_PERSIST_ENTERPRISE` flag with platform-appropriate scoping to prevent cross-user access.

## Enterprise secrets management
  - **Platform-Specific Storage**: Secrets automatically use the most secure available storage:
    - Windows: Credential Manager with enterprise-level isolation
    - macOS: Keychain with per-user access controls
    - Linux: Secret Service with user isolation
    - Fallback: Encrypted local storage
  - **Service Naming**: Use scoped service names following pattern `{service}-{PLATFORM_SCOPE}-{team}` for complete isolation.
  - **Migration Strategy**: Automatically migrate from `.env` files to secure storage using platform detection and validation.

## Visual standards
  - **UI Indicators**: All dashboards must prominently display the active scope and platform in the header layout.
  - **Platform Status**: Show current platform, storage backend, and secrets scoping status in infrastructure views.
  - **Performance Reports**: Performance tables and matrix reports must include explicit "Scope" and "Platform" columns to contextualize technical metrics.

## Implementation rules
  - **Backward Compatibility**: Fall back to `global/` or `default` scope only if autodetection fails.
  - **Security**: Never allow cross-scope path access within the primary storage managers.
  - **Platform Validation**: Always validate platform capabilities before using advanced features like Credential Manager.
  - **Per-User Isolation**: Enforce strict per-user secret isolation using `CRED_PERSIST_ENTERPRISE` flag across all platforms.

## Testing and validation
  - **Platform Testing**: All scoping implementations must pass platform capabilities tests (`tests/platform-capabilities.test.ts`).
  - **Secrets Validation**: Validate per-user isolation with comprehensive scoping tests (`tests/secrets-scoping.test.ts`).
  - **Cross-Platform Consistency**: Ensure scoping behavior is consistent across Windows, macOS, and Linux platforms.
  - **Health Monitoring**: Implement continuous monitoring of scoping and secrets health (`monitoring/secrets-health-check.ts`).

## v3.7 Baseline: Deterministic Timezone Strategy
- ✅ Static timezone offsets (±HH:MM format)
- ✅ Boolean DST flags (no calculation)
- ✅ IANA timezone names only (Atomic Stability)
- ✅ UTC-aligned testing (like Bun test runner)
- ✅ Canonical-only policy (no legacy 1:1 offsets)
- ❌ Dynamic DST transitions (deferred to v3.8)
- ❌ Historical timezone changes  
- ❌ Political timezone updates
- ❌ Runtime timezone detection (rely on `process.env.TZ`)

### Canonical Zone Requirements
All infrastructure components MUST use canonical IANA zone identifiers (e.g., `America/New_York`) for audit logs and metadata extraction. Legacy links like `US/Eastern` or `GMT` are strictly prohibited in code/configuration to prevent mismatch during platform-specific string normalization.

## v3.8+ Scope: Non-Deterministic Complexity
>>>>+++ REPLACE

- **DST Transitions**: Implement after v3.7 freeze
- **Rationale**: Use `Intl.DateTimeFormat` with cached historical data
- **Implementation**: `node-ical` or `tzdata` npm packages
- **Verification**: Cross-reference with IANA database snapshots
- **Testing**: Timezone-specific test suites with temporal data

## Bun Timezone Configuration

Bun supports programmatically setting a default time zone for the lifetime of the `bun` process. To do set, set the value of the `TZ` environment variable to a [valid timezone identifier](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

<Note>
  When running a file with `bun`, the timezone defaults to your system's configured local time zone.

  When running tests with `bun test`, the timezone is set to `UTC` to make tests more deterministic.
</Note>

```ts
process.env.TZ = "America/New_York";
```

Alternatively, this can be set from the command line when running a Bun command.

```sh
TZ=America/New_York bun run dev
```

Once `TZ` is set, any `Date` instances will have that time zone. By default all dates use your system's configured time zone.

```ts
new Date().getHours(); // => 18

process.env.TZ = "America/New_York";

new Date().getHours(); // => 21
```