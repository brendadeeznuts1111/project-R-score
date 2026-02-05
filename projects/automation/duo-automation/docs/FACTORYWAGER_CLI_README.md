# FactoryWager CLI Inspector - Enterprise Edition

## Overview

FactoryWager CLI Inspector v2.0 is an enterprise-grade inspection tool with semantic colors, PCI/GDPR compliance, QR onboarding, and production deployment capabilities.

## Features

### 🔍 Core Inspection
- URL pattern extraction and analysis
- Real-time monitoring with watch mode
- Interactive TUI for live inspection
- JSON output for automation

### 🎨 Enterprise Color System
- **No purple colors** enforced across dashboard
- Semantic hex colors: `#3b82f6` (enterprise blue), `#22c55e` (success), `#f59e0b` (warning), `#ef4444` (error)
- Consistent color validation and enforcement

### 🛡️ PCI/GDPR Compliance
- Automated redaction engine for sensitive data
- PCI DSS, GDPR, AML5 compliance checks
- Audit report generation
- Real-time compliance scoring

### 📱 QR Onboarding Integration
- 28-second onboarding target
- 15 mandatory device health checks
- MRR impact tracking ($65% baseline)
- Enterprise readiness validation

### 🌐 Dashboard Routes
- `/inspector` - Main interface
- `/inspector/query` - JQ/JSON query engine
- `/inspector/redact` - PCI/GDPR masking tool
- Live metrics and real-time updates

### 🚀 Production Deployment
- Global CLI installation
- Systemd service integration
- Package.json configuration
- Automated deployment scripts

## Installation

### Development
```bash
# Clone and install
git clone <repository>
cd duo-automation
bun install

# Run CLI
bun run cli/factorywager-cli.ts
```

### Production Deployment
```bash
# Deploy globally
bun run scripts/deploy-global-cli.ts

# Or use the CLI
bun run cli/factorywager-cli.ts deploy --global --systemd
```

## Usage

### Basic Inspection
```bash
# Inspect default URL
factorywager inspect

# Inspect specific URL with redaction
factorywager inspect https://example.com --redact

# Interactive TUI mode
factorywager inspect --tui

# JSON output
factorywager inspect --json
```

### Dashboard Operations
```bash
# Start dashboard with live mode
factorywager dashboard --port 8090 --live

# Production mode
factorywager dashboard --production
```

### QR Onboarding
```bash
# Launch QR onboarding system
factorywager qr-onboard --port 8091 --health-checks

# Monitor onboarding
factorywager qr-onboard --monitor
```

### Compliance
```bash
# Run compliance checks
factorywager compliance --standards pci,gdpr,aml5

# Generate audit report
factorywager compliance --audit

# Test redaction engine
factorywager compliance --redaction-engine
```

### System Status
```bash
# Basic status
factorywager status

# Detailed system information
factorywager status --detailed
```

## Enterprise Features

### Color Compliance
The system enforces a strict no-purple policy with semantic colors:

```typescript
const ENTERPRISE_COLORS = {
  enterprise: '#3b82f6',    // Primary blue
  success: '#22c55e',      // Success green
  warning: '#f59e0b',      // Warning amber
  error: '#ef4444',        // Error red
  background: '#1f2937',   // Dark background
  inspector: '#111827',    // Near black
  merchant: '#92400e',     // Merchant brown
  zone: '#6366f1'          // Zone indigo
};
```

### Device Health Validation
15 mandatory checks before device activation:
1. OS version check
2. Browser compatibility
3. Network performance
4. Storage validation
5. Camera test
6. Biometric check
7. Security posture
8. WebAuthn validation
9. Processor performance
10. Root detection
11. App integrity
12. Encryption support
13. VPN detection
14. Patch level
15. Enterprise readiness

### Compliance Redaction
Automatic masking of sensitive data:
- Credit cards: `****-****-****-1234`
- Emails: `$[REDACTED_USER]@domain.com`
- Phones: `+1-***-***-4567`
- SSN: `***-**-****`
- Financial: `$[REDACTED_AMOUNT]`

## Dashboard Integration

### Main Dashboard
- Live metrics display
- Recent scan history
- Compliance scoring
- MRR impact tracking

### Query Engine
- JQ/JSON query interface
- Pattern extraction
- Real-time results
- Export capabilities

### Redaction Tool
- Interactive PCI/GDPR masking
- Live preview
- Compliance badges
- Batch processing

## Architecture

```
cli/
├── factorywager-cli.ts           # Main CLI entry point
├── factorywager-inspector-enhanced.ts  # Enhanced inspector
├── qr-onboarding-integration.ts  # QR onboarding system
└── deploy-global-cli.ts          # Production deployment

server/
├── inspector-dashboard.ts         # Dashboard server
└── factorywager-inspector.ts     # Core inspector logic

config/
└── enterprise-colors.ts          # Color system & validation

scripts/
└── deploy-global-cli.ts          # Deployment automation
```

## API Endpoints

### Dashboard API
- `GET /api/metrics` - System metrics
- `POST /api/query` - Execute queries
- `POST /api/redact` - Apply redaction

### QR Onboarding API
- `POST /api/qr/session` - Create session
- `POST /api/qr/session/:id` - Run health checks
- `GET /api/qr/metrics` - Onboarding metrics

## Monitoring

### Metrics Tracked
- Total scans and patterns extracted
- Compliance scores
- MRR impact
- Device health validation results
- QR onboarding completion rates

### Real-time Updates
- Live dashboard updates every 5 seconds
- WebSocket connections for real-time data
- Automatic metric aggregation

## Security

### Enterprise Security
- mTLS enforcement for all devices
- JWT token expiry (5 minutes)
- Biometric verification requirements
- Security posture validation

### Data Protection
- PCI DSS v4.0 compliance
- GDPR Article 32 compliance
- AML5 directive adherence
- Automatic data redaction

## Performance

### Targets
- 28-second onboarding completion
- 99.9% uptime requirement
- Sub-second query responses
- 95%+ compliance scores

### Optimization
- Parallel health checks
- Cached configuration profiles
- Prefetched data patterns
- Optimized redaction algorithms

## Support

### Commands
```bash
# Help
factorywager --help
factorywager inspect --help

# Version
factorywager --version

# Status
factorywager status --detailed
```

### Troubleshooting
- Check system status with `factorywager status`
- Verify installation with `factorywager --version`
- Test dashboard with `factorywager dashboard --port 8090`
- Run compliance checks with `factorywager compliance --audit`

## License

MIT License - © DuoPlus Enterprise 2026
