# 🏰 FactoryWager Theme System

## Official Color Palette

FactoryWager uses a carefully selected **5-color palette** - NO purple/indigo colors:

| Color | Hue | Usage | Hex | HSL |
|-------|-----|-------|-----|-----|
| 🔵 **Blue** | 210° | Primary, Brand | `#007FFF` | `hsl(210 100% 50%)` |
| 🩵 **Teal** | 175° | Secondary, Accent | `#17B8A6` | `hsl(175 80% 45%)` |
| 🟢 **Green** | 145° | Success, Positive | `#14B866` | `hsl(145 80% 45%)` |
| 🟠 **Orange** | 30° | Warning, Caution | `#FF8000` | `hsl(30 100% 50%)` |
| 🔴 **Red** | 0° | Error, Danger | `#E64C4C` | `hsl(0 85% 55%)` |

## Available Themes

### 1. 🏰 FactoryWager (Default)
Official brand theme with the full 5-color palette
```typescript
import { themes } from './themes/config';
const theme = themes.factorywager;
```

### 2. ☀️ Light
Clean light theme for daytime use
```typescript
const theme = themes.light;
```

### 3. 🌙 Dark
Professional dark theme for low-light
```typescript
const theme = themes.dark;
```

### 4. 💼 Professional
Corporate blue-gray theme
```typescript
const theme = themes.professional;
```

## Usage Examples

### Basic Theme Access
```typescript
import { themes, getTheme } from './themes/config';

// Get FactoryWager theme
const fw = themes.factorywager;

// Get theme dynamically
const theme = getTheme('factorywager');

// Access colors
const brandBlue = fw.colors.primary['500'];
const successGreen = fw.colors.success['500'];
const errorRed = fw.colors.error['500'];
```

### With Domain CLI
```typescript
import { getDomainTheme, ThemedConsole } from './themes/config/domain-theme';

// Get themed console
const t = new ThemedConsole('factorywager');
t.success('Operation completed!');
t.error('Something went wrong');
t.warning('Please check your input');
t.info('Processing...');
```

### Generate CSS Variables
```typescript
import { generateCSSVariables, themes } from './themes/config';

const css = generateCSSVariables(themes.factorywager);
console.log(css);
// Output:
// :root {
//   --color-primary-50: hsl(210 100% 97%);
//   --color-primary-500: hsl(210 100% 50%);
//   ...
// }
```

## Color Scale System

Each color has a full 11-step scale (50-950):

```
50  - Lightest (97% lightness)
100 - Very Light (94%)
200 - Light (86%)
300 - Medium Light (76%)
400 - Light Medium (60%)
500 - Base Color (brand color)
600 - Dark Medium (42%)
700 - Medium Dark (36%)
800 - Dark (30%)
900 - Very Dark (24%)
950 - Darkest (16%)
```

## Semantic Color Usage

| Semantic | Color | Use Case |
|----------|-------|----------|
| `primary` | Blue | Brand identity, main actions |
| `secondary` | Teal | Accents, secondary actions |
| `success` | Green | Success states, confirmations |
| `warning` | Orange | Warnings, cautions |
| `error` | Red | Errors, destructive actions |
| `info` | Blue* | Information, help text |

*Info typically uses primary (blue)

## Status Indicators

```
🟢 Online  - Green (145°)
🟠 Away    - Orange (30°)
🔴 Busy    - Red (0°)
⚪ Offline - Gray
```

## Design Tokens

### Typography
- **Sans**: `'Inter', system-ui, -apple-system, sans-serif`
- **Mono**: `'JetBrains Mono', 'Fira Code', monospace`

### Shadows
- All shadows use the primary text color at low opacity
- Creates consistent depth across themes

### Border Radius
```
sm:     4px
default: 6px
md:     8px
lg:     12px
xl:     16px
full:   9999px
```

## Why No Purple?

FactoryWager deliberately avoids purple/indigo (hues 240-300) to:
1. **Maintain brand consistency** - Blue/Teal/Green/Orange/Red are distinctive
2. **Improve accessibility** - Better contrast ratios with this palette
3. **Avoid confusion** - Many competitors use purple; we stand out
4. **Professional aesthetic** - This palette feels more corporate/technical

## Testing

Run theme tests:
```bash
bun test tests/theme-palette.test.ts
```

This verifies:
- ✅ All themes are registered
- ✅ Correct hue ranges for each color
- ✅ NO purple/indigo colors (240-300°)
- ✅ Full color scales available

## File Structure

```
themes/config/
├── index.ts           # Theme registry & utilities
├── domain-theme.ts    # Domain CLI theming
├── domain.toml        # Domain configuration
├── factorywager.toml  # 🏰 Official brand theme
├── light.toml         # ☀️ Light theme
├── dark.toml          # 🌙 Dark theme
└── professional.toml  # 💼 Corporate theme
```

## Version History

- **v2.0.0** - Added FactoryWager theme, strict 5-color palette
- **v1.0.0** - Initial theme system with light/dark/professional
