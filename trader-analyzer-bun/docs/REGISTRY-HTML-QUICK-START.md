# Registry.html Quick Start: Seeing Transformations in Action

## Quick Demo

### 1. Start Server with UIContextRewriter Integration

Add this route to `src/api/routes.ts`:

```typescript
import { UIContextRewriter, createUIContextFromRequest } from '../services/ui-context-rewriter';

// Add this route handler
api.get('/registry.html', async (c) => {
  const request = c.req.raw;
  
  // Create context from request
  const context = createUIContextFromRequest(request, {
    featureFlags: {
      shadowGraph: Bun.env.HYPERBUN_FEATURE_SHADOWGRAPH === 'true',
      covertSteamAlerts: Bun.env.HYPERBUN_FEATURE_COVERTSTEAM !== 'false',
      debugPanel: Bun.env.HYPERBUN_DEBUG === 'true'
    },
    userRole: request.headers.get('X-User-Role') as any || 'guest',
    debugMode: Bun.env.HYPERBUN_DEBUG === 'true'
  });
  
  // Transform HTML
  const htmlFile = Bun.file('./public/registry.html');
  const rewriter = new UIContextRewriter(context).createRewriter();
  
  return new Response(rewriter.transform(htmlFile.stream()), {
    headers: { 'Content-Type': 'text/html' }
  });
});
```

### 2. Test in Browser

```bash
# Start server
HYPERBUN_FEATURE_SHADOWGRAPH=true HYPERBUN_DEBUG=true bun run src/index.ts

# Open browser
open http://localhost:3001/registry.html
```

### 3. What You'll See

#### In Browser Console:

```javascript
// Type this in console:
window.HYPERBUN_UI_CONTEXT

// You'll see:
{
  apiBaseUrl: "http://localhost:3001",
  featureFlags: {
    shadowGraph: true,
    covertSteamAlerts: true,
    debugPanel: true
  },
  userRole: "guest",
  debugMode: true,
  currentTimestamp: 1704067200450
}
```

#### On the Page:

- ✅ **Header**: Shows server timestamp (not "Loading...")
- ✅ **Shadow Market Graph**: Visible (feature enabled)
- ✅ **Covert Steam Alerts**: Visible
- ✅ **Admin Settings**: Visible if you're admin, hidden if guest
- ✅ **Debug Mode**: Yellow dashed border around body

### 4. Test Feature Flag Pruning

```bash
# Disable shadow graph feature
HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/index.ts

# Refresh browser
# Result: Shadow Market Graph section disappears completely
```

**Verify in Console**:
```javascript
document.getElementById('shadow-graph-section')
// null (element removed from DOM)
```

### 5. Test RBAC Pruning

```bash
# Request as guest (default)
curl http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
# Expected: 0 (removed)

# Request as admin
curl -H "X-User-Role: admin" http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
# Expected: 1 (present)
```

**In Browser**:
- Open DevTools → Elements tab
- Search for "admin-settings"
- **Guest**: Not found
- **Admin**: Found with red left border

## Visual Indicators

### ✅ Context Injection (6.1.1.2.2.2.1.0)
- **Where**: Browser console → `window.HYPERBUN_UI_CONTEXT`
- **What**: JSON object with all context properties

### ✅ Feature Flag Pruning (6.1.1.2.2.2.2.0)
- **Where**: Page content
- **What**: Sections with `data-feature` appear/disappear
- **Example**: `#shadow-graph-section` visible when `shadowGraph: true`

### ✅ RBAC Pruning (6.1.1.2.2.2.3.0)
- **Where**: Page content
- **What**: Sections with `data-access` appear/disappear
- **Example**: `#admin-settings` visible only for admin users
- **Visual**: Red left border (`rbac-protected` class)

### ✅ Timestamp Injection (6.1.1.2.2.2.4.0)
- **Where**: Header "Server Time" display
- **What**: Shows ISO timestamp instead of "Loading..."
- **Example**: "Server Time: 2024-01-01T12:00:00.450Z"

## Quick Verification Script

```bash
#!/bin/bash
# test-registry-transformations.sh

echo "Testing UIContextRewriter transformations..."

# Test 1: Context injection
echo "1. Testing context injection..."
CONTEXT=$(curl -s http://localhost:3001/registry.html | rg -o "window\.HYPERBUN_UI_CONTEXT = \{[^}]+\}")
if [ -n "$CONTEXT" ]; then
  echo "   ✅ Context injected"
else
  echo "   ❌ Context NOT injected"
fi

# Test 2: Feature flag pruning
echo "2. Testing feature flag pruning..."
SHADOW_COUNT=$(curl -s http://localhost:3001/registry.html | rg -c 'id="shadow-graph-section"')
echo "   Shadow graph section count: $SHADOW_COUNT"

# Test 3: RBAC pruning
echo "3. Testing RBAC pruning..."
ADMIN_COUNT=$(curl -H "X-User-Role: guest" -s http://localhost:3001/registry.html | rg -c 'id="admin-settings"')
echo "   Admin settings count (as guest): $ADMIN_COUNT"

# Test 4: Timestamp injection
echo "4. Testing timestamp injection..."
TIMESTAMP=$(curl -s http://localhost:3001/registry.html | rg -A 1 'data-server-timestamp' | tail -1)
if [[ "$TIMESTAMP" == *"Loading"* ]]; then
  echo "   ❌ Timestamp NOT replaced"
else
  echo "   ✅ Timestamp replaced: $TIMESTAMP"
fi
```

Run it:
```bash
chmod +x test-registry-transformations.sh
./test-registry-transformations.sh
```
