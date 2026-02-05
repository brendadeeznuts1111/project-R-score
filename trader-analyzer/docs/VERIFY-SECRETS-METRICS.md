# Verify Secrets Metrics - Quick Guide

## ✅ Metrics Test (No Server Required)

Test that metrics are being recorded correctly:

```bash
bun run scripts/test-secrets-metrics.ts
```

**Expected Output**:
```
🧪 Testing Secrets Metrics Recording...
✅ Recorded 4 access events
✅ Recorded 2 rotation events
✅ Recorded 2 validation errors
✅ All metrics tests passed!
```

---

## 🌐 Verify Metrics Endpoint (Server Required)

### Step 1: Start the API Server

```bash
# In terminal 1
bun run dev
```

Wait for server to start (you'll see "Server started on port 3000")

### Step 2: Verify Metrics Endpoint

```bash
# In terminal 2
curl http://localhost:3000/metrics | grep hyperbun_secret
```

**Expected Output**:
```
# HELP hyperbun_secret_access_total Total secret access attempts
# TYPE hyperbun_secret_access_total counter
hyperbun_secret_access_total{service="nexus",operation="read",status="success"} 5
hyperbun_secret_access_total{service="nexus",operation="write",status="success"} 2
hyperbun_secret_access_total{service="nexus",operation="delete",status="denied"} 1

# HELP hyperbun_secret_rotation_timestamp Last rotation timestamp by secret
# TYPE hyperbun_secret_rotation_timestamp counter
hyperbun_secret_rotation_timestamp{service="nexus",name="mcp.bun.apiKey"} 1701984000000

# HELP hyperbun_secret_validation_errors_total Total secret validation errors
# TYPE hyperbun_secret_validation_errors_total counter
hyperbun_secret_validation_errors_total{type="api-key",reason="format_mismatch"} 3
```

---

## 🔍 Alternative: Check Health Endpoint

The health endpoint also includes basic metrics:

```bash
curl http://localhost:3000/health | jq '.metrics'
```

---

## 📝 Quick Test Script

Run the test script to verify metrics without starting the server:

```bash
bun run scripts/test-secrets-metrics.ts
```

This will:
- ✅ Test secret access metrics recording
- ✅ Test secret rotation metrics recording  
- ✅ Test validation error metrics recording
- ✅ Display metrics summary

---

## 🚨 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -ti:3000 | xargs kill

# Try again
bun run dev
```

### Metrics endpoint returns 404
- Verify the route is registered: Check `src/api/routes.ts` for `/metrics` route
- Check server logs for route registration

### No metrics appear
- Metrics only appear after operations are performed
- Try accessing a secret endpoint first: `curl http://localhost:3000/api/mcp/secrets`
- Then check metrics: `curl http://localhost:3000/metrics | grep hyperbun_secret`

---

## 📊 Metrics Reference

| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `hyperbun_secret_access_total` | counter | `service`, `operation`, `status` | Total secret access attempts |
| `hyperbun_secret_rotation_timestamp` | counter | `service`, `name` | Last rotation timestamp |
| `hyperbun_secret_validation_errors_total` | counter | `type`, `reason` | Total validation errors |
| `hyperbun_emergency_rotation_total` | counter | `severity` | Emergency rotations |

---

**Status**: ✅ Metrics system verified and working
