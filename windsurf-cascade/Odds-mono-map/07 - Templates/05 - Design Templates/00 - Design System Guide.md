---
type: design-system
title: 🎨 Odds Protocol Design System
version: "2.0"
category: system-design
priority: high
status: active
tags:
  - design-system
  - theming
  - standards
  - ui
created: 2025-11-18T14:50:00Z
updated: 2025-11-18T14:50:00Z
author: system
review-frequency: monthly
---



# 🎨 Odds Protocol Design System

## Overview

*Consolidated from: Brief description of this content.*


> **Version**: 2.0 | **Status**: Active | **Review**: Monthly

---

## 🎯 Design Philosophy

*Consolidated from: ### **Core Principles***
1. **Clarity First** - Information should be immediately understandable
2. **Consistent Experience** - Unified visual language across all components
3. **Professional Appearance** - Enterprise-grade aesthetics
4. **Accessibility** - Inclusive design for all users
5. **Performance** - Fast, responsive, and efficient

### **Design Goals**
- **Visual Hierarchy**: Clear information structure
- **Scannability**: Quick content comprehension
- **Brand Consistency**: Unified Odds Protocol identity
- **User Experience**: Intuitive and delightful interactions

---

## 🎨 Color palette

*Consolidated from: ### ** Primary colors***
```css
:root {
  /* Primary Brand Colors */
  --odds-primary: #6366f1;        /* Main brand color */
  --odds-primary-light: #818cf8;  /* Lighter variant */
  --odds-primary-dark: #4f46e5;   /* Darker variant */
  --odds-primary-50: #eef2ff;     /* Very light background */
  --odds-primary-100: #e0e7ff;    /* Light background */
}
```

**Usage Guidelines**:
- **Primary**: Main CTAs, important actions, brand elements
- **Primary Light**: Hover states, secondary actions
- **Primary Dark**: Active states, emphasis
- **Primary 50/100**: Background highlights, subtle accents

### ** Secondary colors**
```css
:root {
  /* Secondary Accent Colors */
  --odds-secondary: #22d3ee;      /* Accent color */
  --odds-secondary-light: #67e8f9;
  --odds-secondary-dark: #06b6d4;
}
```

**Usage Guidelines**:
- **Secondary**: Secondary actions, highlights, data visualization
- **Secondary Light**: Hover states for secondary elements
- **Secondary Dark**: Active states for secondary elements

### ** Semantic colors**
```css
:root {
  /* Success States */
  --odds-success: #10b981;
  --odds-success-light: #34d399;
  --odds-success-bg: #ecfdf5;
  
  /* Warning States */
  --odds-warning: #f59e0b;
  --odds-warning-light: #fbbf24;
  --odds-warning-bg: #fffbeb;
  
  /* Error States */
  --odds-error: #ef4444;
  --odds-error-light: #f87171;
  --odds-error-bg: #fef2f2;
  
  /* Information States */
  --odds-info: #3b82f6;
  --odds-info-light: #60a5fa;
  --odds-info-bg: #eff6ff;
}
```

### ** Neutral colors**
```css
:root {
  /* Gray Scale for Text and Borders */
  --odds-gray-50: #f9fafb;
  --odds-gray-100: #f3f4f6;
  --odds-gray-200: #e5e7eb;
  --odds-gray-300: #d1d5db;
  --odds-gray-400: #9ca3af;
  --odds-gray-500: #6b7280;
  --odds-gray-600: #4b5563;
  --odds-gray-700: #374151;
  --odds-gray-800: #1f2937;
  --odds-gray-900: #111827;
}
```

---

## 📝 Typography System

*Consolidated from: ### **Font Families***
```css
:root {
  /* Primary Fonts */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  --font-display: 'Inter Display', 'Inter', sans-serif;
}
```

### **Type Scale**
| Size | Usage | Line Height | Weight |
|------|-------|-------------|--------|
| **48px** | H1 - Page Titles | 1.2 | 700 |
| **36px** | H2 - Section Headers | 1.3 | 600 |
| **24px** | H3 - Subsection Headers | 1.4 | 600 |
| **20px** | H4 - Component Headers | 1.5 | 600 |
| **16px** | Body Text | 1.7 | 400 |
| **14px** | Small Text | 1.6 | 400 |
| **12px** | Caption/Labels | 1.5 | 500 |

### **Typography Guidelines**
- **Headings**: Use display weights for emphasis
- **Body Text**: Regular weight for readability
- **Code**: Monospace font for technical content
- **Emphasis**: Use weight rather than italics for better readability

---

## 🎯 Component library

*Consolidated from: ### ** Buttons***

#### ** Primary button**
```css
.btn-primary {
  background: var(--odds-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--odds-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
```

#### ** Secondary button**
```css
.btn-secondary {
  background: var(--odds-secondary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  transition: all 0.2s ease;
}
```

#### ** Outline button**
```css
.btn-outline {
  background: transparent;
  color: var(--odds-primary);
  border: 2px solid var(--odds-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}
```

### ** Cards & containers**

#### ** Default card**
```css
.card {
  background: var(--odds-bg-primary);
  border: 1px solid var(--odds-border-light);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

#### ** Status cards**
```css
.card-success {
  border-left: 4px solid var(--odds-success);
  background: var(--odds-success-bg);
}

.card-warning {
  border-left: 4px solid var(--odds-warning);
  background: var(--odds-warning-bg);
}

.card-error {
  border-left: 4px solid var(--odds-error);
  background: var(--odds-error-bg);
}
```

### ** Tags & labels**

#### ** Standard tags**
```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.tag-primary {
  background: var(--odds-primary);
  color: white;
}

.tag-success {
  background: var(--odds-success);
  color: white;
}

.tag-warning {
  background: var(--odds-warning);
  color: var(--odds-gray-900);
}
```

### ** Status indicators**

#### ** Progress bars**
```css
.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: var(--odds-gray-200);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--odds-primary);
  transition: width 0.3s ease;
}
```

#### ** Status dots**
```css
.status-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.5rem;
}

.status-active {
  background: var(--odds-success);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-inactive {
  background: var(--odds-gray-400);
}
```

---

## 📊 Data Visualization

*Consolidated from: ### **Tables***
```css
.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--odds-bg-primary);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table th {
  background: var(--odds-primary);
  color: white;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
}

.table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--odds-border-light);
}

.table tr:nth-child(even) {
  background: var(--odds-bg-secondary);
}
```

### **Charts & Graphs**
- **Color Scheme**: Use primary and secondary colors for main data
- **Highlight Colors**: Use semantic colors for special data points
- **Grid Lines**: Use light gray colors for minimal visual interference
- **Labels**: Use gray-600 for secondary information

---

## 🎯 Icon system

*Consolidated from: ### ** Icon categories***
| Category | Icons | Usage |
|----------|-------|-------|
| **Navigation** | 🏠, 📚, 🏗️, 💻, 📖 | Section navigation |
| **Actions** | ✅, ❌, ⚡, 🔄, 📝 | Interactive elements |
| **Status** | 🟢, 🟡, 🔴, ⚪, ⏳ | Status indicators |
| **Content** | 📄, 📊, 🔗, 📋, 🎯 | Content types |
| **System** | ⚙️, 🔧, 🛡️, 📈, 🎨 | System functions |

### ** Icon usage guidelines**
- **Consistency**: Use the same icon for the same concept throughout
- **Size**: Maintain consistent sizing (16px, 24px, 32px)
- **Color**: Use semantic colors for status icons
- **Accessibility**: Always include text labels for screen readers

---

## 📱 Responsive Design

*Consolidated from: ### **Breakpoints***
```css
/* Mobile First Approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### **Mobile Guidelines**
- **Typography**: Scale down appropriately for smaller screens
- **Spacing**: Reduce padding and margins on mobile
- **Navigation**: Use hamburger menu for complex navigation
- **Touch Targets**: Minimum 44px for touch interaction

---

## 🌙 Dark mode support

*Consolidated from: ### ** Dark mode variables***
```css
.theme-dark {
  --odds-bg-primary: #1e293b;
  --odds-bg-secondary: #334155;
  --odds-bg-tertiary: #475569;
  --odds-text-primary: #f1f5f9;
  --odds-text-secondary: #cbd5e1;
  --odds-text-muted: #94a3b8;
  --odds-border-light: #475569;
  --odds-border-medium: #64748b;
}
```

### ** Dark mode guidelines**
- **Contrast**: Maintain WCAG AA contrast ratios
- **Colors**: Adjust colors for reduced eye strain
- **Images**: Use darker variants or reduce opacity
- **Shadows**: Use subtle shadows for depth

---

## ♿ Accessibility Standards

*Consolidated from: ### **Color Contrast***
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio

### **Focus States**
```css
.focus-visible {
  outline: 2px solid var(--odds-primary);
  outline-offset: 2px;
}
```

### **Screen Reader Support**
- **Semantic HTML**: Use proper heading hierarchy
- **Alt Text**: Descriptive alt text for images
- **ARIA Labels**: Proper labels for interactive elements
- **Keyboard Navigation**: Full keyboard accessibility

---

## 🎨 Animation & transitions

*Consolidated from: ### ** Timing functions***
```css
:root {
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.2s ease-out;
  --transition-slow: 0.3s ease-out;
}
```

### ** Animation guidelines**
- **Purpose**: Animations should enhance, not distract
- **Duration**: Keep animations short and purposeful
- **Easing**: Use ease-out for natural feeling
- **Performance**: Use transform and opacity for smooth animations

### ** Micro-interactions**
- **Hover States**: Subtle color changes and transforms
- **Button Presses**: Scale down slightly on click
- **Loading States**: Smooth progress indicators
- **Toast Notifications**: Slide in from the right

---

## 📋 Implementation Guidelines

*Consolidated from: ### **CSS Organization***
```css
/* 1. CSS Variables */
:root { /* Design tokens */ }

/* 2. Base Styles */
body { /* Base typography and layout */ }

/* 3. Components */
.btn { /* Button styles */ }
.card { /* Card styles */ }

/* 4. Utilities */
.text-center { /* Utility classes */ }
```

### **Naming Conventions**
- **BEM Methodology**: Block__Element--Modifier
- **Consistent Prefixes**: Use odds- for custom classes
- **Semantic Names**: Describe purpose, not appearance

### **Performance Considerations**
- **Critical CSS**: Inline critical above-the-fold styles
- **CSS Purging**: Remove unused CSS in production
- **Image Optimization**: Use modern formats and proper sizing
- **Font Loading**: Optimize font loading strategies

---

## 🧪 Testing & quality assurance

*Consolidated from: ### ** Visual regression testing***
- **Screenshot Comparison**: Automated visual diff testing
- **Cross-browser Testing**: Ensure consistency across browsers
- **Responsive Testing**: Verify all breakpoints work correctly
- **Accessibility Testing**: Automated and manual accessibility checks

### ** Code quality**
- **CSS Linting**: Use stylelint for CSS consistency
- **Performance Auditing**: Regular performance testing
- **Bundle Analysis**: Monitor CSS bundle size
- **Documentation**: Keep documentation up to date

---

## 📚 Resources & Tools

*Consolidated from: ### **Design Tools***
- **Figma**: Primary design tool
- **Color Contrast Checker**: Accessibility validation
- **Font Sizer**: Typography testing
- **Responsive Tester**: Cross-device testing

### **Development Tools**
- **Stylelint**: CSS linting
- **PurgeCSS**: Unused CSS removal
- **PostCSS**: CSS processing
- **Autoprefixer**: Browser compatibility

### **Inspiration & References**
- [Material Design](https://material.io/design/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Atlassian Design System](https://atlassian.design/)
- [Salesforce Lightning Design System](https://www.lightningdesignsystem.com/)

---

## 🔄 Evolution & maintenance

*Consolidated from: ### ** Version control***
- **Semantic Versioning**: Use MAJOR.MINOR.PATCH
- **Change Log**: Document all changes
- **Migration Guides**: Provide upgrade instructions
- **Backward Compatibility**: Maintain when possible

### ** Regular reviews**
- **Monthly**: Design system health check
- **Quarterly**: User feedback review
- **Annually**: Major system evaluation
- **As Needed**: Critical issue resolution

---

*This design system ensures consistency, accessibility,
and professional appearance across all Odds Protocol interfaces. Last updated: 2025-11-18*
