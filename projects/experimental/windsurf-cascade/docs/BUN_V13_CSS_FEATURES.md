# Bun v1.3 CSS Features Implementation

This document demonstrates the implementation of Bun v1.3's enhanced CSS features in the Odds Protocol project.

## 🎯 Features Implemented

### 1. View Transition Pseudo-Elements with Class Selectors

Bun v1.3 fixes CSS parsing issues with view-transition pseudo-elements that include class selector arguments:

```css
/* Before: Would cause "Unexpected token: ." errors */
::view-transition-old(.slide-out)
::view-transition-new(.fade-in)
::view-transition-group(.card)
::view-transition-image-pair(.hero)

/* After: Now parses, minifies, and serializes correctly */
```

#### Implementation Details:
- **File**: `apps/dashboard/src/bun-v13-features.css`
- **Layer**: `@layer transitions`
- **Usage**: Applied via React hooks and utility functions

### 2. Enhanced @layer Blocks with Color-Scheme Support

Bun v1.3's CSS minifier now processes `@layer` blocks correctly, ensuring:
- `color-scheme` rules receive required `--buncss-light/--buncss-dark` variable injections
- `prefers-color-scheme` fallbacks for browsers without `light-dark()` support

#### Implementation Details:
```css
@layer base {
  :root {
    --buncss-light: {
      --transition-bg: #ffffff;
      --transition-text: #1e293b;
    };
    
    --buncss-dark: {
      --transition-bg: #0f172a;
      --transition-text: #f1f5f9;
    };
  }
  
  color-scheme: light dark;
  
  @media (prefers-color-scheme: light) {
    /* Fallback styles */
  }
}
```

## 🏗️ Architecture

### CSS Layer Structure

```text
@layer base {
  /* Color scheme variables and base styles */
}

@layer transitions {
  /* View transition pseudo-elements with class selectors */
}

@layer animations {
  /* Keyframe definitions */
}

@layer components {
  /* Component-specific transition classes */
}

@layer utilities {
  /* Utility classes for transitions */
}

@layer theme {
  /* Dark mode support */
}
```

### TypeScript Utilities

#### Core Functions:
- `performViewTransition()`: Main transition orchestrator
- `NavigationTransition`: Page navigation with transitions
- `ComponentTransition`: Element-level transitions
- `ThemeTransition`: Theme switching with transitions
- `TransitionPerformance`: Performance monitoring

#### React Hooks:
- `useViewTransition()`: General-purpose transition hook
- `usePageTransition()`: Page-level transitions
- `useThemeTransition()`: Theme switching
- `useComponentTransition()`: Component-level transitions

## 🎨 Demo Component

The `BunV13Demo` component showcases all implemented features:

### Interactive Elements:
1. **Transition Type Selector**: Choose between different transition types
2. **Page Content Transitions**: Smooth page switching with view transitions
3. **Interactive Card**: 3D flip animations using `::view-transition-group(.card)`
4. **Theme Toggle**: Dark/light mode with color scheme transitions
5. **Navigation Demo**: Navigation transitions with `::view-transition-old/new(.nav-item)`
6. **Performance Metrics**: Real-time transition performance monitoring

### Performance Features:
- Transition duration tracking
- Average performance metrics by transition type
- Performance monitoring integration
- Fallback support for browsers without View Transition API

## 🚀 Usage Examples

### Basic View Transition

```typescript
import { useViewTransition } from '../hooks/useViewTransition';

const { transition } = useViewTransition({ 
  type: 'fade-in',
  enablePerformanceMonitoring: true 
});

await transition(async () => {
  // Update your content here
  setCurrentPage(newPage);
});
```

### Navigation with Transitions

```typescript
import { NavigationTransition } from '../utils/view-transitions';

await NavigationTransition.navigateWithTransition('/analytics', 'slide-out');
```

### Theme Switching

```typescript
import { ThemeTransition } from '../utils/view-transitions';

await ThemeTransition.toggleTheme();
```

### Component Transitions

```typescript
import { ComponentTransition } from '../utils/view-transitions';

ComponentTransition.addTransitionClasses(element, 'card', 'fade-in');
await ComponentTransition.toggleWithTransition(element, 'hero');
```

## 🔧 Configuration

### CSS Integration
Add the CSS file to your main application:

```typescript
import './bun-v13-features.css';
```

### Build Configuration
The features work with Bun's built-in CSS processing. No additional configuration needed for:
- CSS minification
- View transition parsing
- @layer block processing
- Color scheme variable injection

### Browser Support
- **Full Support**: Modern browsers with View Transition API
- **Fallback Support**: Automatic fallback for older browsers
- **Progressive Enhancement**: Core functionality works everywhere

## 📊 Performance Benefits

### Before Bun v1.3:
- CSS parsing errors with view-transition class selectors
- Broken minification for @layer blocks
- Missing color scheme variable injections
- Manual fallback implementations required

### After Bun v1.3:
- ✅ Correct parsing and minification
- ✅ Automatic color scheme support
- ✅ Built-in performance optimizations
- ✅ Reduced bundle size through better minification
- ✅ Enhanced developer experience

## 🧪 Testing

### Unit Tests
```bash
# Test view transition utilities
bun test apps/dashboard/src/utils/view-transitions.test.ts

# Test React hooks
bun test apps/dashboard/src/hooks/useViewTransition.test.ts
```

### Integration Tests
```bash
# Test demo component
bun test apps/dashboard/src/components/BunV13Demo.test.tsx
```

### Performance Tests
```bash
# Run performance benchmarks
bun test apps/dashboard/src/performance/view-transitions.test.ts
```

## 🔮 Future Enhancements

### Planned Features:
1. **Advanced Transitions**: More sophisticated transition patterns
2. **Accessibility**: Enhanced ARIA support for transitions
3. **SSR Support**: Server-side rendering compatibility
4. **Animation Library**: Integration with popular animation libraries
5. **Performance Dashboard**: Advanced performance monitoring UI

### Contributing
When adding new transition types:
1. Define CSS in the appropriate `@layer`
2. Add TypeScript types to `TransitionType`
3. Implement utility functions
4. Add React hooks
5. Update demo component
6. Add tests

## 📚 References

- [Bun v1.3 Release Notes](https://bun.sh/blog/bun-v1.3)
- [View Transition API Specification](https://www.w3.org/TR/css-view-transitions-1/)
- [CSS @layer Specification](https://www.w3.org/TR/css-cascade-5/#layering)
- [Color Scheme CSS Specification](https://www.w3.org/TR/css-color-adjust-1/#color-scheme-prop)

---

**Status**: ✅ **Fully Implemented and Tested**
**Version**: Bun v1.3+
**Last Updated**: 2025-11-17
