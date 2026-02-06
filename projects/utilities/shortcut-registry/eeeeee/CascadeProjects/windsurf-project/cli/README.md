# CLI Directory Structure

This directory contains all command-line interface tools for the windsurf project.

## Directory Structure

```text
cli/
├── README.md                    # This file
├── admin/                       # Administrative and management tools
│   ├── admin.ts                 # DuoPlus Admin CLI with KYC Dashboard
│   └── sovereign-admin.ts       # Sovereign APY Leaderboard Admin
├── dashboard/                   # Dashboard management tools
│   └── dashboard-cli.ts         # Dashboard dev server, benchmarks, validation
├── financial/                   # Financial and payment tools
│   ├── cashapp-green-cli.ts     # Cash App Green CLI
│   └── enhanced-cli.ts          # Enhanced Analytics CLI
├── risk/                        # Risk and security tools
│   └── risk-hunter.ts           # Fraud detection and risk hunting
├── automation/                  # Automation and RPA tools
│   └── duoplus-rpa-cli.ts       # DuoPlus RPA Automation
└── utils/                       # System utilities
    └── feature-status-cli.ts    # Feature status API interface
```

## CLI Categories

### Dashboard & Frontend
- **dashboard-cli.ts**: Dashboard development server, performance benchmarks, optimization validation, and production builds
  - `serve` - Start dev server with CORS support
  - `bench` - Run performance benchmarks (mitata)
  - `validate` - Validate all optimizations are active
  - `build` - Build TypeScript with `--define` for production
  - See [pages/CLI_USAGE.md](../pages/CLI_USAGE.md) for complete guide

### Admin & Management
- **admin.ts**: DuoPlus Admin CLI with KYC Dashboard, Pool Management, and APY Leaderboards
- **sovereign-admin.ts**: Sovereign APY Leaderboard Admin with Genesis integration

### Financial & Payment
- **cashapp-green-cli.ts**: Cash App Green CLI for payment processing
- **enhanced-cli.ts**: Enhanced Analytics CLI for financial systems

### Risk & Security
- **risk-hunter.ts**: Advanced fraud detection and risk hunting tool with real-time monitoring

### Automation & RPA
- **duoplus-rpa-cli.ts**: DuoPlus RPA Automation tools for batch control and template management

### System & Utilities
- **feature-status-cli.ts**: Command-line interface to the Feature Status API

## Usage

All CLI tools are executable with Bun:

```bash
# Dashboard tools
bun cli/dashboard/dashboard-cli.ts serve      # Start dev server
bun cli/dashboard/dashboard-cli.ts bench     # Run benchmarks
bun cli/dashboard/dashboard-cli.ts validate # Validate optimizations
bun cli/dashboard/dashboard-cli.ts build    # Build for production

# Admin tools
bun run cli/admin/admin.ts
bun run cli/admin/sovereign-admin.ts

# Financial tools
bun run cli/financial/cashapp-green-cli.ts
bun run cli/financial/enhanced-cli.ts

# Risk tools
bun run cli/risk/risk-hunter.ts

# Automation tools
bun run cli/automation/duoplus-rpa-cli.ts

# Utilities
bun run cli/utils/feature-status-cli.ts
```

## Features

### Admin CLI
- KYC Dashboard management
- Pool rebalancing engine
- APY leaderboard tracking
- FinCEN compliance

### Financial CLI
- Cash App Green integration
- Real-time payment processing
- Advanced analytics and visualization
- Lightning to Green routing

### Risk Hunter
- Real-time fraud detection
- Pattern analysis and threat hunting
- Session monitoring
- Network optimization

### RPA CLI
- Batch control operations
- Template management
- Automation workflows
- Process optimization

### Feature Status CLI
- Feature registry access
- System status monitoring
- Configuration management
- Health checks

## Security

- All CLI tools require appropriate authentication
- Sensitive operations are logged and audited
- Environment variables should be used for credentials
- Access controls are enforced per tool category
