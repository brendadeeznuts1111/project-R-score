# Enhanced Bucket Visualization - Bootstrap Setup Guide

This guide will help you set up and run the enhanced bucket visualization system continuously with monitoring and automatic recovery.

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone and navigate to project
cd foxy-proxy

# Run the bootstrap setup
./scripts/bucket-bootstrap.sh setup
```

### 2. Configure Environment

Edit the environment file with your R2 credentials:

```bash
# Edit the environment file
nano packages/dashboard/.env
```

Required variables:

```env
VITE_R2_ACCOUNT_ID=your_cloudflare_account_id
VITE_R2_ACCESS_KEY_ID=your_r2_access_key_id
VITE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
VITE_R2_BUCKET_NAME=your_bucket_name
VITE_R2_PUBLIC_URL=https://pub-your-account-id.r2.dev
```

### 3. Start the Server

```bash
# Start the bucket visualization server
./scripts/bucket-bootstrap.sh start
```

The server will be available at: http://localhost:5173

## 📋 Management Commands

### Bootstrap Script Commands

```bash
./scripts/bucket-bootstrap.sh setup     # Initial environment setup
./scripts/bucket-bootstrap.sh start     # Start the server
./scripts/bucket-bootstrap.sh stop      # Stop the server
./scripts/bucket-bootstrap.sh restart   # Restart the server
./scripts/bucket-bootstrap.sh status    # Show server status
./scripts/bucket-bootstrap.sh logs      # Show server logs
./scripts/bucket-bootstrap.sh help      # Show help
```

### Monitoring Commands

```bash
./scripts/bucket-monitor.sh dashboard  # Interactive monitoring dashboard
./scripts/bucket-monitor.sh monitor    # Start continuous monitoring
./scripts/bucket-monitor.sh health     # Run health check
./scripts/bucket-monitor.sh alerts     # Check for alerts
./scripts/bucket-monitor.sh logs       # Show health/metrics logs
```

## 🔧 Continuous Operation Options

### Option 1: Simple Background Process

```bash
# Start in background
./scripts/bucket-bootstrap.sh start

# Check status anytime
./scripts/bucket-bootstrap.sh status

# View logs
./scripts/bucket-bootstrap.sh logs
```

### Option 2: Screen/Tmux Session

```bash
# Using screen
screen -S bucket-visualizer
./scripts/bucket-bootstrap.sh start
# Press Ctrl+A, D to detach

# Reattach later
screen -r bucket-visualizer

# Using tmux
tmux new-session -d -s bucket-visualizer './scripts/bucket-bootstrap.sh start'
tmux attach-session -t bucket-visualizer
```

### Option 3: Systemd Service (Linux)

```bash
# Copy and modify the service file
sudo cp scripts/bucket-visualizer.service /etc/systemd/system/
sudo nano /etc/systemd/system/bucket-visualizer.service

# Update user/group paths and environment
sudo systemctl daemon-reload
sudo systemctl enable bucket-visualizer
sudo systemctl start bucket-visualizer

# Check status
sudo systemctl status bucket-visualizer
```

### Option 4: Launch Agent (macOS)

```bash
# Create launch agent file
cat > ~/Library/LaunchAgents/com.foxyproxy.bucket-visualizer.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.foxyproxy.bucket-visualizer</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/bun</string>
        <string>run</string>
        <string>dev</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/nolarose/foxy-proxy/packages/dashboard</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/nolarose/foxy-proxy/logs/bucket-visualizer.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/nolarose/foxy-proxy/logs/bucket-visualizer.error.log</string>
</dict>
</plist>
EOF

# Load the agent
launchctl load ~/Library/LaunchAgents/com.foxyproxy.bucket-visualizer.plist

# Unload to stop
launchctl unload ~/Library/LaunchAgents/com.foxyproxy.bucket-visualizer.plist
```

## 📊 Monitoring and Health Checks

### Real-time Dashboard

```bash
# Start interactive monitoring dashboard
./scripts/bucket-monitor.sh dashboard
```

The dashboard shows:

- Server status and PID
- Resource usage (CPU, Memory, Disk)
- Recent health checks
- Performance metrics
- System information

### Health Checks

The system performs automatic health checks every 30 seconds when monitoring is active:

- Server process status
- HTTP response verification
- Resource usage monitoring
- Disk space checks
- Memory usage alerts

### Log Files

All logs are stored in the `logs/` directory:

- `bucket-server.log` - Main server logs
- `health-check.log` - Health check results
- `metrics.log` - Performance metrics

## 🔒 Security Considerations

### Environment Variables

- Store sensitive credentials in `.env` file (not in version control)
- Use read-only access keys when possible
- Rotate keys regularly
- Use environment-specific configurations

### Network Security

- Server runs on localhost by default
- Configure firewall rules for production
- Use HTTPS in production environments
- Consider reverse proxy for additional security

### File Permissions

```bash
# Secure log files
chmod 700 logs/
chmod 600 logs/*

# Secure scripts
chmod 700 scripts/*.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **Server won't start**

   ```bash
   # Check environment file
   ./scripts/bucket-bootstrap.sh setup

   # Check logs
   ./scripts/bucket-bootstrap.sh logs

   # Verify dependencies
   cd packages/dashboard && bun install
   ```

2. **Server stops unexpectedly**

   ```bash
   # Check health
   ./scripts/bucket-monitor.sh health

   # Check alerts
   ./scripts/bucket-monitor.sh alerts

   # Restart
   ./scripts/bucket-bootstrap.sh restart
   ```

3. **High resource usage**

   ```bash
   # Monitor metrics
   ./scripts/bucket-monitor.sh dashboard

   # Check for memory leaks
   ps aux | grep bun
   ```

4. **Connection issues**

   ```bash
   # Verify port availability
   lsof -i :5173

   # Check firewall
   sudo ufw status

   # Test HTTP response
   curl -I http://localhost:5173
   ```

### Performance Optimization

1. **Memory Usage**
   - Limit file preview size in configuration
   - Enable file cleanup for old uploads
   - Monitor memory trends with metrics

2. **Disk Space**
   - Set up log rotation
   - Clean up temporary files
   - Monitor bucket storage usage

3. **Network Performance**
   - Use CDN for static assets
   - Enable compression
   - Optimize API calls

## 🔄 Maintenance

### Daily Tasks

```bash
# Check server status
./scripts/bucket-bootstrap.sh status

# Review health logs
./scripts/bucket-monitor.sh logs

# Check for alerts
./scripts/bucket-monitor.sh alerts
```

### Weekly Tasks

```bash
# Rotate logs
mv logs/bucket-server.log logs/bucket-server.log.old
mv logs/health-check.log logs/health-check.log.old
mv logs/metrics.log logs/metrics.log.old

# Update dependencies
cd packages/dashboard && bun update

# Check disk usage
df -h
```

### Monthly Tasks

```bash
# Security audit
# - Review access logs
# - Check for unusual activity
# - Update credentials if needed

# Performance review
# - Analyze metrics trends
# - Optimize configurations
# - Clean up old data
```

## 📈 Scaling Considerations

### Horizontal Scaling

- Use load balancer for multiple instances
- Implement session management
- Set up database for persistent storage

### Vertical Scaling

- Increase memory allocation
- Optimize database queries
- Use caching strategies

### Production Deployment

1. **Containerization**

   ```dockerfile
   FROM oven/bun:latest
   WORKDIR /app
   COPY package*.json ./
   RUN bun install
   COPY . .
   EXPOSE 5173
   CMD ["bun", "run", "dev"]
   ```

2. **Cloud Deployment**
   - Use managed services (Vercel, Netlify)
   - Set up CI/CD pipelines
   - Configure monitoring and alerts

3. **Database Integration**
   - Add PostgreSQL/MongoDB
   - Implement data persistence
   - Set up backup strategies

## 📞 Support

### Getting Help

1. Check the logs for error messages
2. Review this troubleshooting guide
3. Check the GitHub issues
4. Contact support with detailed information

### Reporting Issues

Include in your report:

- Operating system and version
- Node.js/Bun version
- Error messages from logs
- Steps to reproduce
- Expected vs actual behavior

---

**Happy bucket visualizing! 🎉**
