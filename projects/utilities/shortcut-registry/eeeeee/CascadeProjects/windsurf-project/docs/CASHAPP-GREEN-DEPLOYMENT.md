# 🚀 Cash App Green Deployment Guide

## 📋 Prerequisites

### **System Requirements**
- **Node.js**: Not required (uses Bun runtime)
- **Bun**: v1.3.6+ 
- **Memory**: 4GB+ RAM
- **Storage**: 20GB+ available
- **Network**: Stable internet connection

### **Cash App Business API Setup**
1. **Apply for Business Account**: https://developer.squareup.com/docs/cash-app-api
2. **EIN Required**: US business tax identification
3. **Compliance Review**: 2-4 week approval process
4. **API Credentials**: Client ID, Client Secret, Access Token

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/nolarose-windsurf-project.git
cd nolarose-windsurf-project

# Install dependencies with Bun
bun install

# Copy environment template
cp .env.example .env.green

# Edit environment variables
nano .env.green
```

## ⚙️ Environment Configuration

```bash
# .env.green - Cash App Green Configuration

# Cash App Business API Credentials
CASHAPP_ACCOUNT_ID=acc_your_account_id_here
CASHAPP_CLIENT_ID=your_client_id_here
CASHAPP_CLIENT_SECRET=your_client_secret_here
CASHAPP_ACCESS_TOKEN=ca_production_token_here
CASHAPP_REFRESH_TOKEN=ca_refresh_token_here

# Compliance & Security
CHAINALYSIS_API_KEY=chainalysis_api_key_here
FINCEN_REPORTING_ENABLED=true
OFAC_SCREENING_ENABLED=true

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/duoplus_green
REDIS_URL=redis://localhost:6379

# S3 Configuration (for audit logs)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=duoplus-green-audit-logs

# Lightning Network Configuration
LND_RPC_HOST=localhost:10009
LND_MACAROON_PATH=/path/to/admin.macaroon
LND_TLS_CERT_PATH=/path/to/tls.cert

# Performance Settings
MAX_CONCURRENT_DEPOSITS=10
DEPOSIT_TIMEOUT_MS=30000
PRICE_UPDATE_INTERVAL_MS=30000

# Monitoring & Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your/webhook
PAGERDUTY_SERVICE_KEY=your_pagerduty_key

# Feature Flags
ENABLE_REAL_TIME_PRICE_FEED=true
ENABLE_VOLATILITY_ROUTING=true
ENABLE_ADVANCED_DASHBOARD=true
ENABLE_COMPLIANCE_REPORTING=true

# Development Settings
NODE_ENV=production
LOG_LEVEL=info
DEBUG_MODE=false
```

## 🗄️ Database Setup

```bash
# PostgreSQL setup
sudo -u postgres createdb duoplus_green
psql -d duoplus_green -f schema/cashapp-green.sql

# Redis setup (for caching)
redis-server --daemonize yes

# Run database migrations
bun run migrations:run
```

## 🚀 Service Deployment

### **Option 1: Systemd Service (Recommended)**

```bash
# Create service file
sudo nano /etc/systemd/system/cashapp-green.service
```

```ini
[Unit]
Description=DuoPlus Cash App Green Yield Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=duoplus
Group=duoplus
WorkingDirectory=/opt/duoplus-green
Environment=NODE_ENV=production
EnvironmentFile=/opt/duoplus-green/.env.green
ExecStart=/usr/local/bin/bun run services/cashapp-green-service.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cashapp-green
sudo systemctl start cashapp-green

# Check status
sudo systemctl status cashapp-green
```

### **Option 2: Docker Deployment**

```dockerfile
# Dockerfile
FROM oven/bun:1.3.6-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S duoplus && \
    adduser -S duoplus -u 1001

USER duoplus

EXPOSE 3227

CMD ["bun", "run", "services/cashapp-green-service.ts"]
```

```bash
# Build and run
docker build -t duoplus-cashapp-green .
docker run -d \
  --name cashapp-green \
  --restart unless-stopped \
  -p 3227:3227 \
  --env-file .env.green \
  -v /opt/duoplus-green/data:/app/data \
  duoplus-cashapp-green
```

### **Option 3: Kubernetes Deployment**

```yaml
# k8s/cashapp-green-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cashapp-green
  labels:
    app: cashapp-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cashapp-green
  template:
    metadata:
      labels:
        app: cashapp-green
    spec:
      containers:
      - name: cashapp-green
        image: duoplus-cashapp-green:latest
        ports:
        - containerPort: 3227
        env:
        - name: NODE_ENV
          value: "production"
        - name: CASHAPP_ACCOUNT_ID
          valueFrom:
            secretKeyRef:
              name: cashapp-secrets
              key: account-id
        - name: CASHAPP_ACCESS_TOKEN
          valueFrom:
            secretKeyRef:
              name: cashapp-secrets
              key: access-token
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3227
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3227
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cashapp-green-service
spec:
  selector:
    app: cashapp-green
  ports:
  - protocol: TCP
    port: 3227
    targetPort: 3227
  type: LoadBalancer
```

## 🔍 Monitoring & Observability

### **Health Checks**

```bash
# Service health
curl http://localhost:3227/api/health

# Detailed status
curl http://localhost:3227/api/status

# Metrics endpoint
curl http://localhost:3227/api/metrics
```

### **Log Management**

```bash
# View service logs
sudo journalctl -u cashapp-green -f

# Application logs
tail -f logs/cashapp-green.log

# Audit logs (S3)
aws s3 ls s3://duoplus-green-audit-logs/
```

### **Monitoring Stack**

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki.yml:/etc/loki/local-config.yaml

volumes:
  grafana-storage:
```

## 🧪 Testing & Validation

```bash
# Run unit tests
bun test test/cashapp-green.test.ts

# Run integration tests
bun test test/cashapp-green-integration.test.ts

# Run performance tests
bun test test/performance/routing.test.ts

# Security audit
bun audit

# Type checking
bunx tsc --noEmit

# Linting
bunx eslint src/ --ext .ts
```

## 📊 Performance Tuning

### **Database Optimization**

```sql
-- Create indexes for performance
CREATE INDEX idx_deposits_user_id ON cashapp_green_deposits(user_id);
CREATE INDEX idx_deposits_timestamp ON cashapp_green_deposits(timestamp);
CREATE INDEX idx_routing_decisions_timestamp ON routing_decisions(timestamp);

-- Partition large tables
CREATE TABLE cashapp_green_deposits_2024 PARTITION OF cashapp_green_deposits
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### **Caching Strategy**

```bash
# Redis configuration
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### **Load Balancing**

```nginx
# nginx.conf
upstream cashapp_green {
    server 127.0.0.1:3227;
    server 127.0.0.1:3228;
    server 127.0.0.1:3229;
}

server {
    listen 80;
    server_name api.duoplus.app;
    
    location / {
        proxy_pass http://cashapp_green;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🔒 Security Hardening

### **Network Security**

```bash
# Firewall rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3227/tcp  # Application
sudo ufw enable
```

### **SSL/TLS Setup**

```bash
# Generate SSL certificate
sudo certbot --nginx -d api.duoplus.app

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Security Monitoring**

```bash
# Fail2ban setup
sudo apt install fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[jail.local]
[cashapp-green]
enabled = true
port = 3227
filter = cashapp-green
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
```

## 🚨 Incident Response

### **Alerting Rules**

```yaml
# alerts/cashapp-green.yml
groups:
- name: cashapp-green
  rules:
  - alert: HighFailureRate
    expr: rate(cashapp_deposits_failed_total[5m]) > 0.05
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High deposit failure rate detected"
      
  - alert: LowYieldGeneration
    expr: cashapp_yield_rate < 0.03
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Yield generation below expected rate"
```

### **Runbook**

```bash
# Emergency commands
./scripts/emergency-stop.sh          # Stop all routing
./scripts/emergency-rollback.sh      # Rollback to last version
./scripts/emergency-withdraw.sh      # Emergency withdrawal
./scripts/compliance-report.sh       # Generate compliance report
```

## 📈 Scaling Strategy

### **Horizontal Scaling**

```bash
# Add more instances
kubectl scale deployment cashapp-green --replicas=5

# Auto-scaling
kubectl autoscale deployment cashapp-green --cpu-percent=70 --min=3 --max=10
```

### **Database Scaling**

```bash
# Read replicas
CREATE DATABASE duoplus_green_replica;
# Configure streaming replication

# Connection pooling
pgbouncer -d 5432 -u duoplus -p 6432
```

## 🔄 Backup & Recovery

### **Automated Backups**

```bash
# Database backup
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

pg_dump duoplus_green | gzip > $BACKUP_DIR/database.sql.gz
aws s3 cp $BACKUP_DIR/database.sql.gz s3://duoplus-backups/database/
```

### **Disaster Recovery**

```bash
# Restore procedure
#!/bin/bash
aws s3 cp s3://duoplus-backups/database/latest.sql.gz .
gunzip latest.sql.gz
psql duoplus_green < latest.sql
```

## 🎯 Production Checklist

- [ ] **Cash App Business API** approved and configured
- [ ] **Environment variables** securely configured
- [ ] **Database schema** deployed and indexed
- [ ] **SSL certificates** installed and auto-renewing
- [ ] **Monitoring** configured (Prometheus + Grafana)
- [ ] **Alerting** rules set up and tested
- [ ] **Backup strategy** implemented and tested
- [ ] **Load testing** completed and optimized
- [ ] **Security audit** passed
- [ ] **Compliance reporting** configured
- [ ] **Documentation** updated and distributed
- [ ] **Team training** completed

## 📞 Support

- **Documentation**: https://docs.duoplus.app/cashapp-green
- **Issues**: https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues
- **Support**: support@duoplus.app
- **Emergency**: emergency@duoplus.app

---

**🚀 Ready to generate yield with Cash App Green!**
