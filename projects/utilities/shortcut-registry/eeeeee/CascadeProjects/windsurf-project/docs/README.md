# 🛍️ URLPattern v1.3.4 Example Site

## 🎯 Interactive URLPattern Demonstration

This is a complete, interactive example site demonstrating all the URLPattern features from **Bun v1.3.4**, including the new `hasRegExpGroups` and `hasCustomRegExp` flags.

## 🚀 Quick Start

### Option 1: Using Bun Server (Recommended)

```bash
# Navigate to the docs directory
cd docs

# Start the server
bun run server.ts

# Open your browser
# Navigate to: http://localhost:3000
```

### Option 2: Direct HTML File

```bash
# Open the HTML file directly in your browser
open docs/urlpattern-showcase.html
# or double-click the file in your file explorer
```

## 📊 Features Demonstrated

### 🎨 Interactive Pattern Testing
- **Real-time URL testing** against 15 different patterns
- **Visual feedback** for matches and failures
- **Risk assessment** for security analysis
- **Pattern classification** (RegExp vs Named)

### 🛡️ Fraud Detection Applications
- **Subdomain analysis** for multi-tenant security
- **API endpoint monitoring** for suspicious activity
- **Admin panel detection** for privileged access tracking
- **File download patterns** for content security

### 📈 Pattern Categories

#### 🛒 E-commerce Patterns
```
https://shop.example.com/items/:id
/items/:id/details
/items/:id?color=:color
```

#### 🔧 API Patterns
```
https://api.example.com/v1/users/:id
/api/v1/users/(\w+)
https://:subdomain.example.com/:path*
```

#### 📁 File & Content Patterns
```
/files/*/:name.:ext
/blog/:year(\d{4})/:month(\d{2})
/redirect?from=:from&to=:to
```

#### 🛡️ Security Patterns
```
https://admin.example.com/:path*
/api/(token|key|secret)/:action
/(items|products)/:id
```

#### 🔍 RegExp Advanced
```
https://shop.example.com/items/(\d+)
https://shop.example.com/items/:id(\d+)
/search?q=:term
```

#### 📊 Analytics Patterns
```
/:category/:id/:slug
/track/:sessionId
https://*.example.com/:path*
```

## 🎯 Interactive Features

### 📊 Real-time Statistics
- **Total Patterns**: 15 different URL patterns
- **RegExp Patterns**: 6 patterns with custom RegExp
- **Success Rate**: Dynamic calculation based on URL
- **Risk Level**: Security assessment (LOW/MEDIUM/HIGH)

### 🔍 URL Testing
1. **Click preset URLs** for quick testing
2. **Enter custom URLs** for specific testing
3. **View detailed results** with extracted parameters
4. **Analyze security implications**

### 🎨 Visual Feedback
- **Color-coded results** (green = match, red = no match)
- **Risk level indicators** for security analysis
- **Pattern type badges** (RegExp vs Named)
- **Interactive hover effects** for better UX

## 🛡️ Security Analysis Features

### 🔍 Risk Assessment
The site automatically analyzes URLs for security risks:

| Risk Level | Triggers | Examples |
|------------|----------|----------|
| **HIGH** | `/track/`, `/token/`, `/key/`, `/secret/` | Tracking URLs, API keys |
| **MEDIUM** | `admin`, `root` | Admin panels, privileged access |
| **LOW** | Normal patterns | Standard e-commerce, content |

### 📊 Pattern Classification
- **RegExp Patterns**: Complex matching with custom regex
- **Named Patterns**: Simple parameter capture
- **Mixed Patterns**: Combination of both
- **Wildcard Patterns**: Flexible routing

## 🚀 API Endpoints

### POST /api/test-patterns
Test any URL against all patterns:

```bash
curl "http://localhost:3000/api/test-patterns?url=https://shop.example.com/items/42"
```

**Response Format:**
```json
{
  "url": "https://shop.example.com/items/42",
  "totalPatterns": 15,
  "matches": 3,
  "regexPatterns": 2,
  "successRate": 20,
  "riskLevel": "LOW",
  "results": [
    {
      "index": 0,
      "pattern": "https://shop.example.com/items/:id",
      "matches": true,
      "groups": "id",
      "hasRegExpGroups": false,
      "extracted": { "id": "42" }
    }
  ]
}
```

## 🎯 Use Cases

### 🛡️ Fraud Detection
- **Pattern matching** for suspicious URLs
- **Subdomain analysis** for multi-tenant security
- **API endpoint monitoring** for abuse detection
- **File access patterns** for content protection

### 🔍 Security Monitoring
- **Admin panel detection** for privilege escalation
- **API key exposure** detection
- **Tracking URL identification**
- **Cross-tenant access** monitoring

### 📊 Analytics & SEO
- **URL structure analysis** for SEO optimization
- **Content categorization** for analytics
- **User journey mapping** for UX analysis
- **Performance monitoring** for routing optimization

## 🛠️ Technical Implementation

### 🎨 Frontend Features
- **Pure HTML/CSS/JavaScript** - No frameworks required
- **Responsive design** - Works on all devices
- **Modern CSS** - Gradients, animations, backdrop filters
- **Interactive elements** - Hover effects, transitions

### 🔧 Backend Features
- **Bun server** - Fast and efficient
- **URLPattern API** - Native browser support
- **JSON responses** - Easy integration
- **CORS enabled** - Cross-origin requests

### 📊 Browser Compatibility
- **Chrome 95+** - Full URLPattern support
- **Firefox 113+** - URLPattern support
- **Safari 16.4+** - URLPattern support
- **Edge 95+** - URLPattern support

## 🎯 Learning Outcomes

After exploring this example site, you'll understand:

### ✅ URLPattern Fundamentals
- **Pattern syntax** and structure
- **Named vs RegExp** parameters
- **Wildcard usage** and limitations
- **Base URL handling** for relative patterns

### 🛡️ Security Applications
- **Pattern-based security** analysis
- **Risk assessment** methodologies
- **Fraud detection** patterns
- **Multi-tenant security** considerations

### 🚀 Advanced Features
- **RegExp group detection** with `hasRegExpGroups`
- **Custom RegExp identification** with `hasCustomRegExp`
- **Performance optimization** for pattern matching
- **Caching strategies** for repeated patterns

## 📚 Related Resources

- [URLPattern v1.3.4 Showcase](./URLPATTERN_V134_SHOWCASE.md)
- [Subdomain Pattern Showcase](./SUBDOMAIN_PATTERN_SHOWCASE.md)
- [Ultimate Bun Showcase](./ULTIMATE_BUN_SHOWCASE.md)
- [VS Code Snippets](../.vscode/bun-table-snippets.code-snippets)
- [Bun Documentation](https://bun.sh/docs)

## 🎊 Get Started Now!

1. **Start the server**: `bun run docs/server.ts`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Test URLs**: Click preset URLs or enter custom ones
4. **Analyze results**: Review pattern matches and security analysis
5. **Explore patterns**: Try different URL structures and see how they match

**🚀 Experience the power of URLPattern v1.3.4 in action!**
