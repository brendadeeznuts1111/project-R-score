/**
 * Generate Markdown Documentation from Scoping Matrix
 * 
 * This script creates SCOPING_MATRIX.md from the enhanced matrix data
 * ensuring the living spec stays in sync with the source-of-truth code.
 * 
 * Run: bun scripts/generate-scoping-docs.ts
 * Output: docs/SCOPING_MATRIX.md (auto-generated, DO NOT EDIT)
 */

import { DUOPLUS_SCOPING_MATRIX, ScopingMatrixRow } from '../data/scopingMatrixEnhanced';
import { writeFileSync } from 'fs';

function generateMarkdown(): string {
  const now = new Date().toISOString();
  
  // Main table
  const mainTable = `
| Serving Domain / Context | Detected Scope | Platform | Storage Path | Secrets Backend | Service Name Format | Secrets Flag | Bun Runtime TZ | Bun Test TZ | Feature Flag(s) | API / Strategy Used | Benefit |
|--------------------------|----------------|----------|--------------|-----------------|---------------------|--------------|----------------|------------|-----------------|---------------------|---------|
${DUOPLUS_SCOPING_MATRIX.map((row: ScopingMatrixRow) => {
  const domain = row.servingDomain ? `\`${row.servingDomain}\`` : '*(fallback)*';
  const flags = row.featureFlags.length > 0 
    ? row.featureFlags.map(f => `\`${f}\``).join(', ')
    : '—';
  
  return `| ${domain} | **${row.detectedScope}** | ${row.platform} | \`${row.storagePath}\` | ${row.secretsBackend} | \`${row.serviceNameFormat}\` | \`${row.secretsFlag}\` | ${row.bunRuntimeTz} | ${row.bunTestTz} | ${flags} | ${row.apiStrategy} | ${row.operationalBenefit} |`;
}).join('\n')}
`;

  // Platform-specific details
  const platformSections = ['Windows', 'macOS', 'Linux', 'Other']
    .map(platform => {
      const rows = DUOPLUS_SCOPING_MATRIX.filter(r => r.platform === platform);
      if (rows.length === 0) return '';
      
      return `
## ${platform}

${rows.map((row: ScopingMatrixRow) => `
### ${row.servingDomain || 'Fallback'} (${row.detectedScope})

- **Storage Path:** \`${row.storagePath}\`
- **Secrets Backend:** ${row.secretsBackend}
- **Service Name:** \`${row.serviceNameFormat}\`
- **Feature Flags:** ${row.featureFlags.map(f => `\`${f}\``).join(', ') || 'None'}
- **API Strategy:** ${row.apiStrategy}
- **Benefit:** ${row.operationalBenefit}
`).join('\n')}
`;
    })
    .filter(s => s.length > 0)
    .join('\n');

  // Scope-specific details
  const scopeSections = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX', 'global']
    .map(scope => {
      const rows = DUOPLUS_SCOPING_MATRIX.filter(r => r.detectedScope === scope);
      if (rows.length === 0) return '';
      
      const sections = rows.map((row: ScopingMatrixRow) => {
        const flagsList = row.featureFlags.map(f => `\`${f}\``).join(', ') || 'None';
        return `
### ${row.servingDomain || 'Fallback'} on ${row.platform}

| Property | Value |
|----------|-------|
| Storage Path | \`${row.storagePath}\` |
| Secrets Backend | ${row.secretsBackend} |
| Service Name | \`${row.serviceNameFormat}\` |
| API Strategy | ${row.apiStrategy} |
| Feature Flags | ${flagsList} |
| Operational Benefit | ${row.operationalBenefit} |
`;
      }).join('\n');
      
      return `
## Scope: ${scope}

${sections}
`;
    })
    .filter(s => s.length > 0)
    .join('\n');

  return `# DuoPlus Multi-Tenant Scoping & Platform Matrix (v3.7+ Enhanced)

**Auto-generated:** ${now}  
**Source:** [\`data/scopingMatrixEnhanced.ts\`](../../data/scopingMatrixEnhanced.ts)  
**⚠️ DO NOT EDIT DIRECTLY** — Update source TypeScript file instead

---

## Master Scoping Matrix

Unified view of all tenant contexts, platforms, and configurations.

${mainTable}

---

## Key Bun-Native Patterns

| Pattern | Where Used | Why It Matters |
|---------|-----------|----------------|
| **Atomic writes** | Local mirror file updates | Prevents corrupted state during crashes (\`Bun.write(temp) → rename\`) |
| **Idempotent generation** | \`generate-env-dts.ts\` | Avoids Git noise; safe in CI loops |
| **Normalized domain names** | \`domainToFeature()\` | Ensures valid JS identifiers: \`dev.apple...\` → \`DEV_APPLE..._TENANT\` |
| **Feature-based code elimination** | \`feature()\` from \`bun:bundle\` | Dead code removed at compile-time (0 runtime overhead) |
| **Scope validation** | \`validateMetricScope()\` | Prevents cross-scope data leakage |
| **Exit codes** | All scripts | \`Bun.exit(1)\` on error → CI fails fast |

---

## By Platform

${platformSections}

---

## By Scope

${scopeSections}

---

## Integration Patterns

### With Private Registry

\`\`\`typescript
import { feature } from "bun:bundle";
import { getScopedFeatureFlags } from "../data/scopingMatrixEnhanced";

// For apple.factory-wager.com (ENTERPRISE)
const servingDomain = Bun.env.HOST ?? "localhost";
const flags = getScopedFeatureFlags(servingDomain);

if (flags.has("APPLE_FACTORY_WAGER_COM_TENANT")) {
  const response = await fetch("https://npm.pkg.github.com/duoplus/@duoplus/core", {
    headers: {
      Authorization: \`Bearer \${Bun.env.DUOPLUS_NPM_TOKEN}\`,
      "Content-Disposition": "inline",
    },
  });
}
\`\`\`

### With Dashboard Scope

\`\`\`typescript
import { detectScope } from "../data/scopingMatrixEnhanced";

// Spawn isolated dashboard per scope
const scope = detectScope(Bun.env.HOST);
Bun.env.DASHBOARD_SCOPE = scope;

// Only send scope-matching metrics
const metrics = allMetrics.filter(m => m.scope === scope);
\`\`\`

### With Metrics Validation

\`\`\`typescript
import { validateMetricScope } from "../data/scopingMatrixEnhanced";

// Prevent cross-scope leakage
if (!validateMetricScope(metric.scope)) {
  throw new Error(\`Metric scope mismatch: \${metric.scope} != \${Bun.env.DASHBOARD_SCOPE}\`);
}
\`\`\`

---

## Feature Flag Mapping

All rows automatically generate compile-time feature flags:

\`\`\`bash
# Build for ENTERPRISE scope
bun build \\
  --feature=APPLE_FACTORY_WAGER_COM_TENANT \\
  --feature=R2_STORAGE \\
  --feature=PREMIUM_SECRETS \\
  --minify src/index.ts

# Build for DEVELOPMENT scope
bun build \\
  --feature=DEV_APPLE_FACTORY_WAGER_COM_TENANT \\
  --feature=DEBUG \\
  --feature=MOCK_API \\
  --minify src/index.ts

# Build for LOCAL-SANDBOX (safe dev)
bun build \\
  --feature=LOCAL_SANDBOX \\
  --feature=DEBUG \\
  --feature=MOCK_API \\
  --minify src/index.ts
\`\`\`

---

## Runtime Scope Detection

The matrix enables automatic scope detection:

\`\`\`typescript
import { detectScope, getMatrixRow } from "../data/scopingMatrixEnhanced";

const servingDomain = Bun.env.HOST || "localhost";
const scope = detectScope(servingDomain);
const row = getMatrixRow(servingDomain);

console.log(\`Scope: \${scope}\`);
console.log(\`Storage: \${row?.storagePath}\`);
console.log(\`Secrets: \${row?.secretsBackend}\`);
\`\`\`

**Examples:**

| Domain | Detected Scope | Storage | Secrets |
|--------|----------------|---------|---------|
| apple.factory-wager.com | ENTERPRISE | enterprise/ | Windows Credential Manager |
| dev.apple.factory-wager.com | DEVELOPMENT | development/ | macOS Keychain |
| localhost | LOCAL-SANDBOX | local-sandbox/ | Encrypted local |
| *(unknown)* | global | global/ | Encrypted local (fallback) |

---

## Validation Tests

\`\`\`typescript
// tests/scoping-matrix.test.ts
import { detectScope, getScopedFeatureFlags, validateMetricScope } from "../data/scopingMatrixEnhanced";

test("apple domain → ENTERPRISE scope", () => {
  expect(detectScope("apple.factory-wager.com")).toBe("ENTERPRISE");
});

test("dev domain → DEVELOPMENT scope", () => {
  expect(detectScope("dev.apple.factory-wager.com")).toBe("DEVELOPMENT");
});

test("localhost → LOCAL-SANDBOX scope", () => {
  expect(detectScope("localhost")).toBe("LOCAL-SANDBOX");
});

test("ENTERPRISE gets R2_STORAGE flag", () => {
  const flags = getScopedFeatureFlags("apple.factory-wager.com");
  expect(flags.has("R2_STORAGE")).toBe(true);
});

test("metric scope validation prevents leakage", () => {
  Bun.env.DASHBOARD_SCOPE = "ENTERPRISE";
  expect(validateMetricScope("ENTERPRISE")).toBe(true);
  expect(validateMetricScope("DEVELOPMENT")).toBe(false);
});
\`\`\`

---

## How to Update This Document

1. **Edit source:** Modify \`data/scopingMatrixEnhanced.ts\`
2. **Regenerate:** Run \`bun scripts/generate-scoping-docs.ts\`
3. **Commit:** Git will show the updated markdown
4. **Deploy:** CI automatically picks up new configurations

This keeps the **living spec** in perfect sync with implementation code.

---

## Next Steps

- [ ] Add time-series storage with scoped partitioning (\`enterprise/2026/01/15/...\`)
- [ ] Implement anomaly detection per scope
- [ ] Create alerting rules per scope tier
- [ ] Setup SLA dashboards by scope

---

**Status:** ✅ **Generated at ${now}** | Always in sync with code | Single source of truth
`;
}

async function main() {
  try {
    const markdown = generateMarkdown();
    
    // Write to file
    const outputPath = './docs/SCOPING_MATRIX_AUTO.md';
    writeFileSync(outputPath, markdown);
    
    console.log(`✅ Generated ${outputPath}`);
    console.log(`📊 Documented ${DUOPLUS_SCOPING_MATRIX.length} matrix rows`);
    console.log(`📝 ${(markdown.split('\n').length)} lines total`);
  } catch (err) {
    console.error('❌ Failed to generate documentation:', err);
    Bun.exit(1);
  }
}

if (import.meta.main) {
  main();
}
