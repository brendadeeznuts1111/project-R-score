# Role-Based Access Control (RBAC) and SCOPE Annotations Guide

## Overview

This guide explains how **Role-Based Access Control (RBAC)** and **`[SCOPE:*]` annotations** work in the codebase. These are two complementary systems:

1. **RBAC System** - Runtime authorization enforcement
2. **SCOPE Annotations** - Documentation/metadata tags for DoD compliance tracking

---

## Part 1: Role-Based Access Control (RBAC)

### Architecture

The RBAC system has **three layers**:

```
User → Role → Permissions + Data Scopes
```

### 1.1 User Roles

**Location**: `src/rbac/types.ts`, `src/secrets/operator-session.ts`

**Roles Defined**:
- `senior-engineer` - Full access (read, write, delete)
- `engineer` - Read-only access
- `analyst` - Read-only access
- `observer` - Read-only access (lowest privilege)
- `admin` - Maps to `senior-engineer` (legacy compatibility)
- `trader` - Maps to `analyst` (read-only)
- `user` - Maps to `analyst` (read-only)

**Example**:
```typescript
// From src/secrets/operator-session.ts
export interface Operator {
  id: string;
  role: 'senior-engineer' | 'engineer' | 'analyst' | 'observer';
  username?: string;
  sessionId?: string;
}
```

### 1.2 Permissions

**Location**: `src/rbac/types.ts`

**Permission Structure**:
```typescript
interface Permission {
  resource: string;      // e.g., "data-source", "property", "endpoint", "*"
  actions: string[];    // e.g., ["read", "write", "delete"], ["*"]
  conditions?: PermissionCondition[];
}
```

**Example Role Permissions**:
```typescript
// Admin role - full access
permissions: [
  { resource: "*", actions: ["*"] }
]

// Trader role - read-only
permissions: [
  { resource: "data-source", actions: ["read"] },
  { resource: "property", actions: ["read"] },
  { resource: "endpoint", actions: ["read"] }
]

// Analyst role - limited read
permissions: [
  { resource: "data-source", actions: ["read"] },
  { resource: "property", actions: ["read"] }
]
```

### 1.3 Data Scopes

**Location**: `src/rbac/types.ts`

**Data Scope Structure**:
```typescript
interface DataScope {
  sources: string[];      // Data source IDs (use "*" for all)
  properties: string[];  // Property IDs (use "*" for all)
  namespaces: string[];  // Namespaces (use "*" for all)
  filters?: ScopeFilter[]; // Additional filters
}
```

**Example Data Scopes**:
```typescript
// Admin - access to everything
dataScopes: [{
  sources: ["*"],
  properties: ["*"],
  namespaces: ["*"]
}]

// Analyst - access to all sources but filtered properties
dataScopes: [{
  sources: ["*"],
  properties: ["price", "volume", "timestamp"], // Only specific properties
  namespaces: ["*"]
}]
```

### 1.4 How RBAC Works in Practice

#### Example 1: Secret Access Control

**File**: `src/auth/secret-guard.ts`

```typescript
export async function authorizeSecretAccess(
  service: string,
  operation: 'read' | 'write' | 'delete',
  user?: PipelineUser | null
): Promise<boolean> {
  // Get operator from user context or session
  const operator = getCurrentOperator();
  
  // Role-based permissions
  const permissions: Record<string, string[]> = {
    'senior-engineer': ['read', 'write', 'delete'],
    'engineer': ['read'],
    'analyst': ['read'],
  };
  
  // Check if operator's role allows the operation
  if (!operator || !permissions[operator.role]?.includes(operation)) {
    logger.error(LOG_CODES['HBSE-006'], 'Unauthorized access attempt', ...);
    recordSecretAccess(service, operation, 'denied');
    return false;
  }
  
  recordSecretAccess(service, operation, 'success');
  return true;
}
```

**Usage**:
```typescript
// In API route handler
const authorized = await authorizeSecretAccess('nexus', 'read', user);
if (!authorized) {
  return c.json({ error: 'Unauthorized' }, 403);
}
```

#### Example 2: Data Filtering

**File**: `src/rbac/manager.ts`

```typescript
filterData(data: EnrichedData, user: PipelineUser): EnrichedData | null {
  const role = this.getRole(user);
  const scope = role.dataScopes[0]; // Use primary scope
  
  // Filter by sources
  if (!scope.sources.includes(data.source.id) && 
      !scope.sources.includes("*")) {
    return null; // User can't access this source
  }
  
  // Filter properties
  const filteredProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data.properties)) {
    if (scope.properties.includes(key) || scope.properties.includes("*")) {
      filteredProperties[key] = value;
    }
  }
  
  return { ...data, properties: filteredProperties };
}
```

**Usage**:
```typescript
// Filter data based on user's role
const filteredData = rbacManager.filterData(enrichedData, user);
if (!filteredData) {
  return c.json({ error: 'Access denied' }, 403);
}
```

#### Example 3: API Middleware

**File**: `src/auth/middleware.ts`

```typescript
export function authMiddleware(options: AuthMiddlewareOptions = {}): MiddlewareHandler {
  return async (c, next) => {
    // Extract and verify JWT token
    const user: PipelineUser = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      featureFlags: payload.featureFlags || [],
    };
    
    // Check role requirements
    if (requiredRole && user.role !== requiredRole) {
      return c.json({ error: "Insufficient role permissions" }, 403);
    }
    
    // Check RBAC permissions
    if (requiredPermissions.length > 0) {
      const role = rbacManager.getRole(user);
      const hasPermission = requiredPermissions.every(permission =>
        role.permissions.some(p => 
          p.resource === permission || p.resource === "*"
        )
      );
      
      if (!hasPermission) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }
    
    // Attach user to context
    (c as any).user = user;
    await next();
  };
}
```

**Usage**:
```typescript
// Protect route with role requirement
api.get('/secrets', authMiddleware({ 
  requiredRole: 'senior-engineer' 
}), async (c) => {
  // Handler code
});

// Protect route with permission requirement
api.post('/data', authMiddleware({ 
  requiredPermissions: ['data-source:write'] 
}), async (c) => {
  // Handler code
});
```

---

## Part 2: SCOPE Annotations

### 2.1 What Are SCOPE Annotations?

**`[SCOPE:*]` annotations** are **documentation/metadata tags** used for:
- DoD (Department of Defense) compliance tracking
- Code organization and categorization
- Documentation generation
- Audit trail for security-critical features

**They are NOT runtime enforcement** - they're metadata tags for documentation.

### 2.2 SCOPE Annotation Format

**Pattern**: `[DoD][CLASS:ClassName][SCOPE:ScopeName]`

**Examples**:
```typescript
// Secret management
[DoD][CLASS:SecretManagement][SCOPE:FullLifecycle]

// Authorization
[DoD][CLASS:Authorization][SCOPE:SecretAccess]

// Input validation
[DoD][FUNCTION:InputValidation][SCOPE:SecretSanity]

// Rate limiting
[DoD][MIDDLEWARE:RateLimit][SCOPE:DoSProtection]

// Domain-specific scopes
[DoD][DOMAIN:SportsBetting][SCOPE:MultiLayerCorrelation]
[DoD][DOMAIN:TemporalAnalysis][SCOPE:PatternRecognition]
```

### 2.3 Common SCOPE Values

**Security & Access Control**:
- `SCOPE:SecretAccess` - Secret management operations
- `SCOPE:FullLifecycle` - Complete lifecycle management
- `SCOPE:DoSProtection` - Denial-of-service protection
- `SCOPE:SecretSanity` - Input validation

**Domain-Specific**:
- `SCOPE:MultiLayerCorrelation` - Multi-layer correlation engine
- `SCOPE:PatternRecognition` - Pattern recognition
- `SCOPE:AnomalyDetection` - Anomaly detection
- `SCOPE:Persistence` - Data persistence
- `SCOPE:BuildOps` - Build operations
- `SCOPE:Layer1Direct` - Direct layer correlation
- `SCOPE:Layer2CrossMarket` - Cross-market correlation
- `SCOPE:Layer3CrossEvent` - Cross-event correlation
- `SCOPE:Layer4CrossSport` - Cross-sport correlation

**UI & Infrastructure**:
- `SCOPE:Dashboard` - Dashboard UI
- `SCOPE:GlobalTiming` - Global timing configuration

### 2.4 Where SCOPE Annotations Are Used

**File Headers**:
```typescript
/**
 * @fileoverview Secret Access Control
 * @description Role-based access control for secret operations
 * 
 * [DoD][CLASS:Authorization][SCOPE:SecretAccess]
 */
```

**Code Sections**:
```typescript
// ==================== [DoD][SCOPE:BuildOps] ====================
// Build operations code here

// ==================== [DoD][SCOPE:Layer4CrossSport] ====================
// Cross-sport correlation code here
```

### 2.5 How SCOPE Relates to RBAC

**SCOPE annotations** document **what** a code section does, while **RBAC** enforces **who** can access it.

**Example**:
```typescript
/**
 * [DoD][CLASS:Authorization][SCOPE:SecretAccess]
 */
export async function authorizeSecretAccess(
  service: string,
  operation: 'read' | 'write' | 'delete',
  user?: PipelineUser | null
): Promise<boolean> {
  // SCOPE:SecretAccess documents this is secret access control
  // RBAC enforces who can access (senior-engineer, engineer, analyst)
  
  const operator = getCurrentOperator();
  const permissions: Record<string, string[]> = {
    'senior-engineer': ['read', 'write', 'delete'], // RBAC enforcement
    'engineer': ['read'],
    'analyst': ['read'],
  };
  
  return permissions[operator.role]?.includes(operation) ?? false;
}
```

---

## Part 3: Complete Flow Example

### Secret Management Flow

**1. User makes request**:
```typescript
// User with role: "analyst"
GET /api/mcp/secrets/nexus/api-key
Authorization: Bearer <jwt-token>
```

**2. Authentication middleware** (`src/auth/middleware.ts`):
```typescript
// Extracts user from JWT
const user = {
  id: "user-123",
  role: "analyst",  // From JWT payload
  username: "analyst1"
};
```

**3. API route handler** (`src/api/mcp/secrets.ts`):
```typescript
// [DoD][CLASS:SecretManagement][SCOPE:SecretAccess]
export async function getMCPServerApiKey(req: Request, server: string) {
  // Check authorization
  const authorized = await authorizeSecretAccess('nexus', 'read', user);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403
    });
  }
  
  // Get secret
  const apiKey = await mcpApiKeys.get(server);
  return new Response(JSON.stringify({ apiKey }));
}
```

**4. Authorization check** (`src/auth/secret-guard.ts`):
```typescript
// [DoD][CLASS:Authorization][SCOPE:SecretAccess]
export async function authorizeSecretAccess(
  service: string,
  operation: 'read',
  user: PipelineUser
): Promise<boolean> {
  // Map user role to operator role
  const operatorRole = mapUserRoleToOperatorRole(user.role);
  // "analyst" → "analyst"
  
  // Check permissions
  const permissions = {
    'senior-engineer': ['read', 'write', 'delete'],
    'engineer': ['read'],
    'analyst': ['read'],  // ✅ Analyst can read
  };
  
  // Check: permissions['analyst'].includes('read') → true
  return true; // ✅ Authorized
}
```

**5. Result**:
- ✅ **Authorized** - Analyst can read secrets
- ❌ **Would be denied** if operation was 'write' or 'delete'

---

## Part 4: Key Differences Summary

| Aspect | RBAC System | SCOPE Annotations |
|--------|-------------|-------------------|
| **Purpose** | Runtime authorization enforcement | Documentation/metadata |
| **When Used** | Every request | Code documentation |
| **Enforcement** | Yes - blocks unauthorized access | No - informational only |
| **Location** | `src/rbac/`, `src/auth/` | File headers, code comments |
| **Format** | TypeScript interfaces, classes | `[DoD][CLASS:*][SCOPE:*]` tags |
| **Examples** | `authorizeSecretAccess()`, `filterData()` | `[SCOPE:SecretAccess]`, `[SCOPE:FullLifecycle]` |

---

## Part 5: Best Practices

### RBAC Best Practices

1. **Always check authorization** before sensitive operations:
   ```typescript
   const authorized = await authorizeSecretAccess(service, operation, user);
   if (!authorized) {
     return c.json({ error: 'Unauthorized' }, 403);
   }
   ```

2. **Use middleware** for route-level protection:
   ```typescript
   api.get('/secrets', authMiddleware({ 
     requiredRole: 'senior-engineer' 
   }), handler);
   ```

3. **Filter data** based on user's data scopes:
   ```typescript
   const filteredData = rbacManager.filterData(data, user);
   ```

4. **Log all authorization decisions**:
   ```typescript
   recordSecretAccess(service, operation, 'denied');
   ```

### SCOPE Annotation Best Practices

1. **Use consistent SCOPE values** for similar functionality
2. **Document security-critical features** with SCOPE tags
3. **Use CLASS tags** to categorize code sections
4. **Include SCOPE in file headers** for major modules

---

## References

- **RBAC Manager**: `src/rbac/manager.ts`
- **RBAC Types**: `src/rbac/types.ts`
- **Secret Guard**: `src/auth/secret-guard.ts`
- **Auth Middleware**: `src/auth/middleware.ts`
- **Operator Session**: `src/secrets/operator-session.ts`
- **DoD Documentation**: `docs/BUN-SECRETS-DOD-COMPLETION.md`
