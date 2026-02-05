# Shadow Graph System - Naming Enhancement Plan

**Version**: 1.1.1.1.1.0.0  
**Status**: 📋 Planning  
**Last Updated**: 2025-01-XX

---

## 🎯 Enhancement Goals

1. **Consistency**: Ensure all names follow established patterns
2. **Clarity**: Make names more descriptive and self-documenting
3. **Discoverability**: Improve prefix/suffix patterns for better IDE autocomplete
4. **Maintainability**: Reduce ambiguity and improve code readability

---

## 📁 File Name Enhancements

### Core Shadow Graph Files

| Current File | Enhanced File | Reason | Priority |
|-------------|---------------|--------|----------|
| `orchestrator.ts` | `shadow-graph-orchestrator.ts` | More descriptive, matches prefix pattern | High |
| `database.ts` | `shadow-graph-database.ts` | More descriptive, matches prefix pattern | High |
| `constants.ts` | `shadow-graph-constants.ts` | More descriptive, matches prefix pattern | High |
| `case-study.ts` | `shadow-graph-case-study.ts` | More descriptive, matches prefix pattern | High |
| `index.ts` | ❌ **DO NOT RENAME** | Standard Node.js convention - `index.ts` is special | N/A |

### Impact Analysis

**Files that import these**:
- `src/arbitrage/shadow-graph/index.ts` - Will need updates
- `src/mcp/tools/shadow-graph-research.ts` - Will need updates
- `src/arbitrage/shadow-graph/orchestrator.ts` - Will need updates
- Any other files importing from these modules

---

## 🏗️ Class Name Enhancements

### Core Classes

| Current Class | Enhanced Class | File | Reason | Priority |
|--------------|----------------|------|--------|----------|
| `ShadowMarketProber` | `ShadowGraphMarketProber` | `shadow-graph-builder.ts` | More consistent with `ShadowGraph*` prefix | High |
| `ShadowSteamDetector` | `ShadowGraphSteamDetector` | `hidden-steam-detector.ts` | More consistent with `ShadowGraph*` prefix | High |
| `ShadowArbitrageScanner` | `ShadowGraphArbitrageScanner` | `shadow-arb-scanner.ts` | More consistent with `ShadowGraph*` prefix | High |

### Already Optimal (No Changes Needed)

- ✅ `ShadowGraphAlertSystem` - Perfect naming
- ✅ `ShadowGraphOrchestrator` - Perfect naming
- ✅ `AdvancedResearchOrchestrator` - Perfect naming
- ✅ `ReverseLineMovementDetector` - Perfect naming
- ✅ `SteamOriginationGraph` - Perfect naming
- ✅ `DerivativeMarketCorrelator` - Perfect naming
- ✅ `TemporalPatternEngine` - Perfect naming
- ✅ `CrossSportArbitrage` - Perfect naming
- ✅ `LimitOrderBookReconstructor` - Perfect naming
- ✅ `BehavioralPatternClassifier` - Perfect naming

---

## 🔷 Interface Name Enhancements

### Core Interfaces

| Current Interface | Enhanced Interface | File | Reason | Priority |
|------------------|-------------------|------|--------|----------|
| `HiddenSteamEvent` | `ShadowGraphHiddenSteamEvent` | `types.ts` | More descriptive, matches domain | Medium |
| `ShadowArbEntry` | `ShadowGraphArbitrageEntry` | `types.ts` | More descriptive, clearer abbreviation | Medium |
| `ShadowArbMatrix` | `ShadowGraphArbitrageMatrix` | `types.ts` | More descriptive, clearer abbreviation | Medium |

### Already Optimal (No Changes Needed)

- ✅ `ShadowNode` - Perfect naming
- ✅ `ShadowEdge` - Perfect naming
- ✅ `ShadowGraph` - Perfect naming
- ✅ `RLMDetectionResult` - Perfect naming
- ✅ `SteamOriginationResult` - Perfect naming
- ✅ `DerivativeCorrelationResult` - Perfect naming
- ✅ `TemporalPatternResult` - Perfect naming
- ✅ `CrossSportEdge` - Perfect naming
- ✅ `ReconstructedOrderBook` - Perfect naming
- ✅ `BehavioralEdgeScore` - Perfect naming
- ✅ `ResearchReport` - Perfect naming

---

## 🔤 Property Name Enhancements

### ShadowNode Properties

| Current Property | Enhanced Property | Reason | Priority |
|-----------------|------------------|--------|----------|
| `lastOdds` | `lastOddsPrice` | More descriptive | Low |
| `lastProbeSuccess` | `lastProbeSuccessStatus` | More descriptive | Low |
| `lastUpdated` | `lastUpdatedTimestamp` | More descriptive | Low |

### Already Optimal (No Changes Needed)

- ✅ `nodeId` - Perfect naming
- ✅ `eventId` - Perfect naming
- ✅ `marketId` - Perfect naming
- ✅ `bookmaker` - Perfect naming
- ✅ `visibility` - Perfect naming
- ✅ `displayedLiquidity` - Perfect naming
- ✅ `hiddenLiquidity` - Perfect naming
- ✅ `reservedLiquidity` - Perfect naming
- ✅ `expectedCorrelation` - Perfect naming
- ✅ `actualCorrelation` - Perfect naming
- ✅ `correlationDeviation` - Perfect naming
- ✅ `isBaitLine` - Perfect naming
- ✅ `baitDetectionCount` - Perfect naming
- ✅ `parentNodeId` - Perfect naming

---

## 📋 Implementation Plan

### Phase 1: File Renames (High Priority)

**Step 1**: Rename core files
```bash
# Rename files
mv src/arbitrage/shadow-graph/orchestrator.ts src/arbitrage/shadow-graph/shadow-graph-orchestrator.ts
mv src/arbitrage/shadow-graph/database.ts src/arbitrage/shadow-graph/shadow-graph-database.ts
mv src/arbitrage/shadow-graph/constants.ts src/arbitrage/shadow-graph/shadow-graph-constants.ts
mv src/arbitrage/shadow-graph/case-study.ts src/arbitrage/shadow-graph/shadow-graph-case-study.ts
```

**Step 2**: Update all imports
- Update `src/arbitrage/shadow-graph/index.ts`
- Update `src/mcp/tools/shadow-graph-research.ts`
- Update `src/arbitrage/shadow-graph/orchestrator.ts` (if it imports these)
- Search for all other imports: `rg "from.*orchestrator|from.*database|from.*constants|from.*case-study" src/`

**Step 3**: Update documentation
- Update all documentation references
- Update code examples
- Update cross-references

---

### Phase 2: Class Renames (High Priority)

**Step 1**: Rename classes in source files
- `ShadowMarketProber` → `ShadowGraphMarketProber` in `shadow-graph-builder.ts`
- `ShadowSteamDetector` → `ShadowGraphSteamDetector` in `hidden-steam-detector.ts`
- `ShadowArbitrageScanner` → `ShadowGraphArbitrageScanner` in `shadow-arb-scanner.ts`

**Step 2**: Update all usages
```bash
# Find all usages
rg "ShadowMarketProber|ShadowSteamDetector|ShadowArbitrageScanner" src/
```

**Files to update**:
- `src/arbitrage/shadow-graph/index.ts`
- `src/arbitrage/shadow-graph/orchestrator.ts`
- `src/mcp/tools/shadow-graph-research.ts`
- Any other files using these classes

**Step 3**: Update exports
- Update `src/arbitrage/shadow-graph/index.ts` exports
- Update type exports if needed

---

### Phase 3: Interface Renames (Medium Priority)

**Step 1**: Rename interfaces in `types.ts`
- `HiddenSteamEvent` → `ShadowGraphHiddenSteamEvent`
- `ShadowArbEntry` → `ShadowGraphArbitrageEntry`
- `ShadowArbMatrix` → `ShadowGraphArbitrageMatrix`

**Step 2**: Update all usages
```bash
# Find all usages
rg "HiddenSteamEvent|ShadowArbEntry|ShadowArbMatrix" src/
```

**Step 3**: Update type exports
- Update `src/arbitrage/shadow-graph/index.ts` if these are exported
- Update any type imports

---

### Phase 4: Property Renames (Low Priority)

**Step 1**: Rename properties in `types.ts`
- `lastOdds` → `lastOddsPrice`
- `lastProbeSuccess` → `lastProbeSuccessStatus`
- `lastUpdated` → `lastUpdatedTimestamp`

**Step 2**: Update all usages
```bash
# Find all usages
rg "\.lastOdds|\.lastProbeSuccess|\.lastUpdated" src/
```

**Step 3**: Update database mapping functions
- Database columns use `snake_case` (`last_odds`, `last_probe_success`, `last_updated`)
- TypeScript properties use `camelCase` (`lastOdds`, `lastProbeSuccess`, `lastUpdated`)
- Update mapping functions in `database.ts`:
  - `rowToShadowNode()` - Update property mappings
  - `shadowNodeToRow()` - Update column mappings
- **No database migration needed** - columns remain unchanged

---

## 🔍 Verification Commands

### After File Renames

```bash
# Verify no broken imports
rg "from.*orchestrator|from.*database|from.*constants|from.*case-study" src/ --type ts

# Verify files exist
ls src/arbitrage/shadow-graph/shadow-graph-*.ts
```

### After Class Renames

```bash
# Verify no old class names remain
rg "ShadowMarketProber|ShadowSteamDetector|ShadowArbitrageScanner" src/ --type ts

# Verify new class names exist
rg "ShadowGraphMarketProber|ShadowGraphSteamDetector|ShadowGraphArbitrageScanner" src/ --type ts
```

### After Interface Renames

```bash
# Verify no old interface names remain
rg "HiddenSteamEvent|ShadowArbEntry|ShadowArbMatrix" src/ --type ts

# Verify new interface names exist
rg "ShadowGraphHiddenSteamEvent|ShadowGraphArbitrageEntry|ShadowGraphArbitrageMatrix" src/ --type ts
```

### After Property Renames

```bash
# Verify no old property names remain
rg "\.lastOdds|\.lastProbeSuccess|\.lastUpdated" src/ --type ts

# Verify new property names exist
rg "\.lastOddsPrice|\.lastProbeSuccessStatus|\.lastUpdatedTimestamp" src/ --type ts
```

---

## 📊 Impact Summary

### Breaking Changes

**High Priority**:
- 4 file renames (requires import updates)
- 3 class renames (requires usage updates)

**Medium Priority**:
- 3 interface renames (requires type updates)

**Low Priority**:
- 3 property renames (requires usage updates, **no database migration needed** - columns use snake_case)

### Files Affected

**Estimated**: ~15-20 files need updates

**Key Files**:
1. `src/arbitrage/shadow-graph/index.ts` - Export updates
2. `src/arbitrage/shadow-graph/orchestrator.ts` - Class usage updates
3. `src/mcp/tools/shadow-graph-research.ts` - Import and usage updates
4. `src/arbitrage/shadow-graph/types.ts` - Interface and property updates
5. `src/arbitrage/shadow-graph/database.ts` - Property updates (if needed)
6. Documentation files - Reference updates

---

## ✅ Pre-Implementation Checklist

- [ ] Create feature branch
- [ ] Backup current codebase
- [ ] Run full test suite to establish baseline
- [ ] Document all current usages
- [ ] Create migration script
- [ ] Update documentation references
- [ ] Plan rollback strategy

---

## 🚀 Post-Implementation Checklist

- [ ] All file renames completed
- [ ] All imports updated
- [ ] All class renames completed
- [ ] All usages updated
- [ ] All interface renames completed
- [ ] All type usages updated
- [ ] All property renames completed
- [ ] Database mapping functions updated (no migration needed - columns unchanged)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Merge to main branch

---

## 📝 Migration Script Template

```typescript
/**
 * Shadow Graph Naming Enhancement Migration Script
 * 
 * This script helps automate the renaming process
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const SHADOW_GRAPH_DIR = './src/arbitrage/shadow-graph';

// File rename mappings
const FILE_RENAMES = {
  'orchestrator.ts': 'shadow-graph-orchestrator.ts',
  'database.ts': 'shadow-graph-database.ts',
  'constants.ts': 'shadow-graph-constants.ts',
  'case-study.ts': 'shadow-graph-case-study.ts',
};

// Class rename mappings
const CLASS_RENAMES = {
  'ShadowMarketProber': 'ShadowGraphMarketProber',
  'ShadowSteamDetector': 'ShadowGraphSteamDetector',
  'ShadowArbitrageScanner': 'ShadowGraphArbitrageScanner',
};

// Interface rename mappings
const INTERFACE_RENAMES = {
  'HiddenSteamEvent': 'ShadowGraphHiddenSteamEvent',
  'ShadowArbEntry': 'ShadowGraphArbitrageEntry',
  'ShadowArbMatrix': 'ShadowGraphArbitrageMatrix',
};

// Property rename mappings
const PROPERTY_RENAMES = {
  'lastOdds': 'lastOddsPrice',
  'lastProbeSuccess': 'lastProbeSuccessStatus',
  'lastUpdated': 'lastUpdatedTimestamp',
};

async function migrateFile(filePath: string): Promise<void> {
  let content = await readFile(filePath, 'utf-8');
  
  // Apply class renames
  for (const [old, new_] of Object.entries(CLASS_RENAMES)) {
    content = content.replace(new RegExp(old, 'g'), new_);
  }
  
  // Apply interface renames
  for (const [old, new_] of Object.entries(INTERFACE_RENAMES)) {
    content = content.replace(new RegExp(old, 'g'), new_);
  }
  
  // Apply property renames (more careful - only replace property access)
  for (const [old, new_] of Object.entries(PROPERTY_RENAMES)) {
    content = content.replace(new RegExp(`\\.${old}\\b`, 'g'), `.${new_}`);
    content = content.replace(new RegExp(`: ${old}`, 'g'), `: ${new_}`);
  }
  
  await writeFile(filePath, content, 'utf-8');
}

// Main migration function
async function migrate(): Promise<void> {
  const files = await readdir(SHADOW_GRAPH_DIR);
  
  for (const file of files) {
    if (file.endsWith('.ts')) {
      await migrateFile(join(SHADOW_GRAPH_DIR, file));
    }
  }
  
  console.log('Migration completed!');
}

migrate().catch(console.error);
```

---

## 📚 Documentation Updates Required

### Files to Update

1. **SHADOW-GRAPH-SYSTEM.md**
   - Update file references
   - Update class names in examples
   - Update interface names in examples

2. **SHADOW-GRAPH-COMPLETE-HIERARCHY.md**
   - Update code location references
   - Update class names
   - Update interface names

3. **SHADOW-GRAPH-QUICK-REFERENCE.md**
   - Update code examples
   - Update import statements
   - Update class names

4. **SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md**
   - Update file references
   - Update class names in tables
   - Update interface names in tables

5. **RESEARCH-SCRIPTS-INTEGRATION.md**
   - Update any references to renamed classes/interfaces

6. **README.md**
   - Update any code examples

---

## ⚠️ Risk Assessment

### Low Risk
- Property renames (backward compatible with database migrations)
- Documentation updates

### Medium Risk
- Interface renames (requires type updates but no runtime changes)
- File renames (requires import updates but no logic changes)

### High Risk
- Class renames (requires all usages to be updated, could break runtime)

### Mitigation Strategies

1. **Incremental Migration**: Do one phase at a time
2. **Feature Flags**: Use feature flags to support both old and new names temporarily
3. **Comprehensive Testing**: Run full test suite after each phase
4. **Code Review**: Thorough code review before merging
5. **Rollback Plan**: Keep old code in git history for easy rollback

---

**Status**: 📋 Planning Complete  
**Next Steps**: Review and approve plan, then begin Phase 1 implementation  
**Last Updated**: 2025-01-XX

