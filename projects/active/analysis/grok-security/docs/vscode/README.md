# 🎯 VSCode Configuration - Factory Wager Bun v1.3.5+

Enterprise-grade VSCode workspace configuration for Bun development with RSS Feed Table, URLPattern, DNS Resolver, and Token Matcher support.

---

## 📁 Configuration Files

### [1.0.0.0] Core Settings

- **settings.json** - Workspace settings (editor, TypeScript, terminal, theme)
- **extensions.json** - Recommended extensions
- **launch.json** - Debug configurations
- **tasks.json** - Build, test, and development tasks

### [2.0.0.0] Code Snippets

- **table-utils.code-snippets** - Table utilities snippets
- **rss-feed-table.code-snippets** - RSS Feed Table snippets
- **bun-utilities.code-snippets** - URLPattern, DNS, Token Matcher snippets

---

## 🚀 Quick Start

### 1. Install Recommended Extensions

```bash
# VSCode will prompt to install recommended extensions
# Or manually install from extensions.json
```

### 2. Open Workspace

```bash
code /Users/nolarose/grok-secuirty
```

### 3. Run Tasks

```
Cmd+Shift+P → Tasks: Run Task → Select task
```

### 4. Use Snippets

```
Type snippet prefix (e.g., "rssentry") → Tab to expand
```

---

## 📋 Available Snippets

### RSS Feed Table

- `rssentry` - RSSFeedEntry interface
- `rssascii` - Render ASCII table
- `rssvalidate` - Validate and render
- `rssjson` - Export as JSON
- `rsscsv` - Export as CSV
- `rsshtml` - Export as HTML

### URLPattern

- `urlpattern` - URLPatternMatcher
- `urlvalidator` - URLPatternValidator

### DNS Resolver

- `dnsresolve` - DNS resolution
- `dnsbatch` - Batch resolution

### Token Matcher

- `tokenextract` - Token extraction
- `tokencompare` - Token comparison
- `tokenpattern` - Pattern detection

### Utilities

- `benchmark` - Performance benchmark
- `batchbench` - Batch performance test

---

## 🔧 Debug Configurations

### Run Current File

```
F5 → [1.1.0.0] Bun: Current File
```

### Run Tests

```
F5 → [5.3.0.0] Tests: All Tests
```

### Run Examples

```
F5 → [2.1.0.0] RSS: Feed Table Example
```

### Profile Performance

```
F5 → [6.1.0.0] Profile: Current File
```

---

## 📝 Available Tasks

### Build

- `[1.1.0.0] Build: Current File`
- `[1.2.0.0] Build: All`

### Test

- `[2.1.0.0] Test: Current File`
- `[2.2.0.0] Test: All`
- `[2.3.0.0] Test: RSS Feed Schema`
- `[2.4.0.0] Test: RSS Table Integration`

### Run Examples

- `[3.1.0.0] Run: RSS Feed Table Example`
- `[3.2.0.0] Run: RSS Scraper Example`
- `[3.3.0.0] Run: URLPattern Example`
- `[3.4.0.0] Run: DNS Resolver Example`

### Format

- `[4.1.0.0] Format: Current File`
- `[4.2.0.0] Format: All`

### Development

- `[5.1.0.0] Dev: Watch Mode`
- `[5.2.0.0] Dev: Test Watch`

---

## ⌨️ Keyboard Shortcuts

### Run Task

```
Cmd+Shift+P → Tasks: Run Task
```

### Debug

```
F5 - Start debugging
Shift+F5 - Stop debugging
F10 - Step over
F11 - Step into
```

### Format

```
Shift+Option+F - Format document
Cmd+K Cmd+F - Format selection
```

### Snippets

```
Type prefix → Tab to expand
Ctrl+Space - Show completions
```

---

## 🎨 Theme & Appearance

### Current Theme

- **Color Theme**: One Dark Pro
- **Icon Theme**: Material Icon Theme
- **Font**: Menlo, Monaco, Courier New
- **Font Size**: 12px
- **Line Height**: 1.6

### Customize

Edit `settings.json`:

```json
"workbench.colorTheme": "Your Theme",
"editor.fontSize": 12,
"editor.fontFamily": "Your Font"
```

---

## 🔍 Editor Settings

### Formatting

- **Prettier**: 80-character line width
- **Tab Size**: 2 spaces
- **Trailing Comma**: ES5
- **Quotes**: Double quotes

### TypeScript

- **Auto Imports**: Enabled
- **Inlay Hints**: Enabled
- **Strict Mode**: Enabled

### Terminal

- **Default Shell**: zsh
- **Environment**: BUN_ENV=development

---

## 📚 Documentation

### Snippets Documentation

- See individual `.code-snippets` files for descriptions
- Each snippet has `[x.x.x.x]` hierarchy tags

### Settings Documentation

- See `settings.json` comments for detailed explanations
- Organized by [DOMAIN][SCOPE][TYPE] tags

### Debug Documentation

- See `launch.json` for debug configuration details
- Each configuration has descriptive names

### Tasks Documentation

- See `tasks.json` for task descriptions
- Organized by functionality

---

## 📋 Global Table Format Rule

### 6-Column Minimum (ENFORCED)

**All markdown tables in this workspace must have a minimum of 6 columns.**

This rule is enforced by:

- ✅ VSCode snippets (auto-generate 6-column tables)
- ✅ Pre-commit hook (blocks commits with invalid tables)
- ✅ Validation task (manual checking)

### Quick Fix

Use snippets to create compliant tables:

```
versiontable  → Version History table (6 columns)
mdtable6      → Generic 6-column template
table6col     → Alternative generic template
```

### Why 6 Columns?

- Ensures consistency across documentation
- Prevents incomplete table formats
- Maintains professional appearance
- Supports rich metadata (Version, Date, Changes, Status, Author, Notes)

---

## 🔗 Integration

### With Bun

- Bun v1.3.4+ required
- Native Bun APIs supported
- Zero npm dependencies

### With Extensions

- Prettier for formatting
- ESLint for linting
- TypeScript for type checking
- Material Icons for file icons

### With Workspace

- Works with bun-inspect-utils
- Supports all example files
- Integrates with test suite

---

## 🐛 Troubleshooting

### Extensions Not Installing

```bash
# Manually install from extensions.json
code --install-extension esbenp.prettier-vscode
```

### Debug Not Working

```bash
# Ensure Bun is in PATH
which bun
# Or use full path in launch.json
```

### Snippets Not Showing

```bash
# Reload VSCode
Cmd+Shift+P → Developer: Reload Window
```

### Format Issues

```bash
# Check Prettier settings
Cmd+Shift+P → Format Document
```

---

## 📞 Support

For issues or questions:

1. Check `settings.json` comments
2. Review snippet descriptions
3. Check debug configuration names
4. Review task descriptions

---

**Version**: 1.0.0.0 | **Bun**: 1.3.4+ | **Date**: 2026-01-18
