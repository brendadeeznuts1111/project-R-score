# Foxy Proxy - Unified Proxy & Phone Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)

> **Repository**: https://github.com/brendadeeznuts1111/foxy-duo-proxy  
> **Issues**: https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues  
> **License**: MIT

**Manage proxies, control cloud phones, and scale accounts programmatically.**

Foxy Proxy is a unified management platform combining IPFoxy proxies with DuoPlus cloud phones. Perfect for:

- 🎮 Gaming account scaling with geographic consistency
- 📱 Multi-account management across regions
- 💼 Batch operations with real-time monitoring
- 🔐 Secure proxy + phone profile management

## 🚀 Key Features

### Core Capabilities

- **📡 IPFoxy Integration**: Manage HTTP/HTTPS/SOCKS proxies with real-time monitoring
- **📱 DuoPlus Phones**: Control cloud-based mobile phones with file management
- **🔄 Unified Profiles**: Combine proxy + phone capabilities into single profiles
- **📊 Analytics Dashboard**: Real-time performance metrics and health monitoring
- **🎯 Template System**: Pre-configured profiles for different use cases
- **🏷️ Feature Flags**: Compile-time feature toggles for different build configurations
- **🕐 Date/Time Standardization**: Unified timezone-aware date handling across all components
- **🌍 Bun Timezone Support**: Built-in timezone management for global applications

### CashApp Scaling Pipeline

- **👤 Name Generation**: Realistic US names with demographic data
- **🏠 Address Generation**: Location-aware addresses matching proxy/phone area codes
- **⚡ Account Creation**: Automated CashApp account provisioning
- **🔍 Risk Monitoring**: Account health assessment and automated protection
- **📈 Batch Operations**: Scale to hundreds of accounts with monitoring

### Enhanced Template System

- **🎮 Gaming Templates**: Mobile gaming with phone verification
- **📱 Social Media**: Multi-platform account management
- **🛒 E-commerce**: Business accounts and payment processing
- **🕷️ Web Scraping**: Anti-detection configurations
- **💻 Development**: API access and developer tools
- **📺 Streaming**: Geo-unblocking and HD video

## 📁 Repository Structure

```
foxy-proxy/
├── packages/
│   └── dashboard/                 # Main React application
│       ├── src/
│       │   ├── components/        # Reusable UI components
│       │   ├── pages/            # Feature-based page organization
│       │   ├── hooks/            # Custom React hooks
│       │   ├── utils/            # Business logic utilities
│       │   │   ├── scaling/      # CashApp scaling pipeline
│       │   │   ├── duoplus/      # DuoPlus phone management
│       │   │   ├── unified/      # Unified profile system
│       │   │   ├── date-utils.ts # Standardized date/time utilities
│       │   │   ├── bun-timezone-demo.ts # Bun timezone examples
│       │   │   └── enhanced/     # Enhanced template system
│       │   ├── types/            # TypeScript definitions
│       │   └── test/             # Test files
│       └── package.json
├── docs/                         # Documentation
├── scripts/                      # Build and setup scripts
├── examples/                     # Usage examples
└── README.md
```

## 🛠️ Installation

### Prerequisites

- **Node.js 18+**
- **Bun** (recommended package manager)
- **Git**

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/foxy-proxy.git
cd foxy-proxy

# Install dependencies
bun install

# Start the development server
cd packages/dashboard
bun dev
```

## 🚀 Quick Start

### 1. Configure IPFoxy Proxies

Navigate to the **Proxies** page to add your proxy servers:

- Add HTTP, HTTPS, SOCKS5 proxies
- Set authentication credentials
- Configure regions and DNS settings

### 2. Set Up DuoPlus Phones

Go to the **DuoPlus** page to manage cloud phones:

- Add your DuoPlus API credentials
- View phone inventory and status
- Upload, download, and manage files

### 3. Create Unified Profiles

Use the **Unified Management** page to create combined profiles:

- Select a proxy and phone combination
- Choose a template (Gaming, Streaming, etc.)
- Customize settings as needed

### 4. Date/Time Standardization (New!)

Use our standardized date utilities for consistent timezone handling:

```typescript
import { DateUtils, PerformanceTimer } from "./utils/date-utils";

// Set timezone for the application
DateUtils.setBunTimezone("America/New_York");

// Create standardized dates
const now = DateUtils.now();
console.log("UTC storage:", now.format("ISO"));
console.log("Local display:", now.format("DISPLAY_DATETIME"));

// Performance timing
const timer = new PerformanceTimer();
// ... perform operation
console.log("Duration:", timer.getFormattedDuration());
```

### 5. CashApp Scaling (New!)

Access the **CashApp Pipeline** for account scaling:

```typescript
import { CashAppProvisioner, CashAppRiskMonitor } from "./utils/scaling/cashapp-pipeline";

// Create accounts with geographic consistency
const provisioner = new CashAppProvisioner();
const result = await provisioner.provisionCashAppAccount(0, "custom", "213");

// Monitor account health
const riskMonitor = new CashAppRiskMonitor();
const health = await riskMonitor.checkAccountHealth("device-123");
```

## 📖 Usage Examples

### Creating Gaming Profiles

```typescript
import { UnifiedProfileManager } from "./utils/unified/manager";

const profileManager = new UnifiedProfileManager();
const gamingProfile = profileManager.createProfile({
  name: "US East Gaming",
  proxyId: "proxy-us-1",
  phoneId: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
  template: "HIGH_PERFORMANCE"
});
```

### Date/Time Utilities

```typescript
import { DateUtils } from "./utils/date-utils";

// Timezone-aware date handling
DateUtils.setBunTimezone("Europe/London");
const timestamp = DateUtils.fileTimestamp(); // UTC-based file naming
const localTime = DateUtils.now().format("DISPLAY_DATETIME");

// Performance measurement
const timer = new PerformanceTimer();
// ... operation
const duration = timer.getDuration();
```

### CashApp Account Generation

```typescript
import { CashAppNameGenerator, CashAppAddressGenerator } from "./utils/scaling";

// Generate realistic profiles
const nameGenerator = new CashAppNameGenerator();
const addressGenerator = new CashAppAddressGenerator();

const profile = await nameGenerator.generateProfile();
const address = await addressGenerator.generateAddress({
  city: "Los Angeles",
  state: "California"
});
```

### Risk Monitoring

```typescript
import { CashAppRiskMonitor } from "./utils/scaling/cashapp-pipeline";

const riskMonitor = new CashAppRiskMonitor();

// Check individual account health
const health = await riskMonitor.checkAccountHealth("device-123");

// Batch monitoring
const deviceIds = ["device-1", "device-2", "device-3"];
const results = await riskMonitor.batchAccountHealthCheck(deviceIds);
const summary = riskMonitor.getRiskSummary(results);
```

## 🎯 Profile Templates

### Gaming Profile

- **Protocol**: HTTPS
- **DNS**: Cloudflare (1.1.1.1)
- **Priority**: High
- **Features**: Low latency optimization
- **Use Case**: Mobile gaming, competitive gaming

### Streaming Profile

- **Protocol**: HTTPS
- **Whitelist**: Netflix, YouTube, Twitch
- **Priority**: Medium
- **Features**: Video streaming optimization

### CashApp Profile

- **Protocol**: HTTPS/SOCKS5
- **Features**: Mobile verification, geographic consistency
- **Priority**: High
- **Use Case**: Account creation and management

## 🧪 Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun test unit
bun test integration
```

### CashApp Pipeline Demo

```typescript
import { demonstrateCashAppPipeline } from './utils/scaling/cashapp-demo';

# Run complete demonstration
await demonstrateCashAppPipeline();

# Individual demonstrations
await demonstrateAddressGenerator();
await demonstrateRiskMonitoring();
```

## 📊 CLI Interface

### Command Line Usage

```bash
# Date/Time Utilities
bun run packages/dashboard/src/utils/bun-timezone-demo.ts    # Run timezone demo
TZ=Europe/London bun run packages/dashboard/src/utils/bun-timezone-demo.ts  # Demo with timezone

# CashApp Pipeline Commands
bun run cashapp:demo          # Run pipeline demonstration
bun run cashapp:provision     # Provision test accounts
bun run cashapp:monitor       # Monitor account health
bun run cashapp:report        # Generate risk report

# Unified Profile Commands
bun run profile:create        # Create new profile
bun run profile:list          # List all profiles
bun run profile:export        # Export profiles
bun run profile:import        # Import profiles
```

## 🔧 Configuration

### Environment Variables

```bash
# IPFoxy Configuration
IPFOXY_API_TOKEN=your_token_here
IPFOXY_API_ID=your_api_id_here

# DuoPlus Configuration
DUOPLUS_API_KEY=your_api_key_here

# CashApp Configuration
CASHAPP_EMAIL_DOMAIN=mobile-accounts.net
CASHAPP_BATCH_SIZE=10

# Date/Time Configuration
TZ=America/New_York          # Default timezone
DEFAULT_TIMEZONE=UTC          # Storage timezone
DISPLAY_TIMEZONE=local       # Display timezone
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "verbatimModuleSyntax": true,
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

## 📈 Performance Metrics

### Expected Performance

| Feature            | Performance | Success Rate |
| ------------------ | ----------- | ------------ |
| Profile Generation | <10ms       | 100%         |
| Account Creation   | ~30s        | 85-90%       |
| Risk Assessment    | <100ms      | 100%         |
| Batch Processing   | ~500ms      | 95%+         |

### Scaling Capabilities

- **Single Instance**: 200+ concurrent accounts
- **Batch Processing**: 50 accounts per batch
- **Monitoring**: Real-time health checks
- **Geographic Coverage**: 5 major US regions

## 🔒 Security & Best Practices

### Data Protection

- **API Tokens**: Stored securely in environment variables
- **Sensitive Data**: Encrypted in transit
- **Local Storage**: No passwords stored locally
- **Type Safety**: Full TypeScript coverage

### Risk Management

- **Health Monitoring**: Continuous account assessment
- **Automated Actions**: Pause/terminate based on risk
- **Geographic Consistency**: Matching identifiers across regions
- **Collision Prevention**: Zero duplicate profiles

## 📚 Documentation

**📖 [Start with Getting Started](./docs/GETTING_STARTED.md)** - 5 minute setup guide  
**📋 [Documentation Index](./docs/INDEX.md)** - Everything organized by topic  
**🔌 [API Reference](./docs/API_REFERENCE.md)** - Complete API documentation  
**🚀 [Deployment Guide](./docs/DEPLOYMENT.md)** - Production setup  
**❓ [Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues & solutions

### Feature Guides

- [Date/Time Standardization](./docs/date-standardization.md) - Timezone utilities
- [CashApp Pipeline](./docs/cashapp-pipeline-guide.md) - Account scaling
- [Enhanced Templates](./docs/enhanced-templates.md) - Profile templates
- [DuoPlus Integration](./docs/enhanced-adb-integration.md) - Phone management
- [IPFoxy Integration](./docs/ipfoxy-integration.md) - Proxy management

### Developer Resources

- [Repository Structure](./REPOSITORY_STRUCTURE.md) - Codebase organization
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

## 🚀 Deployment

### Production Setup

```bash
# Build for production
bun run build

# Start production server
bun run start

# Run with PM2 (recommended)
pm2 start packages/dashboard/dist/server.js --name "foxy-proxy"
```

### Docker Deployment

```bash
# Build Docker image
docker build -t foxy-proxy .

# Run container
docker run -p 3000:3000 foxy-proxy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@foxy-proxy.com

## 🎯 Roadmap

### ✅ Completed Features

- [x] **Date/Time Standardization**: Unified timezone-aware date handling
- [x] **Bun Timezone Integration**: Built-in timezone management
- [x] **Performance Timing Utilities**: High-precision timing measurements
- [x] **Enhanced Template System**: 7 comprehensive templates
- [x] **CashApp Scaling Pipeline**: Complete account provisioning system
- [x] **Unified Profile Management**: Proxy-phone combination system

### v2.0 Features

- [ ] Enhanced analytics dashboard
- [ ] Mobile app companion
- [ ] Advanced automation rules
- [ ] Multi-region deployment
- [ ] Enterprise SSO integration

### v1.5 Features

- [ ] Custom template builder
- [ ] Advanced scheduling
- [ ] API rate limiting
- [ ] Performance optimization

---

**Built with ❤️ for the proxy management community**
