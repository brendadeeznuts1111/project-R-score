# Team Dashboard API Verification

**RG Marker**: `[TEAM.DASHBOARD.API.VERIFICATION.RG]`

This document provides comprehensive verification and testing information for all API endpoints used by the Team Organization Dashboard.

## Overview

The Team Organization Dashboard consumes 6 main API endpoints:

1. **Team Departments Registry** - `GET /api/registry/team-departments` (NEW - integrated with registry.ts)
2. **Team Info Query** - `GET/POST /api/team/info`
3. **PR Reviewer Assignment** - `POST /api/pr/reviewers`
4. **Workspace Registry** - `GET /api/registry/workspace`
5. **Workspace Keys** - `GET /api/workspace/keys`
6. **RSS Feed** - `GET /api/rss.xml` (also `/rss`)

## Test Script

A comprehensive test script is available at `scripts/test-team-dashboard-apis.ts`:

```bash
# Run tests against default localhost:3001
bun run scripts/test-team-dashboard-apis.ts

# Run tests against custom base URL
bun run scripts/test-team-dashboard-apis.ts --base-url http://localhost:3001
```

**Note**: The test script should be updated to include the new `/api/registry/team-departments` endpoint.

The script generates a JSON report with detailed test results.

## API Endpoint Specifications

### 0. Team Departments Registry (NEW)

**Endpoint**: `GET /api/registry/team-departments`

**Purpose**: Get team departments registry with integrated workspace API keys

**Implementation**: `src/api/registry.ts:2149-2408` (`getTeamDepartmentsRegistry()`)

**Request Example**:
```bash
curl http://localhost:3001/api/registry/team-departments
```

**Response Format**:
```json
{
  "departments": [
    {
      "id": "api",
      "name": "API & Routes",
      "lead": "API Team Lead",
      "color": "#00d4ff",
      "description": "API & Routes department responsible for...",
      "responsibilities": [...],
      "keyAreas": [...],
      "reviewFocus": [...],
      "members": [
        {
          "email": "user@example.com",
          "role": "lead",
          "hasApiKey": true,
          "apiKeyInfo": {
            "keyId": "key-123",
            "purpose": "onboarding",
            "active": true,
            "expiresAt": 1234567890,
            "requestCount": 42
          }
        }
      ]
    }
  ],
  "total": 8,
  "byDepartment": {
    "api": 5,
    "arbitrage": 3
  },
  "withApiKeys": 12,
  "withoutApiKeys": 8
}
```

**Integration**: 
- Dashboard uses this endpoint to dynamically load department structure
- Integrates TEAM.md parsing with workspace API key management
- Falls back to hardcoded data if API unavailable

**Error Handling**:
- Returns empty structure if TEAM.md not found
- Returns empty structure if workspace manager unavailable
- Dashboard falls back to hardcoded department data

---

### 1. Team Info Query

**Endpoint**: `GET /api/team/info?query=<query>` or `POST /api/team/info`

**Purpose**: Query TEAM.md using the team-info MCP tool (Human Capital Knowledge Graph)

**Implementation**: `src/api/routes.ts:3726-3789`

**GET Request**:
```bash
curl "http://localhost:3001/api/team/info?query=department:api"
```

**POST Request**:
```bash
curl -X POST http://localhost:3001/api/team/info \
  -H "Content-Type: application/json" \
  -d '{"query": "department:api"}'
```

**Response Format**:
```json
{
  "query": "department:api",
  "results": [...],
  "markers": [...],
  "contacts": [...]
}
```

**Query Examples**:
- `department:api` - Find API department members
- `role:lead` - Find all team leads
- `package:@graph/layer4` - Find package maintainers
- `communication` - Extract communication protocols
- `oncall` - Find on-call rotation information
- `policy` - Find policy enforcement details

**Error Handling**:
- Returns `500` with error message if query fails
- Returns `200` with empty results if no matches found

---

### 2. PR Reviewer Assignment

**Endpoint**: `POST /api/pr/reviewers`

**Purpose**: Analyze PR and get ML-driven reviewer suggestions

**Implementation**: `src/api/routes.ts:3750-3770`

**Request Body**:
```json
{
  "prNumber": 123,
  "baseBranch": "main"
}
```

**Request Example**:
```bash
curl -X POST http://localhost:3001/api/pr/reviewers \
  -H "Content-Type: application/json" \
  -d '{"prNumber": 123, "baseBranch": "main"}'
```

**Response Format**:
```json
{
  "prNumber": 123,
  "suggestedReviewers": [
    {
      "reviewer": "@api-team-lead",
      "confidence": 0.95,
      "reasoning": "...",
      "specialties": ["API design", "OpenAPI specs"],
      "availability": "available"
    }
  ],
  "departmentOwners": ["API & Routes"],
  "codeImpact": {...}
}
```

**Error Handling**:
- Returns `400` if `prNumber` is missing or invalid
- Returns `500` if PR analysis fails
- Returns `200` with empty suggestions if PR not found

**Integration**: `src/integrations/ml-pr-reviewer-assignment.ts`

---

### 3. Workspace Registry

**Endpoint**: `GET /api/registry/workspace`

**Purpose**: Get workspace registry statistics (active keys, expired keys, by-purpose breakdown)

**Implementation**: `src/api/routes.ts:3626-3641`

**Request Example**:
```bash
curl http://localhost:3001/api/registry/workspace
```

**Response Format**:
```json
{
  "items": [
    {
      "id": "key-123",
      "name": "user@example.com (onboarding)",
      "type": "workspace-key",
      "description": "API key for user@example.com - onboarding",
      "metadata": {
        "email": "user@example.com",
        "purpose": "onboarding",
        "createdAt": 1234567890,
        "expiresAt": 1234567890,
        "active": true,
        "rateLimitPerHour": 100,
        "requestCount": 42
      },
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ],
  "total": 10,
  "active": 8,
  "expired": 2,
  "byPurpose": {
    "onboarding": 5,
    "interview": 3,
    "trial": 2
  },
  "metadata": {
    "secretService": "com.nexus.trader-analyzer.devworkspace",
    "storageBackend": "Bun.secrets",
    "indexKey": "key-index:all-keys",
    "keyFormat": "api-key:{scope}:{keyId}",
    "metaFormat": "metadata:{scope}:{keyId}",
    "usageFormat": "usage-stats:{scope}:{keyId}",
    "lookupFormat": "lookup-index:hash:{apiKeyHash}"
  }
}
```

**Error Handling**:
- Returns `500` if workspace registry cannot be accessed
- Returns empty structure if workspace not initialized

**Registry Implementation**: `src/api/registry.ts:1833-1917`

---

### 4. Workspace Keys

**Endpoint**: `GET /api/workspace/keys`

**Purpose**: List all workspace API keys with details

**Implementation**: `src/api/workspace-routes.ts:183-218`

**Query Parameters**:
- `purpose` (optional): Filter by purpose (`onboarding`, `interview`, `trial`)

**Request Example**:
```bash
# Get all keys
curl http://localhost:3001/api/workspace/keys

# Get keys filtered by purpose
curl "http://localhost:3001/api/workspace/keys?purpose=onboarding"
```

**Response Format**:
```json
[
  {
    "id": "key-123",
    "email": "user@example.com",
    "purpose": "onboarding",
    "createdAt": 1234567890,
    "expiresAt": 1234567890,
    "active": true,
    "rateLimitPerHour": 100,
    "requestCount": 42,
    "lastRequestAt": 1234567890,
    "metadata": {}
  }
]
```

**Error Handling**:
- Returns `500` if keys cannot be listed
- Returns empty array if no keys exist

---

### 5. RSS Feed

**Endpoint**: `GET /api/rss.xml` or `GET /rss`

**Purpose**: Get team updates RSS feed (RSS 2.0 compliant)

**Implementation**: `src/api/routes.ts:1253-1261`

**Request Example**:
```bash
curl http://localhost:3001/api/rss.xml
```

**Response Format**: RSS 2.0 XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NEXUS Trading Platform v1.0.0.0.0.0</title>
    <link>http://localhost:3001</link>
    <description>...</description>
    <language>en-US</language>
    <lastBuildDate>Mon, 01 Jan 2024 12:00:00 GMT</lastBuildDate>
    <item>
      <title>Team Update</title>
      <link>...</link>
      <description>...</description>
      <pubDate>...</pubDate>
    </item>
  </channel>
</rss>
```

**Content-Type**: `application/rss+xml; charset=utf-8`

**RSS Generation**: `src/api/routes.ts:666-1250` (`generateRSSFeed()`)

---

## Test Results

### Latest Test Run

Run the test script to generate current test results:

```bash
bun run scripts/test-team-dashboard-apis.ts
```

The script generates a JSON report file: `test-results-team-dashboard-apis-{timestamp}.json`

### Expected Results

All endpoints should return:
- **Status Code**: `200 OK` (or appropriate status)
- **Response Time**: < 500ms for most endpoints
- **Content-Type**: `application/json` (except RSS which is `application/rss+xml`)

### Common Issues

#### 1. Connection Refused
**Symptom**: All tests fail with connection errors
**Solution**: Ensure API server is running (`bun run dev`)

#### 2. 404 Not Found
**Symptom**: Endpoint returns 404
**Solution**: Verify endpoint path matches implementation

#### 3. 500 Internal Server Error
**Symptom**: Endpoint returns 500
**Solution**: Check server logs for error details

#### 4. CORS Issues
**Symptom**: Browser requests fail with CORS errors
**Solution**: Verify CORS middleware is configured in `src/api/routes.ts`

#### 5. RSS Feed Not Loading
**Symptom**: RSS endpoint returns empty or invalid XML
**Solution**: Check `generateRSSFeed()` function and git log access

---

## Usage Examples

### Dashboard Integration

The dashboard uses these endpoints as follows:

```javascript
// Team Info Query
const response = await fetch('/api/team/info?query=department:api');
const result = await response.json();

// PR Reviewer Assignment
const response = await fetch('/api/pr/reviewers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prNumber: 123, baseBranch: 'main' })
});
const assignment = await response.json();

// Workspace Registry
const response = await fetch('/api/registry/workspace');
const registry = await response.json();

// Workspace Keys
const response = await fetch('/api/workspace/keys');
const keys = await response.json();

// RSS Feed
const response = await fetch('/api/rss.xml');
const rssXml = await response.text();
```

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const response = await fetch('/api/team/info?query=department:api');
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  const result = await response.json();
  // Process result
} catch (error) {
  console.error('Failed to query team info:', error);
  // Show user-friendly error message
}
```

---

## Performance Benchmarks

Expected response times (on localhost):

| Endpoint | Expected Time | Notes |
|----------|---------------|-------|
| `/api/team/info` | < 200ms | MCP tool execution |
| `/api/pr/reviewers` | < 1000ms | ML analysis may take longer |
| `/api/registry/workspace` | < 100ms | Database query |
| `/api/workspace/keys` | < 100ms | Secrets lookup |
| `/api/rss.xml` | < 300ms | Git log + XML generation |

---

## Troubleshooting Guide

### Issue: Team Info Query Returns Empty Results

**Possible Causes**:
1. TEAM.md file not found or not readable
2. Query syntax incorrect
3. MCP tool not initialized

**Solutions**:
1. Verify `.github/TEAM.md` exists
2. Check query format matches expected patterns
3. Verify `src/mcp/tools/team-info.ts` is working

### Issue: PR Reviewer Assignment Fails

**Possible Causes**:
1. GitHub API not accessible
2. PR number doesn't exist
3. ML integration not configured

**Solutions**:
1. Check GitHub API credentials
2. Verify PR number is valid
3. Check `src/integrations/ml-pr-reviewer-assignment.ts` configuration

### Issue: Workspace Registry Empty

**Possible Causes**:
1. Workspace not initialized
2. Bun.secrets not configured
3. Database not accessible

**Solutions**:
1. Initialize workspace: `bun run scripts/setup-workspace-bin.ts`
2. Verify Bun.secrets configuration
3. Check database connection

### Issue: RSS Feed Not Updating

**Possible Causes**:
1. Git not available in PATH
2. Git log command failing
3. RSS generation function error

**Solutions**:
1. Verify git is installed and accessible
2. Check git log command permissions
3. Review `generateRSSFeed()` function logs

---

## Related Documentation

- `docs/TEAM-ORGANIZATION-DASHBOARD-FEATURES.md` - Dashboard features documentation
- `docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md` - Human Capital Knowledge Graph
- `.github/TEAM.md` - Team structure source of truth
- `src/api/routes.ts` - API route implementations
- `src/api/workspace-routes.ts` - Workspace API routes
- `src/mcp/tools/team-info.ts` - Team info MCP tool

### Component Test Suites

Comprehensive tests using Bun v1.3.4 patterns:

| Component | Test File | Coverage |
|-----------|-----------|----------|
| Team Filter | [`apps/@registry-dashboard/src/components/team-filter.test.ts`](../apps/@registry-dashboard/src/components/team-filter.test.ts) | TEAM_DATA, filterTeam, runTeamBenchmark, createRFC, Telegram integration |
| Geographic Filter | [`apps/@registry-dashboard/src/components/geographic-filter.test.ts`](../apps/@registry-dashboard/src/components/geographic-filter.test.ts) | Bookmaker/region filtering, map visualization, Leaflet integration |
| Market Filter | [`apps/@registry-dashboard/src/components/market-filter.test.ts`](../apps/@registry-dashboard/src/components/market-filter.test.ts) | Market type/sub-market filtering, confidence filtering, Telegram notifications |
| Test Status | [`apps/@registry-dashboard/src/components/test-status.test.ts`](../apps/@registry-dashboard/src/components/test-status.test.ts) | Test status card rendering |

### Bun v1.3.4 Integration

- [`docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md`](./14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md) - Bun runtime enhancements
- [`test/bun-1.3.4-features.test.ts`](../test/bun-1.3.4-features.test.ts) - Core Bun v1.3.4 feature tests

---

## Maintenance

### Updating Endpoints

When adding or modifying endpoints:

1. Update this documentation
2. Update test script (`scripts/test-team-dashboard-apis.ts`)
3. Update dashboard JavaScript if needed
4. Run test script to verify changes

### Version History

- **2024-01-27**: Initial documentation created
- **2024-01-27**: Added all 5 endpoints with specifications
- **2024-01-27**: Added troubleshooting guide

---

**Last Updated**: 2024-01-27  
**Maintainer**: Platform & Tools Team  
**RG Marker**: `[TEAM.DASHBOARD.API.VERIFICATION.RG]`
