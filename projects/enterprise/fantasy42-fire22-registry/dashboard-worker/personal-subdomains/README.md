# 🌐 Fire22 Personal Subdomains

**Personal subdomain infrastructure for all Fire22 employees using Cloudflare
Workers**

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare-blue)](https://workers.cloudflare.com/)
[![Status](https://img.shields.io/badge/Status-Ready-green)](#)

---

## 🎯 Overview

This project implements a complete personal subdomain system for Fire22
employees, providing each team member with their own professional presence at
`firstname-lastname.fire22.workers.dev`.

### ✨ Key Features

- **5-Tier Template System**: Executive, Management, Specialist, Standard, and
  VIP templates
- **Wildcard DNS**: Automatic subdomain routing via `*.fire22.workers.dev`
- **SSL Security**: Automatic HTTPS certificates for all subdomains
- **Mobile Responsive**: Perfect display across all devices
- **Fire22 Branding**: Consistent visual identity across all sites
- **Role-Based Features**: Specialized tools and content based on employee tier

---

## 🚀 Quick Start

### Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **Wrangler CLI** installed globally
3. **Node.js/Bun** runtime
4. **Fire22 Domain** configured in Cloudflare

### Environment Setup

```bash
# Clone or navigate to the project
cd dashboard-worker/personal-subdomains

# Install dependencies
bun install

# Set up environment variables
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ZONE_ID="your_zone_id"
```

### One-Command Deployment

```bash
# Deploy everything automatically
bun run setup
```

This command will:

- ✅ Create KV namespaces for employee data
- ✅ Deploy the Cloudflare Worker
- ✅ Seed employee data for all team members
- ✅ Configure wildcard DNS routing
- ✅ Test the deployment

---

## 📋 Employee Subdomain Registry

### VIP Management (Tier 5 - CRITICAL)

- **Vinny2Times**: `https://vinny2times.fire22.workers.dev/` ⭐ **URGENT - 24hr
  deadline**

### Executive Team (Tier 1)

- **William Harris (CEO)**: `https://william-harris.fire22.workers.dev/`
- **Patricia Clark (COO)**: `https://patricia-clark.fire22.workers.dev/`
- **Chris Brown (CTO)**: `https://chris-brown.fire22.workers.dev/`
- **Jennifer Adams (HR Director)**: `https://jennifer-adams.fire22.workers.dev/`
- **Sarah Martinez (Communications Director)**:
  `https://sarah-martinez.fire22.workers.dev/`
- **Isabella Martinez (Design Director)**:
  `https://isabella-martinez.fire22.workers.dev/`

### Complete Employee List

See
[`FIRE22-PERSONAL-SUBDOMAIN-STANDARDS.md`](../src/communications/FIRE22-PERSONAL-SUBDOMAIN-STANDARDS.md)
for the complete registry of all 50+ employee subdomains.

---

## 🏗️ Architecture

### Cloudflare Worker Structure

```
📁 personal-subdomains/
├── 📄 wrangler.toml          # Worker configuration
├── 📁 src/
│   └── 📄 index.ts           # Main worker logic
├── 📁 scripts/
│   ├── 📄 deploy-worker.ts   # Deployment automation
│   ├── 📄 seed-employee-data.ts # Data seeding
│   └── 📄 test-deployment.ts # Testing suite
└── 📄 README.md              # This file
```

### Data Flow

1. **DNS Resolution**: `*.fire22.workers.dev` → Cloudflare Workers
2. **Subdomain Extraction**: Worker extracts employee identifier
3. **Data Lookup**: KV query for employee information
4. **Template Rendering**: Generate personalized HTML based on tier
5. **Response**: Serve professional employee profile page

### Template Tiers

| Tier | Template   | Target                      | Features                              |
| ---- | ---------- | --------------------------- | ------------------------------------- |
| 1    | Executive  | C-suite, Department Heads   | Team dashboard, advanced analytics    |
| 2    | Management | Directors, Managers         | Team management, reporting tools      |
| 3    | Specialist | Senior roles, Experts       | Specialized tools, expertise showcase |
| 4    | Standard   | All employees               | Basic profile, contact info           |
| 5    | VIP/Custom | Special roles (Vinny2Times) | Custom features, VIP tools            |

---

## 🛠️ Development

### Local Development

```bash
# Start local development server
bun run dev

# The worker will be available at:
# http://localhost:8787/
# https://vinny2times.fire22.workers.dev.localhost:8787/
```

### Manual Deployment Steps

```bash
# 1. Deploy worker
bun run deploy

# 2. Seed employee data
bun run seed

# 3. Test deployment
bun run test
```

### Adding New Employees

1. **Update Employee Data** in `scripts/seed-employee-data.ts`
2. **Redeploy Worker** with new data
3. **Test New Subdomain** immediately

---

## 🧪 Testing

### Automated Testing

```bash
# Run comprehensive test suite
bun run test
```

### Manual Testing

```bash
# Test VIP subdomain (CRITICAL)
curl -I https://vinny2times.fire22.workers.dev/

# Test executive subdomains
curl -I https://william-harris.fire22.workers.dev/

# Test API health check
curl https://vinny2times.fire22.workers.dev/api/health
```

### Performance Testing

```bash
# Test load time (< 3 seconds target)
curl -o /dev/null -s -w "%{time_total}\n" https://vinny2times.fire22.workers.dev/

# Test SSL certificate
openssl s_client -connect vinny2times.fire22.workers.dev:443 -servername vinny2times.fire22.workers.dev
```

---

## 🔧 Configuration

### wrangler.toml

```toml
name = "fire22-personal-sites"
main = "src/index.ts"
compatibility_date = "2025-01-27"

[env.production]
routes = [
  { pattern = "*.fire22.workers.dev/*", zone_name = "fire22.workers.dev" }
]

[[env.production.kv_namespaces]]
binding = "PERSONAL_SITES"
id = "your-kv-namespace-id"

[[env.production.kv_namespaces]]
binding = "EMPLOYEE_DATA"
id = "your-employee-data-namespace-id"
```

### Environment Variables

| Variable                | Description                           | Required |
| ----------------------- | ------------------------------------- | -------- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID            | ✅       |
| `CLOUDFLARE_API_TOKEN`  | API token with Workers/KV permissions | ✅       |
| `CLOUDFLARE_ZONE_ID`    | Zone ID for fire22.workers.dev        | ✅       |

---

## 📊 Monitoring & Analytics

### Worker Analytics

Access Cloudflare dashboard for:

- Request volume and performance
- Error rates and response times
- Geographic distribution
- SSL certificate status

### Custom Analytics

Each employee site includes:

- Page view tracking
- Feature usage metrics
- Performance monitoring
- Error logging

### Health Checks

```bash
# Check worker health
curl https://vinny2times.fire22.workers.dev/api/health

# Monitor worker logs
wrangler tail
```

---

## 🚨 Troubleshooting

### Common Issues

#### DNS_PROBE_FINISHED_NXDOMAIN

**Cause**: Wildcard DNS not configured **Solution**:

```bash
# Check DNS configuration
nslookup vinny2times.fire22.workers.dev

# Verify Cloudflare DNS settings
# Ensure *.fire22.workers.dev CNAME points to fire22.workers.dev
```

#### SSL Certificate Errors

**Cause**: SSL not provisioned **Solution**: Wait for Cloudflare to provision
SSL (usually < 5 minutes)

#### Worker Deployment Fails

**Cause**: Configuration or permission issues **Solution**:

```bash
# Check wrangler authentication
wrangler auth login

# Verify configuration
wrangler deploy --dry-run
```

### Emergency Contacts

- **Technical Issues**: Chris Brown (CTO) - `chris-brown@tech.fire22`
- **DNS Problems**: Cloudflare Support
- **VIP Critical**: Vinny2Times - `vinny2times@fire22.com`

---

## 📈 Success Metrics

### Performance Targets

- **Load Time**: < 3 seconds
- **Uptime**: 99.9%
- **SSL Score**: A+ rating
- **Mobile Score**: 100/100

### Coverage Goals

- **100% Employee Coverage**: Every employee has a subdomain
- **95% Compliance**: All sites meet Fire22 standards
- **<48 Hour Provisioning**: New employee setup time

---

## 🎯 Business Impact

### HR Directive Compliance

- ✅ **HR-2025-001**: Mandatory personal subdomains for all employees
- ✅ **Professional Branding**: Consistent Fire22 identity
- ✅ **VIP Operations**: Critical infrastructure for Vinny2Times

### Benefits Delivered

- **Modern Employee Experience**: Professional personal sites
- **Brand Consistency**: Unified Fire22 presence
- **Process Efficiency**: Automated onboarding integration
- **VIP Support**: Enhanced customer management capabilities

---

## 📞 Support & Contact

### Fire22 Team

- **Technical Lead**: Chris Brown (CTO)
- **Project Manager**: Jennifer Adams (HR Director)
- **Design Lead**: Isabella Martinez (Design Director)

### Cloudflare Support

- **Enterprise Support**: Available 24/7
- **Documentation**:
  [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Community**: [Cloudflare Community](https://community.cloudflare.com/)

---

## 🔄 Roadmap

### Phase 1: Core Infrastructure ✅

- [x] Wildcard DNS configuration
- [x] Basic worker deployment
- [x] Employee data seeding
- [x] VIP subdomain (vinny2times.fire22.workers.dev)

### Phase 2: Enhanced Features 🔄

- [ ] Advanced analytics dashboard
- [ ] Team collaboration tools
- [ ] Custom domain support
- [ ] Integration with existing Fire22 systems

### Phase 3: Automation 🚀

- [ ] Automatic new hire provisioning
- [ ] Self-service profile management
- [ ] Advanced customization options
- [ ] Performance optimization

---

**🎉 Fire22 Personal Subdomains - Empowering Every Employee with Professional
Presence**

_Deployed and maintained by the Fire22 Technology Department_</contents>
</xai:function_call">
