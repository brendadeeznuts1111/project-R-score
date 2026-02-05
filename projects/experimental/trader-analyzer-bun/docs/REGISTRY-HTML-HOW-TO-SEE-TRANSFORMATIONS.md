# How to See Transformations in registry.html

## Quick Answer

The transformations are visible in **three places**:

### 1. **Browser Console** (Context Injection)

```javascript
// Open browser console (F12) and type:
window.HYPERBUN_UI_CONTEXT

// You'll see:
{
  apiBaseUrl: "http://localhost:3001",
  featureFlags: { shadowGraph: true, covertSteamAlerts: true },
  userRole: "admin",
  debugMode: true,
  currentTimestamp: 1704067200450
}
```

**This shows**: `6.1.1.2.2.2.1.0` context injection ✅

---

### 2. **Page Content** (Feature Flags & RBAC)

**What you see on the page**:
- ✅ **Shadow Market Graph section**: Visible if feature enabled, **completely gone** if disabled
- ✅ **Admin Settings section**: Visible if admin, **completely gone** if guest
- ✅ **Server Time**: Shows actual timestamp (not "Loading...")

**How to verify**:
1. Open DevTools (F12) → **Elements** tab
2. Search for `shadow-graph-section`
   - **Found** = Feature enabled ✅
   - **Not Found** = Feature disabled (removed from DOM) ❌

**This shows**: `6.1.1.2.2.2.2.0` and `6.1.1.2.2.2.3.0` pruning ✅

---

### 3. **View Page Source** (All Transformations)

1. Right-click → **"View Page Source"**
2. Search for `window.HYPERBUN_UI_CONTEXT` → ✅ Found (injected script)
3. Search for `shadow-graph-section` → ✅/❌ Based on feature flag
4. Search for `data-server-timestamp` → ✅ Shows timestamp (not "Loading...")

**This shows**: All transformations visible in HTML source ✅

---

## Visual Guide

### Before Transformation (Original HTML)

```html
<body>
    <header>
        <div>Server Time: <span data-server-timestamp>Loading...</span></div>
    </header>
    <main>
        <section id="shadow-graph-section" data-feature="shadowGraph" data-access="admin">
            <h2>Shadow Market Graph</h2>
        </section>
        <section id="admin-settings" data-access="admin">
            <h2>Admin Settings</h2>
        </section>
    </main>
</body>
```

### After Transformation (with `{ shadowGraph: false, userRole: 'guest' }`)

```html
<body>
    <!-- ✅ Context injected -->
    <script>window.HYPERBUN_UI_CONTEXT = {...};</script>
    
    <header>
        <!-- ✅ Timestamp replaced -->
        <div>Server Time: <span data-server-timestamp>2024-01-01T12:00:00.450Z</span></div>
    </header>
    <main>
        <!-- ❌ shadow-graph-section REMOVED (feature disabled) -->
        <!-- ❌ admin-settings REMOVED (not admin) -->
        
        <!-- ✅ Only non-feature-flagged sections remain -->
        <section id="covert-steam-alerts-section" data-feature="covertSteamAlerts">
            <h2>Covert Steam Alerts</h2>
        </section>
    </main>
</body>
```

---

## Step-by-Step Verification

### Step 1: Check Context Injection

```javascript
// Browser console
console.log(window.HYPERBUN_UI_CONTEXT);
// Expected: Object with apiBaseUrl, featureFlags, userRole, etc.
```

### Step 2: Check Feature Flag Pruning

```javascript
// Browser console
const section = document.getElementById('shadow-graph-section');
console.log(section);
// Expected: <section> element if enabled, null if disabled
```

### Step 3: Check RBAC Pruning

```javascript
// Browser console
const adminSection = document.getElementById('admin-settings');
console.log(adminSection);
// Expected: <section> element if admin, null if guest
```

### Step 4: Check Timestamp Injection

```javascript
// Browser console
const timestamp = document.querySelector('[data-server-timestamp]');
console.log(timestamp.textContent);
// Expected: ISO timestamp string, not "Loading..."
```

---

## Quick Test Commands

```bash
# Test context injection
curl -s http://localhost:3001/registry.html | rg "window.HYPERBUN_UI_CONTEXT"
# Expected: Script tag with context object

# Test feature flag pruning
curl -s http://localhost:3001/registry.html | rg -c 'id="shadow-graph-section"'
# Expected: 1 if enabled, 0 if disabled

# Test RBAC pruning
curl -H "X-User-Role: guest" -s http://localhost:3001/registry.html | rg -c 'id="admin-settings"'
# Expected: 0 (removed for guest)

# Test timestamp injection
curl -s http://localhost:3001/registry.html | rg -A 1 'data-server-timestamp'
# Expected: ISO timestamp, not "Loading..."
```

---

## Related Documentation

- [Registry HTML Transformations Visual Guide](./REGISTRY-HTML-TRANSFORMATIONS-VISUAL-GUIDE.md)
- [Registry HTML Before & After](./REGISTRY-HTML-BEFORE-AFTER.md)
- [Registry HTML Quick Start](./REGISTRY-HTML-QUICK-START.md)
