<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# 🌐 Internal Wiki Generator - Usage Guide

## 🎯 Overview

The Internal Wiki Generator CLI uses `BUN_UTILS_URLS` to easily create internal wiki references and ideas for documentation, knowledge management, and team collaboration.

---

## 🚀 Quick Start

### **Basic Usage**
```bash
# Generate all wiki pages in markdown format
bun lib/wiki-generator-cli.ts

# Generate all formats (markdown, html, json)
bun lib/wiki-generator-cli.ts --format all

# Custom organization settings
bun lib/wiki-generator-cli.ts --base-url https://wiki.ourcompany.com --workspace bun-docs
```

### **Generated Files**
```text
internal-wiki/
├── README.md                    # Usage instructions and statistics
├── bun-utilities-wiki.md        # Markdown format for Confluence/Notion
├── bun-utilities-wiki.html      # HTML format for web viewing
└── bun-utilities-wiki.json      # JSON format for API integration
```

---

## 📋 CLI Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--format` | Output format | `markdown` | `--format all` |
| `--base-url` | Internal wiki base URL | `https://wiki.company.com` | `--base-url https://internal.wiki.com` |
| `--workspace` | Workspace name | `bun-utilities` | `--workspace dev-docs` |
| `--no-examples` | Exclude code examples | `false` | `--no-examples` |
| `--help` | Show help | - | `--help` |

---

## 🎯 Use Cases

### **1. Confluence Integration**
```bash
# Generate markdown for Confluence import
bun lib/wiki-generator-cli.ts --format markdown --base-url https://ourcompany.atlassian.net/wiki --workspace bun-utilities

# Then import bun-utilities-wiki.md into Confluence
```

### **2. Notion API Integration**
```bash
# Generate JSON for Notion API
bun lib/wiki-generator-cli.ts --format json --base-url https://notion.so/ourworkspace --workspace bun-docs

# Use bun-utilities-wiki.json with Notion API to create pages
```

### **3. GitHub Wiki**
```bash
# Generate markdown for GitHub Wiki
bun lib/wiki-generator-cli.ts --format markdown --base-url https://github.com/ourorg/repo/wiki --workspace utilities

# Push bun-utilities-wiki.md to GitHub Wiki
```

### **4. Internal Documentation Portal**
```bash
# Generate HTML for internal portal
bun lib/wiki-generator-cli.ts --format html --base-url https://docs.ourcompany.com --workspace bun

# Embed bun-utilities-wiki.html in your internal portal
```

---

## 📊 Generated Content Examples

### **Internal Wiki URLs Generated**
```text
https://wiki.ourcompany.com/bun-docs/file_system/read_file
https://wiki.ourcompany.com/bun-docs/networking/fetch
https://wiki.ourcompany.com/bun-docs/process/spawn
https://wiki.ourcompany.com/bun-docs/validation/is_string
https://wiki.ourcompany.com/bun-docs/conversion/to_buffer
```

### **Markdown Table Format**
```markdown
### FILE SYSTEM

| Utility | Internal Wiki | Official Documentation | Example |
|---------|---------------|----------------------|---------|
| READ FILE | [📝 🌐](https://wiki.ourcompany.com/bun-docs/file_system/read_file) | [📚 🌐](https://bun.sh/docs/api/utils#readfile) | [✅](#example) |
| WRITE FILE | [📝 🌐](https://wiki.ourcompany.com/bun-docs/file_system/write_file) | [📚 🌐](https://bun.sh/docs/api/utils#writefile) | [✅](#example) |
```

### **JSON API Format**
```json
{
  "metadata": {
    "total": 42,
    "categories": 5,
    "generated": "2026-02-05T03:15:16.308Z"
  },
  "pages": [
    {
      "title": "FILE SYSTEM: READ FILE",
      "url": "https://wiki.ourcompany.com/bun-docs/file_system/read_file",
      "category": "file_system",
      "documentation": "https://bun.sh/docs/api/utils#readfile",
      "example": "import { readFile } from 'bun';\nconst content = await readFile('package.json', 'utf-8');"
    }
  ]
}
```

---

## 🔧 Integration Examples

### **1. Automated CI/CD Integration**
```bash
# Add to your CI pipeline
- name: Generate Internal Wiki
  run: |
    bun lib/wiki-generator-cli.ts --format all --base-url $WIKI_BASE_URL --workspace $WIKI_WORKSPACE
    # Upload files to your wiki system
```

### **2. Custom Script Integration**
```typescript
// wiki-integration.ts
import { write } from "bun";

async function updateWiki() {
  // Generate wiki data
  const result = await Bun.spawn(['bun', 'lib/wiki-generator-cli.ts', '--format', 'json']).exited;
  
  if (result === 0) {
    const wikiData = JSON.parse(await Bun.file('internal-wiki/bun-utilities-wiki.json').text());
    
    // Custom integration logic
    for (const page of wikiData.pages) {
      await createWikiPage(page);
    }
  }
}
```

### **3. Webhook Integration**
```typescript
// webhook-handler.ts
export async function handleWikiUpdate(request: Request) {
  if (request.method === 'POST') {
    // Trigger wiki regeneration
    await Bun.spawn(['bun', 'lib/wiki-generator-cli.ts', '--format', 'all']).exited;
    
    // Notify team
    await notifyTeam('Internal wiki has been updated!');
  }
  
  return new Response('Wiki update triggered');
}
```

---

## 🎯 Advanced Usage

### **Custom Organization Setup**
```bash
# Enterprise setup
bun lib/wiki-generator-cli.ts \
  --format all \
  --base-url https://enterprise.wiki.company.com \
  --workspace engineering/bun-utilities \
  --no-examples
```

### **Development Environment**
```bash
# Development setup
bun lib/wiki-generator-cli.ts \
  --format markdown \
  --base-url http://example.com/wiki \
  --workspace dev-bun
```

### **Multi-Workspace Setup**
```bash
# Generate for different teams
bun lib/wiki-generator-cli.ts --workspace frontend/bun --base-url https://wiki.company.com/frontend
bun lib/wiki-generator-cli.ts --workspace backend/bun --base-url https://wiki.company.com/backend
bun lib/wiki-generator-cli.ts --workspace devops/bun --base-url https://wiki.company.com/devops
```

---

## 📈 Business Benefits

### **For Development Teams**
- ✅ **Centralized Documentation**: All Bun utilities in one place
- ✅ **Quick Reference**: Internal URLs for easy access
- ✅ **Code Examples**: Ready-to-use implementations
- ✅ **Team Collaboration**: Shared knowledge base

### **For Documentation Teams**
- ✅ **Automated Generation**: No manual wiki page creation
- ✅ **Consistent Formatting**: Standardized across all utilities
- ✅ **Multi-Format Support**: Markdown, HTML, JSON
- ✅ **Version Control**: Track changes over time

### **For Organization**
- ✅ **Knowledge Management**: Centralized utility documentation
- ✅ **Onboarding**: Quick reference for new team members
- ✅ **Standardization**: Consistent documentation practices
- ✅ **Integration Ready**: API-friendly JSON format

---

## 🚀 Next Steps

### **Immediate Actions**
1. **Generate Wiki**: Run the CLI with your organization's settings
2. **Choose Format**: Select markdown, HTML, or JSON based on your wiki system
3. **Import Content**: Add generated files to your wiki platform
4. **Customize URLs**: Update base URL and workspace for your organization

### **Advanced Integration**
1. **Automate Updates**: Add to CI/CD pipeline for automatic updates
2. **API Integration**: Use JSON format for custom applications
3. **Custom Templates**: Modify the generator for your specific needs
4. **Team Training**: Educate team on using the internal wiki

### **Maintenance**
1. **Regular Updates**: Regenerate when Bun utilities change
2. **Content Review**: Periodically review and enhance content
3. **Feedback Collection**: Gather team feedback for improvements
4. **Version Management**: Track different versions of documentation

---

## 🛠️ Troubleshooting

### **Common Issues**
- **Import Errors**: Ensure `lib/documentation/constants/utils.ts` exists
- **Permission Errors**: Check write permissions for `internal-wiki/` directory
- **URL Generation**: Verify base URL format includes protocol (http/https)

### **Solutions**
```bash
# Check dependencies
ls -la lib/documentation/constants/

# Test with minimal config
bun lib/wiki-generator-cli.ts --format markdown --no-examples

# Verify output directory
ls -la internal-wiki/
```

---

## 🎉 Success Metrics

### **Generated Statistics**
- **42 Utilities**: Complete coverage of all Bun utilities
- **5 Categories**: Organized by functionality
- **3 Formats**: Markdown, HTML, JSON
- **100% Automated**: Zero manual effort required

### **Integration Success**
- ✅ **Confluence Ready**: Markdown import compatible
- ✅ **Notion Ready**: JSON API compatible
- ✅ **GitHub Ready**: Wiki format compatible
- ✅ **Custom Ready**: Extensible architecture

---

**The Internal Wiki Generator transforms BUN_UTILS_URLS into a comprehensive, organization-ready knowledge management system!** 🎯

*Start generating your internal wiki today and empower your team with centralized Bun utilities documentation!*
