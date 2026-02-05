# CLI Commands Versioning System

**11.0.0.0.0.0.0: CLI Commands Subsystem Versioning**

This document defines the numerical versioning system used for CLI command documentation.

## Version Format

All versions follow the pattern: `11.X.Y.Z.A.B.C`

Where:
- `11` - Major subsystem (CLI Commands)
- `X` - Command category (1-8)
- `Y` - Sub-category within command
- `Z` - Feature group
- `A` - Sub-feature
- `B` - Implementation detail
- `C` - Specific variant

## Version Hierarchy

### 11.0.0.0.0.0.0: CLI Commands Subsystem (Root)

- `11.0.1.0.0.0.0` - CLI Argument Parsing
- `11.0.2.0.0.0.0` - Environment Variables
- `11.0.3.0.0.0.0` - Bun.shell Integration
- `11.0.4.0.0.0.0` - Bun.file() Operations
- `11.0.5.0.0.0.0` - Bun.spawn() Integration

### 11.1.0.0.0.0.0: Telegram Management

- `11.1.1.0.0.0.0` - Message Management
- `11.1.2.0.0.0.0` - Topic Management
- `11.1.3.0.0.0.0` - Covert Steam Alerts
- `11.1.4.0.0.0.0` - Environment Variables
- `11.1.5.0.0.0.0` - Logging

### 11.2.0.0.0.0.0: MCP Tools Execution

- `11.2.1.0.0.0.0` - Tool Listing
- `11.2.2.0.0.0.0` - Tool Execution
- `11.2.3.0.0.0.0` - Tool Categories
  - `11.2.3.1.0.0.0` - Bun Tooling Tools
  - `11.2.3.2.0.0.0` - Shell Tools
  - `11.2.3.3.0.0.0` - Documentation Tools
  - `11.2.3.4.0.0.0` - Research Tools
  - `11.2.3.5.0.0.0` - Bun Utils Tools

### 11.3.0.0.0.0.0: Live Dashboard

- `11.3.1.0.0.0.0` - Options
- `11.3.2.0.0.0.0` - Keyboard Controls
  - `11.3.2.1.0.0.0` - Navigation
  - `11.3.2.2.0.0.0` - Views
- `11.3.3.0.0.0.0` - Features
- `11.3.4.0.0.0.0` - Data Sources
- `11.3.5.0.0.0.0` - Sharp Books Registry
- `11.3.6.0.0.0.0` - Environment Variables
- `11.3.7.0.0.0.0` - Views
  - `11.3.7.1.0.0.0` - Overview (Default)

### 11.4.0.0.0.0.0: Data Import

- `11.4.1.0.0.0.0` - Data Import
- `11.4.2.0.0.0.0` - Exchange API Integration
- `11.4.3.0.0.0.0` - Supported Exchanges
- `11.4.4.0.0.0.0` - File Formats
  - `11.4.4.1.0.0.0` - CSV Format
  - `11.4.4.2.0.0.0` - JSON Format

### 11.5.0.0.0.0.0: Security Testing

- `11.5.1.0.0.0.0` - Penetration Testing
- `11.5.2.0.0.0.0` - Security Headers
- `11.5.3.0.0.0.0` - Subresource Integrity (SRI)
- `11.5.4.0.0.0.0` - Output Formats
  - `11.5.4.1.0.0.0` - Text Output (Default)
  - `11.5.4.2.0.0.0` - JSON Output

### 11.6.0.0.0.0.0: System Management

- Service management utilities
- Process monitoring

### 11.7.0.0.0.0.0: GitHub Integration

- Repository management
- Issue management

### 11.8.0.0.0.0.0: Password Utilities

- Password generation
- Secure random generation

## Cross-Reference System

Each command version references related subsystems:

- `7.0.0.0.0.0.0` → Bun Runtime Utilities
- `7.4.x.x.x.x.x` → Process & Execution
- `7.5.x.x.x.x.x` → File & Stream Operations
- `9.1.1.x.x.x.x` → Telegram Integration
- `10.0.0.0.0.0.0` → Authentication & Session Management

## Usage in Documentation

Version numbers appear in:

1. **Command Headers**: `**11.X.0.0.0.0.0: Command Name**`
2. **Section Headers**: `## 11.X.Y.0.0.0.0: Section Name`
3. **Sub-section Headers**: `### 11.X.Y.Z.0.0.0: Sub-section Name`
4. **Cross-References**: `@see 11.X.Y.Z.A.B.C` or `` `11.X.Y.Z.A.B.C` ``

## Version Assignment Rules

1. **Major Commands** get `11.X.0.0.0.0.0` (X = 1-8)
2. **Sub-categories** increment Y: `11.X.Y.0.0.0.0`
3. **Features** increment Z: `11.X.Y.Z.0.0.0`
4. **Sub-features** increment A: `11.X.Y.Z.A.0.0`
5. **Implementation details** increment B: `11.X.Y.Z.A.B.0`
6. **Variants** increment C: `11.X.Y.Z.A.B.C`

## Examples

```markdown
# Command Name

**11.1.0.0.0.0.0: Command Description**

## 11.1.1.0.0.0.0: Sub-category

### 11.1.1.1.0.0.0: Feature

**Cross-Reference:**
- `7.5.2.0.0.0.0` → Bun.file() operations
```

## See Also

- [README.md](./README.md) - Commands overview
- [Bun Runtime Utilities](../src/runtime/bun-native-utils-complete.ts) - Version `7.0.0.0.0.0.0`
- [Authentication Subsystem](../docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md) - Version `10.0.0.0.0.0.0`
