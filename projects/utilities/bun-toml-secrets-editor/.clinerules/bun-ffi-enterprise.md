## Brief overview
This project is an enterprise-grade Bun/TypeScript application with heavy emphasis on native FFI integration, performance profiling, and governance systems. Development follows a "prove it works first" approach with concise solutions that can scale to production.

## Communication style
- Prefer concise, actionable responses over verbose explanations
- Show working code examples rather than theoretical descriptions
- Skip boilerplate commentary when the code speaks for itself
- Ask clarifying questions when requirements are ambiguous

## Tech stack preferences
- **Runtime**: Bun (latest stable, currently v1.3.7)
- **Language**: TypeScript with strict mode enabled
- **FFI**: Native C integration via `bun:ffi` for performance-critical paths
- **Build**: Native Bun bundler, no Webpack/Vite
- **Environment**: Nix flake for reproducible development environments

## FFI development patterns
- Place C source files in predictable temp locations (`/tmp/`) for quick tests
- Use `bun:ffi` `cc()` for on-the-fly compilation during development
- Define symbols with explicit `returns` and `args` types - no inference
- Always test FFI calls immediately after definition to verify linkage
- Prefer `int` returns for simple status codes, structs for complex data

## Code organization
- Enterprise architecture: `src/governance/`, `src/profiling/`, `src/cli/`
- Place tests at project root with descriptive names: `test-ffi-{context}.ts`
- Documentation in `docs/` with version-specific guides (e.g., `FFI_V1.3.7_GUIDE.md`)
- Keep configuration in `config/` using TOML for secrets, JSON5 for app settings

## Performance & profiling
- Integrate CPU and heap profiling as first-class concerns
- Use Bun's native profiling APIs (`Bun.FFI`, `Bun.writeFile` with profiling data)
- Auto-commit profiling results with structured naming: `CPU.{timestamp}.{pid}.md`

## Development workflow
- Test native code in isolation before JS integration
- Use `bun -e` for quick inline experiments
- Prefer immediate execution over mock-based testing for FFI
- Document architecture decisions in dedicated markdown files

## File naming conventions
- Use hyphens (`-`) not underscores (`_`) for multi-word filenames
- Prefix test files with `test-` and include context (e.g., `test-ffi-nix.ts`)
- Version-specific guides: `{FEATURE}_V{VERSION}_GUIDE.md`
- Use uppercase for critical documentation (e.g., `ENTERPRISE_REFACTORING_COMPLETE.md`)

## Nix integration
- Maintain `flake.nix` and `shell.nix` for reproducible environments
- Support both Homebrew and Nix package managers for native dependencies
- Document platform-specific FFI setup in dedicated guides