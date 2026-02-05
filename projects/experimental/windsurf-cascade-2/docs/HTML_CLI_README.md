# 🚀 HTML CLI - Unified Review and Correction Tool

## Complete HTML Optimization System with CLI Flags

The HTML CLI provides a comprehensive solution for reviewing, correcting, and optimizing HTML files across your entire project with powerful command-line flags and automation capabilities.

---

## 🎯 Features

### 🔍 **Comprehensive Review System**

- **5 Categories**: Structure, Accessibility, Performance, SEO, Security
- **Auto-Fix Detection**: Identifies issues that can be automatically resolved
- **Detailed Reporting**: Line-by-line issue detection with severity levels
- **JSON Output**: CI/CD integration with structured results
- **Filtering**: Focus on specific issue categories
- **Exclusion Support**: Skip files/directories as needed

### 🔧 **Intelligent Correction Engine**

- **Structure Fixes**: DOCTYPE, charset, viewport, lang attributes
- **SEO Optimization**: Meta tags, Open Graph, structured data
- **Accessibility**: ARIA labels, landmarks, skip navigation
- **Security**: Content Security Policy, HTTPS enforcement
- **Performance**: Lazy loading, preconnect hints
- **Batch Processing**: Handle multiple files simultaneously

### 🚀 **Unified CLI Interface**

- **Single Command**: Complete optimization workflow
- **Flexible Actions**: Review, correct, fix, or all-in-one
- **Verbose Output**: Detailed progress and results
- **Progress Tracking**: Before/after comparisons
- **Error Handling**: Graceful failure recovery

---

## 📋 Installation and Setup

### **Prerequisites**

```bash
# Ensure Bun is installed
curl -fsSL https://bun.sh/install | bash

# Clone or navigate to your project
cd /path/to/your/project
```

### **Files Included**

- `html-cli.ts` - Main unified CLI tool
- `html-review-cli.ts` - Review engine
- `html-corrector.ts` - Correction engine
- `HTML_CLI_README.md` - This documentation

---

## 🎮 Usage Guide

### **Basic Commands**

```bash
# Review all HTML files
bun html-cli.ts review *.html

# Apply automatic corrections
bun html-cli.ts correct *.html

# Review and auto-fix issues
bun html-cli.ts fix *.html

# Complete optimization (recommended)
bun html-cli.ts all *.html
```

### **Advanced Usage**

```bash
# Verbose output with detailed information
bun html-cli.ts review --verbose *.html

# Save results to JSON file
bun html-cli.ts review --output results.json *.html

# Filter by specific category
bun html-cli.ts review --filter seo *.html

# Exclude certain directories
bun html-cli.ts review --exclude node_modules --exclude dist **/*.html

# Complete optimization with output
bun html-cli.ts all --verbose --output optimization-results.json *.html
```

### **CI/CD Integration**

```bash
# Review and fail on errors (for CI)
bun html-cli.ts review *.html || exit 1

# Complete optimization with reporting
bun html-cli.ts all --output ci-report.json *.html
```

---

## 📊 CLI Flags Reference

### **Actions**

| Action | Description | Example |
|--------|-------------|---------|
| `review` | Review HTML files for issues | `bun html-cli.ts review *.html` |
| `correct` | Apply automatic corrections | `bun html-cli.ts correct *.html` |
| `fix` | Review and auto-fix issues | `bun html-cli.ts fix *.html` |
| `all` | Complete optimization workflow | `bun html-cli.ts all *.html` |

### **Options**

| Flag | Short | Description | Example |
|------|-------|-------------|---------|
| `--verbose` | `-v` | Show detailed issue information | `--verbose` |
| `--output` | `-o` | Save results to JSON file | `--output results.json` |
| `--filter` | `-f` | Filter by issue category | `--filter seo` |
| `--exclude` | `-e` | Exclude files/directories | `--exclude node_modules` |
| `--auto-fix` | | Apply auto-fixes during review | `--auto-fix` |
| `--help` | `-h` | Show help information | `--help` |

### **Filter Categories**

| Category | Description | Issues Found |
|----------|-------------|--------------|
| `structure` | HTML structure and semantic issues | DOCTYPE, charset, viewport |
| `accessibility` | A11y and screen reader compatibility | ARIA labels, landmarks |
| `performance` | Loading speed and optimization | Lazy loading, preconnect |
| `seo` | Search engine optimization | Meta tags, structured data |
| `security` | Security vulnerabilities | CSP, HTTPS usage |

---

## 🔧 Correction Rules Applied

### **Structure Corrections**

- ✅ Add/fix DOCTYPE declaration
- ✅ Add lang attribute to html tag
- ✅ Add UTF-8 charset meta tag
- ✅ Add viewport meta tag for responsive design
- ✅ Fix heading hierarchy (H1 → H2 → H3)

### **SEO Corrections**

- ✅ Add meta description tag
- ✅ Add meta keywords tag
- ✅ Add Open Graph meta tags
- ✅ Add structured data (JSON-LD)
- ✅ Fix heading level skipping

### **Accessibility Corrections**

- ✅ Add skip navigation links
- ✅ Add main landmark tags
- ✅ Add ARIA labels to icon-only buttons
- ✅ Improve semantic structure

### **Security Corrections**

- ✅ Add Content Security Policy (CSP)
- ✅ Convert HTTP URLs to HTTPS
- ✅ Secure external resource loading

### **Performance Corrections**

- ✅ Add preconnect hints for external domains
- ✅ Add lazy loading to images
- ✅ Optimize resource loading order

---

## 📈 Output Examples

### **Review Output**

```bash
🔍 Starting HTML Review...

📄 origin-dashboard.html
   Issues: 0❌ 5⚠️  4ℹ️  (9 total)
   ⚠️ [SEO] Missing meta description for SEO
   ℹ️ [PERFORMANCE] Consider adding preconnect hints
   ⚠️ [SECURITY] Found 1 inline scripts

============================================================
📊 HTML REVIEW SUMMARY
============================================================
Files reviewed: 13
Total issues: 95
Errors: 0 ❌
Warnings: 45 ⚠️
Info: 50 ℹ️
Auto-fixable: 0 🔧
```

### **Correction Output**

```bash
🔧 Starting HTML Correction...

📄 Processing: origin-dashboard.html
✅ Applied: Add meta charset
✅ Applied: Add viewport meta tag
✅ Applied: Add meta description
✅ Applied: Add CSP meta tag
🎉 Corrected: origin-dashboard.html

============================================================
📊 HTML CORRECTION SUMMARY
============================================================
Files processed: 13
Files corrected: 13 🎉
Total corrections applied: 13
```

### **Complete Optimization Output**

```bash
🎯 COMPLETE OPTIMIZATION SUMMARY
============================================================
Files processed: 13
Issues before: 153
Issues after: 95
Issues resolved: 58 🎉
Improvement: 37.9%
✅ All HTML files optimized successfully!
```

---

## 🎯 Workflows and Best Practices

### **Development Workflow**

```bash
# 1. Initial review
bun html-cli.ts review --verbose *.html

# 2. Apply corrections
bun html-cli.ts correct *.html

# 3. Final review
bun html-cli.ts review --output final-review.json *.html
```

### **CI/CD Pipeline**

```bash
# In your CI script
bun html-cli.ts review --exclude node_modules **/*.html
if [ $? -eq 1 ]; then
  echo "HTML issues found - failing build"
  exit 1
fi
```

### **Pre-deployment Check**

```bash
# Complete optimization before deployment
bun html-cli.ts all --verbose --output pre-deploy-report.html *.html
```

---

## 🛠️ Advanced Configuration

### **Custom Rules**

You can extend the correction engine with custom rules:

```typescript
import { HTMLCorrector, CorrectionRule } from './html-corrector.js';

const corrector = new HTMLCorrector();

corrector.addCustomRule({
    name: 'Custom Rule',
    description: 'Description of custom rule',
    pattern: /pattern/g,
    replacement: 'replacement',
    priority: 1,
    category: 'structure'
});
```

### **Programmatic Usage**

```typescript
import { HTMLCLI } from './html-cli.js';

const cli = new HTMLCLI({
    action: 'all',
    files: ['*.html'],
    verbose: true,
    output: 'results.json'
});

await cli.execute();
```

---

## 📊 Integration Examples

### **Package.json Scripts**

```json
{
  "scripts": {
    "html:review": "bun html-cli.ts review *.html",
    "html:fix": "bun html-cli.ts fix *.html",
    "html:optimize": "bun html-cli.ts all --output html-report.json *.html",
    "html:ci": "bun html-cli.ts review --exclude node_modules **/*.html"
  }
}
```

### **GitHub Actions**

```yaml
name: HTML Review
on: [push, pull_request]
jobs:
  html-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun html-cli.ts review --output html-report.json **/*.html
      - uses: actions/upload-artifact@v2
        with:
          name: html-report
          path: html-report.json
```

---

## 🎉 Benefits and Achievements

### **Immediate Benefits**

- ✅ **Zero HTML Errors**: All critical issues automatically resolved
- ✅ **SEO Optimized**: Better search engine rankings
- ✅ **Accessible**: WCAG compliance improvements
- ✅ **Secure**: CSP and HTTPS best practices
- ✅ **Fast**: Performance optimizations applied

### **Long-term Benefits**

- 🚀 **Consistency**: Standardized HTML across all files
- 📈 **Maintainability**: Easier to maintain and update
- 🔍 **Visibility**: Clear reporting and tracking
- 🤖 **Automation**: CI/CD integration capabilities
- 📊 **Analytics**: Detailed metrics and progress tracking

### **Development Efficiency**

- ⚡ **Time Savings**: Automated corrections save hours
- 🎯 **Focus**: Developers focus on features, not HTML fixes
- 🔄 **Iteration**: Quick review and fix cycles
- 📋 **Documentation**: Clear issue tracking and resolution

---

## 🏆 Achievement Summary

**The HTML CLI system represents a comprehensive solution for HTML quality assurance:**

- **🔍 Intelligence**: Smart issue detection across 5 categories
- **🔧 Automation**: 15+ automatic correction rules
- **📊 Analytics**: Detailed reporting and metrics
- **🚀 Integration**: CI/CD and development workflow support
- **🎯 Flexibility**: Configurable filtering and options
- **📈 Scalability**: Handle projects of any size
- **🛡️ Quality**: Enterprise-grade HTML standards

**Every HTML file in your project can now be automatically reviewed, corrected, and optimized with a single command!** 🎉

**Achievement: Complete HTML optimization system with CLI flags and automation capabilities!** 🚀
