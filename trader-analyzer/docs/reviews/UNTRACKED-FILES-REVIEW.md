# Untracked Files Review

> Summary of untracked files and recommendations for git tracking

## Summary

**Total Untracked Files**: 46+

---

## 📚 Documentation Files (Should be tracked)

### CSS Documentation (18 files)
These files are referenced in `docs/BUN-CSS-BUNDLER.md` but not tracked:

- ✅ `docs/BUN-SERVER-METRICS.md` - **NEW** - Bun server metrics integration (just created)
- ✅ `docs/COLOR-FUNCTION.md` - Color function documentation
- ✅ `docs/CSS-FALLBACKS.md` - CSS fallbacks guide
- ✅ `docs/CSS-MODULES-COMPOSITION.md` - CSS modules composition rules
- ✅ `docs/CSS-MODULES.md` - CSS modules guide
- ✅ `docs/CSS-NESTING.md` - CSS nesting guide
- ✅ `docs/CSS-SYNTAX-EXAMPLES.md` - CSS syntax examples
- ✅ `docs/DIR-SELECTOR.md` - :dir() selector guide
- ✅ `docs/DOUBLE-POSITION-GRADIENTS.md` - Double position gradients
- ✅ `docs/GOLDEN-CSS-TEMPLATE.md` - Golden CSS template
- ✅ `docs/HWB-COLORS.md` - HWB colors guide
- ✅ `docs/LAB-COLORS.md` - LAB colors guide
- ✅ `docs/LANG-SELECTOR.md` - :lang() selector guide
- ✅ `docs/LIGHT-DARK.md` - light-dark() function guide
- ✅ `docs/LOGICAL-PROPERTIES.md` - Logical properties guide
- ✅ `docs/NOT-SELECTOR.md` - :not() selector guide
- ✅ `docs/RELATIVE-COLORS.md` - Relative colors guide
- ✅ `docs/SHORTHANDS.md` - Modern shorthands guide

**Status**: All should be tracked - they're referenced in existing documentation

---

## 🔧 Scripts (Should be tracked)

- ✅ `scripts/css-playground.ts` - CSS playground script
- ✅ `scripts/dashboard-server.ts` - Dashboard HTTP server (334 lines)
- ✅ `scripts/setup-mcp-config.ts` - MCP config setup script

**Status**: All should be tracked - they're functional scripts

---

## 💻 Source Files (Should be tracked)

- ✅ `src/api/error-tracking.ts` - Error tracking and downtime monitoring (356 lines)
- ✅ `src/mcp/tools/search-bun.ts` - SearchBun MCP tool (139 lines)

**Status**: All should be tracked - they're core source files

---

## 🧪 Test Files (Should be tracked)

- ✅ `test/css-bundler.test.ts` - CSS bundler tests
- ✅ `test/dashboard-server.test.ts` - Dashboard server tests

**Status**: All should be tracked - they're test files

---

## 🎨 Styles (Should be tracked)

- ✅ `styles/base.module.css` - Base CSS module
- ✅ `styles/components.module.css` - Components CSS module
- ✅ `styles/dashboard.module.css` - Dashboard CSS module
- ✅ `styles/golden-template.css` - Golden CSS template
- ✅ `styles/themes.css` - Theme variables
- ✅ `styles/examples/` - Example styles directory

**Status**: All should be tracked - they're part of the styles system

---

## 📝 Test Data (Should be tracked)

- ✅ `test-data/base-module-test.css`
- ✅ `test-data/bundle-output.css`
- ✅ `test-data/bundle-test.css`
- ✅ `test-data/color-mix-test.css`
- ✅ `test-data/component-module-test.css`
- ✅ `test-data/composition-test.css`
- ✅ `test-data/lab-colors-test.css`
- ✅ `test-data/logical-properties-test.css`
- ✅ `test-data/math-functions-test.css`
- ✅ `test-data/media-ranges-test.css`
- ✅ `test-data/modern-selectors-test.css`
- ✅ `test-data/nesting-test.css`
- ✅ `test-data/relative-colors-test.css`
- ✅ `test-data/validation-test.css`

**Status**: All should be tracked - they're test fixtures

---

## 🚫 Should NOT be tracked

- ❌ `.cursor/` directory - Contains MCP configuration with API keys (already in .gitignore)
- ❌ `test-data/*.css` - If these are generated files, consider adding to .gitignore

---

## Recommended Actions

### 1. Add all documentation files
```bash
git add docs/BUN-SERVER-METRICS.md
git add docs/COLOR-FUNCTION.md
git add docs/CSS-*.md
git add docs/*-COLORS.md
git add docs/*-SELECTOR.md
git add docs/GOLDEN-CSS-TEMPLATE.md
git add docs/SHORTHANDS.md
git add docs/DOUBLE-POSITION-GRADIENTS.md
git add docs/LOGICAL-PROPERTIES.md
git add docs/LIGHT-DARK.md
git add docs/RELATIVE-COLORS.md
```

### 2. Add scripts
```bash
git add scripts/css-playground.ts
git add scripts/dashboard-server.ts
git add scripts/setup-mcp-config.ts
```

### 3. Add source files
```bash
git add src/api/error-tracking.ts
git add src/mcp/tools/search-bun.ts
```

### 4. Add test files
```bash
git add test/css-bundler.test.ts
git add test/dashboard-server.test.ts
```

### 5. Add styles
```bash
git add styles/*.module.css
git add styles/golden-template.css
git add styles/themes.css
git add styles/examples/
```

### 6. Add test data
```bash
git add test-data/*.css
```

---

## Quick Add Command

```bash
# Add all recommended files at once
git add docs/BUN-SERVER-METRICS.md \
        docs/COLOR-FUNCTION.md \
        docs/CSS-*.md \
        docs/*-COLORS.md \
        docs/*-SELECTOR.md \
        docs/GOLDEN-CSS-TEMPLATE.md \
        docs/SHORTHANDS.md \
        docs/DOUBLE-POSITION-GRADIENTS.md \
        docs/LOGICAL-PROPERTIES.md \
        docs/LIGHT-DARK.md \
        docs/RELATIVE-COLORS.md \
        scripts/css-playground.ts \
        scripts/dashboard-server.ts \
        scripts/setup-mcp-config.ts \
        src/api/error-tracking.ts \
        src/mcp/tools/search-bun.ts \
        test/css-bundler.test.ts \
        test/dashboard-server.test.ts \
        styles/*.module.css \
        styles/golden-template.css \
        styles/themes.css \
        styles/examples/ \
        test-data/*.css
```

---

## Verification

After adding files, verify they're tracked:
```bash
git status --short | grep "^A"
```

---

**Last Updated**: 2025-01-15  
**Status**: Ready for review and commit
