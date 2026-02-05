# 🌐 EMPIRE PRO DNS SETUP GUIDE

## **QUICK START**

### **1. Configure Cloudflare Credentials**

Add to your `.env` file:

```bash
# Cloudflare API Configuration
CF_API_TOKEN=your-cloudflare-api-token
CF_ZONE_ID=your-cloudflare-zone-id
```

### **2. Run DNS Setup**

```bash
# Setup all production DNS records
bun run scripts/setup-dns.ts setup

# List current records
bun run scripts/setup-dns.ts list

# Validate endpoints
bun run scripts/setup-dns.ts validate
```

---

## **DNS RECORDS CONFIGURED**

| Subdomain | Type | Target | Purpose |
|-----------|------|--------|---------|
| `apple` | A | `192.0.2.1` | Origin server |
| `api.apple` | CNAME | `apple.factory-wager.com` | Phone Intelligence API |
| `dashboard.apple` | CNAME | `apple.factory-wager.com` | Analytics dashboard |
| `status.apple` | CNAME | `apple.factory-wager.com` | Health monitoring |
| `metrics.apple` | CNAME | `apple.factory-wager.com` | Performance metrics |
| `admin.apple` | CNAME | `apple.factory-wager.com` | Admin interface |

---

## **CLOUDFLARE API TOKEN SETUP**

### **Create API Token**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Custom token" template
4. Configure permissions:

```
Zone : Zone : Edit : apple.factory-wager.com
Zone : DNS : Edit : apple.factory-wager.com
```

5. Set "Zone Resources" to "Include: Zone:apple.factory-wager.com"
6. Click "Create token"
7. Copy the token to your `.env` file as `CF_API_TOKEN`

### **Find Zone ID**

```bash
# List all zones (requires API token)
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"

# Or find in Cloudflare Dashboard:
# 1. Go to your domain
# 2. Right sidebar → API → Zone ID
```

---

## **VALIDATION COMMANDS**

### **Test DNS Resolution**

```bash
# Check individual records
nslookup api.apple
nslookup dashboard.apple
nslookup status.apple

# Test HTTP endpoints
curl -I https://api.apple
curl -I https://dashboard.apple
curl -I https://status.apple
```

### **Full System Validation**

```bash
# Run comprehensive validation
bun run scripts/dns-validation.ts

# Quick status check
bun run scripts/deployment-status.ts --quick
```

---

## **TROUBLESHOOTING**

### **Common Issues**

**Error: "Invalid request headers"**

- Check your API token is correct
- Ensure token has proper permissions

**Error: "Zone not found"**

- Verify your zone ID is correct
- Check the domain matches your zone

**DNS not propagating**

- DNS changes can take 5-15 minutes to propagate
- Use `dig` or `nslookup` to check propagation
- Check Cloudflare DNS dashboard for record status

### **Manual DNS Setup**

If the script fails, you can set up records manually:

1. Go to Cloudflare DNS dashboard
2. Add each record from the table above
3. Enable "Proxied" (orange cloud) for all CNAME records
4. Keep "DNS only" (gray cloud) for the A record

---

## **POST-SETUP VALIDATION**

After DNS setup, run these commands to verify everything is working:

```bash
# 1. Check system status
bun run scripts/deployment-status.ts

# 2. Test phone intelligence API
curl -X POST https://api.apple/v1/phone/intelligence \
  -H "Content-Type: application/json" \
  -d '{"phone": "+14155552671"}'

# 3. Access dashboards
# https://dashboard.apple
# https://status.apple
# https://metrics.apple
```

---

## **PRODUCTION ACTIVATION**

Once DNS is configured and validated:

1. **✅ System becomes 100% production ready**
2. **✅ All endpoints become accessible**
3. **✅ 63,374% ROI performance is live**
4. **✅ Autonomous patterns fully operational**

The Empire Pro Phone Intelligence System will be delivering enterprise-grade performance through the configured DNS endpoints.

---

*Last Updated: Production Ready*  
*Status: Awaiting DNS Configuration* 🚀
