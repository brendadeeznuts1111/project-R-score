# Fire22 CSS Highlight System - Migration Guide

**From:** Legacy highlight system  
**To:** Fire22 CSS Highlight System v1.00.10-ALPHA  
**Migration Complexity:** 🟡 Medium  
**Estimated Time:** 2-4 hours for full codebase

## 🎯 Migration Overview

This guide helps you migrate from any existing highlight system to the new
Fire22 CSS Highlight System with OKLCH colors, semantic theming, and advanced
accessibility features.

### Migration Benefits

- ✅ **WCAG AA Compliance**: Automatic accessibility improvements
- ✅ **OKLCH Colors**: Better color accuracy and consistency
- ✅ **Dark Mode Support**: Built-in theme switching
- ✅ **Performance**: GPU-optimized animations
- ✅ **Developer Experience**: Better tooling and debugging

---

## 📋 Pre-Migration Checklist

### 1. Environment Preparation

```bash
# Ensure Bun is installed and up to date
bun --version  # Should be 1.2.20+

# Check OKLCH browser support in your target environments
# Chrome 111+, Firefox 113+, Safari 15.4+ have full support
```

### 2. Audit Current Implementation

```bash
# Find all existing highlight classes in your codebase
grep -r "highlight" --include="*.html" --include="*.jsx" --include="*.vue" src/
grep -r "status-" --include="*.css" --include="*.scss" src/
```

### 3. Backup Current Styles

```bash
# Create a backup of your current CSS
cp -r src/styles src/styles.backup
git commit -m "backup: preserve current highlight styles before migration"
```

---

## 🔄 Step-by-Step Migration Process

### Step 1: Install Fire22 Highlight System

#### Option A: Direct CSS Import (Recommended)

```html
<!-- Add to your main HTML file -->
<link rel="stylesheet" href="../../shared-styles/highlight-enhanced.css" />
```

#### Option B: Bun CSS Bundling

```typescript
// Add to your main entry point
import '../../shared-styles/highlight-enhanced.css';
```

#### Option C: Modular Approach

```css
/* Import only what you need */
@import '../../shared-styles/theme-system.css'; /* Theme foundation */
@import '../../shared-styles/highlight.css'; /* Basic highlights */
```

### Step 2: Update HTML Structure

#### Before (Legacy System)

```html
<!-- Old approach - various patterns -->
<div class="package-card highlight success">
  <div class="status-indicator approved">
    <div class="card border-green">
      <div class="highlight-box warning-state"></div>
    </div>
  </div>
</div>
```

#### After (Fire22 System)

```html
<!-- New approach - consistent pattern -->
<div class="fire22-highlight fire22-package-card success">
  <div class="fire22-highlight success">
    <div class="fire22-highlight warning">
      <div class="fire22-highlight fire22-package-card draft"></div>
    </div>
  </div>
</div>
```

### Step 3: Status Mapping

Map your existing status types to Fire22 status types:

| Legacy Status                    | Fire22 Status | CSS Class   | Notes                   |
| -------------------------------- | ------------- | ----------- | ----------------------- |
| `approved`, `done`, `complete`   | `success`     | `.success`  | Green highlight         |
| `pending`, `review`, `attention` | `warning`     | `.warning`  | Yellow highlight        |
| `failed`, `rejected`, `broken`   | `error`       | `.error`    | Red highlight           |
| `processing`, `under-review`     | `info`        | `.info`     | Blue highlight          |
| `inactive`, `disabled`           | `archived`    | `.archived` | Grayscale               |
| `wip`, `development`             | `draft`       | `.draft`    | Purple, reduced opacity |
| `selected`, `current`            | `active`      | `.active`   | Animated rainbow        |
| `loading`, `updating`            | `pulsing`     | `.pulsing`  | Breathing animation     |

### Step 4: CSS Variable Integration

Replace hard-coded colors with Fire22 semantic variables:

#### Before

```css
.my-component {
  border: 2px solid #22c55e; /* Hard-coded green */
  background: rgba(34, 197, 94, 0.1);
}

.warning-box {
  border-color: #f59e0b; /* Hard-coded yellow */
  color: #d97706;
}
```

#### After

```css
.my-component {
  border: 2px solid var(--fire22-color-success);
  background: rgba(34, 197, 94, 0.1); /* Can keep, or use CSS color-mix */
}

.warning-box {
  border-color: var(--fire22-color-warning);
  color: var(--fire22-color-warning);
}
```

---

## 🎨 Advanced Migration Patterns

### Pattern 1: Theme-Aware Components

#### Before (Static Colors)

```css
.dashboard-card {
  background: white;
  border: 1px solid #e5e7eb;
}

.dashboard-card.success {
  border-color: #22c55e;
}
```

#### After (Theme-Aware)

```css
.dashboard-card {
  background: var(--fire22-bg-primary, white);
  border: 1px solid var(--fire22-border-default, #e5e7eb);
}

.dashboard-card.fire22-highlight.success {
  box-shadow: var(--fire22-ring-medium) var(--fire22-color-success);
  border-color: transparent;
}
```

### Pattern 2: Animation Migration

#### Before (Basic Transitions)

```css
.card {
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

#### After (Performance-Optimized)

```css
.card.fire22-highlight {
  transition:
    box-shadow var(--fire22-transition-medium),
    transform var(--fire22-transition-medium);
}

.card.fire22-highlight:hover {
  box-shadow: var(--fire22-ring-glow) var(--fire22-color-neutral);
  transform: translateY(-2px);
}
```

### Pattern 3: React/JSX Integration

#### Before (Conditional Classes)

```jsx
function PackageCard({ status, name, children }) {
  const statusClass =
    status === 'approved'
      ? 'success-highlight'
      : status === 'rejected'
        ? 'error-highlight'
        : 'default-highlight';

  return (
    <div className={`package-card ${statusClass}`}>
      <h3>{name}</h3>
      {children}
    </div>
  );
}
```

#### After (Fire22 System)

```jsx
function PackageCard({ status, name, children }) {
  // Map business logic statuses to Fire22 visual statuses
  const fire22Status =
    {
      approved: 'success',
      rejected: 'error',
      pending: 'warning',
      draft: 'draft',
      archived: 'archived',
    }[status] || 'default';

  return (
    <div className={`fire22-highlight fire22-package-card ${fire22Status}`}>
      <h3>{name}</h3>
      {children}
    </div>
  );
}
```

---

## 🔧 Framework-Specific Migrations

### Vue.js Migration

```vue
<template>
  <!-- Before -->
  <div :class="['package-card', statusClass]">

  <!-- After -->
  <div :class="['fire22-highlight', 'fire22-package-card', fire22Status]">
</template>

<script>
export default {
  computed: {
    fire22Status() {
      return {
        'approved': 'success',
        'needs-review': 'warning',
        'failed': 'error'
      }[this.status] || 'default';
    }
  }
}
</script>
```

### Svelte Migration

```svelte
<script>
  // Before
  $: statusClass = status === 'approved' ? 'success-card' : 'default-card';

  // After
  $: fire22Status = {
    'approved': 'success',
    'rejected': 'error',
    'pending': 'warning'
  }[status] || 'default';
</script>

<!-- Before -->
<div class="card {statusClass}">

<!-- After -->
<div class="fire22-highlight fire22-package-card {fire22Status}">
```

---

## 🧪 Testing Your Migration

### 1. Visual Regression Testing

```bash
# Take screenshots before migration
npm run screenshot-tests -- --baseline

# After migration, compare
npm run screenshot-tests -- --compare
```

### 2. Accessibility Testing

```bash
# Install accessibility testing tools
bun add -d @axe-core/cli

# Run accessibility audit
axe-core http://localhost:3000 --tags wcag2a,wcag2aa
```

### 3. Cross-Browser Testing

```bash
# Test OKLCH color support
# Chrome/Edge: oklch() supported
# Firefox: oklch() supported
# Safari: oklch() supported
# IE11: Falls back to RGB (if needed)
```

### 4. Performance Testing

```javascript
// Measure performance impact
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'paint') {
      console.log(`${entry.name}: ${entry.startTime}ms`);
    }
  }
});
observer.observe({ entryTypes: ['paint'] });
```

---

## 🐛 Common Migration Issues & Solutions

### Issue 1: OKLCH Colors Not Displaying

**Symptoms**: Colors appear as black or default browser colors  
**Cause**: Browser doesn't support OKLCH  
**Solution**:

```css
/* Add RGB fallbacks */
.fire22-highlight.success {
  box-shadow: 0 0 0 2px #22c55e; /* RGB fallback */
  box-shadow: 0 0 0 2px var(--fire22-color-success); /* OKLCH */
}
```

### Issue 2: Animation Performance Issues

**Symptoms**: Laggy hover effects, low frame rates  
**Cause**: Too many elements animating simultaneously  
**Solution**:

```css
/* Limit GPU acceleration to active elements only */
.fire22-highlight:not(.active):not(.pulsing) {
  will-change: auto; /* Remove GPU acceleration when not needed */
}
```

### Issue 3: Theme Switching Not Working

**Symptoms**: Colors don't change when switching themes  
**Cause**: CSS custom property cascade issues  
**Solution**:

```javascript
// Ensure proper theme attribute setting
document.documentElement.setAttribute('data-theme', 'dark');
// OR
document.body.setAttribute('data-fire22-theme', 'dark');
```

### Issue 4: Specificity Conflicts

**Symptoms**: New styles not applying, old styles persisting  
**Cause**: Existing CSS has higher specificity  
**Solution**:

```css
/* Increase specificity or use !important sparingly */
.fire22-highlight.fire22-package-card.success {
  box-shadow: var(--fire22-ring-medium) var(--fire22-color-success) !important;
}
```

---

## 🎉 Post-Migration Optimization

### 1. Remove Legacy Code

```bash
# After successful migration, clean up old CSS
git rm src/styles/legacy-highlights.css
git rm src/components/old-status-indicators.css

# Update imports
# Remove old CSS imports from main files
```

### 2. Enable Advanced Features

```html
<!-- Enable debug mode during development -->
<body data-fire22-debug="true">
  <!-- Test WCAG compliance -->
  <div class="fire22-highlight success" data-wcag-check="true"></div>
</body>
```

### 3. Performance Optimization

```css
/* Enable CSS containment for better performance */
.fire22-package-card {
  contain: layout style paint;
}

/* Optimize for large lists */
.package-grid {
  contain: layout;
}
```

---

## 📊 Migration Success Metrics

Track these metrics to ensure successful migration:

### Visual Consistency

- [ ] All status types render correctly across themes
- [ ] No visual regressions in existing components
- [ ] Consistent spacing and alignment maintained

### Accessibility Improvements

- [ ] WCAG AA compliance verified (use axe-core)
- [ ] Keyboard navigation works properly
- [ ] Screen reader compatibility confirmed
- [ ] High contrast mode functional

### Performance Benchmarks

- [ ] Bundle size impact: <5KB additional
- [ ] First paint time: No degradation >100ms
- [ ] Animation frame rate: Maintains 60fps
- [ ] Memory usage: <1MB additional heap

### Developer Experience

- [ ] Build process unchanged or faster
- [ ] No TypeScript compilation errors
- [ ] Debugging tools functional
- [ ] Documentation accessible

---

## 🆘 Migration Support

### Getting Help

1. **Visual Configurator**: Use
   `packages/shared-styles/tools/visual-configurator.html`
2. **Color Utilities**: Run `bun packages/shared-styles/tools/color-utils.ts`
3. **Debug Mode**: Enable `data-fire22-debug="true"` for visual debugging

### Common Commands

```bash
# Generate CSS for current configuration
bun color-utils.ts generate-css

# Validate WCAG compliance
bun color-utils.ts validate

# Create custom status color
bun color-utils.ts create urgent 0.7 0.2 15 "Urgent status"

# Check color palette
bun color-utils.ts palette
```

### Rollback Plan

If migration issues are encountered:

```bash
# Quick rollback to previous state
git revert HEAD
# OR restore from backup
rm -rf src/styles && mv src/styles.backup src/styles
```

---

## ✅ Migration Completion Checklist

### Phase 1: Preparation

- [ ] Environment setup complete (Bun, browser support checked)
- [ ] Current implementation audited and documented
- [ ] Backup of existing styles created
- [ ] Migration plan reviewed with team

### Phase 2: Implementation

- [ ] Fire22 CSS system imported/installed
- [ ] HTML structure updated to use Fire22 classes
- [ ] Status types mapped to Fire22 system
- [ ] CSS variables integrated where appropriate
- [ ] Framework-specific patterns implemented

### Phase 3: Testing

- [ ] Visual regression tests pass
- [ ] Accessibility audit passes (WCAG AA)
- [ ] Cross-browser testing complete
- [ ] Performance benchmarks met
- [ ] User acceptance testing complete

### Phase 4: Optimization

- [ ] Legacy code removed
- [ ] Advanced features enabled and tested
- [ ] Performance optimizations applied
- [ ] Documentation updated
- [ ] Team training completed

---

**Migration Complete! 🎉**

You now have a modern, accessible, and maintainable highlight system that will
scale with your Fire22 platform needs.

For ongoing support and updates, refer to:

- `packages/shared-styles/README.md` - Complete usage documentation
- `packages/shared-styles/DECISION-LOG.md` - Technical decisions and rationale
- `packages/shared-styles/tools/visual-configurator.html` - Interactive
  configuration tool
