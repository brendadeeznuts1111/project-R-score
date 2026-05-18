# 🔥 Fire22 KPI Component System

A comprehensive, reusable KPI (Key Performance Indicator) component system
designed for the Fire22 Dashboard Worker. This system provides enhanced styling,
multiple variants, and easy integration capabilities.

## 🚀 Features

### ✨ Core Features

- **Multiple Color Themes**: Primary, secondary, success, warning, danger, info
- **Size Variants**: Small, medium, large
- **Value Formatting**: Number, currency, percentage, text
- **Trend Indicators**: Up, down, neutral with icons
- **Interactive Elements**: Clickable KPIs with event handling
- **Responsive Design**: Hover effects and smooth transitions
- **TypeScript Support**: Full type safety and IntelliSense

### 🎨 Visual Enhancements

- **Gradient Backgrounds**: Modern gradient designs
- **Hover Effects**: Smooth animations and transformations
- **Icon Support**: Emoji and custom icon integration
- **Trend Visualization**: Color-coded trend indicators
- **Responsive Grid**: Auto-fitting grid layout

## 📦 Installation

The KPI component is part of the Fire22 Dashboard Worker system. No additional
installation is required.

## 🔧 Usage

### Basic KPI Creation

```typescript
import { createKPICard } from './kpi-component.ts';

const kpi = createKPICard({
  label: 'Pending Amount',
  value: 125000,
  format: 'currency',
  color: 'warning',
});

document.body.appendChild(kpi);
```

### Pre-built KPI Components

```typescript
import {
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
} from './kpi-component.ts';

// Create specific KPIs
const pendingAmount = createPendingAmountKPI(125000);
const totalAgents = createTotalAgentsKPI(42);
const activeAgents = createActiveAgentsKPI(38);
const pendingWagers = createPendingWagersKPI(156);

// Add to DOM
document.body.appendChild(pendingAmount);
document.body.appendChild(totalAgents);
document.body.appendChild(activeAgents);
document.body.appendChild(pendingWagers);
```

### Advanced KPI with Custom Configuration

```typescript
import { KPIComponent } from './kpi-component.ts';

const kpi = new KPIComponent({
  label: 'Revenue Growth',
  value: 23.5,
  format: 'percentage',
  color: 'success',
  size: 'large',
  icon: '📈',
  trend: 'up',
  trendValue: '+5.2%',
  clickable: true,
  onClick: () => {
    console.log('KPI clicked!');
    // Open detailed view or modal
  },
});

document.body.appendChild(kpi.render());
```

### Interactive KPI with Event Handling

```typescript
const clickableKPI = new KPIComponent({
  label: 'Click Me!',
  value: 'Interactive',
  color: 'secondary',
  icon: '🖱️',
  clickable: true,
  onClick: () => {
    alert('KPI clicked! This could open a detailed view or modal.');
  },
});

document.body.appendChild(clickableKPI.render());
```

## 🎛️ Configuration Options

### KPIConfig Interface

```typescript
interface KPIConfig {
  label: string; // Display label
  value: string | number; // KPI value
  prefix?: string; // Value prefix
  suffix?: string; // Value suffix
  format?: 'number' | 'currency' | 'percentage' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium' | 'large';
  icon?: string; // Emoji or icon
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number; // Trend value display
  clickable?: boolean; // Make KPI clickable
  onClick?: () => void; // Click event handler
}
```

### Color Themes

| Color       | Description     | Use Case              |
| ----------- | --------------- | --------------------- |
| `primary`   | Blue gradient   | General metrics       |
| `secondary` | Purple gradient | Secondary metrics     |
| `success`   | Green gradient  | Positive indicators   |
| `warning`   | Orange gradient | Caution indicators    |
| `danger`    | Red gradient    | Critical indicators   |
| `info`      | Cyan gradient   | Informational metrics |

### Size Variants

| Size     | Padding | Value Font | Label Font |
| -------- | ------- | ---------- | ---------- |
| `small`  | 1rem    | 1.5rem     | 0.8rem     |
| `medium` | 1.5rem  | 2.5rem     | 0.9rem     |
| `large`  | 2rem    | 3.5rem     | 1.1rem     |

### Value Formats

| Format       | Description              | Example   |
| ------------ | ------------------------ | --------- |
| `number`     | Locale-formatted number  | 1,234,567 |
| `currency`   | USD currency format      | $1,234.56 |
| `percentage` | Percentage with decimals | 23.45%    |
| `text`       | Plain text               | "Online"  |

## 🎨 Styling

### CSS Classes

The component automatically generates the following CSS classes:

- `.kpi-card` - Main KPI container
- `.kpi-{color}` - Color-specific styling
- `.kpi-{size}` - Size-specific styling
- `.kpi-clickable` - Clickable KPI styling
- `.kpi-icon` - Icon container
- `.kpi-value` - Value display
- `.kpi-label` - Label display
- `.kpi-trend` - Trend indicator
- `.trend-{direction}` - Trend direction styling

### Custom Styling

You can override the default styles by targeting these classes in your CSS:

```css
.kpi-card {
  /* Custom background */
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

.kpi-value {
  /* Custom value styling */
  font-family: 'Your Font', sans-serif;
  color: #your-color;
}
```

## 🔄 Dynamic Updates

### Update KPI Values

```typescript
const kpi = new KPIComponent({
  label: 'Live Counter',
  value: 0,
});

// Update value
kpi.setValue(42);

// Update multiple properties
kpi.update({
  value: 100,
  color: 'success',
  trend: 'up',
});
```

### Real-time Data Integration

```typescript
// Example: Update KPI every second
setInterval(() => {
  const newValue = Math.floor(Math.random() * 1000);
  kpi.update({
    value: newValue,
    trend: newValue > 500 ? 'up' : 'down',
  });
}, 1000);
```

## 📱 Responsive Design

The KPI components are designed to be responsive and work across different
screen sizes:

- **Grid Layout**: Auto-fitting grid with minimum width constraints
- **Flexible Sizing**: Responsive padding and font sizes
- **Touch Friendly**: Optimized for mobile and touch devices
- **Hover States**: Desktop hover effects with touch alternatives

## 🧪 Testing

### Demo Page

Open `kpi-demo.html` in your browser to see all KPI variants in action:

```bash
# Navigate to the components directory
cd dashboard-worker/src/components

# Open the demo in your browser
open kpi-demo.html
```

### Integration Testing

```typescript
// Test KPI creation
const testKPI = createKPICard({
  label: 'Test KPI',
  value: 100,
  format: 'number',
});

// Verify element creation
console.assert(testKPI instanceof HTMLElement);
console.assert(testKPI.classList.contains('kpi-card'));
```

## 🔗 Integration with Existing Dashboards

### Replace Existing KPI Elements

```typescript
// Find existing KPI elements
const existingKPIs = document.querySelectorAll('.kpi-card');

// Replace with new component
existingKPIs.forEach((element, index) => {
  const newKPI = createKPICard({
    label: `KPI ${index + 1}`,
    value: Math.floor(Math.random() * 1000),
    format: 'number',
    color: 'primary',
  });

  element.parentNode.replaceChild(newKPI, element);
});
```

### Add to Existing Dashboard

```typescript
// Find dashboard container
const dashboard = document.querySelector('.dashboard-overview');

// Add new KPI
const newKPI = createPendingAmountKPI(125000);
dashboard.appendChild(newKPI);
```

## 🚀 Performance Considerations

- **Lightweight**: Minimal DOM manipulation
- **Efficient Updates**: Only updates changed elements
- **Memory Management**: Proper cleanup with destroy() method
- **Event Handling**: Optimized event listeners

## 🔒 Security Features

- **XSS Prevention**: Safe HTML generation
- **Input Validation**: Type-safe configuration
- **Event Isolation**: Controlled event handling
- **DOM Sanitization**: Safe element creation

## 📚 Examples

### Complete Dashboard Integration

```typescript
import {
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
} from './kpi-component.ts';

class Dashboard {
  constructor() {
    this.initializeKPIs();
    this.startDataUpdates();
  }

  initializeKPIs() {
    const container = document.getElementById('kpi-overview');

    this.pendingAmount = createPendingAmountKPI(0);
    this.totalAgents = createTotalAgentsKPI(0);
    this.activeAgents = createActiveAgentsKPI(0);
    this.pendingWagers = createPendingWagersKPI(0);

    container.appendChild(this.pendingAmount);
    container.appendChild(this.totalAgents);
    container.appendChild(this.activeAgents);
    container.appendChild(this.pendingWagers);
  }

  startDataUpdates() {
    setInterval(() => {
      this.updateKPIData();
    }, 5000);
  }

  updateKPIData() {
    // Fetch real-time data and update KPIs
    fetch('/api/dashboard-stats')
      .then(response => response.json())
      .then(data => {
        // Update KPI values
        this.pendingAmount.setValue(data.pendingAmount);
        this.totalAgents.setValue(data.totalAgents);
        this.activeAgents.setValue(data.activeAgents);
        this.pendingWagers.setValue(data.pendingWagers);
      });
  }
}

// Initialize dashboard
new Dashboard();
```

## 🤝 Contributing

When contributing to the KPI component system:

1. **Follow TypeScript Standards**: Maintain type safety
2. **Add Tests**: Include test cases for new features
3. **Update Documentation**: Keep README and examples current
4. **Performance**: Ensure new features don't impact performance
5. **Accessibility**: Maintain accessibility standards

## 📄 License

This component is part of the Fire22 Dashboard Worker system and follows the
same licensing terms.

## 🆘 Support

For issues or questions about the KPI component system:

1. Check the demo page for examples
2. Review the TypeScript interfaces
3. Test with the provided examples
4. Check the main dashboard integration

---

**Built with ❤️ for the Fire22 Dashboard Worker System**
