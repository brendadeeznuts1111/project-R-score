# 📚 Documentation Index

Complete guide to all documentation in the Nebula-Flow™ DuoPlus project.

## 🚀 Getting Started

- **[README.md](../README.md)** - Main project overview and quick start
- **[Getting Started Guide](README.md)** - Detailed setup instructions and core features
- **[Quick Start](../scripts/docs/QUICK_START.txt)** - Fast setup for experienced developers

## 📖 Core Documentation

- **[Project Structure](PROJECT_STRUCTURE.md)** - Complete directory organization and file layout
- **[Versioning](VERSIONING.md)** - Version management system and release process
- **[Scripts Guide](../scripts/INDEX.md)** - Build and deployment scripts reference

## 🔧 Setup & Installation

- **[Installation Guide](../scripts/docs/INSTALLATION_GUIDE.md)** - Detailed installation steps
- **[Environment Template](../scripts/docs/ENVIRONMENT_TEMPLATE.md)** - Environment variables reference
- **[LND Setup](../scripts/setup/setup-lnd.sh)** - Lightning Network Daemon configuration

## 🏗️ Architecture & Design

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture and design patterns
- **[Contributing Guide](../CONTRIBUTING.md)** - Contribution guidelines and development workflow

## 💡 Features & Components

### Lightning Network
- BOLT-11 invoice generation
- LND REST API integration
- Channel management and rebalancing
- Deterministic preimages

### Compliance & Security
- KYC validation and limits
- FinCEN CTR and recordkeeping
- OFAC sanctions checking
- Risk tier management
- Velocity monitoring

### Device Management (Atlas)
- Device inventory tracking
- Lifecycle management
- Fleet operations
- Automated provisioning

### Financial Services
- Yield optimization
- Savings routing
- Cash App Green integration
- Interest calculations

### Web Dashboard
- Real-time metrics
- Device management interface
- Lightning Network monitoring
- CSV import/export
- Live profit ticker

## 📊 API Reference

See [Getting Started Guide](README.md#-api-endpoints) for complete API endpoint documentation.

## 🧪 Testing

- Run tests: `bun test tests/`
- Test files: `tests/lightning.integration.test.ts`, `tests/test-duoplus.ts`
- Coverage: `bun run clean && bun test tests/`

## 🎯 Deployment

- **[Deployment Phases](../scripts/deployment/)** - 12-phase deployment automation
- **[Completion Summary](../scripts/COMPLETION_SUMMARY.txt)** - Deployment verification checklist

## 📝 Logs & Monitoring

Application logs are stored in:
- `./logs/lightning-audit.jsonl` - Invoice generation audit trail
- `./logs/compliance-review-queue.jsonl` - Manual compliance reviews
- `./logs/yield-generation.jsonl` - Yield tracking and calculations

## 🔗 External Resources

- [LND API Documentation](https://api.lightning.community/)
- [BOLT-11 Invoice Spec](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
- [FinCEN Guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincen-regulations-persons-administering)
- [Bun Runtime](https://bun.sh/)

## 📞 Support

For issues or questions:
1. Check the relevant documentation section above
2. Review [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
3. Open an issue on GitHub

---

**Last Updated:** 2026-01-21  
**Version:** 3.5.0

