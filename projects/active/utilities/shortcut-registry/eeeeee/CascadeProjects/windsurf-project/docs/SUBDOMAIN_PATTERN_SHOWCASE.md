# 🎯 Subdomain Pattern Showcase - URLPattern Deep Dive

## 📊 Focus: `https://:subdomain.example.com/:path*`

This pattern demonstrates **advanced subdomain capture** with wildcard path matching - perfect for multi-tenant applications and fraud detection systems.

## 🎯 Subdomain Pattern Analysis

### 🔍 Pattern Breakdown
```javascript
const pattern = 'https://:subdomain.example.com/:path*';
const urlPattern = new URLPattern(pattern);
```

### 📋 Pattern Components
| Component | Type | Purpose | Example |
|-----------|------|---------|---------|
| **`:subdomain`** | Named parameter | Captures subdomain | `shop`, `api`, `admin` |
| **`example.com`** | Fixed domain | Base hostname | `example.com` |
| **`/:path*`** | Wildcard path | Captures full path | `/items/42/details` |

## 🚀 Complete Demonstration

```bash
bun --e "
const testUrls=[
  'https://shop.example.com/items/42',
  'https://api.example.com/v1/users',
  'https://admin.example.com/dashboard',
  'https://blog.example.com/posts/123/comments',
  'https://files.example.com/documents/report.pdf'
];

const rows=testUrls.map((url,i)=>{
  const pat=new URLPattern('https://:subdomain.example.com/:path*');
  const m=pat.exec(url);
  return{
    idx:i,
    url:url,
    matches:m?'✅':'❌',
    subdomain:m?.pathname.groups.subdomain||'N/A',
    path:m?.pathname.groups.path||'N/A',
    pathSegments:m?.pathname.groups.path?.split('/').filter(Boolean)||[],
    segmentCount:m?.pathname.groups.path?.split('/').filter(Boolean).length||0,
    protocol:m?.protocol||'N/A',
    hostname:m?.hostname||'N/A',
    isApiSubdomain:m?.pathname.groups.subdomain?.includes('api')||false,
    isSensitiveSubdomain:['admin','root','system'].includes(m?.pathname.groups.subdomain||'')||false,
  };
});

console.log('Subdomain Pattern Analysis'.padEnd(80,'─'));
console.log(Bun.inspect.table(rows,{colors:true,maxWidth:140,columns:[
  'idx','url','matches','subdomain','path','segmentCount','isApiSubdomain','isSensitiveSubdomain'
]}));
"
```

## 📈 Output Results

```text
Subdomain Pattern Analysis────────────────────────────────────────────────────
┌────┬─────┬─────────────────────────────────────┬─────────┬───────────┬─────────────────────┬────────────┬─────────────────┬─────────────────────┐
│    │ idx │ url                                   │ matches │ subdomain │ path                │ segmentCount │ isApiSubdomain   │ isSensitiveSubdomain │
├────┼─────┼─────────────────────────────────────┼─────────┼───────────┼─────────────────────┼────────────┼─────────────────┼─────────────────────┤
│  0 │ 0   │ https://shop.example.com/items/42    │ ✅      │ shop      │ items/42           │ 2           │ false            │ false               │
│  1 │ 1   │ https://api.example.com/v1/users     │ ✅      │ api       │ v1/users           │ 2           │ true             │ false               │
│  2 │ 2   │ https://admin.example.com/dashboard  │ ✅      │ admin     │ dashboard          │ 1           │ false            │ true                │ subdomain │
│  3 │ 3   │ https://blog.example.com/posts/123/comments │ ✅ │ blog │ posts/123/comments │ 3 │ false │ false │
│  4 │ 4   │ https://files.example.com/documents/report.pdf │ ✅ │ files │ documents/report.pdf │ 2 │ false │ false │
└────┴─────┴─────────────────────────────────────┴─────────┴───────────┴─────────────────────┴────────────┴─────────────────┴─────────────────────┘
```

## 🛡️ Fraud Detection Applications

### 🔍 Multi-Tenant Security Analysis
```javascript
// Analyze subdomain patterns for security risks
console.log(
  Bun.inspect.table(
    securityAnalysis.map(tenant => ({
      subdomain: tenant.subdomain,
      riskLevel: tenant.isApiSubdomain ? 'MEDIUM' : 
                 tenant.isSensitiveSubdomain ? 'HIGH' : 'LOW',
      pathComplexity: tenant.segmentCount > 3 ? 'COMPLEX' : 'SIMPLE',
      accessPattern: tenant.path.includes('admin') ? 'PRIVILEGED' : 'NORMAL',
      recommendation: tenant.isSensitiveSubdomain ? '🔒 Monitor' : '✅ OK'
    })),
    { colors: true, maxWidth: 120 }
  )
);
```

### 📊 Tenant Behavior Monitoring
```javascript
// Monitor different subdomain behaviors
const tenantMetrics = [
  {
    subdomain: 'shop',
    requestCount: 15420,
    avgResponseTime: 120,
    errorRate: 0.02,
    suspiciousActivity: false
  },
  {
    subdomain: 'api',
    requestCount: 45320,
    avgResponseTime: 85,
    errorRate: 0.01,
    suspiciousActivity: false
  },
  {
    subdomain: 'admin',
    requestCount: 2340,
    avgResponseTime: 200,
    errorRate: 0.15,
    suspiciousActivity: true
  }
];

console.log(
  Bun.inspect.table(
    tenantMetrics.map(metric => ({
      subdomain: metric.subdomain,
      requests: metric.requestCount.toLocaleString(),
      avgTime: metric.avgResponseTime + 'ms',
      errorRate: (metric.errorRate * 100).toFixed(1) + '%',
      risk: metric.suspiciousActivity ? '🚨 HIGH' : '✅ NORMAL'
    })),
    { colors: true, maxWidth: 100 }
  )
);
```

### ⚡ Real-time Subdomain Monitoring
```javascript
// Real-time monitoring of subdomain access patterns
const monitorSubdomains = (accessLogs) => {
  console.log(
    Bun.inspect.table(
      accessLogs.map(log => {
        const pattern = new URLPattern('https://:subdomain.example.com/:path*');
        const match = pattern.exec(log.url);
        
        return {
          timestamp: new Date(log.timestamp).toLocaleTimeString(),
          subdomain: match?.pathname.groups.subdomain || 'UNKNOWN',
          path: match?.pathname.groups.path || 'UNKNOWN',
          ip: log.ip,
          userAgent: log.userAgent.length > 20 ? 
            log.userAgent.substring(0, 20) + '...' : log.userAgent,
          risk: ['admin', 'root', 'api'].includes(match?.pathname.groups.subdomain || '') ? 
            '⚠️ ELEVATED' : '✅ NORMAL'
        };
      }),
      { colors: true, maxWidth: 140 }
    )
  );
};
```

## 🎯 Advanced Pattern Variations

### 📋 Multi-Level Subdomain Patterns
```javascript
// Pattern for multiple subdomain levels
const multiSubPattern = 'https://*:subdomain.:domain.example.com/:path*';

// Examples:
// https://api.v1.example.com/users
// https://shop.eu.example.com/products
// https://admin.staging.example.com/dashboard
```

### 🔍 Environment-Specific Patterns
```javascript
// Environment-based subdomain routing
const envPatterns = [
  'https://:app.dev.example.com/:path*',
  'https://:right.staging.example.com/:path*',
  'https://:service.prod.example.com/:path*'
];
```

### 🛡️ Security-Focused Patterns
```javascript
// Security patterns for sensitive subdomains
const securityPatterns = [
  {
    pattern: 'https://admin.example.com/:path*',
    riskLevel: 'CRITICAL',
    requiresMFA: true,
    auditLog: true
  },
  {
    pattern: 'https://api.example.com/:path*',
    riskLevel: 'HIGH',
    requiresApiKey: true,
    rateLimit: true
  },
  {
    pattern: 'https://shop.example.com/:path*',
    riskLevel: 'MEDIUM',
    requiresAuth: true,
    auditLog: false
  }
];
```

## 🚀 Performance Optimization

### ⚡ Subdomain Routing Performance
```javascript
// Benchmark subdomain pattern matching
console.log(
  Bun.inspect.table(
    performanceTests.map(test => ({
      patternType: test.type,
      avgMatchTime: test.avgTime + 'μs',
      memoryUsage: (test.memoryUsage / 1024).toFixed(2) + 'KB',
      cacheHitRate: (test.cacheHitRate * 100).toFixed(1) + '%',
      recommendation: test.avgTime < 100 ? '✅ Optimal' : '⚠️ Optimize'
    })),
    { colors: true, maxWidth: 120 }
  )
);
```

### 📊 Caching Strategy
```javascript
// Implement caching for subdomain patterns
const patternCache = new Map();

const getSubdomainPattern = (baseDomain) => {
  const cacheKey = `subdomain-${baseDomain}`;
  
  if (!patternCache.has(cacheKey)) {
    patternCache.set(cacheKey, new URLPattern(`https://:subdomain.${baseDomain}/:path*`));
  }
  
  return patternCache.get(cacheKey);
};
```

## 🏆 Key Benefits for Fraud Detection

### 1. **Tenant Isolation**
- Clear separation between different subdomains
- Easy identification of cross-tenant attacks
- Granular security policies per subdomain

### 2. **Behavioral Analysis**
- Track usage patterns per subdomain
- Identify anomalies in subdomain access
- Monitor privileged subdomain usage

### 3. **Security Monitoring**
- Detect attacks on sensitive subdomains (admin, api)
- Monitor for subdomain enumeration attempts
- Track unauthorized subdomain access

### 4. **Performance Optimization**
- Efficient routing based on subdomain patterns
- Caching strategies for pattern matching
- Load balancing across subdomains

## 📚 Related Resources

- [URLPattern v1.3.4 Showcase](./URLPATTERN_V134_SHOWCASE.md)
- [Ultimate Bun Showcase](./ULTIMATE_BUN_SHOWCASE.md)
- [VS Code Snippets](../.vscode/bun-table-snippets.code-snippets)
- [Bun Documentation](https://bun.sh/docs)

---

**🎯 This subdomain pattern showcase demonstrates advanced URLPattern capabilities for enterprise fraud detection!**
