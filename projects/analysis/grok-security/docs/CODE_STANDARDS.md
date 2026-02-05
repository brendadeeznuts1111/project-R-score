# Code Standards & Formatting Guide

## Overview

This document establishes the foundational structure for all code in the HSL Tension Rings + DuoPLUS enterprise security system. All code must follow these standards for consistency, traceability, and deep inspection capabilities.

---

## 1. Semantic Tagging System

Every code element must include semantic tags in this exact format:

```
[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]
```

### Tag Definitions

| Tag | Values | Purpose |
|-----|--------|---------|
| `[DOMAIN]` | SECURITY, TELEMETRY, COMPLIANCE, BIOMETRIC, DASHBOARD | Business domain classification |
| `[SCOPE]` | GLOBAL, MODULE, CLASS, FUNCTION, PRIVATE | Code visibility scope |
| `[TYPE]` | API, CONFIG, UTIL, HANDLER, BRIDGE, WORKER | Code/data type |
| `[META:{PROPERTY}]` | META:{VERSION}, META:{ENDPOINT}, META:{THRESHOLD} | Metadata with property |
| `[CLASS]` | ClassName | Class name if applicable |
| `[FUNCTION]` | functionName | Function name if applicable |
| `[INTERFACE]` | IInterfaceName | Interface name if applicable |
| `[#REF:*]` | #REF:DuoPLUS, #REF:HSL-TENSION | Cross-references |
| `[BUN-NATIVE]` | Present if using Bun APIs | Bun-specific API usage |

---

## 2. Deep Inspection Implementation

All objects must support `console.log()` with `--depth=10` for complete visibility.

### Required Implementation

```typescript
[Symbol.for("Bun.inspect.custom")]() {
  return {
    type: this.constructor.name,
    properties: { /* all properties */ },
    metadata: { /* inspection metadata */ },
    nested: { /* deep structure */ }
  };
}
```

---

## 3. Class Definition Standard

```typescript
// [DOMAIN][SCOPE][TYPE][META:{VERSION}][CLASS][#REF:*][BUN-NATIVE]
class ClassName {
  private property: Type;
  
  [Symbol.for("Bun.inspect.custom")]() {
    return `ClassName { /* structure */ }`;
  }
}
```

---

## 4. Interface Definition Standard

```typescript
// [DOMAIN][SCOPE][TYPE][INTERFACE][#REF:*]
interface IInterfaceName {
  property: Type;
  metadata?: Record<string, unknown>;
}
```

---

## 5. Function Definition Standard

```typescript
// [DOMAIN][SCOPE][TYPE][FUNCTION][#REF:*][BUN-NATIVE]
async function functionName(params: Type): Promise<ReturnType> {
  // Implementation
}
```

---

## 6. Configuration Standard

All configuration objects must be deeply inspectable:

```typescript
// [DOMAIN][SCOPE][CONFIG][META:{VERSION}][#REF:*]
const config = {
  version: "1.0.0",
  endpoints: { /* nested */ },
  thresholds: { /* nested */ },
  [Symbol.for("Bun.inspect.custom")]() {
    return Bun.inspect(this, { depth: 10 });
  }
};
```

---

## 7. Bun-Native API Usage

All Bun-native API calls must be explicitly tagged:

```typescript
// [BUN-NATIVE] Bun.serve
Bun.serve({ /* config */ });

// [BUN-NATIVE] Bun.inspect
console.log(Bun.inspect(obj, { depth: 10 }));

// [BUN-NATIVE] Bun.file
const file = Bun.file("path");
```

---

## 8. Cross-Reference Standard

Link related components using `#REF` tags:

- `#REF:DuoPLUS` - DuoPLUS Property Matrix integration
- `#REF:HSL-TENSION` - HSL Tension Rings system
- `#REF:COMPLIANCE-BRIDGE` - ComplianceBridge class
- `#REF:TELEMETRY-ENTRY` - TelemetryEntry class

---

## 9. Naming Conventions

See [NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md) for detailed naming rules.

---

## 10. Example: Complete Implementation

See [CODE_EXAMPLES.md](CODE_EXAMPLES.md) for full working examples.

---

**Last Updated**: January 17, 2026  
**Version**: 1.0.0  
**Status**: Active

