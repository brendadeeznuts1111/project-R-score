# FactoryWager Status Badges

Professional status badges for FactoryWager infrastructure monitoring and visualization.

## 🎨 Badge Categories

### 🏗️ Infrastructure Badges
- `infrastructure.svg` - Overall infrastructure status (39 domains)
- `github-pages.svg` - GitHub Pages domains (21 domains)
- `r2-buckets.svg` - R2 bucket domains (18 domains)
- `health.svg` - System health status
- `dns.svg` - DNS configuration status
- `cloudflare.svg` - Cloudflare proxy status

### 🚀 Service Badges
- `wiki.svg` - Wiki service status
- `dashboard.svg` - Dashboard service status
- `api.svg` - API service status
- `registry.svg` - Registry service status
- `cdn.svg` - CDN service status
- `analytics.svg` - Analytics service status
- `monitoring.svg` - Monitoring service status
- `auth.svg` - Authentication service status

### 📊 Performance Badges
- `perf-uptime.svg` - System uptime (99.9%)
- `perf-response.svg` - Response time (<100ms)
- `perf-throughput.svg` - Request throughput (1K req/s)
- `perf-error-rate.svg` - Error rate (<0.1%)

### 🔒 Security Badges
- `security-ssl.svg` - SSL certificate status
- `security-https.svg` - HTTPS configuration
- `security-cors.svg` - CORS configuration
- `security-firewall.svg` - Firewall status
- `security-auth.svg` - Authentication security

### 🚀 Deployment Badges
- `deploy-version.svg` - Current version (v1.0.0)
- `deploy-environment.svg` - Deployment environment
- `deploy-region.svg` - Deployment region
- `deploy-last-deploy.svg` - Last deployment time

## 📋 Usage Examples

### Markdown
```markdown
![Infrastructure](badges/infrastructure.svg)
![Wiki](badges/wiki.svg)
![Uptime](badges/perf-uptime.svg)
![SSL](badges/security-ssl.svg)
![Version](badges/deploy-version.svg)
```

### HTML
```html
<img src="badges/infrastructure.svg" alt="Infrastructure">
<img src="badges/wiki.svg" alt="Wiki">
<img src="badges/perf-uptime.svg" alt="Uptime">
```

### CLI Commands
```bash
# Generate all badges
./cli/fw-cli badges

# Generate specific category
./cli/fw-cli badges generate infrastructure
./cli/fw-cli badges generate services
./cli/fw-cli badges generate performance
./cli/fw-cli badges generate security
./cli/fw-cli badges generate deployment

# List all available badges
./cli/fw-cli badges list

# Show badge viewer
./cli/fw-cli badges show
./cli/fw-cli badges show infrastructure

# Update badges
./cli/fw-cli badges update
```

## 🎯 Badge Colors

- 🟢 **Green** (#22c55e) - Success, operational, healthy
- 🔵 **Blue** (#3b82f6) - Information, configured, active
- 🟡 **Yellow** (#f59e0b) - Warning, syncing, pending
- 🔴 **Red** (#ef4444) - Error, critical, offline
- 🔴 **Dark Red** (#dc2626) - Critical, urgent
- ⚫ **Gray** (#6b7280) - Unknown, disabled

## 📁 File Structure

```
badges/
├── README.md                    # This documentation
├── index.html                   # Badge viewer and gallery
├── infrastructure.svg           # Infrastructure status
├── github-pages.svg            # GitHub Pages status
├── r2-buckets.svg              # R2 Buckets status
├── health.svg                  # System health
├── dns.svg                     # DNS status
├── cloudflare.svg              # Cloudflare status
├── wiki.svg                    # Wiki service
├── dashboard.svg               # Dashboard service
├── api.svg                     # API service
├── registry.svg                # Registry service
├── cdn.svg                     # CDN service
├── analytics.svg               # Analytics service
├── monitoring.svg              # Monitoring service
├── auth.svg                    # Authentication service
├── perf-uptime.svg             # Uptime metric
├── perf-response.svg           # Response time
├── perf-throughput.svg         # Throughput metric
├── perf-error-rate.svg         # Error rate
├── security-ssl.svg            # SSL status
├── security-https.svg          # HTTPS status
├── security-cors.svg           # CORS status
├── security-firewall.svg       # Firewall status
├── security-auth.svg           # Auth security
├── deploy-version.svg          # Version info
├── deploy-environment.svg      # Environment
├── deploy-region.svg           # Region
└── deploy-last-deploy.svg      # Last deploy
```

## 🔄 Auto-generation

Badges are automatically generated with current status information:

```bash
# Generate all badges with latest data
node cli/status-badges.cjs all

# Or use the CLI wrapper
./cli/fw-cli badges generate all
```

### Scheduled Updates

For automated badge updates, add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Update Status Badges
  run: |
    ./cli/fw-cli badges generate all
    git add badges/
    git commit -m "Update status badges"
    git push
```

## 🌐 Badge Viewer

Open `badges/index.html` in your browser to view:
- All badges in a organized gallery
- Usage examples for each badge
- Copy-to-clipboard functionality
- Real-time preview

## 📊 Integration Examples

### GitHub README
```markdown
# FactoryWager Infrastructure

![Infrastructure](badges/infrastructure.svg)
![Health](badges/health.svg)
![Uptime](badges/perf-uptime.svg)

## Services
![Wiki](badges/wiki.svg) ![Dashboard](badges/dashboard.svg)
![API](badges/api.svg) ![Registry](badges/registry.svg)

## Security
![SSL](badges/security-ssl.svg) ![HTTPS](badges/security-https.svg)
![Firewall](badges/security-firewall.svg)
```

### Documentation Site
```html
<div class="status-badges">
  <img src="badges/infrastructure.svg" alt="Infrastructure">
  <img src="badges/health.svg" alt="Health">
  <img src="badges/perf-uptime.svg" alt="Uptime">
  <img src="badges/security-ssl.svg" alt="SSL">
</div>
```

### Monitoring Dashboard
```javascript
// Dynamic badge loading
const badges = [
  'infrastructure', 'health', 'wiki', 'api', 
  'perf-uptime', 'security-ssl'
];

badges.forEach(badge => {
  const img = document.createElement('img');
  img.src = `badges/${badge}.svg`;
  img.alt = badge;
  document.querySelector('.badge-container').appendChild(img);
});
```

## 🛠️ Customization

### Modify Badge Colors
Edit `cli/status-badges.cjs` to customize colors:

```javascript
const colors = {
  success: '#22c55e',    // Green
  warning: '#f59e0b',    // Yellow  
  error: '#ef4444',      // Red
  info: '#3b82f6',       // Blue
  critical: '#dc2626',   // Dark Red
  unknown: '#6b7280'     // Gray
};
```

### Add Custom Badges
1. Add badge definition in the generator
2. Update the help system
3. Regenerate badges

```javascript
// Example: Add custom badge
const customBadge = this.generateBadge('success', 'Custom', 'Status', '#22c55e');
fs.writeFileSync(path.join(this.outputDir, 'custom.svg'), customBadge);
```

## 📱 Mobile Support

All badges are optimized for mobile viewing:
- Scalable vector format (SVG)
- Responsive sizing
- High-DPI display support
- Touch-friendly dimensions

## 🔧 Troubleshooting

### Badge Not Updating
```bash
# Clear badge cache and regenerate
rm -rf badges/
./cli/fw-cli badges generate all
```

### Missing Badge Files
```bash
# List available badges
./cli/fw-cli badges list

# Regenerate missing badges
./cli/fw-cli badges generate all
```

### Permission Issues
```bash
# Ensure executable permissions
chmod +x cli/status-badges.cjs
chmod +x cli/fw-cli
```

## 📞 Support

- **Documentation**: `./cli/README.md`
- **CLI Help**: `./cli/fw-cli help`
- **Badge Help**: `./cli/fw-cli badges --help`

---

**FactoryWager Status Badges** - Professional infrastructure monitoring at a glance! 🎨
