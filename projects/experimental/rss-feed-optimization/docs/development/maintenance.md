# Maintenance Guide

This guide provides comprehensive information about maintaining the RSS Feed Optimization project, including monitoring, updates, backups, and troubleshooting.

## Overview

Regular maintenance is essential for keeping the RSS Feed Optimization project running smoothly and securely. This guide covers all aspects of ongoing maintenance, from monitoring and updates to backups and performance optimization.

## Monitoring and Observability

### Health Monitoring

#### Application Health Checks

```javascript
// src/middleware/health.js
export function healthCheck(req, res) {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024)
    },
    uptime: Math.floor(uptime),
    dependencies: {
      r2: checkR2Connection(),
      cache: checkCacheHealth()
    }
  };

  res.json(health);
}

function checkR2Connection() {
  // Check R2 connection health
  return 'OK'; // Simplified for example
}

function checkCacheHealth() {
  // Check cache health
  return 'OK'; // Simplified for example
}
```

#### System Health Monitoring

```javascript
// src/utils/system-monitor.js
export class SystemMonitor {
  constructor() {
    this.monitoring = false;
    this.interval = null;
  }

  startMonitoring(interval = 60000) {
    if (this.monitoring) return;

    this.monitoring = true;
    this.interval = setInterval(() => {
      this.checkSystemHealth();
    }, interval);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.monitoring = false;
    }
  }

  checkSystemHealth() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const health = {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user / 1000,
        system: cpuUsage.system / 1000
      },
      uptime: process.uptime()
    };

    // Log health check
    console.log('System health check:', JSON.stringify(health));

    // Check for issues
    this.checkForIssues(health);
  }

  checkForIssues(health) {
    const issues = [];

    // Memory issues
    if (health.memory.heapUsed > 500) {
      issues.push(`High memory usage: ${health.memory.heapUsed}MB`);
    }

    // CPU issues
    if (health.cpu.user > 1000000) {
      issues.push(`High CPU usage: ${health.cpu.user}ms`);
    }

    // Uptime issues
    if (health.uptime < 300) {
      issues.push('Application recently restarted');
    }

    // Report issues
    if (issues.length > 0) {
      this.reportIssues(issues);
    }
  }

  reportIssues(issues) {
    console.warn('System issues detected:', issues);
    
    // Send to monitoring service
    if (process.env.MONITORING_WEBHOOK_URL) {
      fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          issues: issues
        })
      }).catch(console.error);
    }
  }
}
```

### Performance Monitoring

#### Metrics Collection

```javascript
// src/utils/metrics.js
export class Metrics {
  constructor() {
    this.counters = new Map();
    this.timers = new Map();
    this.gauges = new Map();
  }

  increment(metric) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + 1);
  }

  recordTiming(metric, duration) {
    if (!this.timers.has(metric)) {
      this.timers.set(metric, []);
    }
    
    this.timers.get(metric).push(duration);
  }

  setGauge(metric, value) {
    this.gauges.set(metric, value);
  }

  getMetrics() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const totalRequests = this.counters.get('requests.total') || 0;
    const totalErrors = this.counters.get('errors.total') || 0;
    
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    return {
      uptime,
      totalRequests,
      totalErrors,
      errorRate: `${errorRate.toFixed(2)}%`,
      avgResponseTime: this.getAverageResponseTime(),
      requestsPerSecond: totalRequests / uptime,
      memory,
      cache: this.getCacheMetrics()
    };
  }

  getAverageResponseTime() {
    const times = this.timers.get('response_time') || [];
    if (times.length === 0) return '0ms';
    
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    return `${avg.toFixed(2)}ms`;
  }

  getCacheMetrics() {
    // Get cache statistics
    return {
      size: 0, // Implement cache size tracking
      hits: 0, // Implement cache hit tracking
      misses: 0, // Implement cache miss tracking
      hitRate: '0%' // Implement hit rate calculation
    };
  }
}
```

#### Real-time Monitoring Dashboard

```javascript
// src/utils/dashboard.js
export class Dashboard {
  constructor() {
    this.metrics = new Metrics();
    this.monitor = new SystemMonitor();
  }

  start() {
    this.monitor.startMonitoring();
    
    // Expose metrics endpoint
    app.get('/api/v1/metrics', (req, res) => {
      res.json(this.metrics.getMetrics());
    });

    // Expose detailed metrics
    app.get('/api/v1/metrics/detailed', (req, res) => {
      res.json({
        system: this.monitor.getSystemMetrics(),
        application: this.metrics.getDetailedMetrics(),
        cache: this.getCacheMetrics()
      });
    });
  }

  getCacheMetrics() {
    // Implement cache metrics collection
    return {
      size: 0,
      hitRate: '0%',
      operations: {
        get: 0,
        set: 0,
        delete: 0
      }
    };
  }
}
```

## Updates and Upgrades

### Dependency Management

#### Automated Dependency Updates

```yaml
# .github/workflows/dependabot.yml
version: 2
updates:
  - package-ecosystem: "bun"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
    labels:
      - "dependencies"
      - "automated"
```

#### Manual Dependency Updates

```bash
# Check for outdated packages
bun outdated

# Update all dependencies
bun update

# Update specific dependency
bun update package-name

# Audit dependencies for security issues
bun audit

# Fix security issues automatically
bun audit --fix
```

### Application Updates

#### Version Management

```javascript
// src/version.js
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

export function getVersionInfo() {
  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    bunVersion: process.versions.bun,
    nodeVersion: process.versions.node
  };
}
```

#### Update Scripts

```javascript
// scripts/update.js
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

export async function updateApplication() {
  console.log('Starting application update...');
  
  try {
    // Pull latest changes
    execSync('git pull origin main', { stdio: 'inherit' });
    
    // Update dependencies
    execSync('bun install', { stdio: 'inherit' });
    
    // Run tests
    execSync('bun test', { stdio: 'inherit' });
    
    // Update version
    updateVersion();
    
    console.log('Application update completed successfully');
  } catch (error) {
    console.error('Application update failed:', error.message);
    process.exit(1);
  }
}

function updateVersion() {
  const packageJson = JSON.parse(execSync('cat package.json', { encoding: 'utf8' }));
  const currentVersion = packageJson.version;
  
  // Increment patch version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  const newVersion = `${major}.${minor}.${patch + 1}`;
  
  packageJson.version = newVersion;
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  console.log(`Version updated from ${currentVersion} to ${newVersion}`);
}
```

### Database Migrations

#### Migration System

```javascript
// src/migrations/migration-runner.js
export class MigrationRunner {
  constructor() {
    this.migrations = [];
    this.loadMigrations();
  }

  loadMigrations() {
    // Load migration files
    const migrationFiles = [
      '001_initial_setup.js',
      '002_add_cache_table.js',
      '003_update_rss_schema.js'
    ];

    for (const file of migrationFiles) {
      const migration = import(`./${file}`);
      this.migrations.push(migration);
    }
  }

  async runMigrations() {
    console.log('Running database migrations...');
    
    for (const migration of this.migrations) {
      try {
        await migration.up();
        console.log(`Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('All migrations completed successfully');
  }
}
```

## Backup and Recovery

### Automated Backups

#### R2 Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y-%m-%d)
BACKUP_NAME="backup-$DATE"

echo "Starting backup: $BACKUP_NAME"

# Create backup directory
mkdir -p /tmp/$BACKUP_NAME

# Backup R2 bucket
aws s3 sync s3://production-bucket s3://backup-bucket/$BACKUP_NAME/ --storage-class STANDARD_IA

# Backup application data
tar -czf /tmp/$BACKUP_NAME/app-data.tar.gz /app/data/

# Upload backup to cloud storage
aws s3 cp /tmp/$BACKUP_NAME s3://backup-bucket/ --recursive

# Clean up local backup
rm -rf /tmp/$BACKUP_NAME

echo "Backup completed: $BACKUP_NAME"
```

#### Scheduled Backups

```yaml
# .github/workflows/backup.yml
name: Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup AWS CLI
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Run backup script
        run: |
          chmod +x scripts/backup.sh
          ./scripts/backup.sh
```

### Recovery Procedures

#### Application Recovery

```bash
# scripts/recover.sh
#!/bin/bash

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup-date>"
  exit 1
fi

echo "Starting recovery from backup: $BACKUP_DATE"

# Stop application
pm2 stop rss-feed-optimization

# Restore R2 data
aws s3 sync s3://backup-bucket/backup-$BACKUP_DATE/ s3://production-bucket/

# Restore application data
aws s3 cp s3://backup-bucket/backup-$BACKUP_DATE/app-data.tar.gz /tmp/
tar -xzf /tmp/app-data.tar.gz -C /app/

# Start application
pm2 start rss-feed-optimization

echo "Recovery completed from backup: $BACKUP_DATE"
```

#### Database Recovery

```javascript
// scripts/recover-database.js
import { execSync } from 'child_process';

export async function recoverDatabase(backupDate) {
  console.log(`Starting database recovery from ${backupDate}...`);
  
  try {
    // Download backup
    execSync(`aws s3 cp s3://backup-bucket/backup-${backupDate}/database.sql /tmp/`, { stdio: 'inherit' });
    
    // Restore database
    execSync(`psql -h $DB_HOST -U $DB_USER -d $DB_NAME < /tmp/database.sql`, { stdio: 'inherit' });
    
    console.log('Database recovery completed successfully');
  } catch (error) {
    console.error('Database recovery failed:', error.message);
    throw error;
  }
}
```

## Performance Optimization

### Regular Performance Reviews

#### Performance Audit Script

```javascript
// scripts/performance-audit.js
import { PerformanceTracker } from '../src/utils/performance-tracker.js';
import { RSSGenerator } from '../src/rss-generator.js';

export async function runPerformanceAudit() {
  console.log('Starting performance audit...');
  
  const tracker = new PerformanceTracker();
  const generator = new RSSGenerator({
    title: 'Performance Audit Blog',
    baseUrl: 'https://audit.example.com'
  });

  // Test RSS generation performance
  const posts = Array.from({ length: 1000 }, (_, i) => ({
    title: `Post ${i}`,
    slug: `post-${i}`,
    content: `Content for post ${i}`.repeat(5),
    author: 'Audit Author',
    publishedAt: new Date().toISOString(),
    tags: ['audit', 'performance']
  }));

  const rssResult = await tracker.track('rss_generation', async () => {
    return await generator.generate(posts);
  });

  // Test DNS prefetching performance
  const hosts = Array.from({ length: 50 }, (_, i) => `host${i}.example.com`);
  
  const dnsResult = await tracker.track('dns_prefetch', async () => {
    const { DNSOptimizer } = await import('../src/utils/dns-optimizer.js');
    const dns = new DNSOptimizer();
    await dns.prefetch(hosts);
  });

  // Generate report
  const report = tracker.generateReport();
  
  console.log('Performance Audit Results:');
  console.log(`- RSS Generation: ${rssResult.duration}ms for ${posts.length} posts`);
  console.log(`- DNS Prefetching: ${dnsResult.duration}ms for ${hosts.length} hosts`);
  console.log(`- Recommendations: ${report.recommendations.length}`);
  
  if (report.recommendations.length > 0) {
    console.log('Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  return report;
}
```

### Memory Management

#### Memory Monitoring

```javascript
// src/utils/memory-monitor.js
export class MemoryMonitor {
  constructor() {
    this.warningThreshold = 400 * 1024 * 1024; // 400MB
    this.criticalThreshold = 800 * 1024 * 1024; // 800MB
    this.monitoring = false;
  }

  startMonitoring(interval = 30000) {
    if (this.monitoring) return;

    this.monitoring = true;
    this.interval = setInterval(() => {
      this.checkMemory();
    }, interval);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.monitoring = false;
    }
  }

  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;

    if (heapUsed > this.criticalThreshold) {
      console.error(`CRITICAL: Memory usage ${Math.round(heapUsed / 1024 / 1024)}MB exceeds critical threshold`);
      process.emit('memory-critical', usage);
    } else if (heapUsed > this.warningThreshold) {
      console.warn(`WARNING: Memory usage ${Math.round(heapUsed / 1024 / 1024)}MB exceeds warning threshold`);
      process.emit('memory-warning', usage);
    }
  }
}
```

#### Garbage Collection Optimization

```javascript
// src/utils/gc-optimizer.js
export class GCoptimizer {
  constructor() {
    this.gcInterval = null;
  }

  startOptimization(interval = 300000) { // 5 minutes
    if (this.gcInterval) return;

    this.gcInterval = setInterval(() => {
      this.optimizeGC();
    }, interval);
  }

  stopOptimization() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  optimizeGC() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;

    // Force garbage collection if memory usage is high
    if (heapUsed > 300 * 1024 * 1024 && global.gc) { // 300MB
      console.log('Forcing garbage collection...');
      global.gc();
      
      const afterGC = process.memoryUsage();
      const freedMemory = heapUsed - afterGC.heapUsed;
      
      console.log(`Garbage collection freed ${Math.round(freedMemory / 1024 / 1024)}MB`);
    }
  }
}
```

## Security Maintenance

### Security Audits

#### Automated Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  schedule:
    - cron: '0 6 * * 0'  # Weekly on Sunday at 6 AM
  workflow_dispatch:

jobs:
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run security audit
        run: bun audit
      
      - name: Check for vulnerabilities
        run: |
          if [ -f "audit-results.json" ]; then
            echo "Security audit completed with results"
            cat audit-results.json
          else
            echo "No security issues found"
          fi
```

#### Manual Security Review

```javascript
// scripts/security-review.js
import { execSync } from 'child_process';

export async function runSecurityReview() {
  console.log('Starting security review...');
  
  const issues = [];
  
  // Check for exposed secrets
  const gitHistory = execSync('git log --all --full-history --grep="password\|secret\|key"', { encoding: 'utf8' });
  if (gitHistory.trim()) {
    issues.push('Potential secrets in git history');
  }
  
  // Check environment variables
  const envVars = process.env;
  const requiredSecrets = ['ADMIN_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  
  for (const secret of requiredSecrets) {
    if (!envVars[secret] || envVars[secret].length < 10) {
      issues.push(`Weak or missing ${secret}`);
    }
  }
  
  // Check for outdated dependencies
  try {
    const outdated = execSync('bun outdated', { encoding: 'utf8' });
    if (outdated.includes('outdated')) {
      issues.push('Outdated dependencies found');
    }
  } catch (error) {
    // bun outdated returns non-zero exit code when no outdated packages
  }
  
  // Report issues
  if (issues.length > 0) {
    console.warn('Security issues found:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
  } else {
    console.log('No security issues found');
  }
  
  return issues;
}
```

### Certificate Management

#### SSL Certificate Renewal

```bash
#!/bin/bash
# scripts/renew-certificates.sh

echo "Checking SSL certificate expiration..."

# Check certificate expiration
cert_expires=$(openssl x509 -in /etc/ssl/certs/your-blog.com.crt -noout -enddate | cut -d= -f2)
cert_date=$(date -d "$cert_expires" +%s)
current_date=$(date +%s)
days_until_expiry=$(( (cert_date - current_date) / 86400 ))

echo "Certificate expires in $days_until_expiry days"

if [ $days_until_expiry -lt 30 ]; then
  echo "Certificate expires soon, renewing..."
  
  # Renew certificate using Let's Encrypt
  certbot renew --quiet
  
  # Restart web server
  systemctl reload nginx
  
  echo "Certificate renewed successfully"
else
  echo "Certificate is valid for more than 30 days"
fi
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High Memory Usage

**Symptoms:**
- Application slowdowns
- Frequent garbage collection
- Memory warnings

**Solutions:**
```bash
# Check memory usage
pm2 monit

# Force garbage collection
pm2 restart rss-feed-optimization --update-env

# Check for memory leaks
pm2 show rss-feed-optimization

# Increase memory limit
pm2 restart rss-feed-optimization --max-memory-restart 1G
```

#### 2. Slow Response Times

**Symptoms:**
- High response times
- Slow RSS generation
- Poor user experience

**Solutions:**
```bash
# Check application metrics
curl http://localhost:3000/api/v1/metrics

# Check cache hit rate
curl http://localhost:3000/api/v1/cache/stats

# Monitor CPU usage
top

# Check for blocking operations
pm2 monit
```

#### 3. R2 Connection Issues

**Symptoms:**
- Failed uploads/downloads
- Connection timeouts
- Storage errors

**Solutions:**
```bash
# Test R2 connection
bun -e "
import { s3 } from 'bun';
const client = s3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: 'https://your-account.r2.cloudflarestorage.com',
  region: 'auto'
});
console.log('R2 connection test:', await client.listBuckets());
"

# Check R2 credentials
echo "R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:0:4}..."
echo "R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:0:4}..."
```

#### 4. DNS Resolution Issues

**Symptoms:**
- Slow external API calls
- DNS timeouts
- Connection failures

**Solutions:**
```bash
# Test DNS resolution
nslookup feeds.feedburner.com

# Check DNS prefetching
curl http://localhost:3000/api/v1/dns/stats

# Clear DNS cache
sudo dscacheutil -flushcache
```

### Emergency Procedures

#### Application Restart

```bash
# Graceful restart
pm2 restart rss-feed-optimization

# Force restart
pm2 restart rss-feed-optimization --force

# Check application status
pm2 status
```

#### Rollback to Previous Version

```bash
# List previous versions
pm2 ls

# Rollback to previous version
pm2 rollback rss-feed-optimization

# Check rollback status
pm2 logs rss-feed-optimization
```

#### Emergency Backup

```bash
#!/bin/bash
# scripts/emergency-backup.sh

DATE=$(date +%Y-%m-%d-%H-%M-%S)
BACKUP_NAME="emergency-backup-$DATE"

echo "Creating emergency backup: $BACKUP_NAME"

# Create backup directory
mkdir -p /tmp/$BACKUP_NAME

# Backup R2 data
aws s3 sync s3://production-bucket s3://backup-bucket/emergency/$BACKUP_NAME/

# Backup application state
pm2 dump /tmp/$BACKUP_NAME/pm2.dump

# Backup configuration
cp .env /tmp/$BACKUP_NAME/
cp package.json /tmp/$BACKUP_NAME/

# Upload to secure location
aws s3 cp /tmp/$BACKUP_NAME s3://backup-bucket/emergency/ --recursive

# Clean up
rm -rf /tmp/$BACKUP_NAME

echo "Emergency backup completed: $BACKUP_NAME"
```

## Maintenance Schedule

### Daily Tasks

- [ ] Check application health
- [ ] Monitor system resources
- [ ] Review error logs
- [ ] Check backup status

### Weekly Tasks

- [ ] Run security audit
- [ ] Check for dependency updates
- [ ] Review performance metrics
- [ ] Clean up old logs

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review security configuration
- [ ] Test backup and recovery
- [ ] Performance optimization review

### Quarterly Tasks

- [ ] Security penetration testing
- [ ] Infrastructure review
- [ ] Disaster recovery testing
- [ ] Documentation updates

This comprehensive maintenance guide ensures the RSS Feed Optimization project remains secure, performant, and reliable over time.