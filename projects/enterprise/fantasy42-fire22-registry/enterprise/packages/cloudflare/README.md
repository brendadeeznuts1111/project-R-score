# ☁️ Fantasy42-Fire22 Cloudflare Infrastructure

<div align="center">

**Enterprise Cloudflare Workers & Pages Infrastructure**

[![Fantasy42](https://img.shields.io/badge/Fantasy42-Enterprise-red?style=for-the-badge)](https://fantasy42.com)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge)](https://workers.cloudflare.com)

_Complete Cloudflare infrastructure with easy CLI tools_

</div>

---

## 📋 **Overview**

This directory contains the complete Cloudflare infrastructure for the
Fantasy42-Fire22 enterprise registry, including:

- **Cloudflare Workers** - Serverless API endpoints
- **D1 Database** - SQLite database with edge replication
- **KV Storage** - High-performance key-value storage
- **R2 Storage** - S3-compatible object storage
- **Queues** - Message queuing for background processing
- **Analytics** - Real-time analytics and monitoring

---

## 🚀 **Quick Start**

### **Prerequisites**

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate with Cloudflare
wrangler auth login
```

### **One-Command Setup**

```bash
# Setup all environments (development, staging, production)
bun run wrangler:setup

# Or setup specific environment
bun run wrangler:setup:dev
bun run wrangler:setup:staging
bun run wrangler:setup:prod
```

### **Development Workflow**

```bash
# Start development server
bun run wrangler:dev

# Check infrastructure status
bun run wrangler:status

# View worker logs
bun run wrangler:tail

# Check health status
bun run wrangler:health
```

---

## 🏗️ **Architecture**

### **Environment Structure**

```
development (dev.apexodds.net)
├── Worker: fantasy42-fire22-dev
├── D1: fantasy42-registry-dev
├── KV: CACHE-dev
├── R2: fantasy42-packages-dev
└── Queue: registry-events-dev

staging (staging.apexodds.net)
├── Worker: fantasy42-fire22-staging
├── D1: fantasy42-registry-staging
├── KV: CACHE-staging
├── R2: fantasy42-packages-staging
└── Queue: registry-events-staging

production (api.apexodds.net)
├── Worker: fantasy42-fire22-prod
├── D1: fantasy42-registry-prod
├── KV: CACHE-prod
├── R2: fantasy42-packages-prod
└── Queue: registry-events-prod
```

### **API Endpoints**

- `GET /health` - Health check endpoint
- `GET /packages` - List all packages
- `GET /packages/:name` - Get package details
- `GET /analytics` - View analytics data
- `GET /search?q=query` - Search packages

---

## 🛠️ **CLI Tools**

### **Development & Testing**

```bash
# Start development server
bun run wrangler:dev
bun run wrangler:dev:staging
bun run wrangler:dev:prod

# Check authentication
bun run wrangler:auth

# Check infrastructure status
bun run wrangler:status

# Health checks
bun run wrangler:health
bun run wrangler:health:staging
bun run wrangler:health:prod

# Tail logs
bun run wrangler:tail
bun run wrangler:tail:staging
bun run wrangler:tail:prod
```

### **Database Management**

```bash
# Create database
bun run wrangler:db:create
bun run wrangler:db:create staging
bun run wrangler:db:create production

# Create migrations
bun run wrangler:db:migrate add_user_table

# Apply migrations
bun run wrangler:db:apply
bun run wrangler:db:apply staging
bun run wrangler:db:apply production

# Seed database
bun run wrangler:db:seed
bun run wrangler:db:seed staging
bun run wrangler:db:seed production

# Database statistics
bun run wrangler:db:stats
bun run wrangler:db:stats staging
bun run wrangler:db:stats production

# Create backup
bun run wrangler:db:backup
bun run wrangler:db:backup staging
bun run wrangler:db:backup production
```

### **Deployment & Management**

```bash
# Deploy to environments
bun run wrangler:deploy        # Deploy to development
bun run wrangler:deploy:staging # Deploy to staging
bun run wrangler:deploy:prod   # Deploy to production

# Promote staging to production
bun run wrangler:promote
```

### **Infrastructure Setup**

```bash
# One-command setup for all environments
bun run wrangler:setup

# Setup specific environments
bun run wrangler:setup:dev
bun run wrangler:setup:staging
bun run wrangler:setup:prod

# Check current status
bun run wrangler:status
```

---

## 📊 **Database Schema**

### **Packages Table**

```sql
CREATE TABLE packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  description TEXT,
  author TEXT,
  license TEXT,
  repository TEXT,
  homepage TEXT,
  keywords TEXT,
  downloads INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Package Versions Table**

```sql
CREATE TABLE package_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  size INTEGER,
  integrity TEXT,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_name) REFERENCES packages(name)
);
```

### **Users Table**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 **Configuration**

### **Environment Variables**

Create `.env` files for each environment:

```bash
# .env.development
REGISTRY_DB_ID=your-dev-db-id
CACHE_KV_ID=your-dev-kv-id
CACHE_KV_PREVIEW_ID=your-dev-kv-preview-id

# .env.staging
REGISTRY_DB_ID=your-staging-db-id
CACHE_KV_ID=your-staging-kv-id
CACHE_KV_PREVIEW_ID=your-staging-kv-preview-id

# .env.production
REGISTRY_DB_ID=your-prod-db-id
CACHE_KV_ID=your-prod-kv-id
CACHE_KV_PREVIEW_ID=your-prod-kv-preview-id
```

### **Wrangler Configuration**

The `wrangler.toml` file contains all environment-specific configurations:

- **Development**: `dev.apexodds.net`
- **Staging**: `staging.apexodds.net`
- **Production**: `api.apexodds.net`

---

## 🚀 **Deployment Workflow**

### **Development Deployment**

```bash
# 1. Make changes to src/index.ts
# 2. Test locally
bun run wrangler:dev

# 3. Deploy to development
bun run wrangler:deploy

# 4. Check health
bun run wrangler:health
```

### **Production Deployment**

```bash
# 1. Deploy to staging first
bun run wrangler:deploy:staging

# 2. Test staging
bun run wrangler:health:staging

# 3. Promote to production
bun run wrangler:promote

# 4. Verify production
bun run wrangler:health:prod
```

---

## 📈 **Monitoring & Analytics**

### **Health Monitoring**

```bash
# Check all environments
bun run wrangler:health
bun run wrangler:health:staging
bun run wrangler:health:prod
```

### **Log Monitoring**

```bash
# Tail logs in real-time
bun run wrangler:tail
bun run wrangler:tail:staging
bun run wrangler:tail:prod
```

### **Performance Analytics**

- **Analytics Engine**: Real-time performance metrics
- **Request/Response Times**: Automatic tracking
- **Error Rates**: Automated error monitoring
- **Geographic Distribution**: Request origin analysis

---

## 🔒 **Security & Compliance**

### **Security Features**

- **Rate Limiting**: 100 requests per 60 seconds
- **CORS Protection**: Configured for apexodds.net domains
- **Security Headers**: XSS, CSRF, and content-type protection
- **Authentication**: JWT-based authentication support
- **Audit Logging**: All API requests logged

### **Compliance**

- **GDPR**: Data protection compliance
- **HIPAA**: Healthcare data protection
- **PCI DSS**: Payment card industry compliance
- **SOC 2**: Security and availability controls

---

## 🧪 **Testing**

### **Local Testing**

```bash
# Start development server
bun run wrangler:dev

# Test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/packages
```

### **Integration Testing**

```bash
# Test against deployed environments
curl https://dev.apexodds.net/health
curl https://staging.apexodds.net/packages
curl https://api.apexodds.net/search?q=lodash
```

---

## 📚 **API Documentation**

### **Base URLs**

- **Development**: `https://dev.apexodds.net`
- **Staging**: `https://staging.apexodds.net`
- **Production**: `https://api.apexodds.net`

### **Response Format**

All endpoints return JSON with consistent structure:

```json
{
  "status": "success|error",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Authentication Problems**

```bash
# Check authentication
bun run wrangler:auth

# Re-authenticate
wrangler auth login
```

#### **Deployment Failures**

```bash
# Check status
bun run wrangler:status

# Check logs
bun run wrangler:tail

# Try manual deploy
cd enterprise/packages/cloudflare
wrangler deploy --env development
```

#### **Database Issues**

```bash
# Check database status
bun run wrangler:db:stats

# Re-seed if needed
bun run wrangler:db:seed
```

---

## 🤝 **Contributing**

### **Development Guidelines**

1. **Branch Strategy**: Use feature branches from `develop`
2. **Testing**: Write tests for new functionality
3. **Documentation**: Update API docs for changes
4. **Security**: Follow security best practices
5. **Performance**: Optimize for edge computing

### **Code Standards**

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality

---

## 📞 **Support**

### **Resources**

- **Wrangler Documentation**: https://developers.cloudflare.com/workers/
- **D1 Documentation**: https://developers.cloudflare.com/d1/
- **KV Documentation**: https://developers.cloudflare.com/kv/
- **R2 Documentation**: https://developers.cloudflare.com/r2/

### **Getting Help**

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community support
- **Enterprise Support**: enterprise@fire22.com

---

<div align="center">

**☁️ Fantasy42-Fire22 Cloudflare Infrastructure**

_Enterprise-grade serverless infrastructure with easy CLI tools_

**🚀 Ready for deployment with one command!**

---

**🔐 CONFIDENTIAL - Enterprise Use Only**

_This infrastructure contains enterprise-sensitive Cloudflare configurations._

**📞 Contact:** enterprise@fire22.com | **🔐 Classification:** CONFIDENTIAL

</div>
