# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Dashboard.tsx**: Fixed duplicate `onToast` property in `useGlobalShortcuts` call that was causing the second handler to overwrite the first
- **Dashboard.tsx**: Consolidated React imports from two separate statements into a single import
- **Dashboard.tsx**: Improved error handling in `handleRescanProject` with better error messages and response validation
- **Dashboard.tsx**: Gated `console.log` statements behind `import.meta.env.DEV` checks to prevent production logging
- **startup-optimizations.ts**: Fixed incorrect import path for config module (changed from `./config` to `../config`)
- **network.ts**: Fixed incorrect TOML import paths (changed from `../../config/` to `../../../config/`)

### Changed
- **Dashboard.tsx**: Added TODO comment noting limitation that `handleRescanProject` currently uses global rescan endpoint instead of project-specific endpoint

## [1.0.0] - 2026-01-25

### Added
- Initial release
