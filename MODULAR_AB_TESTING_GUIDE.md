# 🧪 Modular A/B Testing Implementation Guide

## **Using Bun's CookieMap with Modular ABTestingManager Class**

---

## **🎯 Overview**

This implementation provides a clean, modular A/B testing system using Bun's native `CookieMap` API. The `ABTestingManager` class handles all cookie operations, variant assignment, and test management in a reusable way.

---

## **🍪 Core Components**

### **1. ABTestingManager Class**
```typescript
// lib/ab-testing/cookie-manager.ts
export class ABTestingManager {
  private cookies: Bun.CookieMap;
  private tests = new Map<string, TestConfig>();
  
  constructor(cookieString?: string) {
    this.cookies = new Bun.CookieMap(cookieString);
  }
}
```

### **2. Bun CookieMap Integration**
```typescript
// Reading cookies
const cookies = new Bun.CookieMap(req.headers.get("cookie"));

// Setting cookies with proper options
const cookieOptions: CookieInit = {
  name: "ab_test_url_structure",
  value: "direct",
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true
};

this.cookies.set(cookieOptions);
```

---

## **🚀 Quick Start**

### **1. Basic Usage**
```typescript
import { ABTestingManager } from './lib/ab-testing/cookie-manager.ts';

// Create manager instance
const abManager = new ABTestingManager(req.headers.get("cookie"));

// Register a test
abManager.registerTest("url_structure", ["direct", "fragments"], {
  weights: [50, 50],
  cookieName: "url_test_group",
  expiryDays: 30
});

// Get variant for user
const variant = abManager.getVariant("url_structure"); // "direct" or "fragments"

// Get cookie headers for response
const cookieHeaders = abManager.getResponseHeaders();
```

### **2. Server Integration**
```typescript
// In your server route handler
if (url.pathname === "/" && req.method === "GET") {
  const cookieString = req.headers.get("cookie") || undefined;
  const abManager = new ABTestingManager(cookieString);
  
  // Register tests (once at startup)
  abManager.registerTest("url_structure", ["direct", "fragments"]);
  
  // Get variant
  const variant = abManager.getVariant("url_structure");
  
  // Get response headers with cookies
  const cookieHeaders = abManager.getResponseHeaders();
  
  // Serve content based on variant
  const html = generateContent(variant);
  
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Set-Cookie": cookieHeaders[0] || ""
    }
  });
}
```

---

## **📋 API Reference**

### **Constructor**
```typescript
constructor(cookieString?: string)
```
- `cookieString`: Optional cookie string from request headers
- Creates internal `Bun.CookieMap` instance

### **registerTest()**
```typescript
registerTest(
  testId: string,
  variants: string[],
  options?: {
    weights?: number[];
    cookieName?: string;
    expiryDays?: number;
  }
): void
```
- `testId`: Unique identifier for the test
- `variants`: Array of variant names
- `options.weights`: Weight distribution (defaults to equal)
- `options.cookieName`: Custom cookie name (defaults to `ab_test_{testId}`)
- `options.expiryDays`: Cookie expiration in days (defaults to 30)

### **getVariant()**
```typescript
getVariant(testId: string): string
```
- Returns assigned variant for the user
- Assigns new variant if none exists
- Throws error if test not registered

### **getAllAssignments()**
```typescript
getAllAssignments(): Record<string, string>
```
- Returns all test assignments for current user
- Format: `{ testId: variant, ... }`

### **forceAssignVariant()**
```typescript
forceAssignVariant(testId: string, variant: string): void
```
- Forces assignment to specific variant
- Useful for testing and admin functions
- Throws error if test or variant invalid

### **getResponseHeaders()**
```typescript
getResponseHeaders(): string[]
```
- Returns array of `Set-Cookie` headers
- Include in response headers to set cookies

---

## **🎛️ Advanced Features**

### **1. Multiple Tests**
```typescript
// Register multiple tests
abManager.registerTest("url_structure", ["direct", "fragments"], {
  weights: [50, 50]
});

abManager.registerTest("layout", ["sidebar", "topnav"], {
  weights: [60, 40]
});

abManager.registerTest("cta_color", ["blue", "green", "orange"], {
  weights: [33, 33, 34]
});

// Get all assignments
const assignments = abManager.getAllAssignments();
// Result: { url_structure: "direct", layout: "sidebar", cta_color: "blue" }
```

### **2. Weighted Assignment**
```typescript
// 70/30 split favoring direct URLs
abManager.registerTest("url_structure", ["direct", "fragments"], {
  weights: [70, 30]
});

// 3-way split with different weights
abManager.registerTest("pricing", ["basic", "pro", "enterprise"], {
  weights: [50, 30, 20]
});
```

### **3. Custom Cookie Configuration**
```typescript
abManager.registerTest("feature_test", ["enabled", "disabled"], {
  cookieName: "feature_rollout",
  expiryDays: 7, // Shorter test duration
  weights: [10, 90] // 10% get new feature
});
```

### **4. Admin Functions**
```typescript
// Force assignment for testing
abManager.forceAssignVariant("url_structure", "direct");

// Clear assignment
abManager.clearAssignment("url_structure");

// Check if user has assignment
const assignments = abManager.getAllAssignments();
const hasUrlTest = "url_structure" in assignments;
```

---

## **📊 Complete Server Example**

### **Server Setup**
```typescript
import { serve } from "bun";
import { ABTestingManager } from "./lib/ab-testing/cookie-manager.ts";

// Global test registration
function registerTests(abManager: ABTestingManager) {
  abManager.registerTest("url_structure", ["direct", "fragments"], {
    weights: [50, 50],
    cookieName: "url_test",
    expiryDays: 30
  });
  
  abManager.registerTest("page_layout", ["sidebar", "topnav"], {
    weights: [60, 40],
    cookieName: "layout_test",
    expiryDays: 14
  });
}

// Content generation
function generatePage(assignments: Record<string, string>) {
  const urlVariant = assignments.url_structure || "direct";
  const layoutVariant = assignments.page_layout || "sidebar";
  
  return `
    <html>
      <head><title>A/B Test - ${urlVariant} / ${layoutVariant}</title></head>
      <body>
        <h1>URL Structure: ${urlVariant}</h1>
        <h2>Layout: ${layoutVariant}</h2>
        <!-- Content based on variants -->
      </body>
    </html>
  `;
}

// Metrics tracking
const metrics = {
  url_structure: { direct: { views: 0, clicks: 0 }, fragments: { views: 0, clicks: 0 } },
  page_layout: { sidebar: { views: 0, clicks: 0 }, topnav: { views: 0, clicks: 0 } }
};

function trackMetric(testId: string, variant: string, action: "view" | "click") {
  if (metrics[testId] && metrics[testId][variant]) {
    metrics[testId][variant][action]++;
  }
}

// Server
const server = serve({
  port: 3005,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/" && req.method === "GET") {
      // Create manager for this request
      const cookieString = req.headers.get("cookie") || undefined;
      const abManager = new ABTestingManager(cookieString);
      
      // Register tests
      registerTests(abManager);
      
      // Get assignments
      const assignments = abManager.getAllAssignments();
      
      // Track views
      Object.entries(assignments).forEach(([testId, variant]) => {
        trackMetric(testId, variant, "view");
      });
      
      // Get cookie headers
      const cookieHeaders = abManager.getResponseHeaders();
      
      // Generate content
      const html = generatePage(assignments);
      
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": cookieHeaders[0] || ""
        }
      });
    }
    
    return new Response("Not found", { status: 404 });
  }
});

console.log("🧪 A/B Testing Server running on http://localhost:3005");
```

---

## **🔧 Testing & Debugging**

### **1. Manual Testing**
```bash
# Test first visit (should assign variant)
curl -v http://localhost:3005/
# Look for: Set-Cookie: url_test=direct

# Test second visit (should use existing variant)
curl -v -H "Cookie: url_test=direct" http://localhost:3005/
# Should not set new cookie

# Force assignment
curl -X POST -H "Content-Type: application/json" \
  -d '{"testId": "url_structure", "variant": "fragments"}' \
  http://localhost:3005/force-assign
```

### **2. Debug Mode**
```typescript
// Add logging to ABTestingManager
class ABTestingManager {
  private debug = process.env.DEBUG_AB_TEST === "true";
  
  getVariant(testId: string): string {
    const test = this.tests.get(testId);
    const existingVariant = this.cookies.get(test.cookieName);
    
    if (this.debug) {
      console.log(`🐛 ${testId}: existing=${existingVariant}`);
    }
    
    if (existingVariant && test.variants.includes(existingVariant)) {
      if (this.debug) console.log(`🐛 ${testId}: using existing ${existingVariant}`);
      return existingVariant;
    }
    
    const variant = this.assignVariant(test.variants, test.weights);
    if (this.debug) console.log(`🐛 ${testId}: assigned new ${variant}`);
    
    this.setVariantCookie(test.cookieName, variant, test.expiryDays);
    return variant;
  }
}
```

### **3. Load Testing**
```bash
# Simulate 100 users
for i in {1..100}; do
  curl -s http://localhost:3005/ > /dev/null &
done

# Check distribution
curl http://localhost:3005/metrics
```

---

## **🌐 Production Considerations**

### **1. Security**
```typescript
// Production cookie settings
const productionOptions = {
  secure: true,           // HTTPS only
  httpOnly: true,         // Prevent XSS
  sameSite: "strict",     // CSRF protection
  maxAge: 30 * 24 * 60 * 60, // 30 days
  domain: ".yourdomain.com" // Subdomain-wide
};
```

### **2. Performance**
```typescript
// Cache test configurations
const TEST_CONFIGS = new Map();

// Reuse manager instances
const managerPool = new Map<string, ABTestingManager>();

function getManager(cookieString: string): ABTestingManager {
  if (!managerPool.has(cookieString)) {
    managerPool.set(cookieString, new ABTestingManager(cookieString));
  }
  return managerPool.get(cookieString)!;
}
```

### **3. Analytics Integration**
```typescript
// Track to analytics service
function trackToAnalytics(testId: string, variant: string, action: string) {
  fetch('https://analytics.example.com/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'ab_test',
      testId,
      variant,
      action,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for')
    })
  });
}
```

---

## **📈 Best Practices**

### **1. Test Design**
- ✅ **Clear hypotheses**: Define what you're testing and why
- ✅ **Sufficient traffic**: Ensure statistical significance
- ✅ **Proper duration**: Run tests long enough for meaningful results
- ✅ **Single variable**: Test one thing at a time when possible

### **2. Implementation**
- ✅ **Consistent naming**: Use clear test IDs and variant names
- ✅ **Proper weights**: Ensure weights sum to meaningful values
- ✅ **Cookie management**: Set appropriate expiration and security
- ✅ **Error handling**: Gracefully handle missing tests or variants

### **3. Monitoring**
- ✅ **Real-time metrics**: Track performance as tests run
- ✅ **Statistical significance**: Use proper statistical methods
- ✅ **User feedback**: Collect qualitative data alongside metrics
- ✅ **Business impact**: Measure effect on key business metrics

---

## **🎉 Summary**

### **Key Benefits**
- ✅ **Modular design**: Reusable ABTestingManager class
- ✅ **Bun-native**: Uses CookieMap for optimal performance
- ✅ **Flexible**: Supports multiple tests, weights, and configurations
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Production-ready**: Security and performance considerations

### **Core Features**
- 🍪 **Cookie management** with Bun's CookieMap
- 🎲 **Weighted random assignment** for variants
- 📊 **Multiple concurrent tests** support
- 🔧 **Admin functions** for testing and control
- 📈 **Real-time metrics** tracking

### **Next Steps**
1. **Customize tests** for your specific use cases
2. **Integrate analytics** for deeper insights
3. **Set up monitoring** for test performance
4. **Configure production** settings
5. **Document results** and learnings

**You now have a complete, modular A/B testing system built with Bun's native CookieMap API!** 🚀

---

## **📁 Files Created**

- `lib/ab-testing/cookie-manager.ts` - Modular ABTestingManager class
- `modular-ab-testing-server.ts` - Complete server implementation
- `MODULAR_AB_TESTING_GUIDE.md` - Comprehensive implementation guide

**Ready to implement clean, modular A/B testing with Bun's powerful cookie APIs!** 🧪

---

*Generated by Modular A/B Testing System - Bun CookieMap Implementation*
