# 🚀 Fantasy42-Fire22 Cloudflare Enterprise Setup Guide

## 🔐 **CRITICAL: Repository Privacy Status**

### ❌ **Current Status: PUBLIC REPOSITORY**

```bash
Repository: https://github.com/brendadeeznuts1111/fantasy42-fire22-registry
Status: ❌ PUBLIC (Security Risk)
```

### 🛡️ **REQUIRED ACTION: Make Repository Private**

#### **Step 1: Convert to Private Repository**

```bash
# GitHub Web Interface:
1. Go to: https://github.com/brendadeeznuts1111/fantasy42-fire22-registry/settings
2. Scroll to "Danger Zone"
3. Click "Make private"
4. Confirm the action
```

#### **Step 2: Update Remote URL (After Making Private)**

```bash
# No action needed - URL remains the same
# Git will automatically use authentication when needed
```

---

## ☁️ **Cloudflare Infrastructure Setup**

### **Step 1: Create Cloudflare Account & API Token**

#### **A. Generate API Token with Required Permissions**

```bash
# Visit: https://dash.cloudflare.com/profile/api-tokens
# Create token with these permissions:

🔑 REQUIRED PERMISSIONS:
├── Account: Cloudflare Workers:Edit
├── Account: D1:Edit
├── Account: KV:Edit
├── Account: R2:Edit
├── Account: Queues:Edit
├── Zone: DNS:Edit (for apexodds.net)
└── Zone: Page Rules:Edit
```

#### **B. Get Your Account ID**

```bash
# Visit: https://dash.cloudflare.com/
# Copy Account ID from the right sidebar
```

### **Step 2: Configure Environment Variables**

#### **Create .env file:**

```bash
# Copy the example configuration
cp enterprise/config/.env.example .env

# Edit with your actual values
nano .env
```

#### **Required Environment Variables:**

```bash
# CLOUDFLARE CONFIGURATION
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# DATABASE IDs (will be created automatically)
REGISTRY_DB_ID=auto_generated
CACHE_KV_ID=auto_generated
CACHE_KV_PREVIEW_ID=auto_generated
```

### **Step 3: Authenticate Wrangler CLI**

#### **Login to Cloudflare:**

```bash
# Method 1: Browser-based authentication
wrangler auth login

# Method 2: API Token (for CI/CD)
wrangler auth token $CLOUDFLARE_API_TOKEN
```

#### **Verify Authentication:**

```bash
wrangler auth whoami
# Should show: ✅ Authenticated with Cloudflare
```

---

## 🏗️ **Cloudflare Resources Setup**

### **Step 1: Automated Setup (Recommended)**

#### **One-Command Enterprise Setup:**

```bash
# Complete infrastructure setup
bun run enterprise:setup

# This will:
# ✅ Authenticate with Cloudflare
# ✅ Create DNS records for apexodds.net
# ✅ Setup Cloudflare Workers infrastructure
# ✅ Create D1, KV, R2, and Queue resources
# ✅ Deploy workers and verify functionality
```

#### **Individual Component Setup:**

```bash
# Authenticate first
wrangler auth login

# Setup DNS records
bun run dns:all

# Setup Cloudflare infrastructure
wrangler dev --env development  # Test locally
wrangler deploy --env development  # Deploy to dev
wrangler deploy --env production   # Deploy to prod
```

### **Step 2: Manual Resource Creation**

#### **A. Create D1 Database:**

```bash
# Create registry database
wrangler d1 create fantasy42-registry

# Get database ID for configuration
wrangler d1 list
```

#### **B. Create KV Namespace:**

```bash
# Create cache namespace
wrangler kv:namespace create "CACHE"

# Create preview namespace
wrangler kv:namespace create "CACHE" --preview
```

#### **C. Create R2 Bucket:**

```bash
# Create packages bucket
wrangler r2 bucket create fantasy42-packages
```

#### **D. Create Queue:**

```bash
# Create registry events queue
wrangler queues create registry-events
```

---

## 🔧 **GitHub Actions Configuration for Private Repo**

### **Step 1: Update Repository Secrets**

#### **Required GitHub Secrets:**

```bash
# GitHub Web Interface: Settings → Secrets and variables → Actions

🔐 REQUIRED SECRETS:
├── CLOUDFLARE_API_TOKEN
├── CLOUDFLARE_ACCOUNT_ID
├── NPM_TOKEN (for private packages)
├── GITHUB_TOKEN (auto-generated)
```

#### **Optional Secrets:**

```bash
├── SLACK_WEBHOOK_URL (for notifications)
├── SONAR_TOKEN (for code quality)
├── DISCORD_WEBHOOK_URL (for notifications)
```

### **Step 2: Update GitHub Actions Workflows**

#### **A. Cloudflare Deployment Workflows:**

```yaml
# .github/workflows/deploy-docs-worker.yml
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

# Add to all Cloudflare workflows:
permissions:
  contents: read
  deployments: write
  pull-requests: write # For PR comments
```

#### **B. Private Repository Permissions:**

```yaml
# Update all workflows with:
permissions:
  contents: read
  packages: write # For private packages
  deployments: write
  pull-requests: write
  id-token: write # For GitHub OIDC
```

---

## 🧪 **Testing Cloudflare Integration**

### **Step 1: Local Development Testing**

#### **Test Workers Locally:**

```bash
# Start local development server
wrangler dev --env development

# Test endpoints:
curl http://localhost:8787/api/health
curl http://localhost:8787/api/packages
```

#### **Test Database Integration:**

```bash
# Connect to D1 database
wrangler d1 execute fantasy42-registry --local --file=./schema.sql

# Query database
wrangler d1 execute fantasy42-registry --local --command="SELECT * FROM packages;"
```

### **Step 2: Remote Testing**

#### **Deploy and Test:**

```bash
# Deploy to development
wrangler deploy --env development

# Test remote endpoints
curl https://fantasy42-fire22-dev.apexodds.workers.dev/api/health
curl https://fantasy42-fire22-dev.apexodds.workers.dev/api/packages
```

#### **Test All Environments:**

```bash
# Development environment
bun run wrangler:dev

# Staging environment
bun run wrangler:deploy:staging

# Production environment
bun run wrangler:deploy:prod
```

---

## 📊 **Monitoring & Health Checks**

### **Step 1: Enable Cloudflare Analytics**

```bash
# Enable analytics engine
wrangler analytics enable

# View analytics
wrangler analytics view
```

### **Step 2: Setup Health Monitoring**

```bash
# Test all endpoints
bun run enterprise:verify

# Monitor logs
wrangler tail --env production

# Check deployments
wrangler deployments
```

---

## 🚀 **Complete Setup Checklist**

### **Phase 1: Repository Security**

- [ ] Make repository private
- [ ] Update branch protection rules
- [ ] Configure repository secrets
- [ ] Update GitHub Actions permissions

### **Phase 2: Cloudflare Authentication**

- [ ] Create Cloudflare API token
- [ ] Get Cloudflare Account ID
- [ ] Authenticate Wrangler CLI
- [ ] Configure environment variables

### **Phase 3: Infrastructure Setup**

- [ ] Create D1 database
- [ ] Setup KV namespaces
- [ ] Create R2 bucket
- [ ] Setup message queues
- [ ] Configure DNS records

### **Phase 4: Deployment & Testing**

- [ ] Deploy to development
- [ ] Test all endpoints
- [ ] Deploy to staging
- [ ] Run integration tests
- [ ] Deploy to production

### **Phase 5: Monitoring & Security**

- [ ] Enable analytics
- [ ] Setup health monitoring
- [ ] Configure logging
- [ ] Setup alerts
- [ ] Test backup/recovery

---

## 🔧 **Quick Commands Reference**

### **Repository Management:**

```bash
# Check repository status
curl -s https://api.github.com/repos/brendadeeznuts1111/fantasy42-fire22-registry | jq '.private'

# Update remote URL if needed
git remote set-url origin https://github.com/brendadeeznuts1111/fantasy42-fire22-registry.git
```

### **Cloudflare Authentication:**

```bash
# Login
wrangler auth login

# Check status
wrangler auth whoami

# Logout
wrangler auth logout
```

### **Infrastructure Management:**

```bash
# Complete setup
bun run enterprise:setup

# Individual components
bun run dns:all              # DNS setup
bun run wrangler:setup       # Cloudflare setup
bun run enterprise:verify    # Verification
```

### **Development & Testing:**

```bash
# Local development
wrangler dev --env development

# Deploy to environments
wrangler deploy --env development
wrangler deploy --env staging
wrangler deploy --env production

# Monitor and debug
wrangler tail --env production
wrangler deployments
```

---

## 🆘 **Troubleshooting**

### **Common Issues:**

#### **1. Authentication Errors**

```bash
# Check token permissions
wrangler auth whoami

# Re-authenticate
wrangler auth login
```

#### **2. Repository Access Issues**

```bash
# Check SSH keys
ssh -T git@github.com

# Use HTTPS with token
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/brendadeeznuts1111/fantasy42-fire22-registry.git
```

#### **3. Deployment Failures**

```bash
# Check logs
wrangler tail --env production

# Check deployments
wrangler deployments

# Rebuild and redeploy
wrangler deploy --env production --force
```

---

## 📞 **Support & Resources**

### **Cloudflare Resources:**

- **Dashboard**: https://dash.cloudflare.com
- **Workers Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

### **GitHub Resources:**

- **Repository Settings**:
  https://github.com/brendadeeznuts1111/fantasy42-fire22-registry/settings
- **Actions Secrets**:
  https://github.com/brendadeeznuts1111/fantasy42-fire22-registry/settings/secrets/actions

### **Fantasy42-Fire22 Resources:**

- **Documentation**: https://crystal-clear-docs.nolarose1968.workers.dev
- **Registry**: https://registry.apexodds.net
- **API**: https://api.apexodds.net

---

<div align="center">

**🚀 ENTERPRISE CLOUDFLARE SETUP COMPLETE**

_This guide ensures secure, private repository with full Cloudflare integration_

**Next Steps:**

1. ✅ Make repository private
2. 🔑 Setup Cloudflare authentication
3. 🏗️ Deploy infrastructure
4. 🧪 Test integration
5. 📊 Enable monitoring

**Ready for enterprise deployment!** 🎯

</div>
