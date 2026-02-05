# Health Endpoints

System health and monitoring endpoints for Fire22 Dashboard.

## GET /health

Basic system health check endpoint.

### Response

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-12-19T10:30:00Z",
    "version": "2.0.0",
    "environment": "production"
  }
}
```

### Status Codes

- **200**: System is healthy
- **503**: System is degraded or unhealthy

## GET /api/health/system

Detailed system health information.

## GET /api/health/database

Database connection and performance status.

## GET /api/health/external

External API connectivity status including Fire22 APIs.
