# ⚡ Profile Payment Linking - Quick Reference

## **🚀 GETTING STARTED**

### **Basic Commands**
```bash
# Show help
matrix profile help

# Create payment link
matrix profile link --profile-id=user123 --payment-account=paypal_user123

# View analytics
matrix profile analytics --timeframe=30d --format=table

# Monitor limits
matrix profile monitor-limits --link-id=link_123

# Run maintenance
matrix profile maintenance --link-id=link_123

# List linked accounts
matrix profile list --profile-id=user123
```

---

## **⚡ SHORTCUTS**

### **Available Shortcuts**
```bash
# List all shortcuts
matrix profile sc list

# Execute shortcuts
matrix profile sc run link_demo           # Demo linking
matrix profile sc run analytics_today     # Today's analytics
matrix profile sc run monitor_all         # Monitor all limits
matrix profile sc run maintenance_full    # Full maintenance
```

### **Create Custom Shortcuts**
Edit `config/profile-payment-shortcuts.toml`:
```toml
[shortcuts]
my_link = "link --profile-id=myuser --payment-account=paypal_myuser"
my_analytics = "analytics --timeframe=7d --format=table"
```

---

## **🤖 AUTOMATION PRESETS**

### **Available Presets**
```bash
# List presets
matrix profile auto list

# Execute presets
matrix profile auto run quick_start user123    # Basic automation
matrix profile auto run power_user user123     # Advanced automation
matrix profile auto run enterprise company456  # Enterprise automation
```

### **Preset Features**
- **Quick Start**: PayPal + Cash App, basic verification
- **Power User**: All platforms, advanced verification
- **Enterprise**: Full automation with compliance monitoring

---

## **⏰ MAINTENANCE SCHEDULING**

### **Available Schedules**
```bash
# List schedules
matrix profile schedule list

# Execute schedules
matrix profile schedule run daily     # Daily health check
matrix profile schedule run weekly    # Weekly optimization
matrix profile schedule run monthly   # Monthly deep clean
```

### **Schedule Operations**
- **Daily**: Verification, balance check, security check
- **Weekly**: Plus limit optimization, risk analysis
- **Monthly**: Plus compliance audit, data cleanup

---

## **📬 NOTIFICATIONS**

### **Send Test Notifications**
```bash
matrix profile notify link_success      # Success notification
matrix profile notify link_failure      # Failure notification
matrix profile notify limit_warning     # Limit warning
matrix profile notify security_alert    # Security alert
```

### **Configure Channels**
Edit `config/profile-payment-shortcuts.toml`:
```toml
[notifications.channels.email]
enabled = true
smtp_server = "smtp.gmail.com"
username = "alerts@company.com"

[notifications.channels.slack]
enabled = true
webhook_url = "${SLACK_WEBHOOK_URL}"
```

---

## **📊 ANALYTICS & REPORTING**

### **Analytics Commands**
```bash
# Different timeframes
matrix profile analytics --timeframe=1d   # Today
matrix profile analytics --timeframe=7d   # Week
matrix profile analytics --timeframe=30d  # Month

# Different formats
matrix profile analytics --format=table   # Table view
matrix profile analytics --format=json    # JSON data
matrix profile analytics --format=csv     # CSV export
```

### **Key Metrics**
- **Success Rate**: Percentage of successful links
- **Total Links**: Number of accounts linked
- **Avg Time**: Average linking time
- **Platform Distribution**: Breakdown by platform

---

## **🔧 CONFIGURATION**

### **Main Config Files**
- `config/profile-payment-linking.json` - Basic configuration
- `config/profile-payment-shortcuts.toml` - Advanced configuration

### **Environment Variables**
```bash
export SMTP_PASSWORD="your_smtp_password"
export SLACK_WEBHOOK_URL="your_slack_webhook"
export DISCORD_WEBHOOK_URL="your_discord_webhook"
export WEBHOOK_URL="your_webhook_url"
export WEBHOOK_TOKEN="your_webhook_token"
```

---

## **🚨 TROUBLESHOOTING**

### **Common Issues**
```bash
# Check configuration loading
matrix profile help  # Shows "using defaults" if config fails

# Test database connection
matrix profile list --profile-id=test

# Verify notification channels
matrix profile notify link_success

# Check system health
matrix profile analytics --timeframe=1d
```

### **Error Messages**
- **"Could not load shortcuts config"** - Check TOML syntax
- **"Profile not found"** - Create profile first
- **"Payment account not found"** - Verify account exists

---

## **📈 PERFORMANCE TIPS**

### **Optimization**
```bash
# Use shortcuts for faster execution
matrix profile sc run analytics_today  # Faster than full command

# Batch operations
matrix profile auto run enterprise user123  # Links all platforms

# Monitor regularly
matrix profile monitor-limits --auto-optimize  # Automatic optimization
```

### **Best Practices**
- Use automation presets for consistent workflows
- Schedule regular maintenance (daily/weekly)
- Monitor limits to avoid account restrictions
- Use notifications for proactive alerts

---

## **🔍 ADVANCED FEATURES**

### **Custom Workflows**
```bash
# Create custom automation
matrix profile auto run quick_start user123
matrix profile schedule run daily
matrix profile notify link_success

# Chain operations
matrix profile sc run link_demo
matrix profile sc run monitor_all
matrix profile sc run maintenance_full
```

### **Integration Examples**
```bash
# DevOps integration
matrix profile auto run enterprise ${USER_ID}
matrix profile analytics --format=json > metrics.json

# Monitoring integration
matrix profile monitor-limits --auto-optimize
matrix profile notify limit_warning
```

---

## **📞 SUPPORT**

### **Getting Help**
```bash
matrix profile help                    # Show all commands
matrix profile sc list                 # List shortcuts
matrix profile auto list               # List presets
matrix profile schedule list           # List schedules
```

### **Documentation**
- `PROFILE_PAYMENT_LINKING.md` - Full technical documentation
- `SHORTAUTOMATION_SUMMARY.md` - Shortcuts & automation guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment procedures

---

## **🎯 QUICK START EXAMPLE**

```bash
# 1. Link your first account
matrix profile link --profile-id=demo --payment-account=paypal_demo

# 2. Check analytics
matrix profile analytics --timeframe=7d

# 3. Monitor limits
matrix profile monitor-limits --link-id=link_123

# 4. Run maintenance
matrix profile maintenance --link-id=link_123

# 5. Use shortcuts for daily operations
matrix profile sc run analytics_today
matrix profile sc run monitor_all
```

---

**🚀 The Profile Payment Linking system is ready for production use!**
