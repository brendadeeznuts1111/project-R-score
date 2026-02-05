# Changelog - Matrix Automation Suite

## [Unreleased]

### Added
- ✅ **JSON5 Profile Support** - Profiles can now use `.json5` format with comments and trailing commas
- ✅ **JSONL Device Logging** - Device metadata logged to efficient JSONL format
- ✅ **JSONL Logger Utility** - `utils/jsonl-logger.ts` for streaming log parsing
- ✅ **Type Safety** - Added `MatrixProfile` and `ProvisioningMetadata` interfaces
- ✅ **Constants Module** - Extracted magic numbers to `utils/constants.ts`
- ✅ **Profile Validator** - Type-safe profile validation utility

### Changed
- ✅ **`loadProfile()`** - Now returns `MatrixProfile` instead of `any`
- ✅ **Profile Loading** - Tries `.json5` first, falls back to `.json`
- ✅ **Device Metadata** - Now typed with `ProvisioningMetadata` interface
- ✅ **Timeouts** - All magic numbers extracted to named constants

### Fixed
- ✅ **Type Safety** - `loadProfile()` no longer returns `any`
- ✅ **Magic Numbers** - All timeouts and delays now use named constants
- ✅ **Path Consistency** - All file paths use centralized constants

### Performance
- ✅ **Automatic Improvements** - Benefits from Bun v1.3.7:
  - 35% faster async/await operations
  - 50% faster Buffer operations
  - 3x faster array.flat()
  - 90% faster string padding

### Documentation
- ✅ **BUN_V1.3.7_UPGRADE.md** - Comprehensive upgrade guide
- ✅ **BUN_HEADER_CASING.md** - Header case preservation documentation
- ✅ **DIAGNOSTICS.md** - Project health diagnostics
- ✅ **ANALYSIS.md** - Code analysis report
- ✅ **README.md** - Updated with JSON5/JSONL examples

## [1.0.0] - 2026-01-26

### Initial Release
- ✅ Automated DuoPlus signup and onboarding
- ✅ Device provisioning with profile configuration
- ✅ ADB-based device configuration
- ✅ 2FA code retrieval from SMS/notifications
- ✅ Bulk provisioning operations
- ✅ Test suite automation
- ✅ Pipeline automation
- ✅ Slack/Teams notifications
- ✅ Cost tracking and reporting
- ✅ Budget alerts

---

**Legend:**
- ✅ Implemented
- ⚠️ In Progress
- 📋 Planned
- 🔴 Blocked
