# Registry.html: Before & After Transformation Examples

## Visual Comparison

### Example 1: Admin User with All Features Enabled

#### BEFORE Transformation (Original HTML)

```html
<!DOCTYPE html>
<html>
<body>
    <header>
        <h1>Hyper-Bun Control Panel</h1>
        <div>Server Time: <span data-server-timestamp>Loading...</span></div>
    </header>
    
    <main>
        <section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin">
            <h2>Shadow Market Graph</h2>
        </section>
        
        <section id="covert-steam-alerts-section" data-feature="covertSteamAlerts">
            <h2>Covert Steam Alerts</h2>
        </section>
        
        <section id="admin-settings" data-access="admin">
            <h2>Admin Settings</h2>
        </section>
    </main>
</body>
</html>
```

#### AFTER Transformation (Context: `{ shadowGraph: true, userRole: 'admin' }`)

```html
<!DOCTYPE html>
<html>
<body>
    <!-- ✅ 6.1.1.2.2.2.1.0: Context injected -->
    <script>window.HYPERBUN_UI_CONTEXT = {
        "apiBaseUrl":"http://localhost:3001",
        "featureFlags":{"shadowGraph":true,"covertSteamAlerts":true},
        "userRole":"admin",
        "debugMode":true,
        "currentTimestamp":1704067200450
    };</script>
    
    <header>
        <h1>Hyper-Bun Control Panel</h1>
        <!-- ✅ 6.1.1.2.2.2.4.0: Timestamp replaced -->
        <div>Server Time: <span data-server-timestamp>2024-01-01T12:00:00.450Z</span></div>
    </header>
    
    <main>
        <!-- ✅ 6.1.1.2.2.2.2.0: Feature enabled → Section PRESENT -->
        <!-- ✅ 6.1.1.2.2.2.3.0: Admin role → Section PRESENT -->
        <section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin" class="rbac-protected">
            <h2>Shadow Market Graph</h2>
        </section>
        
        <!-- ✅ 6.1.1.2.2.2.2.0: Feature enabled → Section PRESENT -->
        <section id="covert-steam-alerts-section" data-feature="covertSteamAlerts">
            <h2>Covert Steam Alerts</h2>
        </section>
        
        <!-- ✅ 6.1.1.2.2.2.3.0: Admin role → Section PRESENT -->
        <section id="admin-settings" data-access="admin" class="rbac-protected">
            <h2>Admin Settings</h2>
        </section>
    </main>
</body>
</html>
```

**Browser View**:
- ✅ All sections visible
- ✅ Server timestamp displayed
- ✅ Admin sections have red left border
- ✅ `window.HYPERBUN_UI_CONTEXT` available in console

---

### Example 2: Guest User with Shadow Graph Disabled

#### BEFORE Transformation (Same Original HTML)

```html
<!-- Same as Example 1 -->
```

#### AFTER Transformation (Context: `{ shadowGraph: false, userRole: 'guest' }`)

```html
<!DOCTYPE html>
<html>
<body>
    <!-- ✅ 6.1.1.2.2.2.1.0: Context injected -->
    <script>window.HYPERBUN_UI_CONTEXT = {
        "apiBaseUrl":"http://localhost:3001",
        "featureFlags":{"shadowGraph":false,"covertSteamAlerts":true},
        "userRole":"guest",
        "debugMode":false,
        "currentTimestamp":1704067200450
    };</script>
    
    <header>
        <h1>Hyper-Bun Control Panel</h1>
        <!-- ✅ 6.1.1.2.2.2.4.0: Timestamp replaced -->
        <div>Server Time: <span data-server-timestamp>2024-01-01T12:00:00.450Z</span></div>
    </header>
    
    <main>
        <!-- ❌ 6.1.1.2.2.2.2.0: Feature disabled → Section REMOVED -->
        <!-- ❌ 6.1.1.2.2.2.3.0: Guest role → Section REMOVED -->
        <!-- shadow-graph-section COMPLETELY REMOVED FROM DOM -->
        
        <!-- ✅ 6.1.1.2.2.2.2.0: Feature enabled → Section PRESENT -->
        <section id="covert-steam-alerts-section" data-feature="covertSteamAlerts">
            <h2>Covert Steam Alerts</h2>
        </section>
        
        <!-- ❌ 6.1.1.2.2.2.3.0: Guest role → Section REMOVED -->
        <!-- admin-settings COMPLETELY REMOVED FROM DOM -->
    </main>
</body>
</html>
```

**Browser View**:
- ❌ Shadow Market Graph section **NOT VISIBLE** (removed from DOM)
- ✅ Covert Steam Alerts section visible
- ❌ Admin Settings section **NOT VISIBLE** (removed from DOM)
- ✅ Server timestamp displayed

**Verification in Browser Console**:
```javascript
// Check if sections exist
document.getElementById('shadow-graph-section')  // null (removed)
document.getElementById('admin-settings')        // null (removed)
document.getElementById('covert-steam-alerts-section')  // <section> element (present)

// Check context
window.HYPERBUN_UI_CONTEXT.featureFlags.shadowGraph  // false
window.HYPERBUN_UI_CONTEXT.userRole                  // "guest"
```

---

## How to See Transformations in Browser

### Method 1: View Page Source

1. **Right-click** on page → **"View Page Source"**
2. **Search for** `window.HYPERBUN_UI_CONTEXT`
3. **See**: Injected script tag with context object
4. **Search for** `shadow-graph-section`
5. **See**: Present if feature enabled, absent if disabled

### Method 2: Browser DevTools Elements Tab

1. **Open DevTools** (F12)
2. **Go to Elements tab**
3. **Search for** `shadow-graph-section`
4. **Result**:
   - ✅ **Found**: Feature is enabled
   - ❌ **Not Found**: Feature is disabled (removed from DOM)

### Method 3: Browser Console

```javascript
// Check context injection
console.log(window.HYPERBUN_UI_CONTEXT);
// Expected: Object with apiBaseUrl, featureFlags, userRole, etc.

// Check feature flags
console.log(window.HYPERBUN_UI_CONTEXT.featureFlags);
// Expected: { shadowGraph: true/false, covertSteamAlerts: true/false }

// Check if elements exist (after transformation)
console.log(document.getElementById('shadow-graph-section'));
// Expected: <section> element if enabled, null if disabled

console.log(document.getElementById('admin-settings'));
// Expected: <section> element if admin, null if guest

// Check timestamp
console.log(document.querySelector('[data-server-timestamp]').textContent);
// Expected: ISO timestamp string, not "Loading..."
```

### Method 4: Network Tab

1. **Open DevTools** → **Network tab**
2. **Reload page**
3. **Click on** `registry.html` request
4. **View Response** tab
5. **See**: Transformed HTML with:
   - Injected `window.HYPERBUN_UI_CONTEXT` script
   - Removed sections (if features disabled or role mismatch)
   - Replaced timestamp

---

## Visual Indicators on Page

### ✅ Context Injection Visible

**Location**: Browser console
```javascript
window.HYPERBUN_UI_CONTEXT
// Shows: { apiBaseUrl, featureFlags, userRole, debugMode, currentTimestamp }
```

### ✅ Feature Flag Pruning Visible

**Location**: Page content
- **Feature Enabled**: Section visible on page
- **Feature Disabled**: Section completely absent (check Elements tab)

**Example**:
- `#shadow-graph-section` visible when `shadowGraph: true`
- `#shadow-graph-section` absent when `shadowGraph: false`

### ✅ RBAC Pruning Visible

**Location**: Page content
- **Admin User**: Section visible with red left border (`rbac-protected` class)
- **Guest/Analyst**: Section completely absent

**Example**:
- `#admin-settings` visible when `userRole: 'admin'`
- `#admin-settings` absent when `userRole: 'guest'`

### ✅ Timestamp Injection Visible

**Location**: Header "Server Time" display
- **Before**: "Server Time: Loading..."
- **After**: "Server Time: 2024-01-01T12:00:00.450Z"

---

## Quick Test Scenarios

### Scenario A: See All Transformations Working

```bash
# Start server with all features enabled, as admin
HYPERBUN_FEATURE_SHADOWGRAPH=true \
HYPERBUN_FEATURE_COVERTSTEAM=true \
HYPERBUN_DEBUG=true \
bun run src/index.ts

# Request as admin
curl -H "X-User-Role: admin" http://localhost:3001/registry.html > output.html

# Verify:
rg "window.HYPERBUN_UI_CONTEXT" output.html          # ✅ Found
rg "shadow-graph-section" output.html                # ✅ Found
rg "admin-settings" output.html                      # ✅ Found
rg "data-server-timestamp.*Loading" output.html       # ❌ Not found (replaced)
```

**Browser**: All sections visible, timestamp displayed, context available

### Scenario B: See Feature Flag Pruning

```bash
# Start server with shadow graph disabled
HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/index.ts

# Request
curl http://localhost:3001/registry.html > output.html

# Verify:
rg "shadow-graph-section" output.html                # ❌ Not found (removed)
rg "covert-steam-alerts-section" output.html         # ✅ Found
```

**Browser**: Shadow graph section absent, alerts section visible

### Scenario C: See RBAC Pruning

```bash
# Start server
bun run src/index.ts

# Request as guest
curl -H "X-User-Role: guest" http://localhost:3001/registry.html > guest.html

# Request as admin
curl -H "X-User-Role: admin" http://localhost:3001/registry.html > admin.html

# Compare:
rg "admin-settings" guest.html                       # ❌ Not found
rg "admin-settings" admin.html                       # ✅ Found
```

**Browser**: 
- Guest: Admin settings absent
- Admin: Admin settings visible with red border

---

## HTML Comments Guide

The HTML file includes comments showing transformation behavior:

```html
<!-- TRANSFORMATION BEHAVIOR:
     - If featureFlags.shadowGraph === false → ENTIRE SECTION REMOVED from DOM
     - If userRole !== 'admin' → ENTIRE SECTION REMOVED from DOM
-->
<section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin">
```

These comments explain:
1. **What triggers the transformation**
2. **What happens** (removed vs. visible)
3. **How to verify** (DevTools instructions)

---

## Related Documentation

- [Registry HTML Transformations Visual Guide](./REGISTRY-HTML-TRANSFORMATIONS-VISUAL-GUIDE.md) - Detailed transformation guide
- [Registry HTML Quick Start](./REGISTRY-HTML-QUICK-START.md) - Quick setup instructions
- [UIContextRewriter Implementation](./UI-CONTEXT-REWRITER-IMPLEMENTATION-SUMMARY.md) - Service implementation
