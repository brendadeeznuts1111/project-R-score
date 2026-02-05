## Brief overview
  Guidelines for prioritizing Bun native APIs and performance-first development in the DuoPlus automation project.

## Coding best practices
  - **Bun Native First**: Always use Bun native APIs as the primary choice. Never fall back to Node.js modules or polyfills unless a native Bun equivalent does not exist.
  - **Performance Optimization**: Prioritize high-performance primitives (e.g., `Bun.file()`, `Bun.write()`, `Bun.stringWidth()`, `Bun.zstdCompressSync()`).
  - **I/O Management**: 
    - Use `Bun.file().text()` or `.json()` instead of `fs.readFileSync`.
    - Use `Bun.write()` instead of `fs.writeFileSync`.
    - Use Bun's native `S3Client` for storage operations instead of bulky external SDKs.
  - **Emoji and ANSI Support**: Ensure all CLI outputs and status tables correctly calculate visual width using `Bun.stringWidth` to maintain perfect alignment.

## Technical preferences
  - **TypeScript Integrity**: Maintain strict type safety. Avoid `any` where `unknown` or specific interfaces can be used, but prioritize working code that leverages Bun's native speed.
  - **Zstd Compression**: Use Bun's native Zstd implementation for efficient storage and transfer of large datasets.
  - **Environment Variables**: Access environment variables directly through `Bun.env` or `process.env` with type awareness.

## Development workflow
  - **Benchmark Validation**: Verify performance gains using real benchmarks (e.g., `bench/storage/bench-r2-real.ts`) and report throughput in IDs/s.
  - **Automation Hooks**: Integrate scripts into the maintenance suite (e.g., `scripts/maintenance/`) to ensure long-term performance auditing.
  - **Dashboard Integration**: Propagate system metrics and operational scopes consistently through the `UnifiedDashboardLauncher` and individual dashboard processes.
