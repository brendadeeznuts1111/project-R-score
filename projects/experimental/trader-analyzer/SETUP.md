# [SETUP.GUIDE.RG] NEXUS Setup Guide

Complete setup guide to ensure everything works perfectly.

---

## 🚀 Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/brendadeeznuts1111/trader-analyzer-bun.git
cd trader-analyzer-bun

# 2. Run automated setup
bun run setup

# 3. Start development server
bun run dev
```

---

## 📋 Prerequisites

### Required

- **Bun** >= 1.1.0
  ```bash
  curl -fsSL https://bun.sh/install | bash
  bun --version  # Should be >= 1.1.0
  ```

- **Git** (for version tracking and git-info API)
  ```bash
  git --version
  ```

### Optional (for full functionality)

- **Telegram Bot Token** (for Telegram integration)
- **Redis** (for caching - optional, falls back to in-memory)

---

## 🔧 Automated Setup

The `setup` script verifies and initializes everything:

```bash
bun run setup
```

**What it checks:**
- ✅ Bun version (>= 1.1.0)
- ✅ Dependencies installed
- ✅ Data directories created
- ✅ Environment variables configured
- ✅ Bun.secrets setup
- ✅ Database initialization readiness
- ✅ Git repository status
- ✅ API server configuration
- ✅ TypeScript type checking

---

## 🔐 Environment Variables

### Required for Basic Operation

None! The platform works out of the box with defaults.

### Optional (for enhanced features)

#### Telegram Integration

```bash
# Option 1: Using Bun.secrets (recommended)
bun secret set TELEGRAM_BOT_TOKEN=your_bot_token
bun secret set TELEGRAM_CHAT_ID=your_chat_id

# Option 2: Using environment variables
export TELEGRAM_BOT_TOKEN=your_bot_token
export TELEGRAM_CHAT_ID=your_chat_id
```

#### API Server Port

```bash
# Default: 3000
export PORT=3000

# Or set in .env file (not tracked by git)
echo "PORT=3000" > .env
```

---

## 📁 Directory Structure

The setup script automatically creates:

```
data/
├── streams/          # Trade stream data
├── telegram-logs/    # Telegram integration logs
├── security/         # Security monitoring data
├── research/         # Research pattern data
├── forensic/         # Forensic logging data
└── compliance/       # Compliance audit data
```

**Databases** (auto-created on first use):
- `data/pipeline.sqlite` - Data pipeline storage
- `data/rbac.sqlite` - RBAC users and roles
- `data/properties.sqlite` - Property registry
- `data/sources.sqlite` - Data source registry
- `data/features.sqlite` - Feature flags
- `data/security.db` - Security monitoring
- `data/compliance-audit.db` - Compliance logs
- `data/research.db` - Research patterns

---

## 🎯 Verification Steps

### 1. Check Setup Status

```bash
bun run setup
```

### 2. Verify API Server

```bash
# Start server
bun run dev

# In another terminal, test endpoints:
curl http://localhost:3000/health
curl http://localhost:3000/api/git-info
```

### 3. Test Dashboard

```bash
# Option 1: CLI Dashboard
bun run dashboard

# Option 2: Web Dashboard
# Open in browser:
open http://localhost:3000/dashboard/index.html
# Or use file:// protocol:
open dashboard/index.html
```

### 4. Run Tests

```bash
bun test
bun run typecheck
bun run lint
```

---

## 🔍 Troubleshooting

### Issue: "Bun is not installed"

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### Issue: "Dependencies not found"

```bash
bun install
```

### Issue: "Port 3000 already in use"

```bash
# Option 1: Use different port
export PORT=3001
bun run dev

# Option 2: Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: "Telegram integration not working"

1. Verify bot token:
   ```bash
   bun secret get TELEGRAM_BOT_TOKEN
   ```

2. Test Telegram API:
   ```bash
   bun run telegram list-topics
   ```

3. Check logs:
   ```bash
   ls -la data/telegram-logs/
   ```

### Issue: "Database errors"

Databases are auto-created, but if you see errors:

```bash
# Remove corrupted database (will be recreated)
rm data/*.sqlite data/*.db

# Restart server
bun run dev
```

### Issue: "Git info API returns null"

```bash
# Verify git repository
git status

# Check git commands work
git rev-parse HEAD
git rev-parse --short HEAD
```

---

## 📚 Next Steps

After setup is complete:

1. **Explore the Dashboard**
   ```bash
   bun run dashboard
   ```

2. **View API Documentation**
   ```bash
   # Start server, then visit:
   open http://localhost:3000/docs
   ```

3. **Test Telegram Integration** (if configured)
   ```bash
   bun run telegram send "Hello from NEXUS!"
   ```

4. **Run Benchmarks**
   ```bash
   bun run bench
   ```

5. **Check Security Status**
   ```bash
   bun run security
   ```

---

## 🔗 Quick Reference

| Command | Description |
|---------|-------------|
| `bun run setup` | Run automated setup verification |
| `bun run dev` | Start development server (port 3000) |
| `bun run dashboard` | Open CLI dashboard |
| `bun run test` | Run test suite |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | Run linter |
| `bun run telegram` | Telegram CLI tool |
| `bun run security` | Security testing CLI |

---

## ✅ Setup Checklist

- [ ] Bun >= 1.1.0 installed
- [ ] Repository cloned
- [ ] `bun run setup` completed successfully
- [ ] Dependencies installed (`node_modules` exists)
- [ ] Data directories created (`data/` exists)
- [ ] Environment variables set (if needed)
- [ ] Bun.secrets configured (if using Telegram)
- [ ] API server starts without errors
- [ ] Health endpoint responds (`/health`)
- [ ] Git info endpoint works (`/api/git-info`)
- [ ] Dashboard accessible
- [ ] Tests pass (`bun test`)

---

## 🆘 Getting Help

- **Documentation**: See `README.md` and `CLAUDE.md`
- **API Docs**: `http://localhost:3000/docs` (when server running)
- **Issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/trader-analyzer-bun/issues)

---

**Status**: ✅ Setup guide complete | Run `bun run setup` to verify your installation
