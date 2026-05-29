# FactoryWager Design Tokens

A comprehensive design system for the Barbershop Dashboard application.

## 🎨 Color System

### Primary Palette (Blue)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-50` | `hsl(210 100% 97%)` | Lightest backgrounds |
| `--color-primary-100` | `hsl(210 100% 94%)` | Hover states, light fills |
| `--color-primary-200` | `hsl(210 100% 86%)` | Borders, dividers |
| `--color-primary-300` | `hsl(210 100% 76%)` | Disabled states |
| `--color-primary-400` | `hsl(210 100% 60%)` | Accent elements |
| `--color-primary-500` | `hsl(210 100% 50%)` | **Primary brand color** |
| `--color-primary-600` | `hsl(210 100% 42%)` | Hover states |
| `--color-primary-700` | `hsl(210 100% 36%)` | Active states |
| `--color-primary-800` | `hsl(210 100% 30%)` | Text on light |
| `--color-primary-900` | `hsl(210 100% 24%)` | Dark text |
| `--color-primary-950` | `hsl(210 100% 16%)` | Darkest elements |

### Secondary Palette (Teal - NOT Purple)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-secondary-500` | `hsl(175 80% 45%)` | **Secondary accent** |
| `--color-secondary-600` | `hsl(175 80% 38%)` | Hover states |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success-500` | `hsl(145 80% 45%)` | Success states, online status |
| `--color-warning-500` | `hsl(30 100% 50%)` | Warnings, away status |
| `--color-error-500` | `hsl(0 85% 55%)` | Errors, busy status |

### Brand Colors (Aliases)

```css
--brand-blue: var(--color-primary-500);
--brand-teal: var(--color-secondary-500);
--brand-green: var(--color-success-500);
--brand-orange: var(--color-warning-500);
--brand-red: var(--color-error-500);
```

## 🌓 Themes

### Light Theme (Default)

```css
--color-background-primary: hsl(0 0% 100%);
--color-background-secondary: hsl(220 14% 96%);
--color-background-tertiary: hsl(220 14% 92%);
--color-text-primary: hsl(220 43% 11%);
--color-text-secondary: hsl(220 14% 35%);
--color-text-muted: hsl(220 9% 60%);
```

### Dark Theme

```css
--color-background-primary: hsl(220 43% 7%);
--color-background-secondary: hsl(220 43% 11%);
--color-text-primary: hsl(0 0% 95%);
--color-text-secondary: hsl(0 0% 80%);
```

### Professional Theme

Muted blue-gray palette optimized for business environments.

### High Contrast Theme

Maximum contrast for accessibility compliance (WCAG AAA).

## 📐 Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `0.25rem (4px)` | Tight spacing |
| `--space-2` | `0.5rem (8px)` | Compact elements |
| `--space-3` | `0.75rem (12px)` | Default padding |
| `--space-4` | `1rem (16px)` | Section padding |
| `--space-5` | `1.25rem (20px)` | Card padding |
| `--space-6` | `1.5rem (24px)` | Container padding |
| `--space-8` | `2rem (32px)` | Section gaps |
| `--space-10` | `2.5rem (40px)` | Large sections |
| `--space-12` | `3rem (48px)` | Page padding |

## 🎯 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small elements, tags |
| `--radius-md` | `8px` | Buttons, inputs |
| `--radius-lg` | `12px` | Cards, panels |
| `--radius-xl` | `16px` | Modals, large cards |
| `--radius-full` | `9999px` | Pills, avatars |

## 🌑 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 hsl(220 43% 11% / 0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px -1px hsl(220 43% 11% / 0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px -3px hsl(220 43% 11% / 0.1)` | Dropdowns, modals |
| `--shadow-xl` | `0 20px 25px -5px hsl(220 43% 11% / 0.1)` | Overlays |
| `--shadow-glow` | `0 0 20px var(--color-primary-400)` | Focus states |

## ⏱️ Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms cubic-bezier(0.4, 0, 0.2, 1)` | Micro-interactions |
| `--transition-normal` | `250ms cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| `--transition-slow` | `350ms cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions |

Easing: `cubic-bezier(0.4, 0, 0.2, 1)` - Standard Material Design easing

## 🔤 Typography

### Font Families

```css
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'Fira Code', 'Monaco', 'Menlo', 'Consolas', monospace;
```

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | `0.75rem (12px)` | Captions, labels |
| `--text-sm` | `0.875rem (14px)` | Secondary text |
| `--text-base` | `1rem (16px)` | Body text |
| `--text-lg` | `1.125rem (18px)` | Lead text |
| `--text-xl` | `1.25rem (20px)` | Section headers |
| `--text-2xl` | `1.5rem (24px)` | Page titles |
| `--text-3xl` | `1.875rem (30px)` | Hero text |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | `400` | Body text |
| `--font-medium` | `500` | Labels, buttons |
| `--font-semibold` | `600` | Headers, emphasis |
| `--font-bold` | `700` | Titles, stats |

## 🎬 Animations

### Fade In
```css
animation: fadeIn 0.3s ease;
```

### Slide Up
```css
animation: fadeInUp 0.4s ease;
```

### Pulse (Live indicator)
```css
animation: pulse 2s ease-in-out infinite;
```

### Skeleton Loading
```css
animation: skeleton-loading 1.5s ease-in-out infinite;
```

### Stagger Children
```css
.stagger-children > * {
  animation: fadeInUp 0.4s ease forwards;
}
```

## ♿ Accessibility

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast

All color combinations meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

## 🎨 Usage Examples

### Button
```css
.btn {
  padding: 0.625rem 1rem;
  background: var(--color-primary-500);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn:hover {
  background: var(--color-primary-600);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Card
```css
.card {
  background: var(--color-background-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

### Status Badge
```css
.badge-success {
  background: var(--color-success-100);
  color: var(--color-success-700);
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}
```

## 📝 TOML Theme Files

Themes are defined in `themes/config/*.toml`:

```toml
[meta]
name = "FactoryWager"
description = "Official FactoryWager brand theme"
icon = "🏰"
version = "2.0.0"

[colors.primary]
500 = "hsl(210 100% 50%)"

[colors.background]
primary = "hsl(0 0% 100%)"
secondary = "hsl(220 14% 96%)"

[shadows]
md = "0 4px 6px -1px hsl(220 43% 11% / 0.1)"
```

## 🔧 Loading Themes

```typescript
import { loadThemeFromTOML, generateThemeCSS } from './theme-loader';

const theme = loadThemeFromTOML('factorywager');
const css = generateThemeCSS(theme);
```
