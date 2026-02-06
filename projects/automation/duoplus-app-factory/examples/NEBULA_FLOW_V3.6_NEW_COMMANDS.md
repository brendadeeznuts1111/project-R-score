# Nebula Flow v3.6 - New Commands Documentation

This document provides detailed information about the new commands introduced in Nebula Flow v3.6.

## 1. Dashboard Command

### Description
Starts the interactive Nebula Flow dashboard.

### Usage
```bash
bun run nebula-flow:dashboard
```

### Features
- Real-time configuration monitoring
- System statistics (total projects, production count, groups, profiles)
- Quick actions for common tasks
- Simple interactive interface with menu navigation

### Quick Actions in Dashboard
```text
1. Interactive Editor        - Open configuration editor
2. Configuration Validation - Validate current configuration
3. Performance Metrics       - Show system performance
4. Topology Generation       - Display configuration topology
5. Sync Status               - Check configuration sync status
6. Exit                      - Quit the dashboard
```

## 2. Topology Command

### Description
Generates a visual representation of the configuration topology.

### Usage
```bash
# Generate text format topology (default)
bun run nebula-flow:topology --format=text

# Generate DOT format for Graphviz
bun run nebula-flow:topology --format=dot --output=examples/topology.dot

# Save text format to file
bun run nebula-flow:topology --format=text --output=examples/topology.txt
```

### Output Formats
- **text**: Tree view of groups and profiles (default)
- **dot**: Graphviz DOT format for visualization

### Example - Text Format
```text
🚀 Nebula Flow Topology
========================

🎯 Group: Production Systems
  └─ Profiles:
    └─ nebula-production (1 projects):
        └─ 🌌 Nebula-Flow™ Core (Primary)

🎯 Group: AI/ML Systems
  └─ Profiles:
    └─ ai-development (1 projects):
        └─ 🤖 AI/ML Development
```

## 3. Audit Command

### Description
Performs a comprehensive security audit of the configuration.

### Usage
```bash
# Run quick audit
bun run nebula-flow:audit

# Fail on critical errors
bun run nebula-flow:audit --fail-on-critical

# Export audit report
bun run nebula-flow:audit --fail-on-critical --export=examples/audit-report.json

# Export to S3 (simulated)
bun run nebula-flow:audit --export=s3://security-reports/
```

### Options
- `--fail-on-critical`: Terminates with error code 1 if critical errors are found
- `--export=<path>`: Exports audit report to JSON file or S3 bucket

### Audit Report Structure
```json
{
  "timestamp": "2026-01-23T02:58:11.570Z",
  "version": "3.6.0",
  "valid": true,
  "errors": [],
  "patterns": [...],
  "statistics": {
    "totalProjects": 10,
    "staticPatterns": 5,
    "dynamicPatterns": 3,
    "errors": 0,
    "validPatterns": 8
  }
}
```

## 4. Secrets Command

### Description
Manages secrets across configuration groups.

### Usage
```bash
# Sync all secrets
bun run nebula-flow:secrets sync --all-groups

# Sync secrets and store in system keychain
bun run nebula-flow:secrets sync --all-groups --to-keychain
```

### Options
- `--all-groups`: Sync secrets for all configuration groups
- `--to-keychain`: Store secrets in system keychain (OS X Keychain, Windows Credential Manager, Linux Secret Service)

## 5. Guard Command

### Description
Generates TypeScript runtime security guards.

### Usage
```bash
# Generate guards for all groups
bun run nebula-flow:guard generate --output=examples/guards.ts

# Generate guards for specific groups
bun run nebula-flow:guard generate --groups="Production Systems,Security Systems" --output=examples/production-guards.ts
```

### Options
- `--groups=<groups>`: Comma-separated list of groups to include
- `--output=<path>`: Output file for generated guards

### Generated Guard Example
```typescript
export const GROUP_GUARDS: Record<string, ProjectGuard[]> = {
  'Production Systems': [
    {
      name: '🌌 Nebula-Flow™ Core (Primary)',
      group: 'Production Systems',
      profile: 'nebula-production',
      rootPath: '/Users/nolarose/d-network',
      allowedPatterns: []
    }
  ]
};

export function validateProjectAccess(group: string, projectName: string): boolean {
  if (!GROUP_GUARDS[group]) {
    return false;
  }
  return GROUP_GUARDS[group].some(guard => guard.name === projectName);
}
```

## 6. Package Command

### Description
Creates deployable package for production deployment.

### Usage
```bash
# Create basic package
bun run nebula-flow:package --outfile=examples/nebula-basic

# Create package with feature flag
bun run nebula-flow:package --feature=PREMIUM --outfile=examples/nebula-premium

# Compile and package with TypeScript
bun run nebula-flow:package --compile --feature=ENTERPRISE --outfile=examples/nebula-enterprise
```

### Options
- `--compile`: Compiles TypeScript sources before packaging
- `--feature=<flag>`: Enable specific features (PREMIUM, ENTERPRISE, etc.)
- `--outfile=<name>`: Output filename for the package

### Package Structure
```text
examples/
└── nebula-premium.zip
    └── nebula-premium.json (package metadata)
```

## 7. Help Command

### Description
Displays all available commands and options.

### Usage
```bash
bun run nebula-flow:help
```

## Getting Started

### Prerequisites
- Bun v1.0 or later
- Node.js compatible system
- Graphviz (optional, for DOT format visualization)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd d-network

# Install dependencies
bun install

# Verify installation
bun run nebula-flow:help
```

### Running Tests
```bash
# Run all Nebula Flow tests
bun test tests/nebula-flow-v3.6.test.ts tests/nebula-flow-v3.6-new-commands.test.ts

# Run specific test file
bun test tests/nebula-flow-v3.6-new-commands.test.ts
```

## Examples

### Complete Workflow
```bash
# 1. Start the dashboard to monitor
bun run nebula-flow:dashboard

# 2. Generate topology diagram
bun run nebula-flow:topology --format=dot --output=dist/topology.dot

# 3. Run security audit
bun run nebula-flow:audit --fail-on-critical --export=reports/audit-20260123.json

# 4. Sync secrets
bun run nebula-flow:secrets sync --all-groups --to-keychain

# 5. Generate production guards
bun run nebula-flow:guard generate --groups="Production Systems" --output=src/guards.ts

# 6. Create deployable package
bun run nebula-flow:package --compile --feature=PREMIUM --outfile=nebula-premium
```

## Changelog
- **v3.6.0**: Added dashboard, topology, audit, secrets, guard, and package commands

## License
MIT License - see LICENSE file for details.
