## Brief overview
  Guidelines for managing multi-tenant organizational scoping within the DuoPlus automation system.

## Scoping architecture
  - **Auto-Detection**: Scope must be automatically derived from the serving domain using the standard matrix:
    - `apple.factory-wager.com` -> **ENTERPRISE**
    - `dev.apple.factory-wager.com` -> **DEVELOPMENT**
    - `localhost` -> **LOCAL-SANDBOX**
  - **Propagation**: The `UnifiedDashboardLauncher` must propagate the detected scope to all children dashboard processes via `DASHBOARD_SCOPE` environment variable and `--scope` CLI argument.

## Storage isolation
  - **Path Physical Partitioning**: Every storage operation in R2/S3 must use scope-based path isolation (e.g., `enterprise/accounts/...`).
  - **Manager Integration**: Use the `BunR2AppleManager.getScopedKey()` method to ensure consistent path prefixing across all system components.
  - **Local Mirroring**: Maintain scope directory structures in the local `data/` mirror to prevent development data collisions.

## Visual standards
  - **UI Indicators**: All dashboards must prominently display the active scope in the header layout.
  - **Performance Reports**: Performance tables and matrix reports must include an explicit "Scope" column to contextualize technical metrics.

## Implementation rules
  - **Backward Compatibility**: Fall back to `global/` or `default` scope only if autodetection fails.
  - **Security**: Never allow cross-scope path access within the primary storage managers.
