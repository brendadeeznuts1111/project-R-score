# Deployment Documentation

## Overview

This guide covers deploying the Bun Payment Linker backend to various environments, from development setups to production-grade deployments with high availability and scalability.

## Deployment Architecture

### Production Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│            (AWS ALB / Google Cloud Load Balancer)        │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                  Web Server Tier                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Node.js   │ │   Node.js   │ │   Node.js   │       │
│  │  Instance 1 │ │  Instance 2 │ │  Instance 3 │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                Application Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   API GW    │ │   Risk      │ │   Device    │       │
│  │  Service    │ │  Engine     │ │  Manager    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                   Data Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ PostgreSQL  │ │    Redis    │ │   S3/IPFS   │       │
│  │ (Primary)   │ │   Cluster   │ │   Storage   │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Environment Setup

### Development Environment

#### Local Setup
```bash
# Clone repository
git clone <repository-url>
cd bun-payment-linker/backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with local configuration

# Setup database
createdb bun_payment_linker_dev
npm run migrate

# Start development server
npm run dev
```

#### Docker Development
```bash
# Build development image
docker build -f Dockerfile.dev -t bun-payment-linker:dev .

# Run with docker-compose
docker-compose -f docker-compose.dev.yml up
```

### Staging Environment

#### Configuration
```bash
# Environment variables
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://user:pass@staging-db:5432/bun_payment_linker_staging
REDIS_URL=redis://staging-redis:6379

# External APIs (staging)
STRIPE_SECRET_KEY=sk_test_...
PLAID_ENV=sandbox
EQUIFAX_ENV=test
```

#### Deployment Script
```bash
#!/bin/bash
# deploy-staging.sh

set -e

echo "🚀 Deploying to staging..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Run database migrations
npm run migrate

# Build application
npm run build

# Restart service
pm2 restart bun-payment-linker-staging

# Health check
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "✅ Staging deployment complete"
```

## Production Deployment

### AWS Deployment

#### Infrastructure as Code (Terraform)

```hcl
# main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "bun-payment-linker-vpc"
  }
}

# Subnets
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "bun-payment-linker-private-${count.index + 1}"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 100}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "bun-payment-linker-public-${count.index + 1}"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier     = "bun-payment-linker-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r5.large"
  
  allocated_storage     = 500
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "bun_payment_linker"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "bun-payment-linker-final-snapshot"
  
  tags = {
    Name = "bun-payment-linker-db"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "bun-payment-linker-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "bun-payment-linker-redis"
  engine               = "redis"
  node_type            = "cache.r5.large"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  
  tags = {
    Name = "bun-payment-linker-redis"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "bun-payment-linker"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name = "bun-payment-linker"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "bun-payment-linker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  
  container_definitions = jsonencode([
    {
      name  = "bun-payment-linker"
      image = "${aws_ecr_repository.app.repository_url}:latest"
      
      essential = true
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.db_url.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_ssm_parameter.redis_url.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_ssm_parameter.jwt_secret.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
  
  tags = {
    Name = "bun-payment-linker"
  }
}

# Service
resource "aws_ecs_service" "app" {
  name            = "bun-payment-linker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "bun-payment-linker"
    container_port   = 3000
  }
  
  depends_on = [aws_lb_listener.app]
  
  tags = {
    Name = "bun-payment-linker"
  }
}
```

#### Application Load Balancer
```hcl
resource "aws_lb" "app" {
  name               = "bun-payment-linker-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  
  enable_deletion_protection = false
  
  tags = {
    Name = "bun-payment-linker-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name     = "bun-payment-linker-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  tags = {
    Name = "bun-payment-linker-tg"
  }
}

resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.app.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

### Docker Deployment

#### Dockerfile
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY knexfile.js ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/knexfile.js ./
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown nextjs:nodejs logs

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "src/index.js"]
```

#### Docker Compose (Production)
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment

#### Namespace and Config
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bun-payment-linker
  labels:
    name: bun-payment-linker

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: bun-payment-linker
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: bun-payment-linker
type: Opaque
data:
  DATABASE_URL: <base64-encoded-url>
  REDIS_URL: <base64-encoded-url>
  JWT_SECRET: <base64-encoded-secret>
  STRIPE_SECRET_KEY: <base64-encoded-key>
```

#### Deployment
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bun-payment-linker
  namespace: bun-payment-linker
  labels:
    app: bun-payment-linker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bun-payment-linker
  template:
    metadata:
      labels:
        app: bun-payment-linker
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      
      containers:
      - name: app
        image: bun-payment-linker:latest
        imagePullPolicy: Always
        
        ports:
        - containerPort: 3000
          name: http
        
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
        
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      
      imagePullSecrets:
      - name: registry-secret
```

#### Service and Ingress
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bun-payment-linker-service
  namespace: bun-payment-linker
  labels:
    app: bun-payment-linker
spec:
  selector:
    app: bun-payment-linker
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bun-payment-linker-ingress
  namespace: bun-payment-linker
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  tls:
  - hosts:
    - api.bun-payment-linker.com
    secretName: bun-payment-linker-tls
  rules:
  - host: api.bun-payment-linker.com
    http:
      paths:
      - path: /api/v1(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: bun-payment-linker-service
            port:
              number: 80
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
    
    - name: Run security audit
      run: npm audit --audit-level high

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: bun-payment-linker
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
    
    - name: Deploy to ECS
      run: |
        aws ecs update-service --cluster bun-payment-linker --service bun-payment-linker --force-new-deployment
        aws ecs wait services-stable --cluster bun-payment-linker --services bun-payment-linker
    
    - name: Run database migrations
      run: |
        aws ecs run-task \
          --cluster bun-payment-linker \
          --task-definition bun-payment-linker-migration \
          --launch-type FARGATE \
          --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Deployment Scripts

#### Blue-Green Deployment
```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

ENVIRONMENT=${1:-production}
NEW_COLOR=${2:-blue}

echo "🚀 Starting blue-green deployment to $ENVIRONMENT as $NEW_COLOR"

# Get current active color
CURRENT_COLOR=$(aws ecs describe-services \
  --cluster bun-payment-linker \
  --services bun-payment-linker-$ENVIRONMENT \
  --query 'services[0].loadBalancers[0].targetGroupArn' \
  --output text | grep -o 'green\|blue' || echo "unknown")

echo "Current active color: $CURRENT_COLOR"

# Deploy new version to inactive color
echo "Deploying to $NEW_COLOR environment..."
aws ecs update-service \
  --cluster bun-payment-linker \
  --service bun-payment-linker-$ENVIRONMENT-$NEW_COLOR \
  --force-new-deployment

# Wait for deployment to complete
echo "Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster bun-payment-linker \
  --services bun-payment-linker-$ENVIRONMENT-$NEW_COLOR

# Health check
echo "Running health checks..."
NEW_TARGET_ARN=$(aws elbv2 describe-target-groups \
  --names bun-payment-linker-$ENVIRONMENT-$NEW_COLOR \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Test health endpoint
for i in {1..30}; do
  if curl -f http://$NEW_COLOR.$ENVIRONMENT.bun-payment-linker.com/health; then
    echo "✅ Health check passed"
    break
  fi
  echo "⏳ Waiting for health check... ($i/30)"
  sleep 10
done

# Switch traffic to new environment
echo "Switching traffic to $NEW_COLOR..."
aws elbv2 modify-listener \
  --listener-arn $(aws elbv2 describe-listeners \
    --load-balancer-arn $(aws elbv2 describe-load-balancers \
      --names bun-payment-linker-$ENVIRONMENT \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text) \
    --query 'Listeners[0].ListenerArn' \
    --output text) \
  --default-actions Type=forward,TargetGroupArn=$NEW_TARGET_ARN

echo "✅ Blue-green deployment complete!"
```

## Monitoring and Observability

### Prometheus Monitoring

```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'bun-payment-linker'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Bun Payment Linker Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

## Security in Production

### Security Hardening

```bash
#!/bin/bash
# security-hardening.sh

# Update system
apt update && apt upgrade -y

# Install security tools
apt install -y fail2ban ufw

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Security kernel parameters
cat >> /etc/sysctl.conf << EOF
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable SYN cookies
net.ipv4.tcp_syncookies = 1

# Log martian packets
net.ipv4.conf.all.log_martians = 1
EOF

sysctl -p
```

### SSL/TLS Configuration

```nginx
# ssl-params.conf
ssl_protocols TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256;

# SSL session caching
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Other security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

## Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/database.sql.gz

# Redis backup
redis-cli --rdb $BACKUP_DIR/redis.rdb

# File system backup
tar -czf $BACKUP_DIR/files.tar.gz /app/uploads

# Upload to S3
aws s3 sync $BACKUP_DIR s3://bun-payment-linker-backups/$(date +%Y%m%d)/

# Cleanup old backups (keep 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Procedures

```bash
#!/bin/bash
# recovery.sh

BACKUP_DATE=$1
BACKUP_DIR="/backups/$BACKUP_DATE"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date>"
    exit 1
fi

# Download backup from S3
aws s3 sync s3://bun-payment-linker-backups/$BACKUP_DATE/ $BACKUP_DIR/

# Stop application
pm2 stop bun-payment-linker

# Restore database
gunzip -c $BACKUP_DIR/database.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Restore Redis
redis-cli FLUSHALL
redis-cli --rdb $BACKUP_DIR/redis.rdb

# Restore files
tar -xzf $BACKUP_DIR/files.tar.gz -C /

# Start application
pm2 start bun-payment-linker

# Health check
sleep 30
curl -f http://localhost:3000/health

echo "Recovery completed from backup: $BACKUP_DATE"
```

## Performance Optimization

### Database Optimization

```sql
-- Performance tuning configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_applications_tenant_status 
ON applications(tenant_id, status);

CREATE INDEX CONCURRENTLY idx_audit_logs_event_timestamp 
ON audit_logs(event_timestamp DESC);

-- Partition large tables
CREATE TABLE audit_logs_y2024 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Application Performance

```javascript
// Performance monitoring
const performanceMonitor = {
  trackRequest: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Log performance metrics
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent')
      });
      
      // Send to monitoring system
      metrics.timing('http.request.duration', duration, {
        method: req.method,
        route: req.route?.path,
        status: res.statusCode
      });
    });
    
    next();
  }
};
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check connection
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   
   # Check connection pool
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   redis-cli ping
   
   # Check memory usage
   redis-cli info memory
   ```

3. **Application Not Starting**
   ```bash
   # Check logs
   pm2 logs bun-payment-linker
   
   # Check configuration
   node -e "console.log(require('./src/config/database'))"
   ```

### Debugging Tools

```bash
# System monitoring
htop
iotop
nethogs

# Application monitoring
pm2 monit
pm2 logs

# Network debugging
netstat -tulpn
ss -tulpn
tcpdump -i any port 3000
```

## Conclusion

This deployment guide provides comprehensive instructions for deploying the Bun Payment Linker backend across various environments. Follow the specific deployment method that best suits your infrastructure and requirements.

For deployment support, contact: **devops@bun-payment-linker.com**
