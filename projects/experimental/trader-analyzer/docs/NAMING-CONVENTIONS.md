# Naming Conventions

**Last Updated**: 2025-01-16  
**Scope**: Constants, Classes, Types, Interfaces, Properties, Enums

---

## 📋 Overview

This document defines the naming conventions for all code elements in the NEXUS Trading Intelligence Platform. Consistent naming improves code readability, maintainability, and discoverability.

---

## 🔤 Constants

### Format: `UPPER_SNAKE_CASE`

**Rules**:
- All uppercase letters
- Words separated by underscores (`_`)
- Use descriptive names
- Group related constants in objects

### Examples

```typescript
// ✅ Good - Simple constants
const MONOREPO_ROOT = import.meta.dir + "/../";
const PACKAGES_DIR = MONOREPO_ROOT + "packages";
const APPS_DIR = MONOREPO_ROOT + "apps";

// ✅ Good - Grouped constants
const COLORS = {
	primary: { hex: "#00ff88", ansi: "\x1b[38;2;0;255;136m" },
	secondary: { hex: "#00d4ff", ansi: "\x1b[38;2;0;212;255m" },
	success: { hex: "#10b981", ansi: "\x1b[38;2;16;185;129m" },
} as const;

// ✅ Good - Private class constants
class DevWorkspaceManager {
	private readonly SECRET_SERVICE = "com.nexus.trader-analyzer.devworkspace";
	private readonly DEFAULT_EXPIRATION_HOURS = {
		interview: 24,
		onboarding: 168,
		trial: 72,
	};
}

// ❌ Bad - Mixed case
const monorepoRoot = "...";
const packagesDir = "...";

// ❌ Bad - camelCase
const defaultExpirationHours = { ... };
```

### Special Cases

```typescript
// Environment variables (follow same convention)
const WS_URL = process.env.AUDIT_WS_URL || "ws://localhost:3002/audit/ws";
const RATE_LIMIT_MS = parseInt(process.env.TAG_RATE_LIMIT || '0', 10);

// Configuration objects (use UPPER_SNAKE_CASE for keys)
const CONFIG = {
	API_URL: "https://api.example.com",
	MAX_RETRIES: 3,
	TIMEOUT_MS: 5000,
} as const;
```

---

## 🏛️ Classes

### Format: `PascalCase`

**Rules**:
- First letter uppercase
- Each word capitalized
- Use descriptive nouns
- No abbreviations unless widely understood

### Examples

```typescript
// ✅ Good - Descriptive class names
export class DevWorkspaceManager { }
export class ArbitrageDetector { }
export class PropertyMatrixManager { }
export class RegistryFormatter { }

// ✅ Good - Specialized classes
export class HTMLRewriter { }
export class EventMatcher { }
export class WorkersAPIClient { }

// ❌ Bad - Abbreviations
export class DevWSMgr { }
export class ArbDet { }

// ❌ Bad - camelCase
export class devWorkspaceManager { }

// ❌ Bad - lowercase
export class devworkspacemanager { }
```

### Class Properties

**Private/Protected**: `camelCase` with underscore prefix for private
**Public**: `camelCase`

```typescript
export class DevWorkspaceManager {
	// ✅ Good - Private constants (UPPER_SNAKE_CASE)
	private readonly SECRET_SERVICE = "...";
	
	// ✅ Good - Private properties (camelCase)
	private keys: Map<string, DevWorkspaceKey> = new Map();
	private rateLimitWindows: Map<string, number> = new Map();
	
	// ✅ Good - Public methods (camelCase)
	public async createKey(options: CreateKeyOptions): Promise<DevWorkspaceKey> { }
	public async revokeKey(keyId: string): Promise<void> { }
}
```

---

## 📐 Types & Interfaces

### Format: `PascalCase`

**Rules**:
- Same as classes
- Use `interface` for object shapes
- Use `type` for unions, intersections, aliases
- Prefix with `I` only if needed for clarity (generally avoid)

### Examples

```typescript
// ✅ Good - Interfaces
export interface DevWorkspaceKey {
	id: string;
	apiKey: string;
	email: string;
	purpose: "onboarding" | "interview" | "trial";
	createdAt: number;
	expiresAt: number;
}

export interface CreateKeyOptions {
	email: string;
	purpose: "onboarding" | "interview" | "trial";
	expirationHours?: number;
	rateLimitPerHour?: number;
	metadata?: Record<string, any>;
}

export interface RegistryInfo {
	id: string;
	name: string;
	description: string;
	category: "data" | "tooling" | "security" | "research";
	type: RegistryType;
	endpoint: string;
	tags: string[];
}

// ✅ Good - Type aliases
export type RegistryStatus = "healthy" | "degraded" | "offline" | "unknown";
export type RegistryType = "property" | "data-source" | "tool" | "error";
export type PredictionVenue = "polymarket" | "kalshi";

// ✅ Good - Union types
export type PropertyType = "string" | "number" | "boolean" | "object" | "array";

// ❌ Bad - camelCase
export interface devWorkspaceKey { }
export type registryStatus = "healthy" | "degraded";

// ❌ Bad - Hungarian notation
export interface IDevWorkspaceKey { }  // Avoid unless necessary
```

---

## 🔑 Properties & Variables

### Format: `camelCase`

**Rules**:
- First letter lowercase
- Subsequent words capitalized
- Use descriptive names
- Avoid single-letter names except in loops

### Examples

```typescript
// ✅ Good - Object properties
const key: DevWorkspaceKey = {
	id: "key-123",
	apiKey: "sk_live_...",
	email: "developer@example.com",
	purpose: "onboarding",
	createdAt: Date.now(),
	expiresAt: Date.now() + 86400000,
};

// ✅ Good - Variables
const monorepoRoot = import.meta.dir + "/../";
const packagesDir = monorepoRoot + "packages";
const totalKeys = keys.length;
const activeKeys = keys.filter(k => k.active).length;

// ✅ Good - Function parameters
function createKey(options: CreateKeyOptions): DevWorkspaceKey {
	const { email, purpose, expirationHours } = options;
	const keyId = generateKeyId();
	const apiKey = generateApiKey();
	// ...
}

// ✅ Good - Loop variables (single letter OK)
for (const pkg of packages) {
	console.log(pkg.name);
}

for (let i = 0; i < items.length; i++) {
	processItem(items[i]);
}

// ❌ Bad - snake_case
const api_key = "...";
const total_keys = 10;

// ❌ Bad - UPPER_SNAKE_CASE (reserved for constants)
const TOTAL_KEYS = 10;  // Only if it's a constant

// ❌ Bad - Abbreviations
const pkgs = [...];
const pkgMgr = new PackageManager();
```

---

## 📦 Enums

### Format: `PascalCase` for enum name, `UPPER_SNAKE_CASE` for values

**Rules**:
- Enum name: `PascalCase`
- Enum values: `UPPER_SNAKE_CASE` (or `PascalCase` if string enum)

### Examples

```typescript
// ✅ Good - Numeric enum
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

// ✅ Good - String enum (PascalCase values)
export enum RegistryCategory {
	Data = "data",
	Tooling = "tooling",
	Security = "security",
	Research = "research",
}

// ✅ Good - Const enum (better performance)
export const enum Status {
	Active = "active",
	Inactive = "inactive",
	Pending = "pending",
}

// ❌ Bad - camelCase enum name
export enum logLevel { }

// ❌ Bad - camelCase values
export enum Status {
	active = "active",
	inactive = "inactive",
}
```

---

## 🎯 Arrays & Collections

### Format: Plural nouns in `camelCase`

**Rules**:
- Use plural form for arrays/collections
- Use descriptive names

### Examples

```typescript
// ✅ Good - Arrays
const packages: Package[] = [...];
const apps: App[] = [...];
const keys: DevWorkspaceKey[] = [...];

// ✅ Good - Maps/Sets
const keyMap = new Map<string, DevWorkspaceKey>();
const keySet = new Set<string>();
const packageRegistry = new Map<string, Package>();

// ❌ Bad - Singular for arrays
const package: Package[] = [...];
const app: App[] = [...];

// ❌ Bad - Abbreviations
const pkgs: Package[] = [...];
const apps: App[] = [...];
```

---

## 🔧 Functions & Methods

### Format: `camelCase` with verb prefix

**Rules**:
- Use verb prefixes: `get`, `set`, `create`, `update`, `delete`, `find`, `is`, `has`, `can`
- Use descriptive names
- Async functions: no special suffix (TypeScript handles this)

### Examples

```typescript
// ✅ Good - Getter functions
function getPackageInfo(name: string): PackageInfo { }
function getRegistryMetrics(id: string): RegistryMetrics { }

// ✅ Good - Setter functions
function setPackageProperty(name: string, property: string, value: any): void { }
function updateKeyMetadata(keyId: string, metadata: Record<string, any>): void { }

// ✅ Good - Creator functions
function createKey(options: CreateKeyOptions): DevWorkspaceKey { }
function generateApiKey(): string { }

// ✅ Good - Boolean functions
function isKeyExpired(key: DevWorkspaceKey): boolean { }
function hasPermission(user: User, permission: string): boolean { }
function canAccessRegistry(user: User, registryId: string): boolean { }

// ✅ Good - Async functions (no special naming)
async function fetchPackageInfo(name: string): Promise<PackageInfo> { }
async function createKey(options: CreateKeyOptions): Promise<DevWorkspaceKey> { }

// ❌ Bad - No verb prefix
function packageInfo(name: string): PackageInfo { }
function key(keyId: string): DevWorkspaceKey { }

// ❌ Bad - snake_case
function get_package_info(name: string): PackageInfo { }
function create_key(options: CreateKeyOptions): DevWorkspaceKey { }
```

---

## 📝 File Naming

### Format: `kebab-case.ts`

**Rules**:
- Use kebab-case (lowercase with hyphens)
- Descriptive names
- Match main export (if single export)

### Examples

```typescript
// ✅ Good - File names
devworkspace.ts
bun-link-monorepo-example.ts
bun-isolated-installs-visualizer.ts
workspace-routes.ts
registry-formatter.ts

// ❌ Bad - camelCase
devWorkspace.ts
bunLinkMonorepoExample.ts

// ❌ Bad - PascalCase
DevWorkspace.ts
BunLinkMonorepoExample.ts

// ❌ Bad - snake_case
dev_workspace.ts
bun_link_monorepo_example.ts
```

---

## 🏷️ Workspace Labeling

### Constants, Classes, Types in Workspace Registry

Constants, classes, types, and properties **are currently exposed** through the workspace system:

#### Current Workspace Integration

**Constants** (from `examples/` and `src/workspace/`):
- `MONOREPO_ROOT`, `PACKAGES_DIR`, `APPS_DIR` - Exposed in workspace config
- `SECRET_SERVICE`, `DEFAULT_EXPIRATION_HOURS` - Documented in `DevWorkspaceManager`
- `COLORS` - Used in visualizers, exposed via interactive HTML

**Classes**:
- `DevWorkspaceManager` - Documented in `/api/docs` and workspace routes
- `ArbitrageDetector`, `PropertyMatrixManager` - Available via registry system
- All classes are discoverable via `/api/registry` endpoints

**Types & Interfaces**:
- `DevWorkspaceKey`, `CreateKeyOptions` - Exposed in workspace API responses
- `RegistryInfo`, `RegistryItem` - Available via `/api/registry` endpoints
- All types are documented in TypeScript definitions and API docs

**Properties**:
- Package manager properties (linker, workspaces, catalog) - Exposed via `/api/workspace/config`
- Registry properties - Available via `/api/registry/properties`
- Workspace key properties - Shown in `/api/workspace/me` response

#### Workspace Dashboard Display

The workspace dashboard (`dashboard/workspace.html`) displays:
- **Constants**: Package manager configuration constants (linker, workspaces, catalog)
- **Types**: API response types shown in JSON responses
- **Classes**: Documented via `/api/docs` endpoints (accessible from dashboard)
- **Properties**: Package.json properties, registry properties, workspace key properties

#### Future Enhancement

To fully register constants/types/classes in the workspace registry, they could be added to the registry system:

```typescript
// Proposed registry entry format
{
	id: "monorepo-root",
	name: "MONOREPO_ROOT",
	type: "constant",
	category: "workspace",
	description: "Root directory path for monorepo",
	value: "import.meta.dir + '/../'",
	file: "examples/bun-link-monorepo-example.ts",
	line: 22,
	tags: ["workspace", "path", "monorepo"],
}
```

---

## ✅ Quick Reference

| Element | Format | Example |
|---------|--------|---------|
| Constants | `UPPER_SNAKE_CASE` | `MONOREPO_ROOT`, `DEFAULT_EXPIRATION_HOURS` |
| Classes | `PascalCase` | `DevWorkspaceManager`, `ArbitrageDetector` |
| Interfaces | `PascalCase` | `DevWorkspaceKey`, `CreateKeyOptions` |
| Types | `PascalCase` | `RegistryStatus`, `RegistryType` |
| Properties | `camelCase` | `apiKey`, `email`, `createdAt` |
| Variables | `camelCase` | `totalKeys`, `activeKeys` |
| Functions | `camelCase` (verb prefix) | `createKey`, `getPackageInfo`, `isExpired` |
| Enums | `PascalCase` (name), `UPPER_SNAKE_CASE` (values) | `enum LogLevel { DEBUG, INFO }` |
| Files | `kebab-case.ts` | `devworkspace.ts`, `workspace-routes.ts` |

---

## 🔍 Finding Code Elements

### By Naming Pattern

```bash
# Find all constants (UPPER_SNAKE_CASE)
rg "^const [A-Z_]+|^export const [A-Z_]+" src/

# Find all classes (PascalCase)
rg "^export class [A-Z]" src/

# Find all interfaces (PascalCase)
rg "^export interface [A-Z]" src/

# Find all types (PascalCase)
rg "^export type [A-Z]" src/
```

### In Workspace Registry

```bash
# Query workspace registry for constants
curl http://localhost:3000/api/registry/workspace?type=constant

# Query workspace registry for classes
curl http://localhost:3000/api/registry/workspace?type=class

# Query workspace registry for types
curl http://localhost:3000/api/registry/workspace?type=type
```

---

## 📚 Related Documentation

- [Workspace System](../docs/WORKSPACE-BUN-V1.3.4-INTEGRATION.md)
- [Registry System](../docs/REGISTRY-SYSTEM.md)
- [TypeScript Guidelines](../docs/TYPESCRIPT-GUIDELINES.md) (if exists)

---

## 🎨 Colors & CSS

### Format: Lowercase hex (`#rrggbb`), CSS Custom Properties (`--color-*`)

**Rules**:
- **Hex colors**: Always lowercase (`#00ff88` not `#00FF88`)
- **CSS Custom Properties**: Use `--color-*` prefix with kebab-case
- **RGBA**: Use `rgba()` for transparency (lowercase)
- **HSL**: Use lowercase `hsl()` or `hsla()` if needed
- **TypeScript constants**: Store hex as lowercase string in `hex` property

### Examples

#### CSS/HTML/JSX/TSX

```css
/* ✅ Good - Lowercase hex */
.button {
	background: #00ff88;
	color: #0a0e27;
	border: 1px solid #00d4ff;
}

/* ✅ Good - RGBA for transparency */
.card {
	background: rgba(0, 255, 136, 0.1);
	border: 1px solid rgba(0, 255, 136, 0.3);
}

/* ✅ Good - CSS Custom Properties */
:root {
	--color-primary: #00ff88;
	--color-secondary: #00d4ff;
	--color-bg-dark: #0a0e27;
	--color-text-light: #e0e0e0;
}

.button {
	background: var(--color-primary);
	color: var(--color-bg-dark);
}

/* ✅ Good - Linear gradients */
.header {
	background: linear-gradient(135deg, #00ff88, #00d4ff);
}

/* ❌ Bad - Uppercase hex */
.button {
	background: #00FF88;  /* Don't use uppercase */
	color: #0A0E27;
}

/* ❌ Bad - Mixed case */
.button {
	background: #00Ff88;  /* Don't mix case */
}
```

#### TypeScript/JavaScript Constants

```typescript
// ✅ Good - Lowercase hex in constants
const COLORS = {
	primary: { hex: "#00ff88", ansi: "\x1b[38;2;0;255;136m" },
	secondary: { hex: "#00d4ff", ansi: "\x1b[38;2;0;212;255m" },
	success: { hex: "#10b981", ansi: "\x1b[38;2;16;185;129m" },
	error: { hex: "#ef4444", ansi: "\x1b[38;2;239;68;68m" },
} as const;

// ✅ Good - CSS custom property names
const CSS_VARS = {
	COLOR_PRIMARY: "--color-primary",
	COLOR_SECONDARY: "--color-secondary",
	COLOR_BG_DARK: "--color-bg-dark",
} as const;

// ❌ Bad - Uppercase hex
const COLORS = {
	primary: { hex: "#00FF88" },  // Don't use uppercase
};

// ❌ Bad - camelCase for CSS vars
const CSS_VARS = {
	colorPrimary: "--color-primary",  // Use UPPER_SNAKE_CASE for constant names
};
```

#### HTML Inline Styles

```html
<!-- ✅ Good - Lowercase hex -->
<div style="background: #00ff88; color: #0a0e27;">
	Content
</div>

<!-- ✅ Good - RGBA -->
<div style="background: rgba(0, 255, 136, 0.1);">
	Content
</div>

<!-- ❌ Bad - Uppercase hex -->
<div style="background: #00FF88;">
	Content
</div>
```

#### JSX/TSX

```tsx
// ✅ Good - Lowercase hex
const Button = () => (
	<button style={{ background: "#00ff88", color: "#0a0e27" }}>
		Click me
	</button>
);

// ✅ Good - CSS classes with custom properties
const Button = () => (
	<button className="btn-primary">
		Click me
	</button>
);

// ✅ Good - Using constants
const Button = () => (
	<button style={{ background: COLORS.primary.hex }}>
		Click me
	</button>
);

// ❌ Bad - Uppercase hex
const Button = () => (
	<button style={{ background: "#00FF88" }}>
		Click me
	</button>
);
```

### Color Format Priority

1. **CSS Custom Properties** (`--color-*`) - Preferred for theming
2. **Lowercase hex** (`#rrggbb`) - Standard format
3. **RGBA** (`rgba(r, g, b, a)`) - For transparency
4. **HSL** (`hsl(h, s%, l%)`) - Only if needed for color manipulation

### CSS Custom Property Naming

```css
/* ✅ Good - Semantic naming */
:root {
	--color-primary: #00ff88;
	--color-secondary: #00d4ff;
	--color-success: #10b981;
	--color-error: #ef4444;
	--color-warning: #f59e0b;
	--color-info: #3b82f6;
	
	/* Background colors */
	--color-bg-primary: #0a0e27;
	--color-bg-secondary: #1a1f3a;
	--color-bg-card: rgba(255, 255, 255, 0.05);
	
	/* Text colors */
	--color-text-primary: #e0e0e0;
	--color-text-secondary: #b0b0b0;
	--color-text-muted: #888;
}

/* ❌ Bad - Inconsistent naming */
:root {
	--primaryColor: #00ff88;  /* Use kebab-case */
	--SECONDARY_COLOR: #00d4ff;  /* Use lowercase */
	--bgColor: #0a0e27;  /* Use --color- prefix */
}
```

### TypeScript Color Constants

```typescript
// ✅ Good - Structured color constants
const COLORS = {
	// Primary palette
	primary: { hex: "#00ff88", rgb: [0, 255, 136] },
	secondary: { hex: "#00d4ff", rgb: [0, 212, 255] },
	accent: { hex: "#ffaa00", rgb: [255, 170, 0] },
	
	// Status colors
	success: { hex: "#10b981", rgb: [16, 185, 129] },
	warning: { hex: "#f59e0b", rgb: [245, 158, 11] },
	error: { hex: "#ef4444", rgb: [239, 68, 68] },
	info: { hex: "#3b82f6", rgb: [59, 130, 246] },
	
	// Background colors
	bgDark: { hex: "#0a0e27", rgb: [10, 14, 39] },
	bgCard: { hex: "#1a1f3a", rgb: [26, 31, 58] },
	
	// Text colors
	textPrimary: { hex: "#e0e0e0", rgb: [224, 224, 224] },
	textSecondary: { hex: "#b0b0b0", rgb: [176, 176, 176] },
} as const;

// ✅ Good - CSS custom property names
const CSS_COLOR_VARS = {
	PRIMARY: "--color-primary",
	SECONDARY: "--color-secondary",
	SUCCESS: "--color-success",
	ERROR: "--color-error",
	BG_PRIMARY: "--color-bg-primary",
	TEXT_PRIMARY: "--color-text-primary",
} as const;
```

### Quick Reference

| Context | Format | Example |
|---------|--------|---------|
| CSS hex | Lowercase `#rrggbb` | `#00ff88` |
| CSS custom property | `--color-*` kebab-case | `--color-primary` |
| TypeScript constant name | `UPPER_SNAKE_CASE` | `COLORS` |
| TypeScript hex value | Lowercase string | `hex: "#00ff88"` |
| RGBA | Lowercase `rgba()` | `rgba(0, 255, 136, 0.1)` |
| HSL | Lowercase `hsl()` | `hsl(150, 100%, 50%)` |

---

**Status**: ✅ Complete  
**Last Updated**: 2025-01-16
