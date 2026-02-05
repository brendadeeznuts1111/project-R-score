# Registry.html Visual Demonstration

## Quick Answer: How Transformations Are Shown

The transformations in `public/registry.html` are visible in **three ways**:

### 1. **In the Browser Console** (Context Injection)

```javascript
// Open browser console (F12) and type:
window.HYPERBUN_UI_CONTEXT

// You'll see the injected context object:
{
  apiBaseUrl: "http://localhost:3001",
  featureFlags: { shadowGraph: true, covertSteamAlerts: true },
  userRole: "admin",
  debugMode: true,
  currentTimestamp: 1704067200450
}
```

**This proves**: `6.1.1.2.2.2.1.0` context injection worked ✅

---

### 2. **On the Page** (Feature Flag & RBAC Pruning)

**What you see**:
- ✅ **Shadow Market Graph section**: Visible if `shadowGraph: true`, **completely absent** if `false`
- ✅ **Admin Settings section**: Visible if `userRole: 'admin'`, **completely absent** if `userRole: 'guest'`
- ✅ **Server Time**: Shows actual timestamp (not "Loading...")

**How to verify**:
1. Open browser DevTools (F12)
2. Go to **Elements** tab
3. Search for `shadow-graph-section`
   - **Found** = Feature enabled ✅
   - **Not Found** = Feature disabled (removed from DOM) ❌

**This proves**: `6.1.1.2.2.2.2.0` and `6.1.1.2.2.2.3.0` pruning worked ✅

---

### 3. **In View Page Source** (All Transformations)

1. Right-click page → **"View Page Source"**
2. Search for `window.HYPERBUN_UI_CONTEXT`
   - ✅ **Found**: Script tag with context object injected
3. Search for `shadow-graph-section`
   - ✅ **Found**: Feature enabled
   - ❌ **Not Found**: Feature disabled (removed)
4. Search for `data-server-timestamp`
   - ✅ **Shows**: Actual timestamp (not "Loading...")

**This proves**: All transformations visible in HTML source ✅

---

## Visual Indicators

| Transformation | Where to Look | What You'll See |
|---------------|---------------|-----------------|
| **Context Injection** (6.1.1.2.2.2.1.0) | Browser Console | `window.HYPERBUN_UI_CONTEXT` object |
| **Feature Flag Pruning** (6.1.1.2.2.2.2.0) | Page Content | Sections appear/disappear |
| **RBAC Pruning** (6.1.1.2.2.2.3.0) | Page Content | Admin sections visible/hidden |
| **Timestamp Injection** (6.1.1.2.2.2.4.0) | Header | "Server Time: [timestamp]" |

---

## Quick Test

```bash
# Start server
HYPERBUN_FEATURE_SHADOWGRAPH=true bun run src/index.ts

# Open browser
open http://localhost:3001/registry.html

# In browser console:
window.HYPERBUN_UI_CONTEXT.featureFlags.shadowGraph  // true
document.getElementById('shadow-graph-section')      // <section> element

# Disable feature and refresh:
HYPERBUN_FEATURE_SHADOWGRAPH=false bun run src/index.ts
# Refresh browser
document.getElementById('shadow-graph-section')      // null (removed!)
```

---

## Related Documentation

- [Registry HTML Transformations Visual Guide](./REGISTRY-HTML-TRANSFORMATIONS-VISUAL-GUIDE.md) - Detailed guide
- [Registry HTML Before & After](./REGISTRY-HTML-BEFORE-AFTER.md) - Examples
- [Registry HTML Quick Start](./REGISTRY-HTML-QUICK-START.md) - Setup instructions
