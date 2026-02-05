---
type: design-system-template
title: 🎨 Design System Template
version: "2.0.0"
category: design
priority: high
status: active
tags:
  - design-system
  - ui-components
  - design-tokens
  - style-guide
  - "{{project_name}}"
  - "{{design_version}}"
created: "{{date:YYYY-MM-DDTHH:mm:ssZ}}"
updated: "{{date:YYYY-MM-DDTHH:mm:ssZ}}"
author: "{{author}}"
template_version: "2.0.0"
validation_rules:
  - required-frontmatter
  - design-system-structure
  - component-documentation
  - token-validation
design_system_name: "{{design_system_name}}"
design_version: "{{design_version}}"
design_lead: "{{design_lead}}"
development_lead: "{{development_lead}}"
last_updated: "{{date:YYYY-MM-DD}}"
---

# 🎨 {{design_system_name}} Design System

> **🎯 Design System Details**: Version {{design_version}} | **👨‍🎨 Design Lead**: {{design_lead}} | **👨‍💻 Development Lead**: {{development_lead}} | **📅 Last Updated**: {{date:YYYY-MM-DD}}

---

## 📋 Overview

### **Design System Philosophy**
{{design_philosophy}}

### **Core Principles**
- **{{principle_1}}** - {{principle_1_description}}
- **{{principle_2}}** - {{principle_2_description}}
- **{{principle_3}}** - {{principle_3_description}}
- **{{principle_4}}** - {{principle_4_description}}

### **Design Goals**
{{design_goals}}

### **Target Platforms**
- {{platform_1}}
- {{platform_2}}
- {{platform_3}}

---

## 🎨 Design Tokens

### **Color System**

#### **Primary Colors**
| Token | Value | Usage | Contrast |
|-------|-------|-------|----------|
| `color-primary-50` | {{primary_50}} | Light backgrounds | {{contrast_50}} |
| `color-primary-100` | {{primary_100}} | Hover states | {{contrast_100}} |
| `color-primary-500` | {{primary_500}} | Primary actions | {{contrast_500}} |
| `color-primary-900` | {{primary_900}} | Dark text | {{contrast_900}} |

#### **Secondary Colors**
| Token | Value | Usage | Contrast |
|-------|-------|-------|----------|
| `color-secondary-50` | {{secondary_50}} | Light accents | {{contrast_secondary_50}} |
| `color-secondary-500` | {{secondary_500}} | Secondary actions | {{contrast_secondary_500}} |
| `color-secondary-900` | {{secondary_900}} | Dark accents | {{contrast_secondary_900}} |

#### **Semantic Colors**
| Token | Value | Usage | Accessibility |
|-------|-------|-------|----------------|
| `color-success` | {{success_color}} | Success states | WCAG AA |
| `color-warning` | {{warning_color}} | Warning states | WCAG AA |
| `color-error` | {{error_color}} | Error states | WCAG AA |
| `color-info` | {{info_color}} | Information states | WCAG AA |

#### **Neutral Colors**
| Token | Value | Usage |
|-------|-------|-------|
| `color-gray-50` | {{gray_50}} | Light backgrounds |
| `color-gray-100` | {{gray_100}} | Borders |
| `color-gray-500` | {{gray_500}} | Disabled text |
| `color-gray-900` | {{gray_900}} | Primary text |

---

### **Typography System**

#### **Type Scale**
| Token | Font Size | Line Height | Weight | Usage |
|-------|-----------|-------------|--------|-------|
| `font-size-xs` | {{font_xs}} | {{line_xs}} | {{weight_xs}} | Captions |
| `font-size-sm` | {{font_sm}} | {{line_sm}} | {{weight_sm}} | Small text |
| `font-size-base` | {{font_base}} | {{line_base}} | {{weight_base}} | Body text |
| `font-size-lg` | {{font_lg}} | {{line_lg}} | {{weight_lg}} | Large text |
| `font-size-xl` | {{font_xl}} | {{line_xl}} | {{weight_xl}} | Headings |
| `font-size-2xl` | {{font_2xl}} | {{line_2xl}} | {{weight_2xl}} | Page titles |

#### **Font Families**
```css
/* Primary Font */
font-family-primary: '{{primary_font}}', sans-serif;

/* Secondary Font */
font-family-secondary: '{{secondary_font}}', serif;

/* Monospace Font */
font-family-mono: '{{mono_font}}', monospace;
```

#### **Font Weights**
| Token | Weight | Usage |
|-------|--------|-------|
| `font-weight-light` | {{weight_light}} | Light text |
| `font-weight-normal` | {{weight_normal}} | Body text |
| `font-weight-medium` | {{weight_medium}} | Emphasis |
| `font-weight-semibold` | {{weight_semibold}} | Subheadings |
| `font-weight-bold` | {{weight_bold}} | Headings |

---

### **Spacing System**

#### **Space Scale**
| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | {{space_1}} | Micro spacing |
| `space-2` | {{space_2}} | Element spacing |
| `space-4` | {{space_4}} | Component spacing |
| `space-8` | {{space_8}} | Section spacing |
| `space-16` | {{space_16}} | Layout spacing |
| `space-24` | {{space_24}} | Page spacing |
| `space-32` | {{space_32}} | Container spacing |

---

### **Shadow System**

#### **Elevation Shadows**
| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | {{shadow_sm}} | Buttons, cards |
| `shadow-md` | {{shadow_md}} | Dropdowns, modals |
| `shadow-lg` | {{shadow_lg}} | Drawers, panels |
| `shadow-xl` | {{shadow_xl}} | Overlays |

---

## 🧩 Component Library

### **Button Components**

#### **Primary Button**
```jsx
<Button variant="primary" size="medium" disabled={false}>
  Button Label
</Button>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' | 'primary' | Button style variant |
| size | 'small' | 'medium' | Button size |
| disabled | boolean | false | Disabled state |
| loading | boolean | false | Loading state |

**States**:
- **Default**: Primary background, white text
- **Hover**: Darker primary background
- **Active**: Darkest primary background
- **Disabled**: Gray background, gray text
- **Loading**: Spinner with disabled state

#### **Secondary Button**
```jsx
<Button variant="secondary" size="medium">
  Secondary Action
</Button>
```

#### **Ghost Button**
```jsx
<Button variant="ghost" size="small">
  Ghost Action
</Button>
```

---

### **Input Components**

#### **Text Input**
```jsx
<Input
  type="text"
  placeholder="Enter text"
  error={false}
  disabled={false}
  helperText="Helper message"
/>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | 'text' | 'text' | Input type |
| placeholder | string | - | Placeholder text |
| error | boolean | false | Error state |
| disabled | boolean | false | Disabled state |
| helperText | string | - | Helper message |

**States**:
- **Default**: Gray border, normal text
- **Focus**: Primary border, primary outline
- **Error**: Red border, red text
- **Disabled**: Gray border, gray text

---

### **Card Components**

#### **Base Card**
```jsx
<Card padding="medium" shadow="md" border={true}>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardBody>
    Card content goes here
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### **Modal Components**

#### **Base Modal**
```jsx
<Modal isOpen={true} onClose={handleClose} size="medium">
  <ModalHeader>
    <ModalTitle>Modal Title</ModalTitle>
  </ModalHeader>
  <ModalBody>
    Modal content
  </ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={handleClose}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </ModalFooter>
</Modal>
```

---

## 📐 Layout System

### **Grid System**

#### **Container**
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.container-fluid {
  width: 100%;
  padding: 0 16px;
}
```

#### **Grid**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}

.col-1 { grid-column: span 1; }
.col-2 { grid-column: span 2; }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-8 { grid-column: span 8; }
.col-12 { grid-column: span 12; }
```

---

### **Flexbox Utilities**

#### **Flex Container**
```css
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
```

#### **Alignment**
```css
.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }

.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }
```

---

## 🎭 Icon System

### **Icon Library**
- **Library**: {{icon_library}}
- **Version**: {{icon_version}}
- **Total Icons**: {{total_icons}}

### **Icon Categories**
| Category | Count | Examples |
|----------|-------|----------|
| UI Icons | {{ui_icon_count}} | chevron, menu, close |
| Action Icons | {{action_icon_count}} | add, edit, delete |
| Social Icons | {{social_icon_count}} | twitter, github, linkedin |
| Status Icons | {{status_icon_count}} | success, warning, error |

### **Icon Usage**
```jsx
<Icon name="chevron-right" size="small" color="primary" />
<Icon name="user" size="medium" color="gray-500" />
<Icon name="check-circle" size="large" color="success" />
```

---

## 📱 Responsive Design

### **Breakpoints**
| Breakpoint | Min Width | Max Width | Usage |
|------------|-----------|-----------|-------|
| `mobile` | 320px | 767px | Mobile phones |
| `tablet` | 768px | 1023px | Tablets |
| `desktop` | 1024px | 1439px | Desktop |
| `wide` | 1440px | - | Large screens |

### **Responsive Utilities**
```css
/* Mobile-first approach */
.component {
  /* Mobile styles */
}

@media (min-width: 768px) {
  .component {
    /* Tablet styles */
  }
}

@media (min-width: 1024px) {
  .component {
    /* Desktop styles */
  }
}
```

---

## ♿ Accessibility Guidelines

### **WCAG 2.1 Compliance**
- **Level**: WCAG AA
- **Color Contrast**: All text meets 4.5:1 ratio
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: Proper ARIA labels and roles

### **Accessibility Checklist**
- [ ] Color contrast ratios meet WCAG standards
- [ ] All interactive elements are keyboard accessible
- [ ] Proper focus indicators on all interactive elements
- [ ] ARIA labels for screen readers
- [ ] Semantic HTML structure
- [ ] Alt text for all meaningful images
- [ ] Form labels and error messages
- [ ] Skip navigation links

---

## 🚀 Implementation Guidelines

### **CSS Architecture**
```css
/* BEM Methodology */
.component { /* Block */ }
.component__element { /* Element */ }
.component--modifier { /* Modifier */ }

/* CSS Custom Properties */
:root {
  --color-primary-500: #3b82f6;
  --font-size-base: 16px;
  --space-4: 1rem;
}
```

### **JavaScript Integration**
```jsx
// Component with proper prop handling
const Button = ({ 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  children, 
  onClick 
}) => {
  const baseClasses = 'btn';
  const variantClasses = `btn--${variant}`;
  const sizeClasses = `btn--${size}`;
  const disabledClasses = disabled ? 'btn--disabled' : '';
  
  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    disabledClasses
  ].filter(Boolean).join(' ');
  
  return (
    <button 
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

---

## 📊 Design System Metrics

### **Component Usage**
```dataview
TABLE
  usage_count AS "Usage Count",
  last_updated AS "Last Updated",
  maintenance_status AS "Status"
FROM #design-component AND "{{design_system_name}}"
SORT usage_count DESC
```

### **Token Coverage**
- **Colors**: {{color_token_count}} tokens documented
- **Typography**: {{typography_token_count}} tokens documented
- **Spacing**: {{spacing_token_count}} tokens documented
- **Shadows**: {{shadow_token_count}} tokens documented

---

## 🔄 Version Control & Updates

### **Version History**
| Version | Release Date | Changes | Breaking |
|---------|--------------|---------|----------|
| {{design_version}} | {{release_date}} | {{changes_current}} | {{breaking_current}} |
| {{previous_version}} | {{previous_date}} | {{changes_previous}} | {{breaking_previous}} |

### **Update Process**
1. **Design Review**: Review proposed changes
2. **Token Update**: Update design tokens
3. **Component Update**: Update affected components
4. **Documentation**: Update documentation
5. **Testing**: Test all changes
6. **Release**: Publish new version

---

## 📚 Resources & Tools

### **Design Tools**
- **Figma**: {{figma_link}}
- **Sketch**: {{sketch_link}}
- **Adobe XD**: {{xd_link}}

### **Development Tools**
- **Storybook**: {{storybook_link}}
- **Chromatic**: {{chromatic_link}}
- **Style Dictionary**: {{style_dictionary_link}}

### **Documentation**
- **Living Documentation**: {{docs_link}}
- **API Reference**: {{api_docs_link}}
- **Usage Examples**: {{examples_link}}

---

## 🏷️ Tags & Indexing

`#design-system` `#{{design_system_name}}` `#ui-components` `#design-tokens` `#style-guide` `#{{design_version}}` `#accessibility`

---

## 🔗 Quick Links


---

## 📋 Template Metadata

**Template Version**: 2.0.0  
**Created**: {{date:YYYY-MM-DDTHH:mm:ssZ}}  
**Updated**: {{date:YYYY-MM-DDTHH:mm:ssZ}}  
**Author**: {{author}}  
**Validation**: ✅ Passed  
**Processing Time**: <50ms  

---

*This design system template follows the Odds Protocol standards with comprehensive component documentation, token management, and accessibility guidelines.*
