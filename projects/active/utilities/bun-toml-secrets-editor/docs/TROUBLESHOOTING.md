# Troubleshooting - Common Issues & Solutions

## 🔧 Common Issues

Quick solutions to common problems with the Enhanced Matrix CLI.

---

## 🚀 Installation & Setup Issues

### **Dependencies Not Installing**
```bash
# Clear cache and reinstall
bun rm -rf node_modules bun.lock
bun install

# Update Bun to latest version
bun upgrade

# Check Node/Bun version
bun --version
node --version
```

### **Permission Errors**
```bash
# Fix permissions on Unix systems
chmod +x scripts/*.sh
sudo chown -R $USER:$USER ~/.matrix/

# On Windows, run as Administrator
# or use PowerShell with elevated privileges
```

### **Configuration Not Found**
```bash
# Reset configuration
rm -rf ~/.matrix/
bun run matrix:analytics:dashboard  # This will recreate directories

# Verify config file exists
ls -la config.toml
cat config.toml
```

---

## 👤 Profile Management Issues

### **Profile Not Found**
```bash
# Check available profiles
bun run matrix:profile:list

# Verify profile file exists
ls profiles/
ls profiles/your-profile-name.json

# Recreate profile if missing
bun run matrix:profile:create your-profile-name
```

### **Validation Failed**
```bash
# Analyze profile to see validation issues
bun run matrix:profile:analyze profile-name

# Check validation rules
cat config.toml | grep -A 10 validation

# Force apply if necessary (use with caution)
bun run matrix:profile:use profile-name --force

# Check compliance score
bun run matrix:analytics:dashboard
```

### **Profile Apply Errors**
```bash
# Check profile syntax
cat profiles/your-profile.json | jq .

# Validate JSON format
bun run matrix:profile:analyze your-profile

# Check environment variables
env | grep MATRIX_
```

---

## 📊 Analytics Issues

### **No Data in Dashboard**
```bash
# Check if analytics is enabled
grep -i analytics config.toml

# Manually trigger event tracking
bun run matrix:profile:use some-profile --validate-rules

# Check analytics file
ls -la ~/.matrix/analytics/
cat ~/.matrix/analytics/events.jsonl

# Reset analytics if corrupted
rm ~/.matrix/analytics/events.jsonl
bun run matrix:analytics:dashboard
```

### **Export Errors**
```bash
# Check file permissions
ls -la ~/.matrix/analytics/

# Try different export format
bun run matrix:analytics:export --format=json
bun run matrix:analytics:export --format=csv

# Check available disk space
df -h
```

### **Report Generation Fails**
```bash
# Check time range format
bun run matrix:analytics:report --time-range=24h
bun run matrix:analytics:report --time-range=7d

# Generate without time range
bun run matrix:analytics:report

# Check logs for errors
tail logs/matrix.log
```

---

## 🛡️ Security Issues

### **Security Scan Fails**
```bash
# Check security configuration
grep -i security config.toml

# Verify security directory
ls -la ~/.matrix/security/

# Reset security data
rm ~/.matrix/security/threats.jsonl
bun run matrix:security:scan

# Check analytics integration
bun run matrix:analytics:dashboard
```

### **False Positive Threats**
```bash
# Review threat details
bun run matrix:security:threats --limit=10

# Unblock legitimate users
bun run matrix:security unblock --user=username

# Adjust security thresholds
# Edit config.toml:
[security]
compliance_threshold = 70  # Lower from 80
threat_sensitivity = "medium"  # From "high"
```

### **User Blocking Issues**
```bash
# Check blocked users
bun run matrix:security:status

# Unblock user
bun run matrix:security unblock --user=username

# Verify user exists
grep username ~/.matrix/security/threats.jsonl
```

---

## 🤖 Automation Issues

### **Workflow Not Found**
```bash
# List available workflows
bun run matrix:automation:list

# Check workflow files
ls -la ~/.matrix/workflows/

# Recreate built-in workflows
rm ~/.matrix/workflows/*.json
bun run matrix:automation:list
```

### **Execution Fails**
```bash
# Check workflow status
bun run matrix:automation:status

# View execution logs
bun run matrix:automation:logs --execution=exec_123

# Cancel stuck execution
bun run matrix:automation:cancel --execution=exec_123

# Check workflow syntax
cat ~/.matrix/workflows/your-workflow.json | jq .
```

### **Workflow Steps Failing**
```bash
# Check step execution details
bun run matrix:automation:logs --execution=exec_123

# Verify built-in actions
bun run matrix:security:scan
bun run matrix:analytics:dashboard

# Test custom commands manually
echo "test command" | bash

# Check timeout settings
grep timeout config.toml
```

---

## 🔧 Configuration Issues

### **Config File Not Found**
```bash
# Create default config
bun run matrix:config:generate --template=basic --output=config.toml

# Check config path
echo $MATRIX_CONFIG_PATH
ls -la $MATRIX_CONFIG_PATH

# Use absolute path
MATRIX_CONFIG_PATH=/full/path/to/config.toml bun run matrix:analytics:dashboard
```

### **Invalid Configuration**
```bash
# Validate TOML syntax
bun run matrix:config:generate --template=basic --output=test.toml
cat test.toml

# Check required sections
grep -E "\[.*\]" config.toml

# Reset to default
cp example-config.toml config.toml
```

### **Environment Variables**
```bash
# Check current environment
env | grep MATRIX_

# Load environment file
source .env.local

# Set variables manually
export MATRIX_CONFIG_PATH="./config.toml"
export MATRIX_LOG_LEVEL="debug"

# Verify variables are loaded
bun run env | grep MATRIX_
```

---

## 📱 Performance Issues

### **Slow Dashboard Loading**
```bash
# Check analytics file size
ls -lh ~/.matrix/analytics/events.jsonl

# Clear old data if too large
bun run matrix:analytics:clear --days=30

# Optimize database
sqlite3 profiles.db "VACUUM;"

# Check system resources
top -p $(pgrep -f matrix)
df -h
```

### **Memory Usage High**
```bash
# Check process memory
ps aux | grep matrix

# Restart services
pkill -f matrix
bun run matrix:analytics:dashboard

# Clear cache
rm -rf ~/.matrix/cache/
```

### **Disk Space Issues**
```bash
# Check disk usage
du -sh ~/.matrix/
du -sh logs/

# Clean old logs
find logs/ -name "*.log" -mtime +7 -delete

# Compress old data
gzip ~/.matrix/analytics/events.jsonl
```

---

## 🌐 Network & Connectivity

### **API Connection Issues**
```bash
# Check network connectivity
curl -I https://api.example.com

# Test DNS resolution
nslookup api.example.com

# Check firewall settings
sudo ufw status
# or on Windows:
netsh advfirewall show allprofiles
```

### **Remote Profile Issues**
```bash
# Test remote connection
curl -X GET https://your-server.com/profiles/

# Check authentication
curl -H "Authorization: Bearer $TOKEN" https://your-server.com/profiles/

# Verify SSL certificates
openssl s_client -connect your-server.com:443
```

---

## 🐛 Debug Mode

### **Enable Debug Logging**
```bash
# Set debug level
export MATRIX_LOG_LEVEL="debug"

# Run with verbose output
bun run matrix:analytics:dashboard --verbose

# Check log files
tail -f logs/matrix.log
tail -f logs/analytics.log
tail -f logs/security.log
```

### **Diagnostic Commands**
```bash
# System information
bun run matrix:diagnostic

# Configuration check
bun run matrix:config:validate

# Health check
bun run matrix:health

# Version information
bun run matrix:version
```

---

## 🔄 Reset & Recovery

### **Full Reset**
```bash
# Backup current data
cp -r ~/.matrix/ ~/.matrix.backup/

# Clear all data
rm -rf ~/.matrix/
rm -rf logs/
rm profiles.db

# Restart fresh
bun run matrix:analytics:dashboard
```

### **Selective Reset**
```bash
# Reset analytics only
rm ~/.matrix/analytics/*

# Reset security only
rm ~/.matrix/security/*

# Reset automation only
rm ~/.matrix/workflows/*
rm ~/.matrix/executions/*

# Reset profiles only
rm profiles.db
```

---

## 📞 Getting Help

### **Command Help**
```bash
# General help
matrix --help

# Specific command help
matrix analytics --help
matrix security --help
matrix automation --help
matrix profile --help
```

### **Community Support**
```bash
# Check GitHub issues
open https://github.com/your-org/bun-toml-secrets-editor/issues

# Join community discussion
open https://github.com/your-org/bun-toml-secrets-editor/discussions

# Check documentation
open docs/README.md
```

### **Report Issues**
```bash
# Generate diagnostic report
bun run matrix:diagnostic --output=diagnostic.json

# Include in bug report
cat diagnostic.json
bun --version
node --version
uname -a
```

---

## 🎯 Prevention Tips

### **Regular Maintenance**
```bash
# Weekly cleanup
bun run matrix:maintenance --cleanup

# Monthly backup
bun run matrix:backup --create

# Quarterly review
bun run matrix:security:report --output=quarterly-security.json
```

### **Monitoring Setup**
```bash
# Set up monitoring
bun run matrix:monitor:setup

# Configure alerts
bun run matrix:alerts:configure --email=admin@company.com

# Health checks
bun run matrix:health --continuous
```

---

## 🆘 Emergency Procedures

### **Security Incident**
```bash
# Immediate security scan
bun run matrix:security:scan

# Block suspicious users
bun run matrix:security:block --user=suspicious-user

# Generate incident report
bun run matrix:security:report --output=incident-$(date +%Y%m%d).json

# Enable enhanced monitoring
export MATRIX_LOG_LEVEL="debug"
bun run matrix:security:monitor --continuous
```

### **System Failure**
```bash
# Emergency backup
bun run matrix:backup:create --emergency

# Switch to backup config
cp config.backup.toml config.toml

# Restart services
pkill -f matrix
bun run matrix:analytics:dashboard
```

---

**🔧 This troubleshooting guide covers the most common issues. For specific problems not covered here, check the [API Reference](./API_REFERENCE.md) or open an issue on GitHub.**
