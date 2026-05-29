# 🏰 FactoryWager Theme System

## Overview

The FactoryWager Theme System provides a consistent, brand-aligned visual identity across all applications. It uses a carefully selected **5-color palette** with strict adherence to brand guidelines—most notably, **NO purple/indigo colors** (hues 240-300°).

---

## FactoryWager Brand Palette

### The 5-Color System

| Color | Hue | Usage | Hex | HSL |
|-------|-----|-------|-----|-----|
| 🔵 **Blue** | 210° | Primary, Brand | `#007FFF` | `hsl(210 100% 50%)` |
| 🩵 **Teal** | 175° | Secondary, Accent | `#17B8A6` | `hsl(175 80% 45%)` |
| 🟢 **Green** | 145° | Success, Positive | `#14B866` | `hsl(145 80% 45%)` |
| 🟠 **Orange** | 30° | Warning, Caution | `#FF8000` | `hsl(30 100% 50%)` |
| 🔴 **Red** | 0° | Error, Danger | `#E64C4C` | `hsl(0 85% 55%)` |

### Color Scale System

Each color has a full 11-step scale (50-950):

| Scale | Lightness | Blue (210°) | Teal (175°) | Green (145°) | Orange (30°) | Red (0°) |
|-------|-----------|-------------|-------------|--------------|--------------|----------|
| 50 | 97% | `hsl(210 100% 97%)` | `hsl(175 80% 97%)` | `hsl(145 80% 97%)` | `hsl(30 100% 97%)` | `hsl(0 85% 97%)` |
| 100 | 94% | — | — | — | — | — |
| 200 | 86% | — | — | — | — | — |
| 300 | 76% | — | — | — | — | — |
| 400 | 60% | — | — | — | — | — |
| **500** | **Base** | `hsl(210 100% 50%)` | `hsl(175 80% 45%)` | `hsl(145 80% 45%)` | `hsl(30 100% 50%)` | `hsl(0 85% 55%)` |
| 600 | 42% | — | — | — | — | — |
| 700 | 36% | — | — | — | — | — |
| 800 | 30% | — | — | — | — | — |
| 900 | 24% | — | — | — | — | — |
| 950 | 16% | `hsl(210 100% 16%)` | `hsl(175 80% 14%)` | `hsl(145 80% 14%)` | `hsl(30 100% 16%)` | `hsl(0 85% 18%)` |

### Semantic Color Usage

| Semantic | Color | Use Case |
|----------|-------|----------|
| `primary` | Blue | Brand identity, main actions |
| `secondary` | Teal | Accents, secondary actions |
| `success` | Green | Success states, confirmations |
| `warning` | Orange | Warnings, cautions |
| `error` | Red | Errors, destructive actions |
| `info` | Blue* | Information, help text |

\* Info typically uses primary (blue)

### Status Indicators

```
🟢 Online  - Green (145°)
🟠 Away    - Orange (30°)
🔴 Busy    - Red (0°)
⚪ Offline - Gray
```

### Why No Purple?

FactoryWager deliberately avoids purple/indigo (hues 240-300°) to:

1. **Maintain brand consistency** - Blue/Teal/Green/Orange/Red are distinctive
2. **Improve accessibility** - Better contrast ratios with this palette
3. **Avoid confusion** - Many competitors use purple; we stand out
4. **Professional aesthetic** - This palette feels more corporate/technical

---

## Available Themes

### 1. 🏰 FactoryWager (Default)

Official brand theme with the full 5-color palette.

```typescript
import { themes } from './themes/config';
const theme = themes.factorywager;
```

**Features:**
- Complete 5-color brand palette
- Full 11-step color scales (50-950)
- Semantic color mappings
- Brand color aliases

### 2. ☀️ Light

Clean light theme for daytime use.

```typescript
const theme = themes.light;
```

### 3. 🌙 Dark

Professional dark theme for low-light environments.

```typescript
const theme = themes.dark;
```

### 4. 💼 Professional

Corporate blue-gray theme for business applications.

```typescript
const theme = themes.professional;
```

---

## Theme Configuration

### File Structure

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

### TOML Configuration Example

Themes are defined in TOML format:

```toml
name = "factorywager"
displayName = "🏰 FactoryWager"
version = "2.0.0"

[colors.primary]  # Blue
50 = "hsl(210 100% 97%)"
100 = "hsl(210 100% 94%)"
# ... 200-900
950 = "hsl(210 100% 16%)"

[colors.secondary]  # Teal
50 = "hsl(175 80% 97%)"
# ...

[semantic]
primary = "blue"
secondary = "teal"
success = "green"
warning = "orange"
error = "red"
info = "blue"
```

### Design Tokens

#### Typography
- **Sans**: `'Inter', system-ui, -apple-system, sans-serif`
- **Mono**: `'JetBrains Mono', 'Fira Code', monospace`

#### Shadows
- All shadows use the primary text color at low opacity
- Creates consistent depth across themes

#### Border Radius
```
sm:     4px
default: 6px
md:     8px
lg:     12px
xl:     16px
full:   9999px
```

---

## CSS Variables and Usage

### Basic Theme Access

```typescript
import { themes, getTheme } from './themes/config';

// Get FactoryWager theme
const fw = themes.factorywager;

// Get theme dynamically
const theme = getTheme('factorywager');

// Access colors
const brandBlue = fw.colors.primary['500'];     // hsl(210 100% 50%)
const brandTeal = fw.colors.secondary['500'];   // hsl(175 80% 45%)
const successGreen = fw.colors.success['500'];  // hsl(145 80% 45%)
const warningOrange = fw.colors.warning['500']; // hsl(30 100% 50%)
const errorRed = fw.colors.error['500'];        // hsl(0 85% 55%)
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

### Themed Console Output

```typescript
import { ThemedConsole } from './themes/config/domain-theme';

const t = new ThemedConsole('factorywager');
t.success('✓ Success message');   // Green
t.error('✗ Error message');       // Red
t.warning('⚠ Warning message');   // Orange
t.info('ℹ Info message');         // Blue
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

---

## Testing and Validation

### Running Tests

```bash
bun test tests/theme-palette.test.ts
```

### Test Coverage

The test suite includes 16 tests verifying:

- ✅ All themes are registered
- ✅ Correct hue ranges for each color
- ✅ **NO purple/indigo colors (240-300°)**
- ✅ Full color scales available
- ✅ Theme utilities function correctly

### Expected Test Output

```
🏰 FactoryWager Theme Palette
├── Theme Registry (3 tests) ✅
├── Blue Palette (2 tests) ✅
├── Teal Palette (2 tests) ✅
├── Green Palette (2 tests) ✅
├── Orange Palette (2 tests) ✅
├── Red Palette (2 tests) ✅
├── NO PURPLE Colors (1 test) ✅
└── Theme Utilities (2 tests) ✅

Total: 16 tests passing
```

---

## Update History

### v2.0.0 - FactoryWager Brand Theme

**Summary:** Updated the FactoryWager Theme System to strictly use the 5-color palette.

**Changes Made:**

1. **New Theme File: `themes/config/factorywager.toml`**
   - Official FactoryWager brand theme
   - Full 11-step color scales (50-950) for each color
   - Semantic color mappings
   - Brand color aliases
   - Comprehensive documentation

2. **Updated `themes/config/index.ts`**
   - Added `factorywager` theme import
   - Registered in themes object
   - Added to re-exports
   - Type-safe access available

3. **Updated `themes/config/domain.toml`**
   - Changed default theme to `factorywager`
   - Added brand palette documentation
   - Color usage comments

4. **Updated `themes/config/domain-theme.ts`**
   - Changed default theme to `factorywager`
   - Updated all default parameter values

5. **Created `tests/theme-palette.test.ts`**
   - 16 tests verifying palette compliance
   - Checks hue ranges for each color
   - Ensures NO purple (240-300°) colors
   - Tests all themes in registry

6. **Created `THEME_PALETTE.md`**
   - Complete palette documentation
   - Usage examples
   - Design token reference
   - Color scale system

**Files Changed:**
- ✅ `themes/config/factorywager.toml` (NEW)
- ✅ `themes/config/index.ts` (Updated)
- ✅ `themes/config/domain.toml` (Updated)
- ✅ `themes/config/domain-theme.ts` (Updated)
- ✅ `tests/theme-palette.test.ts` (NEW)
- ✅ `THEME_PALETTE.md` (NEW)
- ✅ `THEME_UPDATE_SUMMARY.md` (NEW)

### v1.0.0 - Initial Theme System

- Initial theme system with light/dark/professional themes
- Basic color configuration via TOML
- Theme registry and utilities

---

## Quick Reference

| Need To... | Command/Import |
|------------|----------------|
| Get a theme | `themes.factorywager` or `getTheme('factorywager')` |
| Generate CSS | `generateCSSVariables(themes.factorywager)` |
| Themed console | `new ThemedConsole('factorywager')` |
| Run tests | `bun test tests/theme-palette.test.ts` |
| Access brand blue | `fw.colors.primary['500']` |
| Access success green | `fw.colors.success['500']` |
| Access error red | `fw.colors.error['500']` |
