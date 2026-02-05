# 🚀 Geelark Development Environment Setup Guide

Welcome to the Geelark feature flag security model development environment! This guide will help you set up a complete, production-ready development environment with all the tools you need.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **Visual Studio Code** (latest)
- **Git** (latest)
- **Bun** (optional, for local development)

## 🐳 Quick Start with DevContainer

The easiest way to get started is using the DevContainer configuration:

### Option 1: Using VS Code Dev Containers

1. **Open the project** in VS Code:
   ```bash
   code /path/to/geelark
   ```

2. **Install the Remote - Containers extension** if not already installed.

3. **Open Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`):
   - Type "Dev Containers: Reopen in Container"
   - Select the option

4. **Wait for the container to build** (first time may take 5-10 minutes).

5. **Start development** - the container will automatically:
   - Install all dependencies
   - Build the project
   - Set up security scanning tools
   - Configure git hooks

### Option 2: Using Docker CLI

1. **Build the container**:
   ```bash
   docker build -f .devcontainer/Dockerfile -t geelark-dev .
   ```

2. **Run the container**:
   ```bash
   docker run -it --rm \
     -v $(pwd):/workspace \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -p 3000:3000 \
     -p 8080:8080 \
     -p 9229:9229 \
     geelark-dev
   ```

3. **Access the shell**:
   ```bash
   docker exec -it <container-id> bash
   ```

## 🔧 Local Development Setup

If you prefer working locally without containers:

### 1. Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (with WSL)
wsl curl -fsSL https://bun.sh/install | bash
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd geelark

# Install dependencies
bun install

# Build development version
bun run build:dev

# Run tests
bun test
```

### 3. Install Development Tools

```bash
# Security scanning tools
npm install -g snyk
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
pip3 install bandit safety

# Development utilities
npm install -g typescript ts-node @types/node
bun add -g bun-types @types/bun
```

## 📁 Project Structure

```
.geelark-dev/
├── .devcontainer/          # Development container configuration
├── .github/workflows/      # CI/CD pipelines
├── .gitlab/               # GitLab CI configuration
├── scripts/               # Automation scripts
├── config/                # Configuration files
├── docs/                  # Documentation
└── monitoring/            # Monitoring and observability
```

## 🛠️ Available Commands

### Development Commands

```bash
# Build configurations
bun run build:dev          # Development build
bun run build:prod-lite    # Production lite
bun run build:prod-standard # Production standard
bun run build:prod-premium # Production premium
bun run build:test         # Test build
bun run build:audit        # Audit build

# Application commands
bun run start:dev          # Start development server
bun run status             # Show system status
bun run dashboard          # Open monitoring dashboard
bun run logs               # View system logs
bun run health             # Check system health
bun run flags              # Manage feature flags
bun run audit              # Run security audit
```

### Testing Commands

```bash
# Run all tests
bun test

# Specific test suites
bun run test:elimination   # Feature elimination tests
bun test tests/security.test.ts # Security tests
bun test tests/feature-elimination.test.ts # Feature flag tests
bun test bench/            # Performance benchmarks

# Test with coverage
bun test --coverage

# Watch mode
bun run test:watch
```

### Security Scanning

```bash
# Run all security scans
./scripts/security-scan.sh

# Individual scanners
snyk test --severity-threshold=high
trivy fs .
bandit -r . -ll
bun audit
```

### Dev HQ Automation

```bash
# Start automation server
bun run dev-hq server

# Run commands
bun run dev-hq run "ls -la" --json
bun run dev-hq git --table
bun run dev-hq cloc --metrics
bun run dev-hq health --json
```

## 🔒 Security Configuration

### Git Hooks

Pre-configured git hooks are automatically installed:

- **pre-commit**: Runs security scans before committing
- **pre-push**: Runs comprehensive tests before pushing

### Environment Variables

Create a `.env.local` file:

```bash
# Environment
NODE_ENV=development
BUN_ENV=development

# Security
ENCRYPTION_KEY=your-256-bit-key-here
VALIDATION_MODE=strict
AUDIT_TRAIL_ENABLED=true

# API Keys (if needed)
GEELARK_API_KEY=your_api_key
PROXY_SERVICE_URL=http://proxy.company.com

# Logging
LOG_LEVEL=INFO
LOG_RETENTION_DAYS=30
EXTERNAL_LOGGING_ENABLED=false
```

### Security Scanning Tools

The environment includes:

- **Snyk**: Vulnerability scanning
- **Trivy**: Container security scanning
- **Bandit**: Python security scanning
- **TruffleHog**: Secret detection
- **Dependency Audit**: Package vulnerability checking

## 📊 CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `feature-flag-test.yml` | Feature flag testing | Push, PR |
| `security-scan.yml` | Security scanning | Weekly, Push, PR |
| `deploy.yml` | Deployment | Push to main, Tags |

### GitLab CI Alternative

A GitLab CI configuration is also provided in `.gitlab/gitlab-ci.yml`.

## 🐳 Container Development

### Building Images

```bash
# Development image
docker build -f .devcontainer/Dockerfile -t geelark-dev .

# Production image (example)
docker build -f Dockerfile.prod -t geelark-prod .
```

### Running Services

```bash
# Start all services
docker-compose -f .devcontainer/docker-compose.yml up

# Start specific services
docker-compose -f .devcontainer/docker-compose.yml up dev-hq
```

## 🚨 Troubleshooting

### Common Issues

**1. DevContainer fails to build**
```bash
# Check Docker logs
docker logs <container-id>

# Rebuild from scratch
docker build --no-cache -f .devcontainer/Dockerfile -t geelark-dev .
```

**2. Security scans failing**
```bash
# Update security tools
snyk update
trivy --download-db-only

# Run with verbose output
./scripts/security-scan.sh --verbose
```

**3. Feature flag tests failing**
```bash
# Clean build
rm -rf dist/
bun run build:dev

# Run specific test
bun test tests/feature-elimination.test.ts --verbose
```

**4. Port conflicts**
```bash
# Check used ports
lsof -i :3000
lsof -i :8080

# Change ports in .devcontainer/devcontainer.json
```

### Getting Help

- Check the `docs/` directory for more documentation
- Review existing test files for examples
- Use the `bun run` command to see all available scripts
- Check package.json for script definitions

## 📈 Monitoring and Observability

### Development Dashboard

Access the dashboard at `http://localhost:3000/dashboard` when running:

```bash
bun run dashboard
```

### Metrics Collection

Metrics are collected automatically and can be viewed:

```bash
# View metrics
bun run dev-hq metrics --json

# Export metrics
bun run dev-hq metrics --json > metrics.json
```

### Health Checks

```bash
# Run health check
bun run health

# Detailed health check
bun run health --detailed
```

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Update all dependencies
bun update

# Security audit
bun audit

# Check for outdated packages
bun outdated
```

### Updating Security Tools

```bash
# Update Snyk
npm update -g snyk

# Update Trivy
trivy --download-db-only

# Update Bandit
pip3 install --upgrade bandit
```

### Updating Documentation

```bash
# Regenerate meta.json
bun run generate:meta

# Validate configuration
bun run validate:meta
```

## 🎯 Next Steps

1. **Explore the codebase**: Start with `src/` directory
2. **Run tests**: Ensure everything works
3. **Set up your IDE**: Configure VS Code with recommended extensions
4. **Configure CI/CD**: Set up GitHub/GitLab secrets
5. **Join the team**: Connect with other developers

## 🤝 Contributing

See `CONTRIBUTING.md` for contribution guidelines.

## 🆘 Support

- **Documentation**: `docs/` directory
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Team Chat**: Slack/Teams channel

---

**Happy coding! 🚀**
