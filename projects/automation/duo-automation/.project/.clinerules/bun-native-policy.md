## Brief overview
  Guidelines for prioritizing Bun native APIs and performance-first development in the DuoPlus automation project, now enhanced with enterprise-grade secrets management and platform detection.

## Coding best practices
  - **Bun Native First**: Always use Bun native APIs as the primary choice. Never fall back to Node.js modules or polyfills unless a native Bun equivalent does not exist.
  - **Enterprise Secrets Management**: Use `Bun.secrets` with `CRED_PERSIST_ENTERPRISE` flag for per-user secret isolation. Never use custom secrets loaders or environment variables for sensitive data.
  - **Platform Detection**: Utilize the enhanced platform detection system (`utils/platform-detector.ts`) to adapt behavior based on OS capabilities (Windows Credential Manager, macOS Keychain, Linux Secret Service).
  - **Performance Optimization**: Prioritize high-performance primitives (e.g., `Bun.file()`, `Bun.write()`, `Bun.stringWidth()`, `Bun.zstdCompressSync()`).
  - **I/O Management**: 
    - Use `Bun.file().text()` or `.json()` instead of `fs.readFileSync`.
    - Use `Bun.write()` instead of `fs.writeFileSync`.
    - Use Bun's native `S3Client` for storage operations instead of bulky external SDKs.
  - **Emoji and ANSI Support**: Ensure all CLI outputs and status tables correctly calculate visual width using `Bun.stringWidth` to maintain perfect alignment.

## Technical preferences
  - **TypeScript Integrity**: Maintain strict type safety. Use proper error handling with `error instanceof Error` checks. Avoid `any` where `unknown` or specific interfaces can be used, but prioritize working code that leverages Bun's native speed.
  - **Zstd Compression**: Use Bun's native Zstd implementation for efficient storage and transfer of large datasets.
  - **Environment Variables**: Access environment variables directly through `Bun.env` or `process.env` with type awareness.
  - **Secrets Storage**: Use platform-specific storage mechanisms:
    - Windows: Credential Manager with ENTERPRISE scoping
    - macOS: Keychain with USER scoping  
    - Linux: Secret Service with USER scoping
    - Fallback: Local storage for unsupported platforms

## Development workflow
  - **Benchmark Validation**: Verify performance gains using real benchmarks (e.g., `bench/storage/bench-r2-real.ts`) and report throughput in IDs/s.
  - **Automation Hooks**: Integrate scripts into the maintenance suite (e.g., `scripts/maintenance/`) to ensure long-term performance auditing.
  - **Dashboard Integration**: Propagate system metrics and operational scopes consistently through the `UnifiedDashboardLauncher` and individual dashboard processes.
  - **Platform Testing**: Run comprehensive platform capabilities tests (`tests/platform-capabilities.test.ts`) to validate cross-platform compatibility.
  - **Secrets Validation**: Use secrets scoping tests (`tests/secrets-scoping.test.ts`) to verify per-user isolation and CRED_PERSIST_ENTERPRISE functionality.

## Security & Compliance
  - **Per-User Isolation**: All secrets must use `CRED_PERSIST_ENTERPRISE` flag to ensure proper per-user scoping and prevent cross-user access.
  - **Platform Validation**: Always validate platform capabilities before using advanced features like Credential Manager.
  - **Error Handling**: Implement robust error handling with proper TypeScript typing for caught exceptions.
  - **Audit Trails**: Maintain comprehensive logging of secrets operations for compliance and debugging.
