# Docker Deployment Guide

Docker provides a containerized deployment option for the RSS Feed Optimization project. This guide will walk you through creating and deploying Docker containers.

## Why Docker?

- **Consistency**: Same environment across development, staging, and production
- **Isolation**: Application runs in isolated containers
- **Portability**: Deploy anywhere Docker is supported
- **Scalability**: Easy to scale with Docker Compose or Kubernetes
- **Version Control**: Container images can be versioned and tracked

## Prerequisites

1. **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
2. **Docker Compose**: [Install Docker Compose](https://docs.docker.com/compose/install/)
3. **Project repository**: Your RSS Feed Optimization project

## Docker Configuration

### Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# Use Bun's official Docker image
FROM oven/bun:1.3.7

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "start"]
```

### Multi-Stage Build (Optimized)

For production, use a multi-stage build to reduce image size:

```dockerfile
# Build stage
FROM oven/bun:1.3.7 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1.3.7

WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bun

# Change ownership
RUN chown -R bun:nodejs /app
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "start"]
```

### .dockerignore

Create a `.dockerignore` file to exclude unnecessary files:

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development
.env.test
.env.production
coverage
.nyc_output
.vscode
.idea
*.log
.DS_Store
```

## Docker Compose Configuration

### docker-compose.yml

Create a `docker-compose.yml` file for local development:

```yaml
version: '3.8'

services:
  rss-feed-optimization:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - BLOG_TITLE="RSS Feed Optimization (Docker)"
      - BLOG_URL=http://localhost:3000
      - ADMIN_TOKEN=docker-secret-token
      - ENABLE_CACHE=true
      - CACHE_TTL=300
      - LOG_LEVEL=debug
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: PostgreSQL for database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rss_feed_optimization
      POSTGRES_USER: rss_user
      POSTGRES_PASSWORD: rss_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rss_user -d rss_feed_optimization"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
  postgres_data:
```

### docker-compose.prod.yml

Create a production-specific compose file:

```yaml
version: '3.8'

services:
  rss-feed-optimization:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - BLOG_TITLE="RSS Feed Optimization"
      - BLOG_URL=https://your-domain.com
      - ADMIN_TOKEN=${ADMIN_TOKEN}
      - ENABLE_CACHE=true
      - CACHE_TTL=600
      - LOG_LEVEL=info
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_BUCKET_NAME=${R2_BUCKET_NAME}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - rss-feed-optimization
    restart: unless-stopped
```

## Building and Running

### Local Development

```bash
# Build the image
docker build -t rss-feed-optimization .

# Run the container
docker run -p 3000:3000 rss-feed-optimization

# Or use Docker Compose
docker-compose up
```

### Production Deployment

```bash
# Build production image
docker build -t rss-feed-optimization:prod .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Monitor containers
docker-compose ps
```

## Docker Registry

### Building and Pushing to Registry

```bash
# Tag the image
docker tag rss-feed-optimization your-registry/rss-feed-optimization:latest

# Push to registry
docker push your-registry/rss-feed-optimization:latest

# Push with version tag
docker tag rss-feed-optimization your-registry/rss-feed-optimization:v1.0.0
docker push your-registry/rss-feed-optimization:v1.0.0
```

### Using Pre-built Images

```bash
# Pull from registry
docker pull your-registry/rss-feed-optimization:latest

# Run
docker run -p 3000:3000 your-registry/rss-feed-optimization:latest
```

## Environment Configuration

### Environment File

Create an `.env` file for Docker Compose:

```bash
# Application Settings
BLOG_TITLE="RSS Feed Optimization"
BLOG_URL=https://your-domain.com
ADMIN_TOKEN=your-secret-admin-token

# R2 Storage
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-production-bucket

# Performance Settings
CACHE_TTL=600
MAX_CACHE_SIZE=200
ENABLE_CACHE=true

# Security Settings
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=200

# Monitoring
ENABLE_PROFILING=false
ENABLE_METRICS=true
LOG_LEVEL=info
```

### Using Environment File

```bash
# Use environment file with Docker Compose
docker-compose --env-file .env up

# Or specify the file
docker-compose --env-file production.env up
```

## Advanced Docker Configuration

### Custom Nginx Configuration

Create `nginx.conf` for reverse proxy:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server rss-feed-optimization:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            proxy_pass http://app;
        }
    }
}
```

### SSL/TLS Configuration

For HTTPS support:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://app;
        # ... other proxy settings
    }
}
```

## Docker Swarm Deployment

### Docker Stack

For Docker Swarm deployment:

```yaml
version: '3.8'

services:
  rss-feed-optimization:
    image: your-registry/rss-feed-optimization:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    environment:
      - NODE_ENV=production
      - BLOG_TITLE="RSS Feed Optimization"
      - BLOG_URL=https://your-domain.com
      - ADMIN_TOKEN=${ADMIN_TOKEN}
    networks:
      - rss-network

networks:
  rss-network:
    driver: overlay
```

### Deploy to Swarm

```bash
# Initialize swarm (if not already done)
docker swarm init

# Deploy stack
docker stack deploy -c docker-stack.yml rss-feed-optimization

# View services
docker service ls

# View tasks
docker service ps rss-feed-optimization_rss-feed-optimization
```

## Kubernetes Deployment

### Kubernetes Manifest

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rss-feed-optimization
  labels:
    app: rss-feed-optimization
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rss-feed-optimization
  template:
    metadata:
      labels:
        app: rss-feed-optimization
    spec:
      containers:
      - name: rss-feed-optimization
        image: your-registry/rss-feed-optimization:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: BLOG_TITLE
          value: "RSS Feed Optimization"
        - name: BLOG_URL
          value: "https://your-domain.com"
        - name: ADMIN_TOKEN
          valueFrom:
            secretKeyRef:
              name: rss-secrets
              key: admin-token
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: rss-feed-optimization-service
spec:
  selector:
    app: rss-feed-optimization
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
# Create secret
kubectl create secret generic rss-secrets --from-literal=admin-token=your-secret-token

# Apply manifest
kubectl apply -f k8s-deployment.yaml

# View pods
kubectl get pods

# View services
kubectl get services
```

## Monitoring and Logging

### Docker Logs

```bash
# View container logs
docker logs container-name

# Follow logs
docker logs -f container-name

# View logs from compose
docker-compose logs -f
```

### Health Checks

```bash
# Check container health
docker ps

# View health check details
docker inspect container-name | grep -A 10 Health
```

### Metrics

```bash
# View container stats
docker stats

# View compose stats
docker-compose top
```

## Troubleshooting Docker Issues

### Common Issues

#### 1. Build Failures

**Problem**: Docker build fails with dependency errors.

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Check Dockerfile syntax
# Verify package.json and bun.lock exist
```

#### 2. Container Won't Start

**Problem**: Container starts but application fails.

**Solution**:
```bash
# Check container logs
docker logs container-name

# Check container status
docker ps -a

# Enter container for debugging
docker exec -it container-name /bin/sh
```

#### 3. Port Conflicts

**Problem**: Port already in use.

**Solution**:
```bash
# Change port mapping
docker run -p 3001:3000 image-name

# Or use Docker Compose port mapping
```

#### 4. Environment Variables Not Loading

**Problem**: Application can't find environment variables.

**Solution**:
```bash
# Verify environment variables in Dockerfile
# Check docker-compose.yml environment section
# Use docker inspect to verify variables
```

### Docker-Specific Debugging

#### View Container Details

```bash
# Inspect container
docker inspect container-name

# View container processes
docker top container-name

# Check container network
docker network inspect bridge
```

#### Debug with Shell

```bash
# Enter running container
docker exec -it container-name /bin/sh

# Check file system
ls -la /app

# Check environment
env
```

## Performance Optimization

### Image Optimization

```dockerfile
# Use multi-stage builds
# Minimize layers
# Use .dockerignore
# Use smaller base images
```

### Resource Management

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Caching Strategy

```dockerfile
# Leverage Docker layer caching
COPY package.json bun.lock ./
RUN bun install
COPY . .
```

## Security Best Practices

### Non-Root User

```dockerfile
# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bun

# Change ownership
RUN chown -R bun:nodejs /app
USER bun
```

### Secrets Management

```yaml
# docker-compose.yml
environment:
  - ADMIN_TOKEN=${ADMIN_TOKEN}
secrets:
  - rss-secrets

secrets:
  rss-secrets:
    file: ./secrets.txt
```

### Image Security

```bash
# Scan for vulnerabilities
docker scan image-name

# Use trusted base images
FROM oven/bun:1.3.7

# Keep images updated
```

## Next Steps

After successful Docker deployment:

1. **Test your application**: Verify all features work correctly
2. **Set up monitoring**: Configure container monitoring
3. **Implement CI/CD**: Set up automated builds and deployments
4. **Scale as needed**: Adjust replica counts and resources
5. **Backup strategy**: Set up data backups for persistent volumes

## Support

If you encounter issues:

1. **Docker Documentation**: [https://docs.docker.com](https://docs.docker.com)
2. **Docker Community**: [https://forums.docker.com](https://forums.docker.com)
3. **GitHub Issues**: [Create an issue](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
4. **Docker Support**: [Docker Hub Support](https://hub.docker.com/support/)

Docker provides excellent flexibility for deploying the RSS Feed Optimization project across different environments, from local development to production Kubernetes clusters.