# Services Directory

This directory contains organized service modules for the project.

## 📁 Directory Structure

### **core/** 
Core service utilities and fundamental services
- `fetch-service.ts` - Basic fetch functionality for API calls
- `advanced-fetch-service.ts` - Enhanced fetch with retries, caching, and error handling
- `rss-service.ts` - RSS/Atom feed management and parsing

### **monitoring/**
Monitoring and observability services
- `monitoring-service.ts` - Real-time metrics, error tracking, and performance monitoring

### **testing/**
Testing and experimentation services
- `ab-testing-service.ts` - A/B testing framework for URL structures and feature flags

### **demos/**
Demo and example services
- `content-type-demo.ts` - Content type handling demonstrations
- `verbose-fetch-demo.ts` - Detailed fetch examples with logging

## 🚀 Usage

Each service is designed to be modular and can be imported independently:

```typescript
import { FetchService } from './core/fetch-service';
import { MonitoringService } from './monitoring/monitoring-service';
import { ABTestingService } from './testing/ab-testing-service';
```

## 🔧 Configuration

Most services use environment variables for configuration:
- Port settings
- API endpoints
- Cache configurations
- Monitoring thresholds

## 📊 Services Overview

| Service | Purpose | Key Features |
|---------|---------|--------------|
| Fetch Service | HTTP requests | Retry logic, error handling |
| Advanced Fetch | Enhanced HTTP | Caching, timeouts, retries |
| RSS Service | Feed management | Parse, generate, cache feeds |
| Monitoring | Observability | Metrics, alerts, health checks |
| A/B Testing | Experiments | User segmentation, analytics |
| Demos | Examples | Learning, testing patterns |

## 🛠️ Development

All services include:
- ✅ TypeScript support
- ✅ Error handling
- ✅ Performance optimizations
- ✅ Comprehensive logging
- ✅ Environment validation

## 📝 Notes

- Services are designed to work with Bun runtime
- Each service can run independently
- Shared utilities are in `/lib/utils/`
- Configuration files are in `/config/`
