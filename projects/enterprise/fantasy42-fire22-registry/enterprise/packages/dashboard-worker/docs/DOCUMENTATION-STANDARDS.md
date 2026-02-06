# 📚 Fire22 Documentation Standards

## 🔗 Link Guidelines

### ✅ **Correct Link Formats**

#### Internal Documentation Links

```html
<!-- ✅ Correct: Use absolute paths -->
<a href="/docs/packages.html">Package Guide</a>
<a href="/docs/environment-variables.html">Environment Variables</a>

<!-- ❌ Incorrect: Relative paths -->
<a href="packages.html">Package Guide</a>
<a href="../docs/environment-variables.html">Environment Variables</a>
```

#### CSS and Asset Links

```html
<!-- ✅ Correct: Use absolute paths -->
<link rel="stylesheet" href="/src/styles/framework.css" />
<img src="/static/images/logo.png" alt="Logo" />

<!-- ❌ Incorrect: Relative paths -->
<link rel="stylesheet" href="../src/styles/framework.css" />
<img src="./images/logo.png" alt="Logo" />
```

#### API Endpoint Links

```html
<!-- ✅ Correct: Use absolute paths -->
<a href="/api/health">Health Check</a>
<a href="/api/system/status">System Status</a>

<!-- ❌ Incorrect: Hardcoded localhost -->
<a href="http://localhost:4000/api/health">Health Check</a>
```

## 🏗️ **File Structure Standards**

### Directory Organization

```text
docs/
├── api/                    # API documentation
├── architecture/           # System architecture docs
├── business/              # Business logic docs
├── database/              # Database documentation
├── deployment/            # Deployment guides
├── development/           # Development guides
├── getting-started/       # Getting started guides
├── guides/               # How-to guides
├── troubleshooting/      # Troubleshooting guides
└── tutorials/            # Step-by-step tutorials
```

### File Naming Conventions

- Use kebab-case: `environment-variables.html`
- Be descriptive: `fire22-api-integration.html`
- Avoid special characters except hyphens
- Use `.html` for documentation pages
- Use `.md` for markdown files

## 🎨 **Styling Standards**

### CSS Framework Usage

```html
<!-- ✅ Always use the framework CSS -->
<link rel="stylesheet" href="/src/styles/framework.css" />

<!-- Optional: Add Fire22 theme -->
<link rel="stylesheet" href="/src/styles/themes/fire22.css" />
```

### Component Classes

```html
<!-- Use standardized component classes -->
<div class="container">
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Title</h2>
    </div>
    <div class="card-body">
      <p class="card-text">Content</p>
    </div>
  </div>
</div>
```

## 🔧 **Constants Usage**

### Environment-Specific Values

```javascript
// ✅ Use constants from config
import CONSTANTS from '/src/config/constants.js';

const apiUrl = CONSTANTS.API_CONFIG.BASE_PATH;
const defaultAgent = CONSTANTS.API_CONFIG.DEFAULT_AGENT_ID;

// ❌ Don't hardcode values
const apiUrl = '/api';
const defaultAgent = 'BLAKEPPH';
```

### URL Generation

```javascript
// ✅ Use URL helpers
import { apiUrl, docsUrl } from '/src/utils/url-helpers.js';

const healthUrl = apiUrl.health();
const packagesUrl = docsUrl.packages();

// ❌ Don't hardcode URLs
const healthUrl = 'http://localhost:4000/health';
const packagesUrl = '/docs/packages.html';
```

## 📝 **Content Standards**

### Page Structure

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title - Fire22 Dashboard</title>
    <link rel="stylesheet" href="/src/styles/framework.css" />
  </head>
  <body>
    <div class="container">
      <header class="page-header">
        <h1>Page Title</h1>
        <p class="page-description">Brief description</p>
      </header>

      <nav class="page-nav">
        <!-- Navigation links -->
      </nav>

      <main class="page-content">
        <!-- Main content -->
      </main>

      <footer class="page-footer">
        <!-- Footer links -->
      </footer>
    </div>
  </body>
</html>
```

### Navigation Standards

```html
<!-- ✅ Standard navigation structure -->
<nav class="brand-nav">
  <a href="/docs/packages.html" class="nav-link">📦 Packages</a>
  <a href="/docs/environment-variables.html" class="nav-link">🌍 Environment</a>
  <a href="/docs/api-packages.html" class="nav-link">🔌 API</a>
  <a href="/docs/@packages.html" class="nav-link active">🧪 Testing</a>
</nav>
```

## 🧪 **Testing Standards**

### Link Validation

```bash
# Run link validation before committing
bun run scripts/validate-links.js

# Check specific file
bun run scripts/validate-links.js docs/specific-file.html
```

### Manual Testing Checklist

- [ ] All internal links work
- [ ] CSS loads correctly
- [ ] Images display properly
- [ ] Navigation functions
- [ ] Mobile responsive
- [ ] Accessibility compliant

## 🚀 **Deployment Standards**

### Pre-deployment Checklist

- [ ] Run link validation
- [ ] Test all documentation pages
- [ ] Verify CSS and assets load
- [ ] Check mobile responsiveness
- [ ] Validate HTML markup
- [ ] Test API endpoint links

### Environment Configuration

```javascript
// Use environment-specific configurations
const config = CONSTANTS.getEnvironmentConfig();

// Development
if (config.DEBUG) {
  console.log('Debug mode enabled');
}

// Production
if (process.env.NODE_ENV === 'production') {
  // Production-specific settings
}
```

## 🔍 **Troubleshooting**

### Common Issues

#### Broken CSS Links

```html
<!-- ❌ Problem -->
<link rel="stylesheet" href="../src/styles/framework.css" />

<!-- ✅ Solution -->
<link rel="stylesheet" href="/src/styles/framework.css" />
```

#### Missing Documentation Files

```bash
# Check if file exists
ls -la docs/target-file.html

# Verify server routes
curl -I http://localhost:4000/docs/target-file.html
```

#### API Endpoint Issues

```bash
# Test API endpoints
curl http://localhost:4000/api/health
curl http://localhost:4000/api/system/status
```

## 📊 **Validation Tools**

### Available Scripts

- `scripts/validate-links.js` - Validate all documentation links
- `scripts/check-constants.js` - Check for hardcoded values
- `scripts/test-endpoints.js` - Test all API endpoints

### Continuous Integration

```yaml
# Example CI step
- name: Validate Documentation
  run: |
    bun run scripts/validate-links.js
    bun run scripts/check-constants.js
```

## 🎯 **Best Practices**

1. **Always use absolute paths** for internal links
2. **Use constants** instead of hardcoded values
3. **Test links** before committing
4. **Follow naming conventions** for files and directories
5. **Use semantic HTML** structure
6. **Include proper meta tags** for SEO
7. **Ensure mobile responsiveness**
8. **Add alt text** for images
9. **Use descriptive link text**
10. **Keep documentation up to date**

---

_This document should be updated whenever new standards are established or
existing ones are modified._
