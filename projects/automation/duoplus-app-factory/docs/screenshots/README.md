# Dashboard Screenshots

This directory contains screenshots documenting the Lightning Network Testing Dashboard UI.

## Required Screenshots

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `shortcut-matrix-settings.png` | Shortcut Matrix settings overlay | Open Settings → Keyboard Shortcuts |
| `theme-selector.png` | Theme selector dropdown with hotkeys | Click theme icon in header or press `Ctrl+T` |
| `keyboard-help.png` | Keyboard shortcut reference card | Press `?` key |
| `dashboard-overview.png` | Full dashboard view | Main screen with all panels visible |
| `theme-customizer.png` | Theme customization panel | Press `F1` or Settings → Themes → Customize |
| `telemetry-panel.png` | Telemetry dashboard section | Navigate to Telemetry tab |
| `device-manager.png` | Device management panel | Navigate to Devices tab |
| `compliance-monitor.png` | Compliance monitoring view | Navigate to Compliance tab |

## Screenshot Guidelines

### Dimensions
- **Full dashboard**: 1920x1080 or 2560x1440
- **Panels/Overlays**: Crop to relevant area with 20px padding
- **Modals**: Include slight background blur/dim effect

### Themes
Capture each major screenshot in multiple themes:
- `*-dark.png` - Dark Professional theme
- `*-light.png` - Light Compliance theme  
- `*-terminal.png` - Terminal Retro theme (optional)

### File Format
- **Format**: PNG (for UI), JPEG (for photos)
- **Compression**: Optimize with `pngquant` or similar
- **Max size**: 500KB per image

## Naming Convention

```text
{feature}-{variant}-{theme}.png

Examples:
shortcut-matrix-settings-dark.png
shortcut-matrix-settings-light.png
theme-selector-dark.png
dashboard-overview-dark.png
```

## Capturing Screenshots

### macOS
```bash
# Full screen
Cmd+Shift+3

# Selection
Cmd+Shift+4

# Window
Cmd+Shift+4, then Space, then click window
```

### Browser DevTools
```javascript
// Capture full page
await page.screenshot({ path: 'screenshot.png', fullPage: true });

// Capture element
const element = await page.$('.shortcut-settings');
await element.screenshot({ path: 'shortcut-matrix.png' });
```

### Automated Capture Script

```bash
# Run from project root
bun run capture-screenshots

# Or manually with Playwright
npx playwright screenshot http://localhost:3000 dashboard.png
```

## Current Screenshots

_No screenshots have been added yet. Please capture and add them following the guidelines above._

## Adding Screenshots

1. Capture the screenshot following the guidelines
2. Optimize the image size
3. Place in this directory with correct naming
4. Update this README to mark as complete
5. Commit with message: `docs: add {feature} screenshot`

