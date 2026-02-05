# AGENTS.md - Debug Mode

This file provides guidance to agents when debugging issues in this repository.

## Non-Obvious Debugging Patterns

### Feature Flag Debugging
- **Compile-time features cannot be toggled at runtime** - If code inside a `feature('FLAG')` block isn't executing, the build was compiled without that flag
- Check build command: `bun build --feature=FLAG_NAME` must include the flag
- Debug builds should use: `bun run build:dev` or `bun run start:debug`

### Test Timeout Issues
- **Default test timeout is 5 seconds** ([bunfig.toml:9](bunfig.toml:9))
- R2 storage operations may exceed this in slow network conditions
- If tests timeout, check network connectivity to Cloudflare R2
- Mock API tests (`--feature=MOCK_API`) should never timeout

### ESLint Import Errors
- **"Cannot find module" errors** for axios/node-fetch/form-data/dotenv are intentional - these imports are banned
- The error message shows the correct alternative (e.g., "Use Bun native fetch instead of axios")
- Do not attempt to install these packages - they are restricted by design

### TOML Parsing vs Serialization
- **Bun can parse TOML but cannot serialize it** - this is by design
- If config saving produces invalid TOML, check the manual string building in [`ConfigManager.save()`](src/config-manager.ts:280)
- Common error: Forgetting to add newlines between sections
- Validation: Use `bun run config-manager.ts validate -f config.toml`

### R2 Storage Debugging
- **Missing EMPIRE_ prefix** on environment variables causes silent failures
- Required: `EMPIRE_R2_ACCOUNT_ID`, `EMPIRE_R2_ACCESS_KEY_ID`, `EMPIRE_R2_SECRET_ACCESS_KEY`, `EMPIRE_R2_BUCKET`
- Optional: `EMPIRE_R2_PUBLIC_URL` (required for public URL generation)
- Test R2 connectivity: `bun run config-manager.ts list` (lists bucket contents)
- Upload key format: `configs/{environment}/config.toml` (environment must be specified with `--env`)

### Path Alias Resolution Failures
- **Aliases defined in tsconfig.json** but may fail if importing from scripts/ or tests/
- Scripts should use relative imports (they're excluded from tsconfig)
- Tests can use aliases (tests/ is included in tsconfig)
- If alias fails, check the file is in `src/`, `types/`, or `tests/` directories

### Virtual Device System Issues
- **Device reports stored in `reports/`** as timestamped JSON files
- Dashboard runs on separate port - check `agent-container/virtual-device-dashboard.ts`
- Integration failures: Ensure `--feature=MOCK_API` is set for test environments
- Monitor logs: `bun run devices:monitor` shows real-time device status

### Bundle Analysis Failures
- **Bundle analyzer requires build output** - run `bun run build:enterprise` first
- Comparison fails if baseline file missing - run `bun run bundle:analyze` to create baseline
- Health checks verify bundle size thresholds in [BundleMatrix.ts](src/analyzers/BundleMatrix.ts)

### Common Silent Failures
- **Console warnings are treated as errors** in CI environments (ESLint `no-console: warn`)
- Feature flag code is completely removed if flag not set - no runtime errors
- R2 operations fail silently if credentials missing - check for "R2 credentials not configured" error
- Config validation passes with missing optional fields - check validation logic in [`ConfigManager.validate()`](src/config-manager.ts:255)