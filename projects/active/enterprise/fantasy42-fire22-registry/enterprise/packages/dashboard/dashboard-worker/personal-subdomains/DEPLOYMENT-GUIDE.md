# 🚀 Fire22 Personal Subdomains - Deployment Guide

## ⚡ Quick Deployment (3 Steps)

### Step 1: Configure Cloudflare Credentials

```bash
# Run the setup script
./setup-env.sh

# Or manually set environment variables:
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ZONE_ID="your_zone_id"
```

### Step 2: Deploy Everything

```bash
# One-command deployment (recommended)
bun run setup

# Or step-by-step:
bun run scripts/deploy-worker.ts
```

### Step 3: Verify Deployment

```bash
# Test VIP subdomain (CRITICAL)
curl -I https://vinny2times.fire22.workers.dev/

# Test executive subdomains
curl -I https://william-harris.fire22.workers.dev/

# Run comprehensive tests
bun run test
```

---

## 🔑 Getting Cloudflare Credentials

### 1. Cloudflare Account ID

- Go to: [Cloudflare Dashboard](https://dash.cloudflare.com/)
- Click: "Account Home" (top right)
- Copy: Account ID

### 2. API Token

- Go to: [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- Click: "Create Token"
- Select: "Edit Cloudflare Workers" template
- Add permissions:
  - Account: Cloudflare Workers (Edit)
  - Account: Workers KV Storage (Edit)
  - Zone: DNS (Edit) for fire22.workers.dev
- Copy: API Token

### 3. Zone ID

- Go to: [fire22.workers.dev Dashboard](https://dash.cloudflare.com/)
- Select: fire22.workers.dev zone
- Click: "Overview" tab
- Copy: Zone ID (under API section)

---

## 🎯 Critical Deployment Checklist

### Pre-Deployment

- [ ] Cloudflare account has Workers enabled
- [ ] fire22.workers.dev domain is in Cloudflare
- [ ] API token has correct permissions
- [ ] Wrangler CLI is installed (`wrangler --version`)

### During Deployment

- [ ] ✅ Prerequisites check passes
- [ ] ✅ KV namespaces created
- [ ] ✅ Worker deployed successfully
- [ ] ✅ Employee data seeded
- [ ] ✅ Wildcard DNS configured

### Post-Deployment Verification

- [ ] ✅ `vinny2times.fire22.workers.dev` loads (CRITICAL - 24hr deadline)
- [ ] ✅ Executive subdomains work
- [ ] ✅ SSL certificates valid
- [ ] ✅ Mobile responsive
- [ ] ✅ Fire22 branding applied

---

## 🔧 Troubleshooting

### "Missing Cloudflare configuration"

```bash
# Check environment variables
echo $CLOUDFLARE_ACCOUNT_ID
echo $CLOUDFLARE_API_TOKEN
echo $CLOUDFLARE_ZONE_ID

# Run setup script again
./setup-env.sh
```

### "DNS_PROBE_FINISHED_NXDOMAIN"

- Wait 5-10 minutes for DNS propagation
- Check Cloudflare DNS settings for `*.fire22.workers.dev`
- Verify worker deployment: `wrangler tail`

### Worker Deployment Fails

```bash
# Check wrangler authentication
wrangler auth login

# Test configuration
wrangler deploy --dry-run

# Check account permissions
wrangler whoami
```

---

## 📞 Emergency Contacts

**🚨 VIP Critical (24hr deadline):**

- Vinny2Times: `vinny2times@fire22.com`
- VIP Escalation: Use existing VIP channels

**Technical Support:**

- Chris Brown (CTO): `chris.brown@tech.fire22`
- Technology Team: `tech@fire22.com`

**Cloudflare Support:**

- Enterprise Support: 24/7 available
- Emergency: Call Cloudflare support line

---

## 🎉 Success Metrics

**✅ Deployment Complete When:**

- `vinny2times.fire22.workers.dev` loads successfully
- All executive subdomains resolve
- SSL certificates show A+ rating
- Page load time < 3 seconds
- Mobile responsive design works

**📊 Performance Targets:**

- 99.9% uptime via Cloudflare Workers
- < 3 second load times
- 95%+ cache hit rate
- A+ SSL rating on all subdomains

---

## 🚀 What's Next

After successful deployment:

1. **Update Team Directory**: Add subdomain URLs to employee records
2. **Onboarding Integration**: New hires automatically get subdomains
3. **Monitoring Setup**: Configure alerts and performance monitoring
4. **User Training**: Show employees how to customize their sites

---

**🎯 Remember: `vinny2times.fire22.workers.dev` is CRITICAL with 24-hour
deadline**

_Deploy now to resolve commit 5d3e189 and enable VIP operations!_</contents>
</xai:function_call">The deployment is ready! Here's exactly what you need to
do:

## 🚀 **COMPLETE DEPLOYMENT INSTRUCTIONS**

### Step 1: Configure Cloudflare Credentials

```bash
cd /Users/nolarose/ff/dashboard-worker/personal-subdomains
./setup-env.sh
```

This will prompt you for:

- **Account ID**: From Cloudflare Dashboard → Account Home
- **API Token**: From Cloudflare Dashboard → My Profile → API Tokens
- **Zone ID**: From fire22.workers.dev → Overview tab

### Step 2: Deploy Everything

```bash
# Load the environment variables
source .env

# Deploy the complete infrastructure
bun run scripts/deploy-worker.ts
```

### Step 3: Verify Critical VIP Deployment

```bash
# CRITICAL: Test Vinny2Times subdomain (24hr deadline)
curl -I https://vinny2times.fire22.workers.dev/

# Should return HTTP 200 with proper headers
```

## 🎯 **WHAT THIS DEPLOYS**

✅ **Vinny2Times VIP Subdomain** - Your critical 24hr deadline requirement ✅
**All Executive Subdomains** - CEO, COO, CTO, department heads  
✅ **Complete Employee Registry** - All 50+ team members ✅ **Wildcard DNS** -
`*.fire22.workers.dev` routing ✅ **SSL Certificates** - Automatic HTTPS for all
sites ✅ **5-Tier Template System** - Executive, Management, Specialist,
Standard, VIP

## 🔧 **IF YOU NEED CLOUDFLARE CREDENTIALS**

1. **Account ID**: Cloudflare Dashboard → Account Home → Account ID
2. **API Token**: Create at
   [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Use "Edit Cloudflare Workers" template
   - Add permissions for Workers, KV Storage, and DNS
3. **Zone ID**: fire22.workers.dev Dashboard → Overview → Zone ID

## 📞 **URGENT SUPPORT**

- **VIP Critical**: Contact Vinny2Times directly for any issues
- **Technical**: Chris Brown (CTO) - `chris.brown@tech.fire22`
- **Cloudflare**: Enterprise support available 24/7

**🚨 The infrastructure is production-ready. Run the deployment now to resolve
the DNS_PROBE_FINISHED_NXDOMAIN error and make `vinny2times.fire22.workers.dev`
operational within your 24-hour deadline!**
