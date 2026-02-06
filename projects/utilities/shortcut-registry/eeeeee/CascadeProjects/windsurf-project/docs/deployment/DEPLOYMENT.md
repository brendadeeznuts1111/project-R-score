# Deployment Guide

This guide provides comprehensive instructions for deploying the Windsurf fraud detection system in various environments, from development to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Configuration Management](#configuration-management)
- [Monitoring & Observability](#monitoring--observability)
- [Security Considerations](#security-considerations)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### System Requirements

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| **CPU** | 2 cores | 4 cores | 8+ cores |
| **Memory** | 4 GB | 8 GB | 16+ GB |
| **Storage** | 20 GB | 50 GB | 100+ GB SSD |
| **Network** | 100 Mbps | 1 Gbps | 10+ Gbps |
| **OS** | Linux/macOS | Linux (Ubuntu 20.04+) | RHEL/CentOS 8+ |

### Software Dependencies

```bash
# Required software versions
Node.js >= 18.0.0
Bun >= 1.3.0
Docker >= 20.10.0
Kubernetes >= 1.24.0 (optional)
PostgreSQL >= 14.0 (optional)
Redis >= 6.0 (optional)
```

### Cloud Provider Accounts

- **AWS**: IAM user with appropriate permissions
- **Google Cloud**: Service account with Compute Engine access
- **Azure**: Subscription with Contributor role
- **DigitalOcean**: Personal access token

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/brendadeeznuts1111/nolarose-windsurf-project.git
cd nolarose-windsurf-project
```

### 2. Install Dependencies

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install project dependencies
bun install

# Install development dependencies
bun install --dev
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Build Application

```bash
# Build for production
bun run build

# Run tests to verify setup
bun test

# Run linting
bun run lint
```

## Development Deployment

### Local Development

```bash
# Start development server
bun run dev

# Start with hot reload
bun run dev --watch

# Start with debugging
bun run dev --debug
```

### Docker Development

```bash
# Build development image
docker build -f Dockerfile.dev -t windsurf-dev .

# Run development container
docker run -p 3001:3001 -v $(pwd):/app windsurf-dev

# Run with environment file
docker run -p 3001:3001 --env-file .env windsurf-dev
```

### Docker Compose Development

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - HOST=0.0.0.0
      - PORT=3001
    volumes:
      - .:/app
      - /app/node_modules
    command: bun run dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: windsurf_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  redis_data:
  postgres_data:
```

```bash
# Start development stack
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop stack
docker-compose -f docker-compose.dev.yml down
```

## Staging Deployment

### AWS Staging

#### 1. EC2 Deployment

```bash
# Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --user-data file://user-data.sh

# Connect to instance
ssh -i your-key-pair.pem ec2-user@your-instance-ip

# Setup application on EC2
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker

# Clone and deploy
git clone https://github.com/brendadeeznuts1111/nolarose-windsurf-project.git
cd nolarose-windsurf-project
docker build -t windsurf-staging .
docker run -d -p 3001:3001 --name windsurf-staging windsurf-staging
```

#### 2. ECS Deployment

```json
{
  "family": "windsurf-staging",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "windsurf",
      "image": "your-account.dkr.ecr.region.amazonaws.com/windsurf:staging",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "staging"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/windsurf-staging",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Staging

#### Cloud Run Deployment

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/your-project/windsurf-staging

# Deploy to Cloud Run
gcloud run deploy windsurf-staging \
  --image gcr.io/your-project/windsurf-staging \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

### Azure Staging

#### Container Instances

```bash
# Create resource group
az group create --name windsurf-staging --location eastus

# Deploy container
az container create \
  --resource-group windsurf-staging \
  --name windsurf-staging \
  --image your-registry/windsurf:staging \
  --cpu 1 \
  --memory 2 \
  --ports 3001 \
  --environment-variables NODE_ENV=staging
```

## Production Deployment

### Production Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Application   │────│   Database      │
│   (HTTPS/SSL)   │    │   (Auto-scale)  │    │   (Clustered)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Edge      │    │   Redis Cache   │    │   Monitoring    │
│   (CloudFlare)  │    │   (Clustered)   │    │   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### AWS Production

#### 1. VPC Setup

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=windsurf-prod-vpc}]'

# Create subnets
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.1.0/24 --availability-zone us-west-2a
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.2.0/24 --availability-zone us-west-2b

# Create internet gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=windsurf-prod-igw}]'
aws ec2 attach-internet-gateway --vpc-id vpc-xxxxxxxxx --internet-gateway-id igw-xxxxxxxxx
```

#### 2. ECS Production Deployment

```json
{
  "family": "windsurf-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "windsurf",
      "image": "your-account.dkr.ecr.region.amazonaws.com/windsurf:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:windsurf/db-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/windsurf-prod",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "resourceRequirements": [
        {
          "type": "MEMORY",
          "value": "2048"
        }
      ],
      "ulimits": [
        {
          "name": "nofile",
          "softLimit": 65536,
          "hardLimit": 65536
        }
      ]
    }
  ]
}
```

#### 3. Auto Scaling Configuration

```bash
# Create target tracking scaling policy
aws applicationautoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/windsurf-prod/windsurf-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name windsurf-cpu-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60,
  "DisableScaleIn": false
}
```

### Kubernetes Production

#### 1. Namespace and ConfigMaps

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: windsurf-prod
  labels:
    name: windsurf-prod
    environment: production

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: windsurf-config
  namespace: windsurf-prod
data:
  NODE_ENV: "production"
  HOST: "0.0.0.0"
  PORT: "3001"
  LOG_LEVEL: "info"
```

#### 2. Secret Management

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: windsurf-secrets
  namespace: windsurf-prod
type: Opaque
data:
  DATABASE_URL: <base64-encoded-url>
  REDIS_URL: <base64-encoded-url>
  JWT_SECRET: <base64-encoded-secret>
  API_KEY: <base64-encoded-key>
```

#### 3. Deployment Configuration

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windsurf
  namespace: windsurf-prod
  labels:
    app: windsurf
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: windsurf
  template:
    metadata:
      labels:
        app: windsurf
        version: v1
    spec:
      containers:
      - name: windsurf
        image: your-registry/windsurf:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: windsurf-config
        - secretRef:
            name: windsurf-secrets
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
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

#### 4. Service and Ingress

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: windsurf-service
  namespace: windsurf-prod
spec:
  selector:
    app: windsurf
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: windsurf-ingress
  namespace: windsurf-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.windsurf-project.com
    secretName: windsurf-tls
  rules:
  - host: api.windsurf-project.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: windsurf-service
            port:
              number: 80
```

#### 5. Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: windsurf-hpa
  namespace: windsurf-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: windsurf
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

## Configuration Management

### Environment Variables

| Variable | Development | Staging | Production | Description |
|----------|-------------|---------|------------|-------------|
| `NODE_ENV` | development | staging | production | Environment name |
| `HOST` | localhost | 0.0.0.0 | 0.0.0.0 | Server host |
| `PORT` | 3001 | 3001 | 3001 | Server port |
| `DATABASE_URL` | local | staging | production | Database connection |
| `REDIS_URL` | local | staging | production | Redis connection |
| `JWT_SECRET` | dev-secret | staging-secret | production-secret | JWT signing key |
| `LOG_LEVEL` | debug | info | warn | Logging verbosity |
| `ENABLE_METRICS` | true | true | true | Metrics collection |
| `RATE_LIMIT` | 1000 | 500 | 100 | Requests per minute |

### Configuration Files

#### Production Configuration

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3001,
    "timeout": 30000,
    "keepAlive": 5000
  },
  "database": {
    "host": "${DB_HOST}",
    "port": "${DB_PORT}",
    "name": "${DB_NAME}",
    "ssl": true,
    "pool": {
      "min": 5,
      "max": 20,
      "idleTimeout": 30000
    }
  },
  "redis": {
    "host": "${REDIS_HOST}",
    "port": "${REDIS_PORT}",
    "cluster": true,
    "tls": true
  },
  "security": {
    "jwt": {
      "secret": "${JWT_SECRET}",
      "expiry": "1h",
      "refreshExpiry": "7d"
    },
    "rateLimit": {
      "windowMs": 60000,
      "max": 100
    },
    "cors": {
      "origin": ["https://app.windsurf-project.com"],
      "credentials": true
    }
  },
  "monitoring": {
    "prometheus": {
      "enabled": true,
      "path": "/metrics"
    },
    "healthCheck": {
      "enabled": true,
      "path": "/api/health"
    }
  }
}
```

## Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "windsurf_rules.yml"

scrape_configs:
  - job_name: 'windsurf'
    static_configs:
      - targets: ['windsurf-service:80']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'windsurf-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - source_labels: [__address__]
        regex: '(.*):10250'
        target_label: __address__
        replacement: '${1}:9100'
```

### Alerting Rules

```yaml
# windsurf_rules.yml
groups:
- name: windsurf.rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "95th percentile latency is {{ $value }} seconds"

  - alert: MemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value | humanizePercentage }}"
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Windsurf Fraud Detection",
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

## Security Considerations

### Network Security

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: windsurf-network-policy
  namespace: windsurf-prod
spec:
  podSelector:
    matchLabels:
      app: windsurf
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: cache
    ports:
    - protocol: TCP
      port: 6379
```

### Pod Security Policy

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: windsurf-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### SSL/TLS Configuration

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: windsurf-tls
  namespace: windsurf-prod
spec:
  secretName: windsurf-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.windsurf-project.com
  - "*.windsurf-project.com"
```

## Performance Optimization

### Resource Optimization

```yaml
# resource-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: windsurf-quota
  namespace: windsurf-prod
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
    pods: "20"
    services: "10"
    secrets: "10"
    configmaps: "10"
```

### Caching Strategy

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: windsurf-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --maxmemory
        - "256mb"
        - --maxmemory-policy
        - "allkeys-lru"
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
kubectl logs -f deployment/windsurf -n windsurf-prod

# Check pod status
kubectl get pods -n windsurf-prod

# Describe pod for detailed information
kubectl describe pod <pod-name> -n windsurf-prod

# Check events
kubectl get events -n windsurf-prod --sort-by='.lastTimestamp'
```

#### 2. High Memory Usage

```bash
# Check resource usage
kubectl top pods -n windsurf-prod

# Check memory limits
kubectl describe pod <pod-name> -n windsurf-prod | grep -A 10 "Limits:"

# Check for memory leaks
kubectl exec -it <pod-name> -n windsurf-prod -- node --inspect=0.0.0.0:9229
```

#### 3. Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it <pod-name> -n windsurf-prod -- nc -zv database-host 5432

# Check database logs
kubectl logs -f deployment/postgres -n database

# Check connection pool status
kubectl exec -it <pod-name> -n windsurf-prod -- curl http://localhost:3001/api/health
```

### Debug Commands

```bash
# Port forward for local debugging
kubectl port-forward service/windsurf-service 3001:80 -n windsurf-prod

# Execute shell in container
kubectl exec -it <pod-name> -n windsurf-prod -- /bin/bash

# Check environment variables
kubectl exec <pod-name> -n windsurf-prod -- env | grep -E "(NODE_ENV|DATABASE|REDIS)"

# Test API endpoints
curl -X GET https://api.windsurf-project.com/api/health
curl -X POST https://api.windsurf-project.com/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{"features": {"root_detected": 0, "vpn_active": 1}}'
```

## Maintenance

### Rolling Updates

```bash
# Update deployment with new image
kubectl set image deployment/windsurf windsurf=your-registry/windsurf:v1.1.0 -n windsurf-prod

# Check rollout status
kubectl rollout status deployment/windsurf -n windsurf-prod

# Rollback if needed
kubectl rollout undo deployment/windsurf -n windsurf-prod
```

### Backup Procedures

```bash
# Database backup
kubectl exec -it postgres-0 -n database -- pg_dump windsurf_prod > backup-$(date +%Y%m%d).sql

# Redis backup
kubectl exec -it redis-0 -n cache -- redis-cli BGSAVE

# Configuration backup
kubectl get configmap windsurf-config -n windsurf-prod -o yaml > config-backup.yaml
```

### Health Checks

```bash
# Application health
curl -f https://api.windsurf-project.com/api/health

# Database health
kubectl exec -it postgres-0 -n database -- pg_isready

# Redis health
kubectl exec -it redis-0 -n cache -- redis-cli ping

# Kubernetes health
kubectl get pods -n windsurf-prod --field-selector=status.phase=Running
```

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment windsurf --replicas=10 -n windsurf-prod

# Check HPA status
kubectl get hpa -n windsurf-prod

# Adjust HPA settings
kubectl patch hpa windsurf-hpa -n windsurf-prod -p '{"spec":{"minReplicas":5,"maxReplicas":100}}'
```

---

## Support

For deployment issues:
- **Documentation**: Check this guide and API documentation
- **Issues**: Use GitHub Issues with `deployment` label
- **Emergency**: Contact support@windsurf-project.dev
- **Monitoring**: Check Grafana dashboards and alerting

---

*Last updated: January 21, 2024*
