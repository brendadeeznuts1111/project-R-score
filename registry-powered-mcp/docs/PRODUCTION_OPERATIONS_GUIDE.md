# Production Operations Guide - Registry-Powered-MCP v2.4.1

## 🚀 QUICK START

### System Overview
- **Version**: Registry-Powered-MCP v2.4.1
- **Runtime**: Bun 1.3.6_STABLE
- **Architecture**: Zero-trust, quantum-resistant, 300 PoP global deployment
- **Performance Target**: 10.8ms p99 latency
- **Security**: Compile-time config embedding, ML-DSA signing

### Critical Services
```
mcp-registry    # Main MCP server registry
mcp-router      # Request routing and load balancing
mcp-cache       # Redis-backed caching layer
```

## 📊 MONITORING & HEALTH CHECKS

### Health Endpoints
```bash
# System health
curl -f https://cloudflare-workers-app-production.utahj4754.workers.dev/health

# Detailed diagnostics
curl -f https://cloudflare-workers-app-production.utahj4754.workers.dev/health/detailed

# Performance metrics
curl -f https://cloudflare-workers-app-production.utahj4754.workers.dev/metrics
```

### Key Metrics to Monitor
- **Latency**: p99 ≤ 10.8ms
- **Error Rate**: < 0.01%
- **Memory Usage**: ≤ 28MB per instance
- **CPU Usage**: < 5% when idle
- **Logging Throughput**: ≥ 8,500 logs/second

### Alert Thresholds
```yaml
critical:
  latency_p99: "> 15ms for 5m"
  error_rate: "> 1% for 2m"
  memory_usage: "> 40MB for 10m"

warning:
  latency_p99: "> 12ms for 2m"
  cpu_usage: "> 15% for 5m"
  threat_detections: "> 10/minute"
```

## 🔧 ROUTINE OPERATIONS

### Daily Checks
```bash
# 1. Service Status
systemctl status mcp-registry mcp-router mcp-cache

# 2. Log Review
tail -f /var/log/mcp/application.log | grep -E "(ERROR|WARN)"

# 3. Performance Metrics
curl -s https://cloudflare-workers-app-production.utahj4754.workers.dev/metrics | jq '.performance'

# 4. Security Events
curl -s https://cloudflare-workers-app-production.utahj4754.workers.dev/security/events | jq '.recent'
```

### Weekly Maintenance
```bash
# 1. Log Rotation
logrotate /etc/logrotate.d/mcp

# 2. Database Optimization
/opt/mcp/scripts/db-optimize.sh

# 3. Security Scan
/opt/mcp/scripts/security-scan.sh

# 4. Performance Benchmark
/opt/mcp/scripts/benchmark.sh
```

### Monthly Tasks
```bash
# 1. Compliance Audit
/opt/mcp/scripts/compliance-audit.sh

# 2. Backup Verification
/opt/mcp/scripts/backup-verify.sh

# 3. Certificate Rotation
/opt/mcp/scripts/cert-rotate.sh

# 4. Dependency Updates
/opt/mcp/scripts/update-deps.sh
```

## 🚨 INCIDENT RESPONSE

### Severity Levels
- **SEV-1**: Complete system outage, customer impact
- **SEV-2**: Degraded performance, partial functionality loss
- **SEV-3**: Minor issues, monitoring alerts
- **SEV-4**: Informational, no immediate action required

### Emergency Contacts
- **SRE On-Call**: +1-800-SRE-EMERGENCY
- **Security Incident**: +1-800-SEC-INCIDENT
- **Management**: +1-800-EXEC-ONCALL

### Common Issues & Solutions

#### Issue: High Latency
```bash
# Check system load
uptime
top -b -n1 | head -20

# Check service status
systemctl status mcp-router

# Restart if needed
systemctl restart mcp-router

# Emergency rollback if persistent
/opt/mcp/scripts/emergency-rollback-bun-1-2-x.sh "High latency issue"
```

#### Issue: Memory Leak
```bash
# Check memory usage
ps aux --sort=-%mem | head

# Force garbage collection (Bun specific)
kill -USR1 $(pgrep bun)

# Restart service
systemctl restart mcp-registry

# If persistent, scale down and investigate
kubectl scale deployment mcp-registry --replicas=0
```

#### Issue: Security Alert
```bash
# Isolate affected PoP
/opt/mcp/scripts/isolate-pop.sh <pop-id>

# Collect forensics
/opt/mcp/scripts/forensics-collect.sh <incident-id>

# Contact security team
# DO NOT restart services until cleared
```

## 🔄 DEPLOYMENT PROCEDURES

### Standard Deployment
```bash
# 1. Pre-deployment checks
/opt/mcp/scripts/pre-deploy-check.sh

# 2. Backup current state
/opt/mcp/scripts/backup.sh

# 3. Deploy new version
/opt/mcp/scripts/deploy.sh v2.4.1-patch-1

# 4. Health validation
/opt/mcp/scripts/health-check.sh

# 5. Traffic routing
/opt/mcp/scripts/route-traffic.sh 100%
```

### Rollback Procedure
```bash
# Immediate rollback
/opt/mcp/scripts/emergency-rollback-bun-1-2-x.sh "Deployment failure"

/opt/mcp/scripts/rollback.sh

# Verify rollback
/opt/mcp/scripts/health-check.sh
```

## 🔒 SECURITY OPERATIONS

### Access Control
- **Zero-Trust**: All access requires authentication and authorization
- **Principle of Least Privilege**: Minimum permissions for all operations
- **Audit Logging**: All actions logged with tamper-evident signatures

### Security Monitoring
```bash
# Real-time threat detection
watch -n 30 'curl -s https://cloudflare-workers-app-production.utahj4754.workers.dev/security/threats'

# Compliance status
curl -s https://cloudflare-workers-app-production.utahj4754.workers.dev/compliance/status

# Audit trail review
/opt/mcp/scripts/audit-review.sh --last-24h
```

### Incident Handling
1. **Detection**: Alert triggered
2. **Assessment**: Determine impact and severity
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat vectors
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Post-mortem analysis

## 📈 PERFORMANCE TUNING

### Memory Optimization
```bash
# Adjust memory pools
export BUN_MAX_MEMORY=256MB
export BUN_GC_INTERVAL=30000

# Restart services
systemctl restart mcp-registry mcp-router mcp-cache
```

### CPU Optimization
```bash
# Enable SIMD optimizations
export BUN_ENABLE_SIMD=1

# Adjust thread pools
export BUN_THREAD_POOL_SIZE=8
```

### Network Optimization
```bash
# Connection pooling
export BUN_MAX_CONNECTIONS=1000

# Timeout settings
export BUN_CONNECT_TIMEOUT=5000
export BUN_REQUEST_TIMEOUT=30000
```

## 🔧 TROUBLESHOOTING GUIDES

### Service Won't Start
```bash
# Check logs
journalctl -u mcp-registry -n 50

# Check configuration
/opt/mcp/scripts/validate-config.sh

# Check dependencies
/opt/mcp/scripts/check-deps.sh

# Manual start for debugging
/opt/mcp/bin/registry --verbose
```

### Database Connection Issues
```bash
# Test connection
/opt/mcp/scripts/test-db.sh

# Check connection pool
curl -s https://cloudflare-workers-app-production.utahj4754.workers.dev/metrics | jq '.database'

# Restart database service
systemctl restart mcp-cache
```

### Certificate Expiration
```bash
# Check certificate validity
openssl x509 -in /opt/mcp/certs/server.crt -text -noout | grep -A 2 "Validity"

# Renew certificates
/opt/mcp/scripts/cert-renew.sh

# Reload services
systemctl reload mcp-registry
```

## 📚 REFERENCE INFORMATION

### File Locations
```
/opt/mcp/                    # Installation directory
├── bin/                     # Executables
├── config/                  # Configuration files
├── logs/                    # Log files
├── scripts/                 # Management scripts
├── certs/                   # SSL certificates
└── backups/                 # Backup storage
```

### Configuration Files
- `config/registry.toml` - Main configuration
- `config/security.json` - Security settings
- `config/performance.json` - Performance tuning
- `config/compliance.json` - Compliance settings

### Log Files
- `logs/application.log` - Main application logs
- `logs/security.log` - Security events
- `logs/performance.log` - Performance metrics
- `logs/audit.log` - Audit trail

### Key Commands
```bash
# Service management
systemctl {start|stop|restart|status} mcp-{registry|router|cache}

# Log inspection
journalctl -u mcp-registry -f
tail -f /opt/mcp/logs/application.log

# Configuration validation
/opt/mcp/scripts/validate-config.sh

# Performance monitoring
/opt/mcp/scripts/monitor.sh
```

## 📞 SUPPORT & ESCALATION

### Support Tiers
1. **L1 Support**: Basic monitoring and alerting
2. **L2 Support**: Advanced troubleshooting
3. **L3 Support**: Engineering-level issues

### Escalation Path
1. **Operator**: First-line response
2. **SRE Team**: Advanced troubleshooting
3. **Engineering**: Code-level fixes
4. **Management**: Strategic decisions

### External Resources
- **Documentation**: https://cloudflare-workers-app-production.utahj4754.workers.dev/docs
- **Runbooks**: https://cloudflare-workers-app-production.utahj4754.workers.dev/runbooks
- **Status Page**: https://cloudflare-workers-app-production.utahj4754.workers.dev/status
- **Incident Portal**: https://cloudflare-workers-app-production.utahj4754.workers.dev/incidents

---

## 📋 CHECKLIST - Daily Operations

- [ ] Health checks completed
- [ ] Log review performed
- [ ] Performance metrics reviewed
- [ ] Security alerts monitored
- [ ] Backup integrity verified
- [ ] Disk space monitored
- [ ] Certificate expiration checked
- [ ] Update notifications reviewed

## 📋 CHECKLIST - Weekly Operations

- [ ] Log rotation completed
- [ ] Database optimization performed
- [ ] Security scan executed
- [ ] Performance benchmark run
- [ ] System updates applied
- [ ] Backup verification completed

## 📋 CHECKLIST - Monthly Operations

- [ ] Compliance audit completed
- [ ] Certificate rotation performed
- [ ] Dependency updates applied
- [ ] Performance analysis reviewed
- [ ] Disaster recovery tested

---

*This guide is maintained by the SRE team. Last updated: December 19, 2025*