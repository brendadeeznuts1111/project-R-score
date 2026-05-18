# 🎨 Fire22 Branding Audit Toolkit

> [!NOTE] This toolkit is now fully optimized for **Bun** runtime with enhanced
> performance, native TypeScript support, and modern JavaScript features.

Advanced branding audit and validation toolkit that ensures perfect color
implementation, accessibility compliance, and brand consistency across all
platforms and mediums.

[![npm version](https://badge.fury.io/js/%40fire22%2Fbranding-audit.svg)](https://badge.fury.io/js/%40fire22%2Fbranding-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## ✨ Features

- **🎯 Perfect Color Validation**: Ensures colors match brand specifications
  with configurable tolerance
- **♿ Accessibility Compliance**: WCAG AA/AAA contrast ratio validation
- **🔍 Comprehensive Auditing**: CSS, HTML, JavaScript, and other file types
- **📊 Detailed Reporting**: JSON, HTML, and Markdown report formats
- **🎨 Brand Color Management**: Centralized brand color definitions
- **⚡ Fast & Efficient**: Optimized for large codebases
- **🔧 Custom Rules**: Extensible rule system for specific requirements
- **📈 Analytics Dashboard**: Visual compliance metrics and trends
- **🚀 Bun-Native Performance**: Optimized for Bun runtime with enhanced speed
- **⚡ Hot Reload**: Development with instant feedback
- **🎨 Native TypeScript**: Built-in TypeScript support without compilation

## ⚡ Bun Advantages

### 🚀 Performance Benefits

- **3-4x faster** than Node.js for package installation
- **10x faster** cold starts compared to Node.js
- **Native TypeScript** support without compilation step
- **Optimized bundling** with tree-shaking and minification
- **Hot reload** for instant development feedback

### 🎯 Bun-Specific Features

- **Bun.file()** - Native file I/O operations
- **Bun.write()** - Optimized file writing
- **Bun.Glob** - Fast file globbing patterns
- **Array.fromAsync()** - Native async iteration
- **ReadableStream** - Modern stream processing

### 📊 Performance Comparison

| Feature      | Bun    | Node.js  | Improvement        |
| ------------ | ------ | -------- | ------------------ |
| Installation | ~3s    | ~12s     | **4x faster**      |
| Cold Start   | ~50ms  | ~500ms   | **10x faster**     |
| File I/O     | Native | fs-extra | **2x faster**      |
| TypeScript   | Native | tsc +    | **No compilation** |

---

## 🚀 Quick Start

### Installation

```bash
# Using Bun (recommended)
bun add @fire22/branding-audit

# Or using npm
npm install @fire22/branding-audit

# Or using yarn
yarn add @fire22/branding-audit

# Or using pnpm
pnpm add @fire22/branding-audit
```

### Basic Usage

```bash
# Using Bun (recommended)
# Audit current directory
bunx fire22-brand-audit audit

# Audit specific files
bunx fire22-brand-audit audit "src/**/*.{css,html,js}"

# Generate HTML report
bunx fire22-brand-audit report html

# Show brand colors
bunx fire22-brand-audit colors

# Using npx (alternative)
# npx fire22-brand-audit audit
```

### Programmatic Usage

```typescript
import { BrandingAuditor } from '@fire22/branding-audit';

// Create auditor instance
const auditor = new BrandingAuditor({
  checkContrast: true,
  checkAccessibility: true,
  tolerance: 5,
});

// Audit files
const results = await auditor.auditFiles(['src/**/*.{css,scss,html}']);

// Generate report
const report = await auditor.generateReport(results);

// Export as HTML
const htmlReport = await auditor.exportReport(report, 'html');
```

## 📋 Commands

| Command               | Description                      | Options                    |
| --------------------- | -------------------------------- | -------------------------- |
| `audit [patterns...]` | Audit files for brand compliance | File patterns to audit     |
| `report [format]`     | Generate audit report            | `json`, `html`, `markdown` |
| `colors`              | Display brand color definitions  | -                          |

## 🎨 Brand Colors

The toolkit comes pre-configured with Fire22's official brand colors:

### Primary Colors

- **Primary Blue** (`#2563eb`) - Primary actions, links, brand elements
- **Secondary Gray** (`#64748b`) - Secondary text, subtle elements

### Accent Colors

- **Accent Gold** (`#f59e0b`) - Highlights, premium features, warnings
- **Success Green** (`#10b981`) - Success states, confirmations
- **Error Red** (`#ef4444`) - Error states, critical alerts
- **Info Cyan** (`#06b6d4`) - Information, links

### Neutral Colors

- **Background Light** (`#f8fafc`) - Backgrounds, surfaces
- **Text Primary Dark** (`#0f172a`) - Primary text, headings

## 🔧 Configuration

Create a `.branding-audit.json` file in your project root:

```json
{
  "brandColors": {
    "custom-blue": "#1e40af",
    "custom-green": "#059669"
  },
  "tolerance": 5,
  "checkContrast": true,
  "checkAccessibility": true,
  "ignorePatterns": ["node_modules/**", "dist/**", "build/**"],
  "customRules": []
}
```

### Configuration Options

- **`brandColors`**: Additional brand colors beyond the defaults
- **`tolerance`**: Color difference tolerance (0-100, default: 5)
- **`checkContrast`**: Enable contrast ratio validation (default: true)
- **`checkAccessibility`**: Enable WCAG compliance checking (default: true)
- **`ignorePatterns`**: Glob patterns to ignore during audit
- **`customRules`**: Custom validation rules

## 📊 Report Formats

### HTML Report

Interactive web-based report with:

- Compliance scores and grades
- Visual color swatches
- Issue breakdown by severity
- Recommendations and next steps

### JSON Report

Structured data format for:

- Integration with CI/CD pipelines
- Custom reporting tools
- Data analysis and trending

### Markdown Report

GitHub/GitLab compatible format for:

- Pull request comments
- Documentation
- Team communication

## 🎯 Audit Rules

### Built-in Rules

1. **Color Validation**: Ensures colors match brand palette
2. **Contrast Compliance**: WCAG AA/AAA contrast ratio validation
3. **Accessibility**: Color accessibility and readability checks
4. **Consistency**: Brand usage consistency across files

### Custom Rules

Create custom validation rules for specific requirements:

```typescript
import { BrandingAuditor, AuditRule } from '@fire22/branding-audit';

const customRule: AuditRule = {
  name: 'No Red in Buttons',
  description: 'Buttons should not use red colors',
  validate: (color: string, context: any) => {
    if (context.usage?.includes('button') && color.includes('#ef')) {
      return {
        type: 'warning',
        code: 'RED_BUTTON',
        message: 'Red colors should not be used in buttons',
        suggestion: 'Use brand primary or secondary colors instead',
      };
    }
    return null;
  },
};

const auditor = new BrandingAuditor({
  customRules: [customRule],
});
```

## 📈 CI/CD Integration

### GitHub Actions

```yaml
name: Branding Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun add -g @fire22/branding-audit
      - run: fire22-brand-audit audit
      - run: fire22-brand-audit report html
      - uses: actions/upload-artifact@v3
        with:
          name: branding-audit-report
          path: branding-audit-report.html
```

### GitHub Actions (with Bun native)

```yaml
name: Branding Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: bun run audit
      - run: bun run report html
      - uses: actions/upload-artifact@v3
        with:
          name: branding-audit-report
          path: branding-audit-report.html
```

### GitLab CI

```yaml
stages:
  - audit

branding_audit:
  stage: audit
  image: oven/bun:latest
  before_script:
    - bun add -g @fire22/branding-audit
  script:
    - fire22-brand-audit audit
    - fire22-brand-audit report html
  artifacts:
    paths:
      - branding-audit-report.html
    expire_in: 1 week
```

### GitLab CI (with Bun native)

```yaml
stages:
  - audit

branding_audit:
  stage: audit
  image: oven/bun:latest
  script:
    - bun install
    - bun run audit
    - bun run report html
  artifacts:
    paths:
      - branding-audit-report.html
    expire_in: 1 week
```

## 🔍 Advanced Usage

### Custom Brand Colors

```typescript
const auditor = new BrandingAuditor({
  brandColors: {
    'company-red': '#dc2626',
    'company-purple': '#7c3aed',
    'company-orange': '#ea580c',
  },
});
```

### Accessibility-Only Audit

```typescript
const results = await auditor.auditFiles(['src/**/*'], {
  checkContrast: true,
  checkAccessibility: true,
  checkConsistency: false,
});
```

### Batch Processing

```typescript
const patterns = [
  'src/**/*.{css,scss}',
  'public/**/*.{html}',
  'components/**/*.{js,ts,jsx,tsx}',
];

const results = await auditor.auditFiles(patterns);
const report = await auditor.generateReport(results);
```

## 📊 API Reference

### BrandingAuditor

#### Constructor

```typescript
new BrandingAuditor(config?: Partial<AuditConfig>)
```

#### Methods

- **`auditFiles(patterns: string[])`**: Audit files matching patterns
- **`generateReport(results: AuditResult[])`**: Generate comprehensive audit
  report
- **`exportReport(report: AuditReport, format: 'json' | 'html' | 'markdown')`**:
  Export report
- **`addBrandColor(name: string, hex: string, category?: ColorCategory)`**: Add
  custom brand color
- **`getBrandColors()`**: Get all brand color definitions
- **`clearCache()`**: Clear audit result cache

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details.

### Development Setup

```bash
git clone https://github.com/fire22/branding-audit.git
cd branding-audit
bun install
bun run dev
```

### Development with Hot Reload

```bash
# Start development server with hot reload
bun --hot src/cli.ts

# Run tests in watch mode
bun test --watch

# Type checking
bunx tsc --noEmit
```

### Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🙏 Acknowledgments

- Built with ❤️ by the Fire22 Team
- Inspired by design system best practices
- Powered by modern web technologies

## 📞 Support

- 📧 **Email**: support@fire22.dev
- 💬 **Discord**: [Join our community](https://discord.gg/fire22)
- 📖 **Documentation**: [docs.fire22.dev](https://docs.fire22.dev)
- 🐛 **Issues**:
  [GitHub Issues](https://github.com/fire22/branding-audit/issues)

---

<div align="center">

**Made with ❤️ by the Fire22 Team**

[🌐 Website](https://fire22.dev) • [📚 Documentation](https://docs.fire22.dev) •
[🐙 GitHub](https://github.com/fire22/branding-audit)

</div>
