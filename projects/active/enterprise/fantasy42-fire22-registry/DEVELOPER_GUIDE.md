# 🚀 Crystal Clear Architecture - Developer Guide

<div align="center">

![Crystal Clear Architecture](https://img.shields.io/badge/Architecture-Domain--Driven-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge)
![Bun](https://img.shields.io/badge/Bun-1.0+-yellow?style=for-the-badge)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge)

**Enterprise-Grade Domain-Driven Dashboard System**

[📖 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start) •
[🔐 Security Setup](#-security-setup) •
[🛠️ Development Workflow](#️-development-workflow)

</div>

---

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [🚀 Quick Start](#-quick-start)
- [🔐 Security Setup](#-security-setup)
- [🛠️ Development Workflow](#️-development-workflow)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [🚀 Deployment](#-deployment)
- [🧪 Testing](#-testing)
- [🔒 Security Best Practices](#-security-best-practices)
- [📚 Resources](#-resources)

---

## 🎯 Overview

Welcome to **Crystal Clear Architecture** - an enterprise-grade domain-driven
dashboard system built with modern technologies and best practices.

### **🏗️ Key Technologies**

- **Runtime**: Bun 1.0+ (High-performance JavaScript runtime)
- **Language**: TypeScript 5.0+ (Type-safe development)
- **Platform**: Cloudflare Workers (Global edge deployment)
- **Database**: PostgreSQL with Drizzle ORM
- **Security**: Bun.secrets (OS-native credential management)
- **Architecture**: Domain-Driven Design (DDD)

### **🎯 What You'll Build**

- **Real-time KPI Dashboards** with Server-Sent Events
- **Multi-tenant Analytics Platform** with custom visualizations
- **Enterprise Security Framework** with JWT and role-based access
- **Global CDN Deployment** with Cloudflare edge network

---

## 🚀 Quick Start

### **1. Prerequisites**

```bash
# Install Bun runtime
curl -fsSL https://bun.sh/install | bash

# Install Git
# macOS: brew install git
# Ubuntu: sudo apt-get install git
# Windows: Download from https://git-scm.com/

# Clone the repository
git clone https://github.com/your-org/crystal-clear-architecture.git
cd crystal-clear-architecture
```

### **2. Environment Setup**

```bash
# Install dependencies
bun install

# Set up security (see Security Setup section below)
bun run registry:setup

# Start development server
bun run dev
```

### **3. Verify Installation**

```bash
# Check system status
curl http://localhost:3000/api/health

# Run tests
bun test

# Build for production
bun run build
```

---

## 🔐 Security Setup

This project uses **Bun.secrets** for secure credential management. All
sensitive data is stored in your operating system's native credential storage.

### **1. Initialize Security**

```bash
# Set up your development credentials
bun run registry:setup

# This will guide you through:
# - Setting up API keys
# - Configuring database credentials
# - Setting up Cloudflare tokens
# - Configuring private registry access
```

### **2. Store Development Secrets**

```javascript
import { secrets } from 'bun';

// Store your development credentials
await secrets.set({
  service: 'fire22-dev',
  name: 'database-url',
  value: 'postgresql://user:pass@localhost:5432/fire22_dev',
});

await secrets.set({
  service: 'fire22-dev',
  name: 'api-key',
  value: 'your-development-api-key',
});
```

### **3. Access Stored Secrets**

```javascript
// Retrieve secrets in your application
const dbUrl = await secrets.get({
  service: 'fire22-dev',
  name: 'database-url',
});

const apiKey = await secrets.get({
  service: 'fire22-dev',
  name: 'api-key',
});
```

### **4. Environment-Specific Secrets**

```javascript
class EnvironmentSecrets {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.service = `fire22-${this.env}`;
  }

  async set(key, value) {
    await secrets.set({
      service: this.service,
      name: key,
      value,
    });
  }

  async get(key) {
    return await secrets.get({
      service: this.service,
      name: key,
    });
  }
}

// Usage
const envSecrets = new EnvironmentSecrets();
await envSecrets.set('API_KEY', 'your-api-key');
```

### **5. Security Best Practices**

```javascript
// ✅ Good: Use service namespacing
const service = 'com.fire22.dashboard';

// ✅ Good: Include environment in service name
const service = 'com.fire22.dashboard-production';

// ✅ Good: Error handling for secrets
async function safeGetSecret(service, name) {
  try {
    const value = await secrets.get({ service, name });
    if (!value) {
      console.warn(`Secret ${name} not found`);
      return null;
    }
    return value;
  } catch (error) {
    console.error(`Failed to retrieve secret: ${error.message}`);
    return null;
  }
}

// ❌ Bad: Generic service names
const service = 'my-app'; // Too generic

// ❌ Bad: No error handling
const value = await secrets.get({ service, name }); // May throw
```

---

## 🛠️ Development Workflow

### **1. Daily Development**

```bash
# Start development server with hot reload
bun run dev

# Run tests in watch mode
bun run test:watch

# Check code quality
bun run lint
bun run format

# Build and preview
bun run build
bun run preview
```

### **2. Feature Development**

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes
# Write tests
# Update documentation

# Commit with conventional commits
git commit -m "feat: add new dashboard widget"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
```

### **3. Code Quality**

```bash
# Run all quality checks
bun run quality

# Format code
bun run format

# Lint code
bun run lint

# Type check
bun run type-check
```

### **4. Testing Strategy**

```bash
# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# End-to-end tests
bun run test:e2e

# Performance tests
bun run test:performance

# Security tests
bun run test:security
```

---

## 📁 Project Structure

```text
crystal-clear-architecture/
├── 📁 src/                          # Source code
│   ├── 📁 domains/                  # Business domains (DDD)
│   │   ├── 📁 finance/             # Financial domain
│   │   ├── 📁 betting/             # Betting domain
│   │   ├── 📁 user/                # User management
│   │   └── 📁 analytics/           # Analytics domain
│   ├── 📁 shared/                  # Shared utilities
│   ├── 📁 interfaces/              # Type definitions
│   └── 📁 services/                # Business services
├── 📁 scripts/                      # Build and utility scripts
├── 📁 tests/                        # Test files
├── 📁 docs/                         # Documentation
├── 📁 dashboard-worker/             # Cloudflare Worker
├── 📁 config/                       # Configuration files
├── 📄 bunfig.toml                   # Bun configuration
├── 📄 package.json                  # Dependencies and scripts
└── 📄 tsconfig.json                 # TypeScript configuration
```

### **🏗️ Architecture Overview**

- **Domain Layer**: Business logic organized by domain
- **Service Layer**: Application services and workflows
- **API Layer**: REST endpoints and GraphQL resolvers
- **Infrastructure Layer**: Database, cache, external services

---

## 🔧 Configuration

### **1. Environment Variables**

```bash
# Application
NODE_ENV=development
FIRE22_ENV=enterprise

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# External Services
API_BASE_URL=https://api.fire22.com
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### **2. Bun Configuration**

```toml
# bunfig.toml
[install]
registry = "https://registry.npmjs.org"

[install.scopes]
"@fire22" = { url = "https://registry.fire22.com", token = "$FIRE22_REGISTRY_TOKEN" }

[test]
coverage = true
coverageReporter = ["text", "html"]

[define]
"process.env.NODE_ENV" = "'development'"
```

### **3. TypeScript Configuration**

```json
{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "strict": true,
    "types": ["@types/bun"]
  }
}
```

---

## 🚀 Deployment

### **1. Cloudflare Workers**

```bash
# Deploy to Cloudflare
cd dashboard-worker
bun run build
wrangler deploy

# Deploy with environment
wrangler deploy --env production
```

### **2. Environment-Specific Deployment**

```bash
# Development
bun run deploy:dev

# Staging
bun run deploy:staging

# Production
bun run deploy:prod
```

### **3. CI/CD Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run deploy
```

---

## 🧪 Testing

### **1. Test Structure**

```text
tests/
├── unit/                    # Unit tests
├── integration/            # Integration tests
├── e2e/                    # End-to-end tests
└── fixtures/              # Test data
```

### **2. Writing Tests**

```javascript
import { test, expect } from 'bun:test';
import { UserService } from '../src/services/UserService';

test('UserService.createUser', async () => {
  const userService = new UserService();

  const user = await userService.createUser({
    email: 'test@example.com',
    name: 'Test User',
  });

  expect(user.id).toBeDefined();
  expect(user.email).toBe('test@example.com');
  expect(user.createdAt).toBeInstanceOf(Date);
});
```

### **3. Test Coverage**

```bash
# Run tests with coverage
bun test --coverage

# View coverage report
open coverage/index.html
```

---

## 🔒 Security Best Practices

### **1. Credential Management**

```javascript
// ✅ Use Bun.secrets for all sensitive data
await secrets.set({
  service: 'fire22-production',
  name: 'database-password',
  value: 'your-secure-password',
});

// ❌ Never hardcode credentials
const password = 'hardcoded-password'; // BAD!
```

### **2. Input Validation**

```javascript
// ✅ Validate all inputs
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return email;
}

// ✅ Sanitize database inputs
const cleanInput = sanitizeSqlInput(userInput);
```

### **3. Authentication & Authorization**

```javascript
// ✅ Use JWT with proper expiration
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// ✅ Implement role-based access control
if (!user.hasPermission('admin')) {
  throw new Error('Insufficient permissions');
}
```

### **4. Data Encryption**

```javascript
// ✅ Encrypt sensitive data at rest
const encrypted = await Bun.password.hash(data, {
  algorithm: 'argon2id',
});

// ✅ Use HTTPS for all external communications
const response = await fetch('https://secure-api.com/data', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### **5. Audit Logging**

```javascript
// ✅ Log all security events
await auditService.logEvent({
  event: 'user_login',
  userId: user.id,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date(),
});
```

---

## 📚 Resources

### **📖 Documentation**

- [Bun Runtime Documentation](https://bun.sh/docs)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### **🔧 Tools & Utilities**

- [Bun Secrets Manager](./docs/bun-secrets-manager.md)
- [Health Check API](./docs/HEALTH-CHECK-API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)

### **🎯 Best Practices**

- [Domain-Driven Design](https://domainlanguage.com/ddd/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Twelve-Factor App](https://12factor.net/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

### **📞 Support**

- **Internal Wiki**: Company internal documentation
- **Team Chat**: Slack/Discord for quick questions
- **Code Reviews**: GitHub pull request reviews
- **Architecture Decisions**: ADRs (Architecture Decision Records)

---

## 🎯 Getting Help

### **🐛 Issues & Bugs**

```bash
# Report bugs with detailed information
bun run issue:report

# Include:
# - Bun version: bun --version
# - OS and version
# - Steps to reproduce
# - Expected vs actual behavior
# - Error logs
```

### **💡 Feature Requests**

```bash
# Submit feature requests
bun run feature:request

# Include:
# - Use case and business value
# - Technical requirements
# - Mockups or examples
# - Acceptance criteria
```

### **📚 Learning Resources**

- **Weekly Tech Talks**: Join our internal tech talks
- **Code Reviews**: Learn from peer reviews
- **Architecture Reviews**: Understand system design decisions
- **Documentation Updates**: Contribute to internal docs

---

## 🚀 Contributing

### **1. Development Process**

1. **Choose an issue** from the project board
2. **Create a feature branch** from `main`
3. **Write tests** for your changes
4. **Implement the feature** following our patterns
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

### **2. Code Standards**

```javascript
// ✅ Follow these patterns
class UserService {
  async createUser(userData) {
    // Validate input
    this.validateUserData(userData);

    // Create user
    const user = await this.userRepository.create(userData);

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email);

    return user;
  }
}

// ✅ Use TypeScript interfaces
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// ✅ Write comprehensive tests
test('UserService.createUser creates user successfully', async () => {
  // Arrange
  const userData = { email: 'test@example.com', name: 'Test User' };

  // Act
  const user = await userService.createUser(userData);

  // Assert
  expect(user.id).toBeDefined();
  expect(user.email).toBe(userData.email);
});
```

### **3. Commit Convention**

```bash
# Format: type(scope): description
git commit -m "feat(auth): add JWT token refresh"

# Types: feat, fix, docs, style, refactor, test, chore
# Scopes: auth, api, db, ui, etc.
```

---

<div align="center">

**🎉 Welcome to Crystal Clear Architecture!**

_Built with ❤️ using Domain-Driven Design, TypeScript, and Bun Runtime_

---

**Ready to start building?** Check out our [Quick Start](#-quick-start) guide!

**Need help?** Join our team chat or create an issue.

**Happy coding! 🚀**

</div>
