# Naming Patterns Quick Reference

Quick reference for naming conventions used throughout the project.

## File Naming

**Pattern**: `kebab-case.ts`

✅ **Correct**:
- `research-report-sender.ts`
- `shadow-graph-builder.ts`
- `hidden-steam-detector.ts`
- `fix-settings.ts`
- `commands.ts`

❌ **Incorrect**:
- `ResearchReportSender.ts` (PascalCase)
- `research_report_sender.ts` (snake_case)
- `researchReportSender.ts` (camelCase)

## Class Naming

**Pattern**: `PascalCase`

✅ **Correct**:
- `ResearchReportSender`
- `ShadowGraphBuilder`
- `TelegramBotApi`
- `DoDMultiLayerCorrelationGraph`

❌ **Incorrect**:
- `researchReportSender` (camelCase)
- `research_report_sender` (snake_case)

## Function Naming

**Pattern**: `camelCase`

✅ **Correct**:
- `sendReport()`
- `formatReport()`
- `getThreadId()`
- `categorizeScript()`

❌ **Incorrect**:
- `SendReport()` (PascalCase)
- `send_report()` (snake_case)

## Constant Naming

**Pattern**: `UPPER_SNAKE_CASE`

✅ **Correct**:
- `CATEGORY_LABELS`
- `DEFAULT_RATE_LIMIT`
- `MAX_RETRY_ATTEMPTS`

❌ **Incorrect**:
- `categoryLabels` (camelCase)
- `CategoryLabels` (PascalCase)

## Type/Interface Naming

**Pattern**: `PascalCase`

✅ **Correct**:
- `ResearchReport`
- `ReportSendResult`
- `ScriptMetadata`

❌ **Incorrect**:
- `researchReport` (camelCase)
- `research_report` (snake_case)

## VS Code Task Labels

**Pattern**: `kebab-case` (no spaces, no emojis in label)

✅ **Correct**:
- `dev:start-server`
- `test:watch-mode`
- `lint:fix`
- `format:fix`

❌ **Incorrect**:
- `🚀 Dev: Start Server` (emojis and spaces)
- `dev_start_server` (snake_case)
- `devStartServer` (camelCase)

**Note**: Use `displayName` property for emoji display in VS Code UI.

## VS Code Launch Config Names

**Pattern**: `kebab-case`

✅ **Correct**:
- `debug:main-entry`
- `debug:research-report-sender`
- `debug:mcp-server`

❌ **Incorrect**:
- `Debug: Main Entry Point` (spaces and PascalCase)
- `debug_main_entry` (snake_case)

## Package.json Script Names

**Pattern**: `kebab-case` with colons for namespacing

✅ **Correct**:
- `dev`
- `test:verbose`
- `debug:graph`
- `validate:settings`

❌ **Incorrect**:
- `testVerbose` (camelCase)
- `test_verbose` (snake_case)

## Directory Naming

**Pattern**: `kebab-case` or `camelCase` (lowercase)

✅ **Correct**:
- `src/api/`
- `src/telegram/`
- `scripts/`
- `test/`

❌ **Incorrect**:
- `src/Api/` (PascalCase)
- `src/telegram_bot/` (snake_case)

## Examples from Codebase

### Files
- `src/telegram/research-report-sender.ts` ✅
- `scripts/fix-settings.ts` ✅
- `scripts/commands.ts` ✅
- `src/middleware/session-middleware.ts` ✅

### Classes
- `ResearchReportSender` ✅
- `TelegramBotApi` ✅
- `DoDMultiLayerCorrelationGraph` ✅

### Functions
- `sendReport()` ✅
- `formatReport()` ✅
- `categorizeScript()` ✅
- `getThreadId()` ✅

### Constants
- `CATEGORY_LABELS` ✅
- `REPORT_TYPE_TO_TOPIC` ✅
- `SEVERITY_PIN_RULES` ✅

### Types
- `ResearchReport` ✅
- `ReportSendResult` ✅
- `ScriptMetadata` ✅

## Quick Checklist

When creating new files/components:

- [ ] File name: `kebab-case.ts`
- [ ] Class name: `PascalCase`
- [ ] Function name: `camelCase`
- [ ] Constant name: `UPPER_SNAKE_CASE`
- [ ] Type/Interface name: `PascalCase`
- [ ] Task label: `kebab-case` (use `displayName` for emoji)
- [ ] Launch config name: `kebab-case`
- [ ] Package.json script: `kebab-case` (with `:` for namespacing)

## See Also

- [Complete Naming Conventions](./guides/NAMING-CONVENTIONS.md)
- [Naming and Path Patterns](./patterns/NAMING-AND-PATH-PATTERNS.md) - Comprehensive path and import patterns
- [Shadow Graph Naming](./SHADOW-GRAPH-NAMING-CONVENTIONS.md)
- [Telegram File Naming](./ui/TELEGRAM-FILE-NAMING-PATTERNS.md)
