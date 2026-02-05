# Registry.html Transformations Visual Guide

## Overview

This guide demonstrates how UIContextRewriter transformations are visible in `public/registry.html`. Each transformation is marked with version numbers and can be verified in the browser.

## How Transformations Are Shown

### 1. Context Injection (6.1.1.2.2.2.1.0)

**What Happens**: The `window.HYPERBUN_UI_CONTEXT` object is injected into the HTML stream.

**Where It's Visible**:

```html
<!-- In the HTML source (after transformation): -->
<body>
    <script>window.HYPERBUN_UI_CONTEXT = {"apiBaseUrl":"http://localhost:3001","featureFlags":{"shadowGraph":true},"userRole":"admin","debugMode":true,"currentTimestamp":1704067200450};</script>
    <!-- Rest of body content -->
</body>
```

**How to Verify**:

1. **Browser DevTools Console**:
   ```javascript
   // Open browser console and type:
   console.log(window.HYPERBUN_UI_CONTEXT);
   
   // Expected output:
   // {
   //   apiBaseUrl: "http://localhost:3001",
   //   featureFlags: { shadowGraph: true, covertSteamAlerts: true },
   //   userRole: "admin",
   //   debugMode: true,
   //   currentTimestamp: 1704067200450
   // }
   ```

2. **View Page Source**:
   - Right-click → "View Page Source"
   - Search for `window.HYPERBUN_UI_CONTEXT`
   - Should see the injected script tag

3. **Network Tab**:
   - Open DevTools → Network tab
   - Reload page
   - Click on `registry.html` request
   - View Response → Should see injected script

**Visual Indicator**: The script tag appears at the start of `<body>` (or in `<head>` as fallback).

---

### 2. Feature Flag Pruning (6.1.1.2.2.2.2.0)

**What Happens**: Elements with `data-feature` attributes are removed if the feature flag is `false`.

**Where It's Visible**:

**Original HTML** (before transformation):
```html
<section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin">
    <h2>Shadow Market Graph Visualization</h2>
    <div id="graph-container"></div>
</section>
```

**Transformed HTML** (when `shadowGraph: false`):
```html
<!-- Section completely removed - not in DOM at all -->
```

**Transformed HTML** (when `shadowGraph: true`):
```html
<section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin">
    <h2>Shadow Market Graph Visualization</h2>
    <div id="graph-container"></div>
</section>
```

**How to Verify**:

1. **Browser DevTools Elements Tab**:
   ```bash
   # Start server with feature disabled
   HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/index.ts
   
   # In browser:
   # Open DevTools → Elements tab
   # Search for "shadow-graph-section"
   # Result: Element NOT FOUND (removed from DOM)
   ```

2. **Console Query**:
   ```javascript
   // In browser console:
   const section = document.getElementById('shadow-graph-section');
   console.log(section); // null if feature disabled, element if enabled
   ```

3. **Visual Inspection**:
   - **Feature Enabled**: Section visible on page
   - **Feature Disabled**: Section completely absent (not just hidden)

**Visual Indicators**:
- ✅ **Feature Enabled**: Section appears normally
- ❌ **Feature Disabled**: Section doesn't exist in DOM (check Elements tab)

**HTML Markers**:
```html
<!-- 6.1.1.2.2.2.2.0: Feature-flagged section (pruned if shadowGraph=false) -->
<section id="shadow-graph-section" data-feature="shadowGraph">
```

---

### 3. Role-Based Access Control (6.1.1.2.2.2.3.0)

**What Happens**: Elements with `data-access` attributes are removed if user role doesn't match.

**Where It's Visible**:

**Original HTML** (before transformation):
```html
<section id="admin-settings" data-access="admin">
    <h2>Admin Settings</h2>
    <button>Save Critical Settings</button>
</section>
```

**Transformed HTML** (when `userRole: 'guest'`):
```html
<!-- Section completely removed - not in DOM -->
```

**Transformed HTML** (when `userRole: 'admin'`):
```html
<section id="admin-settings" data-access="admin">
    <h2>Admin Settings</h2>
    <button>Save Critical Settings</button>
</section>
```

**How to Verify**:

1. **Request with Different Roles**:
   ```bash
   # As guest user
   curl -H "X-User-Role: guest" http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
   # Expected: 0 (element removed)
   
   # As admin user
   curl -H "X-User-Role: admin" http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
   # Expected: 1 (element present)
   ```

2. **Browser Console**:
   ```javascript
   // Check what role you have:
   console.log(window.HYPERBUN_UI_CONTEXT.userRole);
   
   // Check if admin section exists:
   const adminSection = document.getElementById('admin-settings');
   console.log(adminSection); // null if not admin, element if admin
   ```

3. **Visual Inspection**:
   - **Admin User**: "Admin Settings" section visible
   - **Guest/Analyst**: "Admin Settings" section absent

**Visual Indicators**:
- 🔴 **Admin Only**: Red left border (`rbac-protected` class)
- ✅ **Admin User**: Section visible
- ❌ **Non-Admin**: Section doesn't exist in DOM

**HTML Markers**:
```html
<!-- 6.1.1.2.2.2.3.0: Admin-only settings -->
<section id="admin-settings" data-access="admin" class="rbac-protected">
```

---

### 4. Server Timestamp Implantation (6.1.1.2.2.2.4.0)

**What Happens**: Elements with `data-server-timestamp` have their content replaced with formatted server timestamp.

**Where It's Visible**:

**Original HTML** (before transformation):
```html
<div>Server Time: <span data-server-timestamp>Loading...</span></div>
```

**Transformed HTML** (after transformation):
```html
<div>Server Time: <span data-server-timestamp>2024-01-01T12:00:00.450Z</span></div>
```

**How to Verify**:

1. **Browser Elements Tab**:
   - Open DevTools → Elements tab
   - Find `<span data-server-timestamp>`
   - Content should show ISO timestamp (not "Loading...")

2. **Console Query**:
   ```javascript
   const timestampEl = document.querySelector('[data-server-timestamp]');
   console.log(timestampEl.textContent);
   // Expected: ISO timestamp like "2024-01-01T12:00:00.450Z"
   ```

3. **Visual Inspection**:
   - **Before**: Shows "Loading..."
   - **After**: Shows actual server timestamp

**Visual Indicators**:
- ⏰ **Header**: "Server Time: [ISO timestamp]"
- ✅ **Transformed**: Timestamp displayed
- ❌ **Not Transformed**: Still shows "Loading..."

**HTML Markers**:
```html
<!-- 6.1.1.2.2.2.4.0: Server timestamp implantation -->
<div>Server Time: <span data-server-timestamp>Loading...</span></div>
```

---

## Complete Visual Demonstration

### Before Transformation (Original HTML)

```html
<!DOCTYPE html>
<html>
<body>
    <header>
        <h1>Hyper-Bun Control Panel</h1>
        <div>Server Time: <span data-server-timestamp>Loading...</span></div>
    </header>
    
    <main>
        <!-- This section will be removed if shadowGraph=false -->
        <section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin">
            <h2>Shadow Market Graph</h2>
        </section>
        
        <!-- This section will be removed if userRole !== 'admin' -->
        <section id="admin-settings" data-access="admin">
            <h2>Admin Settings</h2>
        </section>
    </main>
    
    <script>
        // window.HYPERBUN_UI_CONTEXT will be injected here
    </script>
</body>
</html>
```

### After Transformation (with context: `{ shadowGraph: false, userRole: 'guest' }`)

```html
<!DOCTYPE html>
<html>
<body>
    <!-- 6.1.1.2.2.2.1.0: Context injected here -->
    <script>window.HYPERBUN_UI_CONTEXT = {"apiBaseUrl":"http://localhost:3001","featureFlags":{"shadowGraph":false},"userRole":"guest","debugMode":false,"currentTimestamp":1704067200450};</script>
    
    <header>
        <h1>Hyper-Bun Control Panel</h1>
        <!-- 6.1.1.2.2.2.4.0: Timestamp replaced -->
        <div>Server Time: <span data-server-timestamp>2024-01-01T12:00:00.450Z</span></div>
    </header>
    
    <main>
        <!-- 6.1.1.2.2.2.2.0: shadow-graph-section REMOVED (feature disabled) -->
        <!-- 6.1.1.2.2.2.3.0: admin-settings REMOVED (userRole !== 'admin') -->
        
        <!-- Only non-feature-flagged, non-admin sections remain -->
        <section id="covert-steam-alerts-section" data-feature="covertSteamAlerts">
            <h2>Covert Steam Alerts</h2>
        </section>
    </main>
</body>
</html>
```

---

## Step-by-Step Verification Guide

### Step 1: Start Server with UIContextRewriter

```typescript
// Example route handler (add to src/api/routes.ts)
import { UIContextRewriter, createUIContextFromRequest } from '../services/ui-context-rewriter';

api.get('/registry.html', async (c) => {
  const request = c.req.raw;
  const context = createUIContextFromRequest(request, {
    featureFlags: {
      shadowGraph: Bun.env.HYPERBUN_FEATURE_SHADOWGRAPH === 'true',
      covertSteamAlerts: true,
      debugPanel: Bun.env.HYPERBUN_DEBUG === 'true'
    },
    userRole: request.headers.get('X-User-Role') as any || 'guest',
    debugMode: Bun.env.HYPERBUN_DEBUG === 'true'
  });
  
  const htmlFile = Bun.file('./public/registry.html');
  const rewriter = new UIContextRewriter(context).createRewriter();
  
  return new Response(rewriter.transform(htmlFile.stream()), {
    headers: { 'Content-Type': 'text/html' }
  });
});
```

### Step 2: Test Different Scenarios

#### Scenario A: Admin User with All Features Enabled

```bash
# Start server
HYPERBUN_FEATURE_SHADOWGRAPH=true HYPERBUN_DEBUG=true bun run src/index.ts

# Request as admin
curl -H "X-User-Role: admin" http://localhost:3001/registry.html > output.html

# Verify in output.html:
# ✅ window.HYPERBUN_UI_CONTEXT injected
# ✅ shadow-graph-section present
# ✅ admin-settings present
# ✅ timestamp replaced
```

**Browser View**:
- ✅ Shadow Market Graph section visible
- ✅ Admin Settings section visible (red border)
- ✅ Server timestamp displayed
- ✅ Debug mode active (yellow dashed border)

#### Scenario B: Guest User with Shadow Graph Disabled

```bash
# Start server
HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/index.ts

# Request as guest (no X-User-Role header)
curl http://localhost:3001/registry.html > output.html

# Verify in output.html:
# ✅ window.HYPERBUN_UI_CONTEXT injected
# ❌ shadow-graph-section REMOVED
# ❌ admin-settings REMOVED
# ✅ timestamp replaced
```

**Browser View**:
- ❌ Shadow Market Graph section NOT visible
- ❌ Admin Settings section NOT visible
- ✅ Covert Steam Alerts section visible
- ✅ Server timestamp displayed

### Step 3: Browser DevTools Verification

1. **Open Browser**: Navigate to `http://localhost:3001/registry.html`

2. **Check Console**:
   ```javascript
   // Verify context injection
   console.log(window.HYPERBUN_UI_CONTEXT);
   
   // Check feature flags
   console.log(window.HYPERBUN_UI_CONTEXT.featureFlags);
   
   // Check user role
   console.log(window.HYPERBUN_UI_CONTEXT.userRole);
   ```

3. **Check Elements Tab**:
   - Search for `shadow-graph-section` → Should be absent if feature disabled
   - Search for `admin-settings` → Should be absent if not admin
   - Find `data-server-timestamp` → Should show timestamp, not "Loading..."

4. **Check Network Tab**:
   - Click on `registry.html` request
   - View Response → Should see injected `window.HYPERBUN_UI_CONTEXT` script

---

## Visual Comparison Table

| Element | Original HTML | Feature Disabled | Role Mismatch | Both Conditions |
|---------|--------------|------------------|---------------|-----------------|
| `window.HYPERBUN_UI_CONTEXT` | ❌ Not present | ✅ Injected | ✅ Injected | ✅ Injected |
| `#shadow-graph-section` | ✅ Present | ❌ **REMOVED** | ✅ Present | ❌ **REMOVED** |
| `#admin-settings` | ✅ Present | ✅ Present | ❌ **REMOVED** | ❌ **REMOVED** |
| `[data-server-timestamp]` | "Loading..." | ✅ Timestamp | ✅ Timestamp | ✅ Timestamp |

---

## Quick Test Commands

### Test Context Injection

```bash
# Verify context is injected
curl -s http://localhost:3001/registry.html | rg -o "window\.HYPERBUN_UI_CONTEXT = \{[^}]+\}"
# Expected: JSON object string
```

### Test Feature Flag Pruning

```bash
# With feature enabled
HYPERBUN_FEATURE_SHADOWGRAPH=true bun run src/index.ts &
curl -s http://localhost:3001/registry.html | rg -c 'id="shadow-graph-section"'
# Expected: 1

# With feature disabled
HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/index.ts &
curl -s http://localhost:3001/registry.html | rg -c 'id="shadow-graph-section"'
# Expected: 0
```

### Test RBAC Pruning

```bash
# As admin
curl -H "X-User-Role: admin" -s http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
# Expected: 1

# As guest
curl -H "X-User-Role: guest" -s http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
# Expected: 0
```

### Test Timestamp Injection

```bash
# Verify timestamp is replaced
curl -s http://localhost:3001/registry.html | rg -A 1 'data-server-timestamp'
# Expected: ISO timestamp, not "Loading..."
```

---

## Browser DevTools Checklist

When viewing `registry.html` in browser:

- [ ] **Console**: `window.HYPERBUN_UI_CONTEXT` exists and has correct values
- [ ] **Elements Tab**: `#shadow-graph-section` present/absent based on feature flag
- [ ] **Elements Tab**: `#admin-settings` present/absent based on user role
- [ ] **Elements Tab**: `[data-server-timestamp]` shows timestamp (not "Loading...")
- [ ] **Network Tab**: Response includes injected script tag
- [ ] **Visual**: Page displays only authorized/feature-enabled sections

---

## Related Documentation

- [UIContextRewriter Implementation](./UI-CONTEXT-REWRITER-IMPLEMENTATION-SUMMARY.md)
- [Ripgrep Demonstrations](./RIPGREP-DEMONSTRATIONS.md)
- [Test Formula Blueprint](./TEST-FORMULA-BLUEPRINT.md)
