# Fire22 Terminal Components Library

A comprehensive library of reusable terminal-inspired components for the Fire22
dashboard ecosystem.

## Overview

This library provides a unified set of terminal-styled components using
box-drawing characters, monospace fonts, and Fire22 brand colors to create a
cohesive terminal aesthetic across all dashboard applications.

## Quick Start

```html
<!-- Include the terminal framework CSS -->
<link rel="stylesheet" href="terminal-framework.css" />

<!-- Include the terminal components CSS -->
<link rel="stylesheet" href="terminal-components.css" />

<!-- Include the terminal components JavaScript -->
<script src="terminal-components.js"></script>
```

## Core Components

### 1. Terminal Header

A branded header component with box-drawing borders and flame animation.

```html
<header class="terminal-header terminal-header--fire22">
  <h1 class="terminal-title">
    <span class="terminal-logo">🔥</span>
    Fire22 Dashboard Title
  </h1>
  <p class="terminal-subtitle">Dashboard subtitle or description</p>
</header>
```

**Modifiers:**

- `.terminal-header--compact` - Reduced padding for smaller headers
- `.terminal-header--wide` - Extended width for full-screen headers

### 2. Terminal Card

A content container with terminal corner decorations.

```html
<div class="terminal-card">
  <div class="terminal-card__header">
    <h2 class="terminal-card__title">📊 Card Title</h2>
    <div class="terminal-status-dot terminal-status-dot--active"></div>
  </div>
  <div class="terminal-card__content">
    <p>Card content goes here</p>
  </div>
</div>
```

**Modifiers:**

- `.terminal-card--compact` - Reduced padding
- `.terminal-card--interactive` - Hover effects enabled
- `.terminal-card--accent` - Accent color border

### 3. Terminal Button

Styled buttons with terminal decorations and hover effects.

```html
<button class="terminal-btn terminal-btn--primary">
  <span class="terminal-btn__icon">🚀</span>
  <span class="terminal-btn__text">Primary Action</span>
</button>

<button class="terminal-btn terminal-btn--secondary">
  <span class="terminal-btn__text">Secondary Action</span>
</button>
```

**Button Variants:**

- `.terminal-btn--primary` - Fire22 orange primary button
- `.terminal-btn--secondary` - Accent blue secondary button
- `.terminal-btn--success` - Green success button
- `.terminal-btn--danger` - Red danger button
- `.terminal-btn--ghost` - Transparent button with border

### 4. Terminal Metrics

KPI and metric display components.

```html
<div class="terminal-metrics">
  <div class="terminal-metric">
    <div class="terminal-metric__value">1,247</div>
    <div class="terminal-metric__label">Active Users</div>
    <div class="terminal-metric__trend terminal-metric__trend--up">↗ +12%</div>
  </div>
</div>
```

### 5. Terminal Progress Bar

Animated progress bars with terminal styling.

```html
<div class="terminal-progress">
  <div class="terminal-progress__header">
    <span class="terminal-progress__label">CPU Usage</span>
    <span class="terminal-progress__value">67%</span>
  </div>
  <div class="terminal-progress__bar">
    <div class="terminal-progress__fill" data-progress="67"></div>
  </div>
</div>
```

### 6. Terminal Status Indicator

Status dots and badges with pulse animations.

```html
<div class="terminal-status">
  <div class="terminal-status-dot terminal-status-dot--active"></div>
  <span class="terminal-status__text">System Active</span>
</div>

<span class="terminal-badge terminal-badge--success">HEALTHY</span>
<span class="terminal-badge terminal-badge--warning">SLOW</span>
<span class="terminal-badge terminal-badge--danger">ERROR</span>
```

### 7. Terminal Navigation

Navigation components with box-drawing styling.

```html
<nav class="terminal-nav">
  <div class="terminal-nav__section">
    ╭─ Dashboard ─────╮ │ • Overview │ │ • Analytics │ │ • Settings │
    ╰─────────────────╯
  </div>
</nav>
```

### 8. Terminal Table

Data tables with terminal styling.

```html
<div class="terminal-table">
  <div class="terminal-table__header">
    <h3 class="terminal-table__title">📋 Data Table</h3>
  </div>
  <table class="terminal-table__table">
    <thead>
      <tr class="terminal-table__row terminal-table__row--header">
        <th class="terminal-table__cell">Name</th>
        <th class="terminal-table__cell">Status</th>
        <th class="terminal-table__cell">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr class="terminal-table__row">
        <td class="terminal-table__cell">Item 1</td>
        <td class="terminal-table__cell">
          <span class="terminal-badge terminal-badge--success">ACTIVE</span>
        </td>
        <td class="terminal-table__cell">100</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 9. Terminal Footer

Comprehensive footer component with features grid and navigation.

```html
<footer class="terminal-footer">
  <div class="terminal-footer__decoration">
    ╭────────────────────────────────────────────────────────────────────────╮
  </div>

  <div class="terminal-footer__content">
    <div class="terminal-footer__main">
      <div class="terminal-footer__logo">🔥</div>
      <h2 class="terminal-footer__title">Fire22 Dashboard</h2>
      <p class="terminal-footer__tagline">Your tagline here</p>
    </div>

    <div class="terminal-footer__features">
      <div class="terminal-footer__features-header">├─── Features ───┤</div>
      <div class="terminal-footer__features-grid">
        <div class="terminal-footer__feature">├─ ⚡ Feature 1</div>
        <div class="terminal-footer__feature">├─ 📊 Feature 2</div>
        <div class="terminal-footer__feature">╰─ 🎯 Feature 3</div>
      </div>
    </div>

    <div class="terminal-footer__navigation">
      <!-- Navigation sections -->
    </div>

    <div class="terminal-footer__status">
      ├───────────────────────────────────────────────────────────────────────┤
      │ Status: ● Active | Version: 1.0.0 | Last Updated: Now │
      ├───────────────────────────────────────────────────────────────────────┤
    </div>

    <div class="terminal-footer__copyright">
      <p>© 2024 Fire22 Development Team. All rights reserved.</p>
    </div>
  </div>

  <div class="terminal-footer__decoration">
    ╰────────────────────────────────────────────────────────────────────────╯
  </div>
</footer>
```

### 10. Terminal Form Components

Form inputs with terminal styling.

```html
<div class="terminal-form">
  <div class="terminal-form__group">
    <label class="terminal-form__label">Agent ID</label>
    <input
      class="terminal-form__input"
      type="text"
      placeholder="Enter agent ID..."
    />
  </div>

  <div class="terminal-form__group">
    <label class="terminal-form__label">Status</label>
    <select class="terminal-form__select">
      <option>Active</option>
      <option>Inactive</option>
    </select>
  </div>
</div>
```

## Layout Components

### Terminal Grid

Responsive grid system for terminal components.

```html
<div class="terminal-grid">
  <div class="terminal-grid__item terminal-grid__item--span-2">
    <!-- Content spanning 2 columns -->
  </div>
  <div class="terminal-grid__item">
    <!-- Single column content -->
  </div>
</div>
```

### Terminal Container

Main container with consistent spacing.

```html
<div class="terminal-container">
  <div class="terminal-container__inner">
    <!-- Dashboard content -->
  </div>
</div>
```

## Utility Classes

### Spacing

- `.terminal-mt-{size}` - Margin top (1-8)
- `.terminal-mb-{size}` - Margin bottom (1-8)
- `.terminal-p-{size}` - Padding (1-8)

### Typography

- `.terminal-text--accent` - Accent color text
- `.terminal-text--fire` - Fire22 orange text
- `.terminal-text--success` - Success green text
- `.terminal-text--warning` - Warning yellow text
- `.terminal-text--danger` - Danger red text
- `.terminal-text--mono` - Monospace font

### Display

- `.terminal-flex` - Flex display
- `.terminal-flex--center` - Center alignment
- `.terminal-flex--between` - Space between
- `.terminal-grid` - Grid display
- `.terminal-hidden` - Hide element

### Animations

- `.terminal-pulse` - Pulse animation
- `.terminal-glow` - Glow effect
- `.terminal-flame` - Flame flicker animation
- `.terminal-shimmer` - Shimmer effect

## JavaScript API

### Terminal Component Controller

```javascript
// Initialize terminal components
const terminal = new TerminalComponents({
  theme: 'fire22',
  animations: true,
  realTime: true,
});

// Update metrics
terminal.updateMetric('cpu-usage', 67, 'warning');

// Show notification
terminal.notify('System updated successfully!', 'success');

// Update progress bar
terminal.setProgress('progress-1', 85);

// Toggle component state
terminal.toggleState('card-1', 'loading');
```

### Auto-updating Components

Components can be configured for real-time updates:

```javascript
// Auto-refresh metrics every 5 seconds
terminal.autoRefresh('.terminal-metric', {
  interval: 5000,
  endpoint: '/api/metrics',
});

// Live status updates
terminal.liveStatus('.terminal-status-dot', {
  statusEndpoint: '/api/health',
});
```

## Theme Customization

### CSS Custom Properties

Override theme colors by defining custom properties:

```css
:root {
  --terminal-primary: #your-color;
  --terminal-fire: #your-brand-color;
  --terminal-accent: #your-accent-color;
}
```

### Dark/Light Mode Support

```css
[data-theme='dark'] {
  --terminal-bg: #0d1117;
  --terminal-text: #f0f6fc;
}

[data-theme='light'] {
  --terminal-bg: #ffffff;
  --terminal-text: #24292f;
}
```

## Responsive Design

All components are responsive and include breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

```css
@media (max-width: 768px) {
  .terminal-grid {
    grid-template-columns: 1fr;
  }

  .terminal-footer__navigation {
    flex-direction: column;
  }
}
```

## Accessibility

All components include accessibility features:

- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Focus indicators

```html
<button
  class="terminal-btn terminal-btn--primary"
  role="button"
  aria-label="Execute primary action"
  tabindex="0"
>
  Primary Action
</button>
```

## Best Practices

### 1. Component Naming

- Use BEM methodology: `.terminal-component__element--modifier`
- Prefix all classes with `terminal-`
- Use semantic naming for clarity

### 2. Box-Drawing Characters

- Use consistent characters: `╭ ╮ ╰ ╯ ├ ─ ┤`
- Test across different fonts and browsers
- Provide fallbacks for unsupported environments

### 3. Performance

- Minimize animation usage on low-end devices
- Use CSS transforms for better performance
- Implement lazy loading for large datasets

### 4. Maintenance

- Keep components modular and reusable
- Document any customizations
- Test across browsers and devices
- Validate accessibility compliance

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

_Note: Box-drawing characters require proper font support. Fallback fonts are
provided._

## File Structure

```text
terminal-components/
├── css/
│   ├── terminal-framework.css      # Core framework
│   ├── terminal-components.css     # Component styles
│   └── terminal-themes.css         # Theme variants
├── js/
│   ├── terminal-components.js      # Core functionality
│   └── terminal-utils.js          # Utility functions
├── examples/
│   ├── dashboard-example.html     # Full dashboard
│   ├── components-demo.html       # Component showcase
│   └── customization-guide.html   # Theming guide
└── docs/
    ├── README.md                  # This documentation
    ├── api-reference.md           # JavaScript API
    └── migration-guide.md         # Version migration
```

## Contributing

1. Follow the established naming conventions
2. Test components across browsers
3. Include accessibility features
4. Document any new components
5. Provide usage examples

## License

Copyright © 2024 Fire22 Development Team. All rights reserved.

---

_Built with ╭─🔥─╮ terminal-inspired design for the Fire22 ecosystem_
