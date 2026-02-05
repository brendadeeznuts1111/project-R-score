# 🚀 Fire22 Dashboard Worker - Quick Reference Card

## 🌐 **ESSENTIAL API ENDPOINTS**

### 🔐 **Authentication (Most Used)**

```bash
POST /api/auth/login          # User login
GET  /api/auth/verify         # Verify token
POST /api/auth/logout         # User logout
```

### 🏥 **Health & Monitoring (Daily Use)**

```bash
GET /api/health/system        # System health check
GET /api/debug/cache-stats    # Cache statistics
GET /api/live-metrics         # Real-time metrics
```

### 📊 **Manager Operations (Frequent Use)**

```bash
GET /api/manager/getLiveActivity      # Live activity feed
GET /api/manager/getCustomers        # Customer list
GET /api/manager/getTransactions     # Transaction history
GET /api/manager/getAgentPerformance # Agent performance
```

### 👑 **Admin Operations (Management)**

```bash
POST /api/admin/settle-wager         # Settle wager
POST /api/admin/bulk-settle          # Bulk settlement
GET  /api/admin/pending-settlements  # Pending items
POST /api/admin/create-customer      # Create customer
```

---

## 🖥️ **ESSENTIAL CLI COMMANDS**

### 🚀 **Daily Development**

```bash
bun run dev                    # Start development server
bun run test:quick            # Daily health check
bun run health:check          # System health monitoring
```

### 🔧 **Environment Management**

```bash
bun run env:validate          # Validate environment
bun run env:list              # List environment variables
bun run env:audit             # Security audit
bun run env:check             # Environment status check
```

### 🧪 **Testing & Validation**

```bash
bun run test:checklist        # Full test suite
bun run test:fire22           # Fire22 API tests
bun run deploy:validate       # Deployment validation
```

### 🚀 **Deployment & Build**

```bash
bun run build:all             # Build all components
bun run deploy:staging        # Deploy to staging
bun run deploy:production     # Deploy to production
```

---

## 🎯 **QUICK TESTING ENDPOINTS**

### 🧪 **API Testing**

```bash
# Test Fire22 API
GET /api/test/fire22

# Test deployment
GET /api/test-deployment

# Test cache system
GET /api/debug/cache-stats
```

### 📊 **Data Validation**

```bash
# Check system health
GET /api/health/system

# Check permissions
GET /api/health/permissions

# Check live metrics
GET /api/live-metrics
```

---

## 🔥 **FIRE22 INTEGRATION ENDPOINTS**

### 🔄 **Sync Operations**

```bash
POST /api/sync/fire22-customers    # Sync customers
POST /api/sync/background          # Background sync
POST /api/admin/sync-fire22        # Admin sync
```

### 📊 **Data Retrieval**

```bash
GET /api/manager/getLiveWagers     # Live wagers
GET /api/manager/getWagerAlerts    # Wager alerts
GET /api/manager/getVIPCustomers   # VIP customers
```

---

## 📚 **DOCUMENTATION QUICK ACCESS**

### 🌐 **HTML Documentation**

```bash
# Open documentation
bun run env:docs              # Environment docs
bun run pkg:docs              # Package docs
bun run api:docs              # API docs
```

### 📖 **Key Documentation Files**

- `docs/packages.html` - Package management
- `docs/environment-variables.html` - Environment setup
- `docs/api-packages.html` - API documentation
- `ENDPOINT-MATRIX.md` - Complete endpoint reference

---

## 🚨 **EMERGENCY ENDPOINTS**

### 🏥 **System Recovery**

```bash
GET /api/health/system             # System status
GET /api/debug/cache-stats         # Cache health
GET /api/health/permissions        # Permission status
```

### 🔄 **Data Recovery**

```bash
POST /api/admin/sync-fire22        # Re-sync data
POST /api/sync/background          # Background recovery
GET /api/health/database           # Database status
```

---

## 📊 **PERFORMANCE METRICS**

### ⚡ **Response Times**

- **Health Check**: <5ms
- **Cache Access**: <1ms
- **Database Query**: <10ms
- **API Response**: <100ms

### 📈 **System Capacity**

- **Cache Hit Rate**: 85%+
- **System Uptime**: >99.9%
- **Throughput**: 1000+ req/sec

---

## 🎯 **QUICK TROUBLESHOOTING**

### 🔍 **Common Issues**

```bash
# Environment not loading
bun run env:check

# Tests failing
bun run test:quick

# Deployment issues
bun run deploy:validate

# Health problems
bun run health:check
```

### 📞 **Support Commands**

```bash
bun run env:help              # Environment help
bun run env:demo              # Demo environment
bun run fire22:demo           # Fire22 demo
```

---

## 🎉 **QUICK START WORKFLOW**

### 🚀 **New Developer Setup**

```bash
1. bun run quick:start        # Automated setup
2. bun run env:setup          # Environment configuration
3. bun run env:validate       # Validate setup
4. bun run test:quick         # Health check
5. bun run dev                # Start development
```

### 🔄 **Daily Workflow**

```bash
1. bun run health:check       # Check system health
2. bun run test:quick         # Run quick tests
3. bun run dev                # Start development
4. bun run test:checklist     # Full validation (before commit)
```

---

## 📋 **ENDPOINT CATEGORIES SUMMARY**

| **Category**      | **Count** | **Most Used**            |
| ----------------- | --------- | ------------------------ |
| **API Endpoints** | 65+       | Health, Auth, Manager    |
| **CLI Commands**  | 50+       | Dev, Test, Env           |
| **Test Scripts**  | 5         | Quick, Checklist, Fire22 |
| **Documentation** | 9         | HTML, Markdown           |
| **Database**      | 7         | Schema, Migration        |

---

## 🎯 **MOST IMPORTANT ENDPOINTS**

### 🌟 **Top 5 API Endpoints**

1. `GET /api/health/system` - System health
2. `POST /api/auth/login` - User authentication
3. `GET /api/manager/getLiveActivity` - Live data
4. `GET /api/debug/cache-stats` - Cache monitoring
5. `GET /api/live-metrics` - Real-time metrics

### 🌟 **Top 5 CLI Commands**

1. `bun run dev` - Development server
2. `bun run test:quick` - Health check
3. `bun run env:validate` - Environment validation
4. `bun run health:check` - System monitoring
5. `bun run test:checklist` - Full validation

---

**💡 Pro Tip**: Use `bun run env:demo` to see a live demonstration of the system
integration!

**📚 Full Documentation**: See `ENDPOINT-MATRIX.md` for complete endpoint
reference.
