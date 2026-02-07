# FactoryWager Design System - Complete Index

A comprehensive, production-ready design system for the Barbershop Dashboard.

## 📁 File Structure

```
themes/css/
├── animations.css      # Transitions, keyframes, skeletons
├── components.css      # UI components (modal, toast, tabs, etc.)
├── dashboard-widgets.css # Charts, stats, tables, timelines
├── forms.css           # Form validation, inputs, checkboxes
├── icons.css           # 100+ emoji icons
├── keyboard.css        # Accessibility, shortcuts, focus states
├── print.css           # Print-optimized styles
├── responsive.css      # Mobile-first responsive utilities
└── states.css          # Empty, error, loading states

src/core/
├── theme-loader.ts     # TOML theme parser
├── ui-components.ts    # Shared header/footer components
├── ui-v2.ts           # Original dashboard renders
└── ui-v3.ts           # Enhanced dashboard renders

docs/
├── DESIGN_TOKENS.md    # Color, spacing, typography reference
└── DESIGN_SYSTEM_INDEX.md # This file

demo/
├── design-system.html       # Component showcase
├── theme-showcase.html      # Theme switching demo
├── dashboard-showcase.html  # Dashboard previews
├── widgets-showcase.html    # Charts & tables
└── responsive-showcase.html # Responsive grid demo
```

## 🎨 CSS Files Reference

### 1. **animations.css** (10KB)
**Purpose**: Motion and transitions

| Feature | Classes |
|---------|---------|
| Fade animations | `fadeIn`, `fadeInUp`, `fadeInDown`, `fadeInScale` |
| Slide animations | `slideInLeft`, `slideInRight` |
| Pulse & glow | `pulse`, `pulse-ring`, `glow` |
| Loading skeletons | `.skeleton`, `.skeleton-text`, `.skeleton-card` |
| Button effects | `.btn::after` ripple, hover transforms |
| Stagger lists | `.stagger-children` |
| Reduced motion | `@media (prefers-reduced-motion)` |

**Usage**:
```css
.my-element {
  animation: fadeInUp 0.4s ease;
}
```

---

### 2. **components.css** (11KB)
**Purpose**: Advanced UI components

| Component | Classes |
|-----------|---------|
| Toast notifications | `.toast-container`, `.toast`, `.toast-success/error/warning/info` |
| Modal/Dialog | `.modal-overlay`, `.modal`, `.modal-header/body/footer` |
| Dropdown menu | `.dropdown`, `.dropdown-toggle`, `.dropdown-menu`, `.dropdown-item` |
| Tabs | `.tabs`, `.tab`, `.tab-content` |
| Accordion | `.accordion`, `.accordion-item`, `.accordion-header`, `.accordion-body` |
| Progress bar | `.progress`, `.progress-bar` |
| Avatar group | `.avatar-group`, `.avatar` |
| Empty state | `.empty-state`, `.empty-state-icon/title/desc` |
| Divider | `.divider` |
| Breadcrumbs | `.breadcrumbs`, `.breadcrumb-item` |
| Pagination | `.pagination`, `.page-item` |

**Usage**:
```html
<div class="toast toast-success">
  <div class="toast-icon">✓</div>
  <div class="toast-content">
    <div class="toast-title">Success!</div>
    <div class="toast-message">Action completed.</div>
  </div>
</div>
```

---

### 3. **dashboard-widgets.css** (13KB)
**Purpose**: Data visualization components

| Widget | Classes |
|--------|---------|
| Stat cards | `.stat-card`, `.stat-icon`, `.stat-value`, `.stat-change` |
| Sparkline charts | `.sparkline`, `.sparkline-bar` |
| Bar charts | `.bar-chart`, `.bar-chart-item`, `.bar-chart-bar` |
| Line charts | `.line-chart`, `.line-chart-path` |
| Donut charts | `.donut-chart` |
| Data tables | `.data-table`, `.data-table-container`, `.table-actions` |
| Timeline | `.timeline`, `.timeline-item`, `.timeline-dot`, `.timeline-content` |
| Activity feed | `.activity-feed`, `.activity-item`, `.activity-avatar` |
| Heatmap | `.heatmap`, `.heatmap-cell` |
| KPI cards | `.kpi-card`, `.kpi-value`, `.kpi-change` |

**Usage**:
```html
<div class="stat-card">
  <div class="stat-icon primary">💰</div>
  <div class="stat-content">
    <div class="stat-value">$24,500</div>
    <div class="stat-label">Revenue</div>
    <div class="stat-change positive">↑ 12%</div>
  </div>
</div>
```

---

### 4. **forms.css** (10KB)
**Purpose**: Form elements and validation

| Element | Classes |
|---------|---------|
| Form groups | `.form-group`, `.form-label`, `.form-label-required` |
| Inputs | `.form-input`, `.form-select`, `.form-textarea` |
| Validation | `.is-valid`, `.is-invalid`, `.form-feedback` |
| Input groups | `.input-group`, `.input-group-addon` |
| Checkboxes | `.form-check`, `.form-check-input`, `.form-check-label` |
| Switches | `.form-switch`, `.form-switch-input` |
| File upload | `.form-file`, `.form-file-input`, `.form-file-label` |
| Character counter | `.form-counter` |
| Sections | `.form-section`, `.form-section-title` |

**Usage**:
```html
<div class="form-group">
  <label class="form-label form-label-required">Email</label>
  <input type="email" class="form-input is-valid" value="user@example.com">
  <div class="form-feedback valid">✓ Looks good!</div>
</div>
```

---

### 5. **icons.css** (10KB)
**Purpose**: Unicode emoji icon system

| Category | Icons |
|----------|-------|
| Brand | `.icon-brand` 🏰, `.icon-logo` 💈, `.icon-scissors` ✂️ |
| Navigation | `.icon-home`, `.icon-menu`, `.icon-back`, `.icon-forward` |
| Actions | `.icon-add`, `.icon-edit`, `.icon-delete`, `.icon-save`, `.icon-search` |
| User | `.icon-user`, `.icon-profile`, `.icon-login`, `.icon-logout` |
| Status | `.icon-success`, `.icon-error`, `.icon-warning`, `.icon-info` |
| Money | `.icon-money`, `.icon-cash`, `.icon-card`, `.icon-receipt`, `.icon-tip` |
| Time | `.icon-calendar`, `.icon-clock`, `.icon-history`, `.icon-schedule` |
| Dashboard | `.icon-admin` 👑, `.icon-client` 👤, `.icon-barber` ✂️, `.icon-ticket` 🎫 |

**Sizes**: `.icon-xs`, `.icon-sm`, `.icon-md`, `.icon-lg`, `.icon-xl`, `.icon-2xl`

**Containers**: `.icon-circle`, `.icon-square` (with `.primary`, `.success`, `.warning`, `.error` variants)

**Usage**:
```html
<span class="icon-circle primary">
  <span class="icon-dashboard icon-lg"></span>
</span>
```

---

### 6. **keyboard.css** (4KB)
**Purpose**: Accessibility and keyboard navigation

| Feature | Classes |
|---------|---------|
| Keyboard shortcuts | `kbd`, `.shortcut-item`, `.shortcuts-help` |
| Focus styles | `:focus-visible`, `[data-keyboard-focus]` |
| Skip links | `.skip-link` |
| Screen readers | `.sr-only`, `.sr-only-focusable` |

**Usage**:
```html
<a href="#main" class="skip-link">Skip to main content</a>
<kbd>Ctrl</kbd> + <kbd>K</kbd>
```

---

### 7. **print.css** (7KB)
**Purpose**: Print-optimized layouts

| Feature | Classes |
|---------|---------|
| Hide on print | `.no-print` |
| Show only on print | `.print-only`, `.print-header`, `.print-footer` |
| Page breaks | `.page-break`, `.no-page-break` |
| Print button | `.print-button` |

**Usage**:
```html
<button class="print-button no-print" onclick="window.print()">🖨</button>
<div class="print-header print-only">
  <h1>Report Title</h1>
</div>
```

---

### 8. **responsive.css** (10KB)
**Purpose**: Mobile-first responsive utilities

| Feature | Classes |
|---------|---------|
| Container | `.container`, `.container-fluid` |
| Grid system | `.grid`, `.grid-cols-1` to `.grid-cols-6` |
| Responsive grid | `.sm:grid-cols-*`, `.md:grid-cols-*`, `.lg:grid-cols-*` |
| Flex utilities | `.flex`, `.flex-col`, `.flex-row`, `.flex-wrap` |
| Show/hide | `.hidden`, `.sm:hidden`, `.md:block`, etc. |
| Mobile nav | `.mobile-nav`, `.mobile-nav-item` |
| Sidebar drawer | `.sidebar`, `.sidebar-overlay` |
| Typography | `.text-responsive-xs` to `.text-responsive-xl` |
| Tables | `.table-responsive`, `.table-cards` |
| Aspect ratios | `.aspect-square`, `.aspect-video`, `.aspect-portrait` |

**Breakpoints**: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`

**Usage**:
```html
<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
  <!-- Responsive grid -->
</div>
```

---

### 9. **states.css** (8KB)
**Purpose**: Empty, error, and loading states

| State | Classes |
|-------|---------|
| Empty state | `.empty-state`, `.empty-state-compact`, `.empty-state-inline` |
| Error state | `.error-state`, `.error-code`, `.error-boundary` |
| Skeleton loading | `.skeleton-screen`, `.skeleton-header`, `.skeleton-line`, `.skeleton-card` |
| Spinners | `.spinner`, `.spinner-sm`, `.spinner-lg`, `.spinner-center` |
| Dots loader | `.loader-dots` |
| Progress loader | `.loader-progress` |
| Offline banner | `.offline-banner` |
| Maintenance | `.maintenance-mode` |
| Coming soon | `.coming-soon`, `.coming-soon-badge` |
| Badges | `.beta-badge`, `.new-badge` |

**Usage**:
```html
<div class="empty-state">
  <div class="empty-state-illustration">📭</div>
  <h3 class="empty-state-title">No items yet</h3>
  <p class="empty-state-description">Get started by creating your first item.</p>
  <div class="empty-state-actions">
    <button class="btn btn-primary">Create Item</button>
  </div>
</div>
```

## 🎯 Quick Start

### 1. Include Core Files
```html
<link rel="stylesheet" href="themes/css/animations.css">
<link rel="stylesheet" href="themes/css/components.css">
<link rel="stylesheet" href="themes/css/responsive.css">
```

### 2. Add Theme Variables
```html
<style>
  :root {
    --color-primary-500: hsl(210 100% 50%);
    /* ... see DESIGN_TOKENS.md ... */
  }
</style>
```

### 3. Use Components
```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader optimized
- Reduced motion support
- High contrast mode support

## 📊 File Sizes (gzipped)

| File | Size |
|------|------|
| animations.css | ~2KB |
| components.css | ~2.5KB |
| dashboard-widgets.css | ~3KB |
| forms.css | ~2.5KB |
| icons.css | ~2KB |
| keyboard.css | ~1KB |
| print.css | ~1.5KB |
| responsive.css | ~2KB |
| states.css | ~2KB |
| **Total** | **~18KB** |
