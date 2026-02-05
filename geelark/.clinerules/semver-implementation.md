## Brief overview
Project-specific guidelines for implementing and maintaining semantic versioning (SemVer 2.0.0) support in the Geelark project (Dev HQ - Bun-based developer toolkit). These rules ensure consistent version management, comprehensive testing, and optimal performance through Bun runtime integration.

## Bun runtime integration
- Prioritize integration with Bun's native `Bun.semver` API when available for performance optimization
- Use type guards and graceful fallbacks for cases where Bun.semver is unavailable
- Cast to `any` type when accessing Bun-specific APIs to avoid TypeScript strict mode issues
- Prefer Bun's semver implementation over custom implementations for range satisfaction checks

## Test coverage expectations
- Aim for 90%+ function coverage on core utilities (version.ts)
- Create comprehensive test suites covering all code paths including edge cases and error scenarios
- Include specific test categories for: parsing, formatting, comparison, incrementing, pre-releases, metadata, ranges, validation, boundaries, and fallback paths
- Each major feature should have multiple test scenarios covering normal, edge, and error cases
- Test categories should be organized with descriptive `describe()` blocks for clarity

## SemVer 2.0.0 compliance
- Strictly follow SemVer 2.0.0 specification (MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD])
- Implement pre-release ordering correctly (numeric vs alphanumeric comparison)
- Pre-release versions are lower than release versions (1.0.0-alpha < 1.0.0)
- Build metadata must not affect version precedence in comparisons
- Support version ranges: exact, caret (^), tilde (~), comparison operators (>, <, >=, <=), and dash ranges

## Version utility exports
- Export core functions: parseVersion, formatVersion, compareVersions, incrementVersion, createPrerelease, addMetadata, satisfiesRange, isValidVersion, getCurrentVersion
- Provide TypeScript interfaces (SemanticVersion, VersionComparison) for type safety
- Implement helper functions as internal (not exported) when they're only used internally

## Documentation requirements
- Create comprehensive guides (e.g., SEMVER_GUIDE.md) with real-world examples and use cases
- Include CLI command documentation with example invocations
- Document best practices for version numbering, changelog maintenance, and dependency management
- Provide examples for all major functions with both simple and complex scenarios

## CLI integration patterns
- Create CLI managers for feature operations (e.g., version-manager.ts)
- Provide both programmatic API and CLI command interfaces
- Add npm scripts for convenient access to version operations (e.g., version:current, version:next:major)
- Support both direct execution and piped command composition

## Error handling approach
- Throw descriptive errors with clear messages indicating what went wrong
- Validate input format before processing (e.g., invalid version strings, malformed metadata)
- Provide fallback behavior when Bun API is unavailable but don't silently fail
- Use try-catch blocks around Bun-specific API calls with meaningful error recovery

## Package.json integration
- Add version management scripts using inline TypeScript evaluation with `bun run --eval`
- Make scripts concise but readable (use existing utility functions rather than reimplementing logic)
- Include scripts for retrieving current version, calculating next versions, and range validation