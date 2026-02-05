# [TELEGRAM.FILE.NAMING.PATTERNS.RG] Telegram Module File Naming Patterns

**Analysis of naming conventions and patterns in `src/telegram/`**

---

## 1. [TELEGRAM.FILE.INVENTORY.RG] Overview

Analysis of naming conventions and patterns used in the `src/telegram/` module directory.

**Code Reference**: `#REF:v-0.1.0.TELEGRAM.FILE.NAMING.PATTERNS.1.0.A.1.1.DOC.1.1`

---

## 2. [TELEGRAM.FILE.LIST.RG] Current File Inventory

### 2.1. [FILES.CONVENTION.RG] Naming Convention

All files follow `kebab-case.ts` convention ✅

### 2.2. [FILES.COMPLETE.LIST.RG] Complete File List

```
bookmaker-router.ts
changelog-poster.ts
check-topics.ts
client.ts
constants.ts
covert-steam-alert.ts
covert-steam-sender.ts
feed-monitor.ts
github-webhook-handler.ts
golden-supergroup.ts
index.ts
mini-app-context.ts
mini-app.ts
monitor.ts
research-report-sender.ts
rss-poster.ts
show-mapping.ts
topic-mapping.ts
```

---

## 3. [TELEGRAM.PATTERNS.IDENTIFIED.RG] Naming Patterns Identified

### 3.1. [PATTERNS.ROUTER.RG] Router Pattern (`*-router.ts`)

- `bookmaker-router.ts` - Routes bookmaker-related messages

### 3.2. [PATTERNS.POSTER.RG] Poster Pattern (`*-poster.ts`)

- `changelog-poster.ts` - Posts changelog updates
- `rss-poster.ts` - Posts RSS feed updates

### 3.3. [PATTERNS.SENDER.RG] Sender Pattern (`*-sender.ts`)

- `covert-steam-sender.ts` - Sends covert steam alerts
- `research-report-sender.ts` - Sends research reports

**Note**: Two different compound patterns:
- `{domain}-sender.ts` (covert-steam-sender.ts)
- `{type}-{action}-sender.ts` (research-report-sender.ts)

### 3.4. [PATTERNS.ALERT.RG] Alert Pattern (`*-alert.ts`)

- `covert-steam-alert.ts` - Covert steam alert handling

### 3.5. [PATTERNS.MONITOR.RG] Monitor Pattern (`*-monitor.ts`)

- `feed-monitor.ts` - Monitors RSS feeds
- `monitor.ts` - Generic monitoring (⚠️ potential naming conflict)

**Issue**: `monitor.ts` is generic while `feed-monitor.ts` is specific. Consider:
- Rename `monitor.ts` → `telegram-monitor.ts` or `integration-monitor.ts`
- Or rename `feed-monitor.ts` → `rss-feed-monitor.ts` for consistency

### 3.6. [PATTERNS.MAPPING.RG] Mapping Pattern (`*-mapping.ts`)

- `topic-mapping.ts` - Maps topics/threads
- `show-mapping.ts` - Maps show data

### 3.7. [PATTERNS.CONTEXT.RG] Context Pattern (`*-context.ts`)

- `mini-app-context.ts` - Mini app context management

### 3.8. [PATTERNS.HANDLER.RG] Handler Pattern (`*-handler.ts`)

- `github-webhook-handler.ts` - Handles GitHub webhooks

### 3.9. [PATTERNS.SIMPLE.RG] Simple Names (no suffix pattern)

- `client.ts` - Telegram client
- `constants.ts` - Module constants
- `index.ts` - Module exports
- `mini-app.ts` - Mini app functionality
- `monitor.ts` - Generic monitoring

### 3.10. [PATTERNS.DOMAIN.RG] Domain-Specific Patterns

- `covert-steam-*` - Covert steam domain (alert, sender)
- `mini-app*` - Mini app domain (mini-app.ts, mini-app-context.ts)
- `golden-supergroup.ts` - Specific feature

---

## 4. [TELEGRAM.CONSISTENCY.ANALYSIS.RG] Consistency Analysis

### 4.1. [CONSISTENCY.VALID.RG] Consistent Patterns

1. All files use `kebab-case.ts` ✅
2. Domain prefixes are consistent (`covert-steam-*`, `mini-app*`)
3. Action suffixes follow patterns (`-router`, `-poster`, `-sender`, `-alert`, `-monitor`, `-mapping`, `-handler`, `-context`)

### 4.2. [CONSISTENCY.ISSUES.RG] Potential Inconsistencies

#### 4.2.1. [ISSUES.GENERIC.NAMING.RG] Generic vs Specific Naming

- `monitor.ts` (generic) vs `feed-monitor.ts` (specific)
- **Recommendation**: Rename `monitor.ts` → `telegram-monitor.ts` or `integration-monitor.ts`

#### 4.2.2. [ISSUES.COMPOUND.SENDER.RG] Compound Sender Patterns

- `covert-steam-sender.ts` (domain-action)
- `research-report-sender.ts` (type-action-action)
- **Status**: Both valid, but different patterns. Consider standardizing if more senders are added.

#### 4.2.3. [ISSUES.MINIAPP.NAMING.RG] Mini App Naming

- `mini-app.ts` (kebab-case)
- `mini-app-context.ts` (kebab-case with suffix)
- **Status**: ✅ Consistent

#### 4.2.4. [ISSUES.COMMAND.NAMING.RG] Check vs Show Commands

- `check-topics.ts` (verb-noun)
- `show-mapping.ts` (verb-noun)
- **Status**: ✅ Consistent pattern

---

## 5. [TELEGRAM.STANDARDS.RG] Recommended Naming Standards

### 5.1. [STANDARDS.HIERARCHY.RG] Pattern Hierarchy

1. **Domain-Action Pattern** (preferred for domain-specific files)
   - `{domain}-{action}.ts`
   - Examples: `covert-steam-alert.ts`, `covert-steam-sender.ts`

2. **Type-Action Pattern** (for generic utilities)
   - `{type}-{action}.ts`
   - Examples: `feed-monitor.ts`, `topic-mapping.ts`

3. **Action-Object Pattern** (for command/CLI utilities)
   - `{action}-{object}.ts`
   - Examples: `check-topics.ts`, `show-mapping.ts`

4. **Simple Names** (for core modules)
   - `{name}.ts`
   - Examples: `client.ts`, `constants.ts`, `index.ts`

### 5.2. [STANDARDS.SUFFIX.MEANINGS.RG] Suffix Meanings

| Suffix | Purpose | Examples |
|--------|---------|----------|
| `-router` | Routes/dispatches messages | `bookmaker-router.ts` |
| `-poster` | Posts content to Telegram | `changelog-poster.ts`, `rss-poster.ts` |
| `-sender` | Sends messages/alerts | `covert-steam-sender.ts`, `research-report-sender.ts` |
| `-alert` | Handles alert logic | `covert-steam-alert.ts` |
| `-monitor` | Monitors/observes systems | `feed-monitor.ts`, `monitor.ts` |
| `-mapping` | Maps/transforms data | `topic-mapping.ts`, `show-mapping.ts` |
| `-handler` | Handles webhooks/events | `github-webhook-handler.ts` |
| `-context` | Manages context/state | `mini-app-context.ts` |

---

## 6. [TELEGRAM.RECOMMENDATIONS.RG] Recommendations

### 6.1. [RECOMMENDATIONS.RENAME.RG] Rename Generic Files

```bash
# Consider renaming for clarity
monitor.ts → telegram-monitor.ts
# OR
monitor.ts → integration-monitor.ts
```

### 6.2. [RECOMMENDATIONS.PATTERN.USAGE.RG] Document Pattern Usage

When adding new files, follow the established patterns:
- Use `-poster` for posting content
- Use `-sender` for sending alerts/messages
- Use `-monitor` for monitoring systems
- Use `-handler` for webhook/event handlers
- Use `-router` for routing/dispatching
- Use `-mapping` for data transformation
- Use `-context` for context management

### 6.3. [RECOMMENDATIONS.CONSISTENCY.RG] Maintain Consistency

- Keep domain prefixes consistent (`covert-steam-*`, `mini-app*`)
- Use compound names for domain-specific files
- Use simple names for core utilities

---

## 7. [TELEGRAM.SUMMARY.RG] Summary

**Status**: ✅ All files follow `kebab-case.ts` convention

**Patterns**: 10 distinct naming patterns identified, mostly consistent

**Issues**: 1 potential naming conflict (`monitor.ts` vs `feed-monitor.ts`)

**Recommendation**: Consider renaming `monitor.ts` to be more specific, or document its purpose clearly.

