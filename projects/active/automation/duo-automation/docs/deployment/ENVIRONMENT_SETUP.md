# Environment Configuration Guide

## Overview

This project uses environment variables for configuration to ensure security and flexibility across different deployment environments.

## Environment Files

### `.env.example`

Template with all available configuration options. Copy this to create your own environment file.

### `.env.development`

Development-specific configuration with debug settings enabled.

### `.env.production`

Production-ready configuration with security optimizations.

## Port Configuration

All ports are now configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_SERVER_PORT` | 8080 | Main web server port |
| `REDIS_PORT` | 6379 | Redis database port |
| `STORAGE_DASHBOARD_PORT` | 3004 | Storage dashboard port |
| `ANALYTICS_DASHBOARD_PORT` | 3005 | Analytics dashboard port |
| `ADMIN_DASHBOARD_PORT` | 3006 | Admin/RBAC dashboard port |
| `METRICS_DASHBOARD_PORT` | 3001 | Metrics dashboard port |
| `SYSTEM_DASHBOARD_PORT` | 3000 | Main system dashboard port |
| `POSTGRES_PORT` | 5432 | PostgreSQL database port |

## Service URLs

External service URLs are configurable:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAPS_SERVICE_URL` | <https://maps.googleapis.com> | Mapping service |
| `CAPTCHA_SERVICE_URL` | <http://2captcha.com> | Captcha solving |
| `ANTI_CAPTCHA_SERVICE_URL` | <https://api.anti-captcha.com> | Alternative captcha |
| `DUOPLUS_ENDPOINT` | <https://api.duoplus.app/analytics> | DuoPlus API |
| `APPLE_ID_URL` | <https://appleid.apple.com> | Apple ID service |

## Database URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `POSTGRES_URL` | postgresql://localhost:5432/duo_automation | PostgreSQL connection |

## Usage

### Development

```bash
cp config/environment/.env.example config/environment/.env.development
# Edit .env.development with your values
export $(cat config/environment/.env.development | xargs)
bun run start
```

### Production

```bash
cp config/environment/.env.example config/environment/.env.production
# Edit .env.production with production values
export $(cat config/environment/.env.production | xargs)
bun run start
```

## Security Notes

- Never commit `.env` files to version control
- Use different API keys for development and production
- Enable CORS only in development
- Use strong JWT secrets and encryption keys in production
