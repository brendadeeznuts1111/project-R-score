---
name: compliance-tables
description: "Enterprise compliance matrices with status indicators, audit tracking, Bun.inspect.table rendering"
user-invocable: false
version: 1.0.0
---

# Enterprise Compliance Tables

Structured compliance matrices with color-coded status indicators for audit tracking.

---

## Status Legend

- **`[■]` Compliant** — #00FF00 / `\x1b[38;2;0;255;0m`
- **`[▲]` Partial** — #FFAA00 / `\x1b[38;2;255;170;0m`
- **`[●]` Non-compliant** — #FF0000 / `\x1b[38;2;255;0;0m`
- **`[◆]` N/A** — #00AAFF / `\x1b[38;2;0;170;255m`

---

## Compliance Matrix Schema

```typescript
interface ComplianceRecord {
  standard: string;       // GDPR, SOX, ISO 27001, PCI-DSS, HIPAA, SOC 2
  description: string;    // Human-readable description
  status: "compliant" | "partial" | "non-compliant" | "n/a";
  hex: string;            // Status color hex
  lastAudit: string;      // ISO date or "-"
  nextAudit: string;      // ISO date or "-"
  owner: string;          // Responsible team
  scope: string;          // EU, US, global
  risk: "low" | "medium" | "high" | "-";
  notes: string;          // Additional context
}
```

---

## Example Matrix

- **GDPR**: Data protection
  - Status: `[■]` compliant (#00FF00)
  - Audit: 2026-01-15 → 2026-04-15
  - Owner: legal | Scope: EU | Risk: low
  - Notes: PII encrypted
- **SOX**: Financial controls
  - Status: `[■]` compliant (#00FF00)
  - Audit: 2026-01-10 → 2026-04-10
  - Owner: finance | Scope: US | Risk: low
  - Notes: audit trail
- **ISO 27001**: Security standards
  - Status: `[■]` compliant (#00FF00)
  - Audit: 2026-01-12 → 2026-07-12
  - Owner: security | Scope: global | Risk: low
  - Notes: access controls
- **PCI-DSS**: Payment security
  - Status: `[■]` compliant (#00FF00)
  - Audit: 2026-01-08 → 2026-04-08
  - Owner: payments | Scope: global | Risk: medium
  - Notes: tokenized
- **HIPAA**: Health data
  - Status: `[◆]` N/A (#00AAFF)
  - Audit: N/A
  - Owner: N/A | Scope: US | Risk: N/A
  - Notes: not applicable
- **SOC 2**: Service controls
  - Status: `[■]` compliant (#00FF00)
  - Audit: 2026-01-05 → 2026-07-05
  - Owner: ops | Scope: global | Risk: low
  - Notes: type II

---

## Bun Rendering

### Generate Compliance Table

```typescript
// compliance-table.ts
const STATUS = {
  compliant: { symbol: "[■]", hex: "#00FF00", label: "compliant" },
  partial: { symbol: "[▲]", hex: "#FFAA00", label: "partial" },
  "non-compliant": { symbol: "[●]", hex: "#FF0000", label: "non-compliant" },
  "n/a": { symbol: "[◆]", hex: "#00AAFF", label: "N/A" },
} as const;

type StatusKey = keyof typeof STATUS;

interface ComplianceRecord {
  standard: string;
  description: string;
  status: StatusKey;
  lastAudit: string;
  nextAudit: string;
  owner: string;
  scope: string;
  risk: string;
  notes: string;
}

function renderStatus(status: StatusKey): string {
  const s = STATUS[status];
  const [r, g, b] = parseHex(s.hex);
  return `\x1b[38;2;${r};${g};${b}m${s.symbol} ${s.label}\x1b[0m`;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const records: ComplianceRecord[] = [
  { standard: "GDPR", description: "Data protection", status: "compliant", lastAudit: "2026-01-15", nextAudit: "2026-04-15", owner: "legal", scope: "EU", risk: "low", notes: "PII encrypted" },
  { standard: "SOX", description: "Financial controls", status: "compliant", lastAudit: "2026-01-10", nextAudit: "2026-04-10", owner: "finance", scope: "US", risk: "low", notes: "audit trail" },
  { standard: "ISO 27001", description: "Security standards", status: "compliant", lastAudit: "2026-01-12", nextAudit: "2026-07-12", owner: "security", scope: "global", risk: "low", notes: "access controls" },
  { standard: "PCI-DSS", description: "Payment security", status: "compliant", lastAudit: "2026-01-08", nextAudit: "2026-04-08", owner: "payments", scope: "global", risk: "medium", notes: "tokenized" },
  { standard: "HIPAA", description: "Health data", status: "n/a", lastAudit: "-", nextAudit: "-", owner: "-", scope: "US", risk: "-", notes: "not applicable" },
  { standard: "SOC 2", description: "Service controls", status: "compliant", lastAudit: "2026-01-05", nextAudit: "2026-07-05", owner: "ops", scope: "global", risk: "low", notes: "type II" },
];

// Render with ANSI colors
const rows = records.map((r) => ({
  Standard: r.standard,
  Description: r.description,
  Status: renderStatus(r.status),
  "Last Audit": r.lastAudit,
  "Next Audit": r.nextAudit,
  Owner: r.owner,
  Scope: r.scope,
  Risk: r.risk,
  Notes: r.notes,
}));

console.log(Bun.inspect.table(rows));
```

### Risk-Based Filtering

```typescript
// Filter by risk level
const highRisk = records.filter((r) => r.risk === "high" || r.risk === "medium");
console.log("Elevated Risk Items:");
console.log(Bun.inspect.table(highRisk.map((r) => ({
  Standard: r.standard,
  Status: renderStatus(r.status),
  Risk: r.risk,
  "Next Audit": r.nextAudit,
}))));
```

### Audit Due Report

```typescript
// Find audits due within 30 days
const now = new Date();
const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const dueSoon = records.filter((r) => {
  if (r.nextAudit === "-") return false;
  return new Date(r.nextAudit) <= threshold;
});

if (dueSoon.length > 0) {
  console.log("\n⚠️ Audits Due Within 30 Days:");
  console.log(Bun.inspect.table(dueSoon.map((r) => ({
    Standard: r.standard,
    "Next Audit": r.nextAudit,
    Owner: r.owner,
  }))));
}
```

---

## JSON Export

```typescript
// Export compliance snapshot
const snapshot = {
  generated: new Date().toISOString(),
  summary: {
    total: records.length,
    compliant: records.filter((r) => r.status === "compliant").length,
    partial: records.filter((r) => r.status === "partial").length,
    nonCompliant: records.filter((r) => r.status === "non-compliant").length,
    na: records.filter((r) => r.status === "n/a").length,
  },
  records,
};

await Bun.write("compliance-snapshot.json", JSON.stringify(snapshot, null, 2));

// Gzipped for archival
const gz = Bun.gzipSync(new TextEncoder().encode(JSON.stringify(snapshot)), { level: 9 });
await Bun.write("compliance-snapshot.json.gz", gz);
```

---

## Validation Rules

```typescript
// Validate compliance record
function validateRecord(r: ComplianceRecord): string[] {
  const errors: string[] = [];

  if (!r.standard) errors.push("Missing standard");
  if (!["compliant", "partial", "non-compliant", "n/a"].includes(r.status)) {
    errors.push(`Invalid status: ${r.status}`);
  }
  if (r.status !== "n/a" && r.lastAudit === "-") {
    errors.push("Active standard requires lastAudit date");
  }
  if (r.status !== "n/a" && r.nextAudit === "-") {
    errors.push("Active standard requires nextAudit date");
  }
  if (r.status !== "n/a" && !r.owner) {
    errors.push("Active standard requires owner");
  }

  return errors;
}

// Validate all records
for (const r of records) {
  const errors = validateRecord(r);
  if (errors.length > 0) {
    console.error(`${r.standard}: ${errors.join(", ")}`);
  }
}
```

---

## Integration Patterns

### Webhook Alert (Non-Compliant)

```typescript
const nonCompliant = records.filter((r) => r.status === "non-compliant");

if (nonCompliant.length > 0) {
  await fetch("https://hooks.slack.com/xxx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🚨 ${nonCompliant.length} non-compliant standards detected`,
      attachments: nonCompliant.map((r) => ({
        color: "#FF0000",
        title: r.standard,
        text: `${r.description} - Owner: ${r.owner}`,
      })),
    }),
  });
}
```

### Telegram Alert

```typescript
const msg = records
  .map((r) => `${STATUS[r.status].symbol} ${r.standard}: ${r.status}`)
  .join("\n");

await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: `📋 Compliance Report\n\n${msg}`,
    parse_mode: "HTML",
  }),
});
```

---

## Related Skills

- **table-enforcement**: Validate table structure and compliance scoring
- **bun-performance**: Bun.inspect.table rendering
- **stdin-quantum**: ANSI color gradients

---

## Version History

- **v1.0.0** (2026-01-18): Initial release with compliance matrix, Bun rendering, validation
