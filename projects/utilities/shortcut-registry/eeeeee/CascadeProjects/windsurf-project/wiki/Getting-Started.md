# 🚀 Getting Started with Sovereign Unit \[01\]

## 📋 Overview

This guide will help you get the **Sovereign Unit \[01\]** Financial Warming Multiverse up and running on your local machine. You'll learn how to set up the development environment, configure the system, and start building with our powerful APIs.

## 🎯 Prerequisites

### **System Requirements**
- **Operating System**: macOS 10.15+, Ubuntu 18.04+, or Windows 10+
- **Node.js**: Not required (uses Bun runtime)
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 10GB free disk space
- **Network**: Internet connection for external API integration

### **Required Software**
- **Bun 1.3.6+**: High-performance JavaScript runtime
- **Git**: Version control system
- **Docker**: Optional, for containerized deployment
- **VS Code**: Recommended IDE with extensions

## 🛠️ Installation

### **1. Install Bun**

```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Or using npm
npm install -g bun

# Verify installation
bun --version
# Should show 1.3.6 or higher
```

### **2. Clone the Repository**

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/nolarose-windsurf-project.git
cd nolarose-windsurf-project

# Verify the project structure
ls -la
```

### **3. Install Dependencies**

```bash
# Install all dependencies
bun install

# Verify installation
bun run --help
```

## ⚙️ Configuration

### **1. Environment Setup**

```bash
# Copy the example configuration
cp .env.example .env

# Open the configuration file
nano .env  # or use your preferred editor
```

### **2. Basic Configuration**

Edit `.env` with the following essential settings:

```bash
# Core Server Configuration
DUOPLUS_ADMIN_PORT=3227
DUOPLUS_API_HOST=localhost
DUOPLUS_DB_PATH=./data/duoplus.db

# Security Configuration
DUOPLUS_JWT_SECRET=your-super-secret-jwt-key-256-bits
DUOPLUS_JWT_EXPIRY=3600
DUOPLUS_ADMIN_SESSION_TIMEOUT=3600

# Feature Flags
DUOPLUS_ENABLE_AI_RISK_PREDICTION=true
DUOPLUS_ENABLE_FAMILY_CONTROLS=true
DUOPLUS_ENABLE_CASH_APP_PRIORITY=true

# Development Settings
DUOPLUS_DEBUG=true
DUOPLUS_LOG_LEVEL=debug
NODE_ENV=development
```

### **3. Validate Configuration**

```bash
# Validate your configuration
bun run config:validate

# Check for any errors or warnings
bun run config:check
```

## 🚀 Running the Application

### **1. Development Mode**

```bash
# Start the development server
bun run dev

# You should see output like:
# 🚀 Sovereign Unit [01] Server starting...
# 📡 API Server: http://localhost:3227
# 🧠 AI Engine: Initialized
# 🕸️ Guardian Networks: Ready
# 💚 Cash App Priority: Connected
```

### **2. Verify Installation**

```bash
# Check the health endpoint
curl http://localhost:3227/api/health

# Expected response:
# {"status": "healthy", "version": "2.1.0", "uptime": 123}
```

### **3. Explore the API**

```bash
# Check available endpoints
curl http://localhost:3227/api/config/features

# Test AI risk scoring
curl -X POST http://localhost:3227/api/risk/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "features": {
      "vpn_active": 0,
      "thermal_spike": 12.5
    }
  }'
```

## 🧪 Testing Your Setup

### **1. Run the Test Suite**

```bash
# Run all tests
bun run test

# Run tests with coverage
bun run test:coverage

# Run specific test files
bun run test tests/api.test.ts
```

### **2. Test Individual Components**

```bash
# Test configuration
bun run config:test

# Test database connection
bun run db:test

# Test external services
bun run external:test
```

### **3. Performance Testing**

```bash
# Run basic performance tests
bun run perf:test

# Load testing (optional)
bun run load:test
```

## 📊 Development Workflow

### **1. Code Structure**

```
src/
├── admin/           # Admin panel and configuration
├── api/             # API routes and handlers
├── ai/              # AI and ML components
├── config/          # Configuration management
├── db/              # Database layer
├── security/        # Security and authentication
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

### **2. Making Changes**

```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... edit files ...

# Run tests to ensure everything works
bun run test

# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push to GitHub
git push origin feature/your-feature-name
```

### **3. Hot Reload**

The development server supports hot reload for most changes:

- **Configuration**: Reload automatically when `.env` changes
- **TypeScript**: Recompiled automatically
- **API Routes**: Reloaded without server restart
- **Static Files**: Served with cache-busting

## 🔧 Common Development Tasks

### **1. Adding New API Endpoints**

```typescript
// src/api/new-endpoint.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const requestSchema = z.object({
  data: z.string(),
});

app.post('/api/new-endpoint', zValidator('json', requestSchema), async (c) => {
  const { data } = c.req.valid('json');
  
  // Your logic here
  return c.json({ success: true, processed: data });
});

export default app;
```

### **2. Adding Configuration Options**

```typescript
// src/config/environment.ts
export interface Config {
  // Existing config...
  NEW_FEATURE_ENABLED: boolean;
  NEW_FEATURE_SETTING: string;
}

// Add to .env
NEW_FEATURE_ENABLED=true
NEW_FEATURE_SETTING=default_value
```

### **3. Testing New Features**

```typescript
// tests/new-feature.test.ts
import { describe, it, expect } from 'bun:test';
import { app } from '../src/api/new-endpoint';

describe('New Feature', () => {
  it('should process data correctly', async () => {
    const response = await app.request('/api/new-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});
```

## 🛠️ Development Tools

### **1. VS Code Extensions**

Install these recommended extensions:

- **Bun**: Official Bun support
- **TypeScript Importer**: Auto-import TypeScript modules
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **GitLens**: Enhanced Git capabilities

### **2. Debugging**

```bash
# Enable debug mode
DUOPLUS_DEBUG=true bun run dev

# Use Node.js debugger
bun --debug run dev

# Or use VS Code debugger
# Create .vscode/launch.json
```

### **3. Performance Monitoring**

```bash
# Enable performance monitoring
DUOPLUS_ENABLE_PERFORMANCE_MONITORING=true bun run dev

# View performance metrics
curl http://localhost:3227/api/metrics
```

## 🔍 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Find what's using the port
lsof -i :3227

# Kill the process
kill -9 <PID>

# Or use a different port
DUOPLUS_ADMIN_PORT=3228 bun run dev
```

#### **Database Connection Issues**
```bash
# Check database path
ls -la ./data/

# Recreate database
rm ./data/duoplus.db
bun run db:migrate
```

#### **Missing Dependencies**
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

#### **Configuration Errors**
```bash
# Validate configuration
bun run config:validate --detailed

# Reset to defaults
cp .env.example .env
```

### **Getting Help**

1. **Check the logs**: Look for error messages in the console
2. **Validate configuration**: Run `bun run config:validate`
3. **Check dependencies**: Ensure all required services are running
4. **Consult documentation**: Check the [API Documentation](API-Documentation)
5. **Ask the community**: Join our [Slack channel](https://slack.sovereign-unit-01.com)

## 📚 Next Steps

### **Learning Resources**

- [📖 API Documentation](API-Documentation) - Complete API reference
- [⚙️ Configuration Guide](Configuration-Guide) - Advanced configuration
- [🔒 Security Guide](Security-Guide) - Security best practices
- [🆘 Troubleshooting](Troubleshooting) - Common issues and solutions

### **Development Paths**

1. **API Development**: Build new endpoints and features
2. **AI/ML Integration**: Enhance risk prediction models
3. **Security Enhancement**: Improve authentication and authorization
4. **Performance Optimization**: Optimize database queries and caching
5. **UI Development**: Create admin panels and dashboards

### **Contributing**

Ready to contribute to the project?

- 🎯 [Contributing Guide](Contributing-Guide) - How to contribute
- 🏗️ [Development Workflow](Contributing-Guide#development-workflow) - Development processes
- 📋 [Code Standards](Contributing-Guide#code-standards) - Coding conventions

---

## 🎉 You're Ready!

Congratulations! You now have the **Sovereign Unit \[01\]** Financial Warming Multiverse running locally. Here's what you can do next:

1. **Explore the API**: Visit http://localhost:3227/api/health
2. **Run the tests**: `bun run test`
3. **Read the documentation**: Explore the wiki
4. **Join the community**: Connect with other developers
5. **Start building**: Create your first feature

**Happy coding!** 🚀

---

**Need help?** 
- 📚 [Documentation](Home)
- 💬 [Community Slack](https://slack.sovereign-unit-01.com)
- 🐛 [GitHub Issues](https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues)
- 📧 [Support](mailto:support@sovereign-unit-01.com)
