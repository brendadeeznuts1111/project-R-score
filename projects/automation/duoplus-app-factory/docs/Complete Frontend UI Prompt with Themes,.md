 Complete Frontend UI Prompt with Themes, Telemetry & Manifest**

## **Updated Project Context with Theme System**
Create a modern, real-time web dashboard for testing Lightning Network mobile applications with **built-in theme customization, telemetry collection, and manifest generation**. The dashboard should allow developers to:

- **Manage Android emulators** (start, stop, install apps)
- **Stream wallet logs** with Lightning-specific filtering
- **Simulate payment flows** between emulators and real LND nodes
- **Monitor compliance requirements** (KYC/AML) for simulated transactions
- **Switch between visual themes** (dark, light, terminal, compliance, etc.)
- **Save and share custom theme profiles**
- **Collect telemetry data** for debugging and compliance reporting
- **Export all data** via standardized manifests

## **NEW: Advanced Theme System**

### **Theme Engine Architecture**
```typescript
interface ThemeProfile {
  id: string;
  name: string;
  description: string;
  author: string;
  category: 'professional' | 'developer' | 'compliance' | 'terminal' | 'custom';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontWeight: Record<string, number>;
  };
  spacing: {
    unit: number;
    scale: number[];
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
  components: {
    button: ButtonTheme;
    card: CardTheme;
    input: InputTheme;
    table: TableTheme;
    // ... all component variants
  };
  customCSS?: string;
}
```

### **Predefined Theme Profiles**

#### **1. Dark Professional (Default)**
```json
{
  "id": "dark-pro",
  "name": "Dark Professional",
  "category": "professional",
  "colors": {
    "primary": "#8B5CF6",
    "secondary": "#0EA5E9",
    "accent": "#F59E0B",
    "background": "#0F172A",
    "surface": "#1E293B",
    "text": "#F1F5F9",
    "error": "#EF4444",
    "warning": "#F59E0B",
    "success": "#10B981",
    "info": "#3B82F6"
  },
  "typography": {
    "fontFamily": "'Inter', system-ui, sans-serif",
    "fontSize": 14
  }
}
```

#### **2. Light Compliance**
```json
{
  "id": "light-compliance",
  "name": "Light Compliance",
  "category": "compliance",
  "colors": {
    "primary": "#2563EB",
    "secondary": "#059669",
    "accent": "#DC2626",
    "background": "#F8FAFC",
    "surface": "#FFFFFF",
    "text": "#1E293B",
    "error": "#DC2626",
    "warning": "#D97706",
    "success": "#059669",
    "info": "#2563EB"
  },
  "typography": {
    "fontFamily": "'Roboto', 'Segoe UI', sans-serif",
    "fontSize": 13
  }
}
```

#### **3. Terminal Retro**
```json
{
  "id": "terminal-retro",
  "name": "Terminal Retro",
  "category": "terminal",
  "colors": {
    "primary": "#00FF00",
    "secondary": "#00CCCC",
    "accent": "#FF6600",
    "background": "#000000",
    "surface": "#111111",
    "text": "#00FF00",
    "error": "#FF3333",
    "warning": "#FF9900",
    "success": "#00CC00",
    "info": "#0099FF"
  },
  "typography": {
    "fontFamily": "'Courier New', 'Cascadia Code', monospace",
    "fontSize": 13
  }
}
```

#### **4. Midnight Developer**
```json
{
  "id": "midnight-dev",
  "name": "Midnight Developer",
  "category": "developer",
  "colors": {
    "primary": "#60A5FA",
    "secondary": "#A78BFA",
    "accent": "#FBBF24",
    "background": "#030712",
    "surface": "#111827",
    "text": "#E5E7EB",
    "error": "#F87171",
    "warning": "#FBBF24",
    "success": "#34D399",
    "info": "#60A5FA"
  },
  "typography": {
    "fontFamily": "'JetBrains Mono', 'Fira Code', monospace",
    "fontSize": 13
  }
}
```

#### **5. Accessibility High Contrast**
```json
{
  "id": "high-contrast",
  "name": "High Contrast",
  "category": "accessibility",
  "colors": {
    "primary": "#000000",
    "secondary": "#333333",
    "accent": "#0000FF",
    "background": "#FFFFFF",
    "surface": "#F0F0F0",
    "text": "#000000",
    "error": "#FF0000",
    "warning": "#FF9900",
    "success": "#008000",
    "info": "#0000FF"
  },
  "typography": {
    "fontFamily": "Arial, sans-serif",
    "fontSize": 16
  }
}
```

### **Theme Management UI**

#### **Theme Selector Component**
```typescript
<ThemeManager>
  {/* Theme Switcher in Header */}
  <Header>
    <ThemeSwitcher>
      <ThemePreview theme={currentTheme} />
      <ThemeDropdown>
        <ThemeCategory title="Professional">
          <ThemeOption theme={themes.darkPro} />
          <ThemeOption theme={themes.lightCompliance} />
        </ThemeCategory>
        <ThemeCategory title="Developer">
          <ThemeOption theme={themes.terminalRetro} />
          <ThemeOption theme={themes.midnightDev} />
        </ThemeCategory>
        <ThemeCategory title="Custom">
          <CustomThemeCreator />
          <SavedThemesList />
        </ThemeCategory>
      </ThemeDropdown>
    </ThemeSwitcher>
  </Header>

  {/* Theme Customization Panel */}
  <ThemeCustomizationPanel>
    <ColorPickerSection>
      <ColorPicker label="Primary" value={theme.colors.primary} />
      <ColorPicker label="Background" value={theme.colors.background} />
      <ColorPicker label="Text" value={theme.colors.text} />
      {/* All color pickers */}
    </ColorPickerSection>

    <TypographySection>
      <FontFamilySelector />
      <FontSizeSlider />
      <FontWeightAdjuster />
    </TypographySection>

    <SpacingSection>
      <SpacingUnitAdjuster />
      <BorderRadiusSlider />
    </SpacingSection>

    <AdvancedSection>
      <CSSEditor value={theme.customCSS} />
      <AnimationControls />
      <ShadowCustomizer />
    </AdvancedSection>
  </ThemeCustomizationPanel>
</ThemeManager>
```

### **Theme Customization Features**

#### **1. Real-time Theme Editor**
```text
┌─────────────────────────────────────────────────┐
│ 🎨 THEME CUSTOMIZER                             │
├─────────────────────────────────────────────────┤
│ Preview: [🟣] [🟢] [🔵] [🟡]                   │
│                                                 │
│ ┌─────────┐ ┌─────────────────────────────────┐ │
│ │ Colors  │ │  Primary:    #8B5CF6    ███████ │ │
│ │         │ │  Background: #0F172A    ███████ │ │
│ │ Typo    │ │  Surface:    #1E293B    ███████ │ │
│ │         │ │  Text:       #F1F5F9    ███████ │ │
│ │ Spacing │ │                               │ │
│ │ Effects │ └─────────────────────────────────┘ │
│ └─────────┘                                     │
│                                                 │
│ [🎨 Generate from Image] [💾 Save] [📤 Export] │
└─────────────────────────────────────────────────┘
```

**Features:**
- **Color palette generator** from uploaded images
- **Accessibility checker** (WCAG contrast ratios)
- **Theme preview** with live component examples
- **Export as CSS/SCSS/Tailwind config**
- **Share via Theme Marketplace**

#### **2. Theme Marketplace**
```typescript
interface ThemeMarketplace {
  featured: ThemeProfile[];
  popular: ThemeProfile[];
  categories: {
    professional: ThemeProfile[];
    developer: ThemeProfile[];
    seasonal: ThemeProfile[];
    community: ThemeProfile[];
  };
  uploadTheme(theme: ThemeProfile): Promise<string>; // returns themeId
  downloadTheme(themeId: string): Promise<ThemeProfile>;
  rateTheme(themeId: string, rating: number): Promise<void>;
}
```

#### **3. Theme Sync Across Devices**
```typescript
// Sync themes via user account
const themeSync = new ThemeSyncService({
  provider: 'firebase' | 'github' | 'local',
  autoSync: true,
  conflictResolution: 'server-wins' | 'client-wins' | 'merge'
});

// Theme backup/restore
themeSync.backupThemes(): Promise<ThemeBackup>;
themeSync.restoreThemes(backup: ThemeBackup): Promise<void>;
```

### **Theme Application System**

#### **Dynamic Theme Application**
```typescript
// Theme context provider
const ThemeProvider: React.FC = ({ children }) => {
  const [theme, setTheme] = useState<ThemeProfile>(defaultTheme);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.style.setProperty('--primary', theme.colors.primary);
    document.documentElement.style.setProperty('--background', theme.colors.background);
    // ... all CSS custom properties

    // Apply custom CSS
    if (theme.customCSS) {
      const style = document.createElement('style');
      style.textContent = theme.customCSS;
      document.head.appendChild(style);
      return () => style.remove();
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

#### **Component Theme Variants**
```typescript
// Themed component with variants
const ThemedButton: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  const { theme } = useTheme();

  const variants = {
    primary: {
      background: theme.colors.primary,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.primary}`
    },
    secondary: {
      background: theme.colors.secondary,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.secondary}`
    },
    ghost: {
      background: 'transparent',
      color: theme.colors.primary,
      border: `1px solid ${theme.colors.primary}`
    }
  };

  return <button style={variants[variant]} {...props} />;
};
```

## **Updated Dashboard Layout with Theme Controls**

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Header: [Logo] ⚡ MOBILE LIGHTNING SIMULATOR  [🎨 Themes] [🔄 Sync]│
├───────────────┬───────────────┬─────────────────────────────┬──────┤
│               │               │                             │      │
│  AVD MANAGER  │  WALLET LOGS  │   PAYMENT SIMULATOR         │ 📊   │
│               │               │                             │ TELE │
│               │               │                             │ METRY│
├───────────────┴───────────────┤                             │      │
│                                │                             │      │
│      TRANSACTION HISTORY       │   COMPLIANCE MONITOR        │      │
│                                │                             │      │
├────────────────────────────────┼─────────────────────────────┤      │
│                                │                             │      │
│    TELEMETRY DASHBOARD         │   MANIFEST GENERATOR        │      │
│                                │                             │      │
├────────────────────────────────┴─────────────────────────────┴──────┤
│                                                                      │
│                     THEME CUSTOMIZATION PANEL                        │
│  (Collapsible, appears when theme editor is active)                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## **Theme System Features**

### **1. Theme Shortcuts & Hotkeys**
```text
F1: Toggle theme panel
F2: Cycle through themes
F3: Save current theme
F4: Reset to default
Ctrl+T: Open theme picker
Ctrl+Shift+T: Capture color from screen
```

### **2. Theme-Based Component Variants**
```typescript
// Different component styles per theme category
const componentVariants = {
  professional: {
    button: 'rounded-md shadow-sm',
    card: 'rounded-lg border',
    table: 'striped with borders'
  },
  developer: {
    button: 'rounded-none no-shadow',
    card: 'no-border code-like',
    table: 'minimal no-borders'
  },
  terminal: {
    button: 'monospace border-ascii',
    card: 'border-double terminal-style',
    table: 'grid-lines fixed-width'
  }
};
```

### **3. Automatic Theme Detection**
```typescript
// Detect system preferences
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Auto-apply system theme
if (prefersDark.matches) {
  applyTheme(themes.darkPro);
}

// Respect accessibility preferences
if (prefersReducedMotion.matches) {
  disableAnimations();
}
```

### **4. Theme Export/Import**
```typescript
// Export theme as various formats
const exportFormats = {
  json: (theme) => JSON.stringify(theme, null, 2),
  css: (theme) => generateCSSVariables(theme),
  tailwind: (theme) => generateTailwindConfig(theme),
  vscode: (theme) => generateVSCodeTheme(theme),
  figma: (theme) => generateFigmaTokens(theme)
};

// Import from popular formats
const importSources = {
  vscode: 'Import from VS Code theme',
  tailwind: 'Import from Tailwind config',
  css: 'Import from CSS variables',
  image: 'Generate from screenshot',
  url: 'Import from URL'
};
```

## **Complete Theme Manifest**

### **Theme Profile Manifest Schema**
```json
{
  "$schema": "https://lightning.dev/schemas/theme-profile/v1.0.0",
  "manifestVersion": "1.0.0",
  "id": "midnight-dev-001",
  "name": "Midnight Developer",
  "version": "1.0.0",
  "description": "Dark theme optimized for developers with high contrast syntax",
  "author": {
    "name": "Lightning Dev Team",
    "email": "dev@lightning.example",
    "url": "https://github.com/lightning"
  },
  "license": "MIT",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",

  "category": "developer",
  "tags": ["dark", "developer", "high-contrast", "syntax"],

  "compatibility": {
    "minAppVersion": "1.0.0",
    "testedAppVersion": "1.2.0"
  },

  "theme": {
    "colors": {
      "$schema": "./color-schema.json",
      "primary": "#60A5FA",
      "secondary": "#A78BFA",
      "accent": "#FBBF24",
      "background": "#030712",
      "surface": "#111827",
      "text": "#E5E7EB",
      "error": "#F87171",
      "warning": "#FBBF24",
      "success": "#34D399",
      "info": "#60A5FA"
    },

    "typography": {
      "fontFamily": {
        "sans": "'JetBrains Mono', 'Fira Code', monospace",
        "mono": "'JetBrains Mono', monospace",
        "ui": "'Inter', system-ui, sans-serif"
      },
      "fontSize": {
        "xs": "11px",
        "sm": "13px",
        "base": "14px",
        "lg": "16px",
        "xl": "18px"
      },
      "fontWeight": {
        "light": 300,
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      }
    },

    "spacing": {
      "unit": 4,
      "scale": [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64]
    },

    "borderRadius": {
      "none": "0",
      "sm": "2px",
      "md": "4px",
      "lg": "8px",
      "xl": "12px",
      "full": "9999px"
    },

    "shadows": {
      "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
    },

    "animations": {
      "duration": {
        "fast": "150ms",
        "normal": "300ms",
        "slow": "500ms"
      },
      "easing": {
        "default": "cubic-bezier(0.4, 0, 0.2, 1)",
        "in": "cubic-bezier(0.4, 0, 1, 1)",
        "out": "cubic-bezier(0, 0, 0.2, 1)",
        "in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    }
  },

  "customCSS": "/* Custom overrides */\n.code-block {\n  background: #1a202c;\n  border-left: 3px solid #60A5FA;\n}",

  "overrides": {
    "components": {
      "Button": {
        "primary": {
          "background": "var(--primary)",
          "color": "white"
        }
      },
      "Table": {
        "header": {
          "background": "var(--surface)",
          "borderBottom": "2px solid var(--primary)"
        }
      }
    }
  },

  "accessibility": {
    "contrastRatios": {
      "text-on-background": 7.1,
      "primary-on-surface": 4.5,
      "success-on-surface": 4.8
    },
    "wcagLevel": "AA",
    "colorblindSafe": true,
    "reducedMotion": true
  },

  "previews": [
    {
      "type": "screenshot",
      "url": "./previews/dashboard-preview.png",
      "description": "Main dashboard view"
    },
    {
      "type": "screenshot",
      "url": "./previews/telemetry-preview.png",
      "description": "Telemetry panel"
    }
  ],

  "dependencies": {
    "fonts": [
      {
        "name": "JetBrains Mono",
        "url": "https://fonts.googleapis.com/css2?family=JetBrains+Mono",
        "license": "OFL"
      },
      {
        "name": "Inter",
        "url": "https://fonts.googleapis.com/css2?family=Inter",
        "license": "OFL"
      }
    ]
  },

  "stats": {
    "downloads": 1245,
    "rating": 4.8,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

## **Theme Integration with Other Systems**

### **1. Theme-Aware Telemetry**
```typescript
// Track theme usage for analytics
telemetry.trackThemeEvent({
  action: 'theme_changed',
  themeId: theme.id,
  category: theme.category,
  previousThemeId: previousTheme?.id,
  sessionDuration: sessionDuration,
  preferredTheme: getUserThemePreference()
});
```

### **2. Theme in Manifest Exports**
```typescript
// Include theme in manifest exports
const manifestWithTheme = {
  ...baseManifest,
  ui: {
    theme: {
      activeTheme: currentTheme.id,
      customizations: userCustomizations,
      accessibility: accessibilitySettings
    },
    layout: currentLayout,
    preferences: userPreferences
  }
};
```

### **3. Theme Sharing System**
```typescript
// Share themes via various methods
const themeSharing = {
  exportAs: {
    url: generateShareableURL(theme),
    qrCode: generateQRCode(theme),
    file: downloadThemeFile(theme),
    embed: generateEmbedCode(theme),
    marketplace: uploadToMarketplace(theme)
  },

  importFrom: {
    url: importThemeFromURL,
    file: uploadThemeFile,
    clipboard: pasteThemeFromClipboard,
    screenshot: extractThemeFromImage
  }
};
```

## **Implementation Components**

### **Theme Customization Panel Layout**
```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🎨 THEME CUSTOMIZER                        [❌ Close] [💾 Save As]  │
├─────────────────┬───────────────────────────────────────────────────┤
│                 │                                                   │
│   NAVIGATION    │              MAIN EDITOR                         │
│   ────────────  │              ───────────                         │
│   • Colors      │  Primary Color:  #8B5CF6      ████████████████   │
│   • Typography  │                                                   │
│   • Spacing     │  Background:     #0F172A      ████████████████   │
│   • Components  │                                                   │
│   • Effects     │  Surface:        #1E293B      ████████████████   │
│   • Advanced    │                                                   │
│                 │  Text:           #F1F5F9      ████████████████   │
│   [Presets]     │                                                   │
│   • Dark Pro    │  Contrast Ratio: 7.1:1 ✅ WCAG AAA               │
│   • Light Comp  │                                                   │
│   • Terminal    │  [🎨 Pick from Image]  [🔄 Randomize]            │
│   • Custom      │                                                   │
│                 │  [📋 Copy Theme]  [📤 Export]  [🔄 Preview]      │
└─────────────────┴───────────────────────────────────────────────────┘
```

### **Theme Profile Manager**
```typescript
<ThemeProfileManager>
  <ProfileList>
    <ProfileCard
      theme={theme}
      isActive={isActive}
      onApply={() => applyTheme(theme)}
      onEdit={() => editTheme(theme)}
      onDuplicate={() => duplicateTheme(theme)}
      onDelete={() => deleteTheme(theme)}
      onExport={() => exportTheme(theme)}
    />
  </ProfileList>

  <ProfileActions>
    <CreateNewProfile />
    <ImportProfile />
    <SyncProfiles />
    <BackupAllProfiles />
  </ProfileActions>
</ThemeProfileManager>
```

## **Package.json Updates**

```json
{
  "name": "lightning-mobile-simulator-dashboard",
  "version": "1.0.0",
  "dependencies": {
    // ... existing dependencies

    // Theme System Dependencies
    "@radix-ui/colors": "^1.0.0",
    "color2k": "^2.0.0",
    "chroma-js": "^2.4.2",
    "polished": "^4.2.2",
    "react-colorful": "^5.6.1",
    "use-debounce": "^9.0.4",

    // Font Loading
    "@fontsource/jetbrains-mono": "^5.0.0",
    "@fontsource/inter": "^5.0.0",
    "@fontsource/roboto-mono": "^5.0.0",

    // QR Code for theme sharing
    "qrcode.react": "^3.1.0",

    // Image color extraction
    "colorthief": "^2.4.0",
    "rgbaster": "^2.1.1"
  },
  "themeSystem": {
    "defaultTheme": "dark-pro",
    "themeStorage": "indexedDB",
    "syncProvider": "firebase",
    "marketplaceEnabled": true,
    "autoDetectSystemTheme": true,
    "accessibility": {
      "highContrastMode": true,
      "reducedMotion": true,
      "screenReader": true
    }
  }
}
```

## **Environment Variables for Themes**

```env
# Theme System Configuration
VITE_THEME_STORAGE_BACKEND=indexeddb # indexeddb | localStorage | api
VITE_THEME_MARKETPLACE_URL=https://themes.lightning.dev
VITE_THEME_SYNC_ENABLED=true
VITE_THEME_BACKUP_INTERVAL_HOURS=24

# Font Configuration
VITE_GOOGLE_FONTS_API_KEY=your_key_here
VITE_CUSTOM_FONT_CDN=https://fonts.your-cdn.com

# Color Extraction API
VITE_COLOR_EXTRACTION_API=https://api.lightning.dev/colors/extract
```

## **Complete Dashboard Manifest with Theme**

```json
{
  "$schema": "https://lightning.dev/schemas/dashboard-manifest/v1.0.0",
  "manifestVersion": "1.0.0",
  "sessionId": "sim_abc123xyz789",

  "ui": {
    "theme": {
      "activeProfile": "midnight-dev-001",
      "customizations": {
        "colors": {
          "primary": "#60A5FA",
          "customAccent": "#FBBF24"
        },
        "typography": {
          "fontSize": 15
        }
      },
      "accessibility": {
        "prefersReducedMotion": false,
        "highContrastMode": false,
        "screenReaderEnabled": true
      }
    },
    "layout": {
      "panels": ["avd", "logs", "payments", "telemetry", "compliance"],
      "splitPositions": [25, 30, 45],
      "collapsedPanels": []
    },
    "preferences": {
      "hotkeys": {
        "themeSwitch": "F2",
        "telemetryCopy": "Ctrl+Shift+C",
        "manifestExport": "Ctrl+Shift+M"
      },
      "autoSaveInterval": 300,
      "defaultExportFormat": "detailed"
    }
  },

  "telemetry": {
    // ... existing telemetry
    "themeUsage": {
      "initialTheme": "dark-pro",
      "themeChanges": 3,
      "totalTimePerTheme": {
        "dark-pro": 1800,
        "light-compliance": 900,
        "midnight-dev-001": 2700
      },
      "preferredTheme": "midnight-dev-001"
    }
  },

  "exportInfo": {
    "exportedWithTheme": "midnight-dev-001",
    "themeIncluded": true,
    "uiSnapshotIncluded": true
  }
}
```

## **Workflow: Creating and Applying Themes**

```text
1. User opens Theme Customizer
   ↓
2. Selects base theme or starts from scratch
   ↓
3. Customizes colors, typography, spacing
   ↓
4. Uses accessibility checker for compliance
   ↓
5. Previews theme on different panel types
   ↓
6. Saves as new profile
   ↓
7. Optionally shares to marketplace
   ↓
8. Theme is applied globally
   ↓
9. Telemetry records theme usage
   ↓
10. Manifest exports include theme info
```

## **Advanced Theme Features**

### **1. Seasonal/Auto Themes**
```typescript
// Auto-changing themes based on time/events
const seasonalThemes = {
  halloween: {
    colors: { primary: '#FF7518', background: '#1a0b00' },
    active: isHalloweenSeason()
  },
  christmas: {
    colors: { primary: '#D70040', secondary: '#00A86B' },
    active: isChristmasSeason()
  },
  pride: {
    colors: rainbowGradient,
    active: isPrideMonth()
  }
};
```

### **2. Theme Animations**
```typescript
// Smooth theme transitions
const ThemeTransition: React.FC = ({ children }) => {
  const { theme } = useTheme();

  return (
    <motion.div
      key={theme.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};
```

### **3. Theme Performance Optimization**
```typescript
// Memoized theme calculations
const useMemoizedTheme = (theme: ThemeProfile) => {
  return useMemo(() => ({
    colors: deepFreeze(theme.colors),
    cssVariables: generateCSSVariables(theme),
    className: `theme-${theme.id}`
  }), [theme]);
};
```

---

## **Keyboard Shortcut System**

The dashboard includes a comprehensive keyboard shortcut system that integrates with themes, supports user customization, and exports to manifests.

### **1. Shortcut Type Definitions**

```typescript
// Shortcut Types
type ShortcutType = 'single' | 'combo' | 'function' | 'arrow';
type ModifierKey = 'ctrl' | 'shift' | 'alt' | 'meta' | 'ctrl+shift' | 'ctrl+alt' | 'ctrl+shift+alt';
type ShortcutScope = 'global' | `panel:${string}`;
type ShortcutCategory = 'theme' | 'telemetry' | 'device' | 'payment' | 'compliance' | 'nav' | 'data';

interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  description: string;
  defaultKey: string;
  type: ShortcutType;
  modifiers?: ModifierKey;
  scope: ShortcutScope;
  enabled: boolean;
  customKey?: string;  // User override
  handler: () => void | Promise<void>;
}

interface ShortcutOverride {
  id: string;
  customKey: string;
  enabled: boolean;
}

interface ShortcutConfig {
  version: string;
  overrides: ShortcutOverride[];
  disabledCategories: ShortcutCategory[];
  conflictResolution: 'warn' | 'block' | 'override';
}
```

### **2. Default Shortcuts Matrix**

#### **🎨 Theme Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `theme.togglePanel` | Toggle theme customizer | `F1` | function | global |
| `theme.cycleThemes` | Cycle through themes | `F2` | function | global |
| `theme.saveTheme` | Save current theme | `F3` | function | global |
| `theme.resetDefault` | Reset to default theme | `F4` | function | global |
| `theme.openPicker` | Open theme picker | `Ctrl+T` | combo | global |
| `theme.captureColor` | Capture color from screen | `Ctrl+Shift+T` | combo | global |
| `theme.quick.dark` | Switch to Dark Pro | `Alt+1` | combo | global |
| `theme.quick.light` | Switch to Light Compliance | `Alt+2` | combo | global |
| `theme.quick.terminal` | Switch to Terminal Retro | `Alt+3` | combo | global |
| `theme.quick.dev` | Switch to Midnight Dev | `Alt+4` | combo | global |

#### **📊 Telemetry Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `telemetry.copy` | Copy telemetry to clipboard | `Ctrl+Shift+C` | combo | panel:telemetry |
| `telemetry.exportManifest` | Export manifest | `Ctrl+Shift+M` | combo | global |
| `telemetry.exportCSV` | Export as CSV | `Ctrl+Shift+E` | combo | panel:telemetry |
| `telemetry.clearSession` | Clear session data | `Ctrl+Shift+X` | combo | panel:telemetry |

#### **📱 Device Management Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `device.power` | Toggle power on/off | `P` | single | panel:devices |
| `device.restart` | Restart device | `R` | single | panel:devices |
| `device.adb` | Toggle ADB | `A` | single | panel:devices |
| `device.execute` | Execute ADB command | `E` | single | panel:devices |
| `device.logcat` | Stream logcat | `L` | single | panel:devices |
| `device.info` | Show device info | `I` | single | panel:devices |
| `device.refresh` | Refresh device list | `F5` | function | panel:devices |
| `device.selectAll` | Select all devices | `Ctrl+A` | combo | panel:devices |

#### **💳 Payment Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `payment.new` | New payment | `Ctrl+N` | combo | panel:payments |
| `payment.send` | Send payment | `Ctrl+Enter` | combo | panel:payments |
| `payment.cancel` | Cancel payment | `Escape` | single | panel:payments |
| `payment.history` | Show payment history | `Ctrl+H` | combo | panel:payments |
| `payment.simulate` | Simulate test payment | `Ctrl+Shift+P` | combo | panel:payments |

#### **📋 Compliance Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `compliance.check` | Run compliance check | `Ctrl+Shift+K` | combo | panel:compliance |
| `compliance.report` | Generate report | `Ctrl+Shift+R` | combo | panel:compliance |
| `compliance.flag` | Flag transaction | `Ctrl+F` | combo | panel:compliance |

#### **🔍 Navigation Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `nav.nextPanel` | Focus next panel | `Tab` | single | global |
| `nav.prevPanel` | Focus previous panel | `Shift+Tab` | combo | global |
| `nav.up` | Move selection up | `↑` | arrow | panel:* |
| `nav.down` | Move selection down | `↓` | arrow | panel:* |
| `nav.select` | Select item | `Enter` | single | panel:* |
| `nav.escape` | Close modal/cancel | `Escape` | single | global |
| `nav.search` | Focus search | `Ctrl+K` | combo | global |
| `nav.help` | Show keyboard help | `?` | single | global |

#### **💾 Data Shortcuts**
| Action ID | Description | Default | Type | Scope |
|-----------|-------------|---------|------|-------|
| `data.save` | Save current state | `Ctrl+S` | combo | global |
| `data.open` | Open file | `Ctrl+O` | combo | global |
| `data.export` | Export data | `Ctrl+Shift+S` | combo | global |
| `data.import` | Import data | `Ctrl+Shift+O` | combo | global |
| `data.undo` | Undo | `Ctrl+Z` | combo | global |
| `data.redo` | Redo | `Ctrl+Shift+Z` | combo | global |


### **3. Shortcut Management System**

```typescript
// ShortcutContext.tsx
interface ShortcutContextValue {
  shortcuts: Map<string, ShortcutDefinition>;
  getShortcut: (id: string) => ShortcutDefinition | undefined;
  updateShortcut: (id: string, newKey: string) => boolean;
  resetShortcut: (id: string) => void;
  resetAll: () => void;
  isConflict: (key: string, excludeId?: string) => boolean;
  getByCategory: (category: ShortcutCategory) => ShortcutDefinition[];
  exportConfig: () => ShortcutConfig;
  importConfig: (config: ShortcutConfig) => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

// useShortcuts.ts - Hook for components
function useShortcuts(scope: ShortcutScope = 'global') {
  const context = useContext(ShortcutContext);
  const scopedShortcuts = useMemo(() =>
    Array.from(context.shortcuts.values())
      .filter(s => s.scope === scope || s.scope === 'global'),
    [context.shortcuts, scope]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = buildKeyString(e);
      const shortcut = scopedShortcuts.find(s =>
        (s.customKey || s.defaultKey) === key && s.enabled
      );
      if (shortcut) {
        e.preventDefault();
        shortcut.handler();
        trackShortcutUsage(shortcut.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scopedShortcuts]);

  return { shortcuts: scopedShortcuts, ...context };
}
```

### **4. Shortcut Override Interface**

```typescript
// ShortcutSettings.tsx
const ShortcutSettings: React.FC = () => {
  const { shortcuts, updateShortcut, resetAll, isConflict } = useShortcuts();
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string>('');

  const handleKeyCapture = (e: KeyboardEvent) => {
    e.preventDefault();
    const captured = buildKeyString(e);
    setPendingKey(captured);
  };

  const saveShortcut = (id: string) => {
    if (isConflict(pendingKey, id)) {
      toast.error('This shortcut conflicts with another action');
      return;
    }
    updateShortcut(id, pendingKey);
    setEditing(null);
  };

  return (
    <div className="shortcut-settings">
      <header>
        <h2>⌨️ Keyboard Shortcuts</h2>
        <button onClick={resetAll}>Reset All to Defaults</button>
      </header>

      {CATEGORIES.map(category => (
        <section key={category}>
          <h3>{getCategoryIcon(category)} {category.toUpperCase()}</h3>
          <table>
            <thead>
              <tr><th>Action</th><th>Shortcut</th><th>Scope</th><th></th></tr>
            </thead>
            <tbody>
              {shortcuts.filter(s => s.category === category).map(shortcut => (
                <tr key={shortcut.id}>
                  <td>{shortcut.description}</td>
                  <td>
                    {editing === shortcut.id ? (
                      <input
                        autoFocus
                        value={pendingKey}
                        onKeyDown={handleKeyCapture}
                        placeholder="Press keys..."
                      />
                    ) : (
                      <kbd>{shortcut.customKey || shortcut.defaultKey}</kbd>
                    )}
                  </td>
                  <td><span className="scope-badge">{shortcut.scope}</span></td>
                  <td>
                    {editing === shortcut.id ? (
                      <>
                        <button onClick={() => saveShortcut(shortcut.id)}>✓</button>
                        <button onClick={() => setEditing(null)}>✕</button>
                      </>
                    ) : (
                      <button onClick={() => setEditing(shortcut.id)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
};
```

### **5. Theme System Integration**

Shortcuts can optionally be stored per-theme or globally:

```typescript
// Theme-specific shortcut preferences
interface ThemeProfile {
  // ... existing theme properties

  shortcuts?: {
    // Optional theme-specific shortcut overrides
    overrides?: ShortcutOverride[];
    // Theme-specific additional shortcuts
    custom?: ShortcutDefinition[];
  };
}

// Theme-aware shortcut loading
const loadShortcutsForTheme = (theme: ThemeProfile) => {
  const baseShortcuts = loadUserShortcuts();

  if (theme.shortcuts?.overrides) {
    theme.shortcuts.overrides.forEach(override => {
      if (baseShortcuts.has(override.id)) {
        baseShortcuts.get(override.id)!.customKey = override.customKey;
      }
    });
  }

  if (theme.shortcuts?.custom) {
    theme.shortcuts.custom.forEach(custom => {
      baseShortcuts.set(custom.id, custom);
    });
  }

  return baseShortcuts;
};
```


### **6. Manifest Inclusion**

Shortcut configuration is included in manifest exports:

```json
{
  "$schema": "https://lightning.dev/schemas/dashboard-manifest/v1.0.0",
  "manifestVersion": "1.0.0",
  "sessionId": "sim_abc123xyz789",

  "ui": {
    "theme": {
      "activeProfile": "midnight-dev-001"
    },

    "shortcuts": {
      "version": "1.0.0",
      "conflictResolution": "warn",

      "overrides": [
        { "id": "theme.openPicker", "customKey": "Ctrl+Shift+T", "enabled": true },
        { "id": "device.refresh", "customKey": "Ctrl+R", "enabled": true }
      ],

      "disabledCategories": [],

      "usage": {
        "totalInvocations": 247,
        "mostUsed": [
          { "id": "nav.search", "count": 45 },
          { "id": "device.refresh", "count": 38 },
          { "id": "theme.cycleThemes", "count": 22 }
        ],
        "neverUsed": ["compliance.flag", "data.redo"]
      }
    }
  },

  "telemetry": {
    "shortcutEvents": [
      { "timestamp": "2024-01-15T10:30:00Z", "shortcutId": "theme.cycleThemes", "context": "global" },
      { "timestamp": "2024-01-15T10:31:00Z", "shortcutId": "device.power", "context": "panel:devices" }
    ]
  }
}
```

### **7. Visual Shortcut Reference Card**

Display this reference card when user presses `?`:

```text
╔═══════════════════════════════════════════════════════════════════════════╗
║                        ⌨️  KEYBOARD SHORTCUTS                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🎨 THEME                      📊 TELEMETRY                               ║
║  ─────────                     ─────────────                              ║
║  F1    Toggle customizer       Ctrl+Shift+C  Copy telemetry               ║
║  F2    Cycle themes            Ctrl+Shift+M  Export manifest              ║
║  F3    Save theme              Ctrl+Shift+E  Export CSV                   ║
║  F4    Reset to default        Ctrl+Shift+X  Clear session                ║
║  Ctrl+T  Open picker                                                      ║
║                                                                           ║
║  📱 DEVICES (when panel active)    💳 PAYMENTS                            ║
║  ──────────                        ──────────                             ║
║  P    Power on/off                 Ctrl+N      New payment                ║
║  R    Restart                      Ctrl+Enter  Send payment               ║
║  A    Toggle ADB                   Escape      Cancel                     ║
║  E    Execute command              Ctrl+H      History                    ║
║  L    Stream logcat                Ctrl+Shift+P Simulate                  ║
║  I    Device info                                                         ║
║  F5   Refresh                                                             ║
║                                                                           ║
║  🔍 NAVIGATION                     💾 DATA                                ║
║  ────────────                      ──────                                 ║
║  Tab       Next panel              Ctrl+S      Save                       ║
║  Shift+Tab Previous panel          Ctrl+O      Open                       ║
║  ↑↓        Move selection          Ctrl+Z      Undo                       ║
║  Enter     Select item             Ctrl+Shift+Z Redo                      ║
║  Escape    Close/cancel            Ctrl+Shift+S Export                    ║
║  Ctrl+K    Search                                                         ║
║  ?         Show this help                                                 ║
║                                                                           ║
║  🎯 QUICK THEME SWITCH             📋 COMPLIANCE                          ║
║  ──────────────────                ────────────                           ║
║  Alt+1  Dark Pro                   Ctrl+Shift+K  Run check                ║
║  Alt+2  Light Compliance           Ctrl+Shift+R  Generate report          ║
║  Alt+3  Terminal Retro             Ctrl+F        Flag transaction         ║
║  Alt+4  Midnight Dev                                                      ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### **8. Shortcut Settings Panel Layout**

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ⌨️ KEYBOARD SHORTCUTS                    [Reset All] [Import] [Export]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🔍 Search shortcuts...                                                 │
│                                                                         │
│  ┌─ 🎨 Theme ──────────────────────────────────────────────────────┐   │
│  │ Toggle customizer    │ F1           │ global  │ [Edit] [Reset] │   │
│  │ Cycle themes         │ F2           │ global  │ [Edit] [Reset] │   │
│  │ Save theme           │ F3           │ global  │ [Edit] [Reset] │   │
│  │ Open picker          │ Ctrl+T (mod) │ global  │ [Edit] [Reset] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ 📱 Devices ────────────────────────────────────────────────────┐   │
│  │ Power on/off         │ P            │ panel   │ [Edit] [Reset] │   │
│  │ Restart              │ R            │ panel   │ [Edit] [Reset] │   │
│  │ Toggle ADB           │ A            │ panel   │ [Edit] [Reset] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Show All Categories ▼]                                                │
│                                                                         │
│  ⚠️ Conflict Detection: ON   │   📊 Usage Stats: 247 invocations       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## **Implementation Status & Screenshots**

### **✅ Implemented Features**

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Theme Engine | ✅ Complete | `web-app/` | CSS custom properties, dynamic switching |
| Theme Profiles | ✅ Complete | Settings Panel | Dark Pro, Light Compliance, Terminal Retro, Midnight Dev, High Contrast |
| Theme Customizer | ✅ Complete | F1 / Settings | Color pickers, typography controls |
| Shortcut Matrix | ✅ Complete | Settings Overlay | View/override all keyboard shortcuts |
| Shortcut Override | ✅ Complete | Settings Overlay | Per-user key binding customization |
| Reset to Defaults | ✅ Complete | Settings Overlay | One-click restore for shortcuts |
| Manifest Integration | ✅ Complete | Export | Shortcuts included in config manifest |
| Telemetry Tracking | ✅ Complete | Background | Shortcut usage analytics |

### **📸 Screenshots**

#### **Shortcut Configuration Panel**

![Shortcut Matrix Settings](./screenshots/shortcut-matrix-settings.png)

*The Shortcut Matrix overlay allows users to view and customize all keyboard shortcuts. Features include:*
- **Themed table layout** matching current dashboard theme
- **Override column** for custom key bindings
- **Reset to Defaults** button for quick restore
- **Global/Panel scope indicators** for each shortcut
- **Conflict detection** prevents duplicate bindings

#### **Theme Selector with Shortcut Integration**

![Theme Selector](./screenshots/theme-selector.png)

*Quick theme switching via Alt+1-4 hotkeys or dropdown selector*

#### **Keyboard Help Overlay**

![Keyboard Help](./screenshots/keyboard-help.png)

*Press `?` to display the visual shortcut reference card*

### **🚀 Usage Instructions**

#### **Accessing Shortcut Settings**

1. **Via Menu**: Click Settings icon → Keyboard Shortcuts
2. **Via Hotkey**: Press `Ctrl+,` (settings) then navigate to Shortcuts tab
3. **Via Help**: Press `?` to see reference card, click "Customize" link

#### **Overriding a Shortcut**

1. Open Shortcut Settings panel
2. Find the action you want to customize
3. Click the **[Edit]** button next to the shortcut
4. Press your desired key combination
5. If no conflict, the new binding is saved automatically
6. Click **[Reset]** to restore default for that action

#### **Exporting Shortcut Configuration**

Shortcuts are automatically included when exporting manifests:

```bash
# Export includes shortcuts in ui.shortcuts section
Ctrl+Shift+M  →  Export Manifest (JSON)
Ctrl+Shift+E  →  Export CSV (data only)
```

### **📁 File Structure**

```text
web-app/
├── src/
│   ├── contexts/
│   │   ├── ThemeContext.tsx      # Theme state management
│   │   └── ShortcutContext.tsx   # Shortcut state management
│   ├── hooks/
│   │   ├── useTheme.ts           # Theme hook
│   │   └── useShortcuts.ts       # Shortcut hook with scope filtering
│   ├── components/
│   │   ├── ThemeSelector.tsx     # Theme dropdown/picker
│   │   ├── ThemeCustomizer.tsx   # Full theme editor panel
│   │   ├── ShortcutSettings.tsx  # Shortcut matrix overlay
│   │   └── KeyboardHelp.tsx      # ? key reference card
│   ├── config/
│   │   ├── themes.ts             # Predefined theme profiles
│   │   └── shortcuts.ts          # Default shortcut definitions
│   └── utils/
│       ├── themeUtils.ts         # CSS variable generation
│       └── shortcutUtils.ts      # Key string parsing, conflict detection
├── public/
│   └── themes/                   # Exportable theme JSON files
└── docs/
    └── screenshots/              # UI screenshots for documentation
        ├── shortcut-matrix-settings.png
        ├── theme-selector.png
        └── keyboard-help.png
```

### **⚙️ Configuration**

#### **Environment Variables**

```env
# Theme System
VITE_DEFAULT_THEME=dark-pro
VITE_THEME_STORAGE=indexeddb
VITE_THEME_SYNC_ENABLED=false

# Shortcut System
VITE_SHORTCUTS_ENABLED=true
VITE_SHORTCUT_CONFLICT_MODE=warn
VITE_SHORTCUT_TELEMETRY=true
```

#### **Runtime Configuration**

```typescript
// Initialize with custom defaults
const config: DashboardConfig = {
  theme: {
    default: 'dark-pro',
    allowCustom: true,
    syncAcrossTabs: true
  },
  shortcuts: {
    enabled: true,
    conflictResolution: 'warn', // 'warn' | 'block' | 'override'
    trackUsage: true,
    globalScope: ['theme.*', 'nav.*', 'data.*'],
    disabledInInputs: true // Don't trigger shortcuts when typing
  }
};
```

### **🔄 Changelog**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial theme system implementation |
| 1.1.0 | 2026-01-21 | Added keyboard shortcut system |
| 1.1.1 | 2026-01-21 | Added shortcut matrix settings overlay |
| 1.1.2 | 2026-01-21 | Added manifest integration for shortcuts |
| 1.2.0 | 2026-01-21 | Added RSS feed integration |

---

## **📰 RSS Feed Integration**

### **Overview**

The dashboard includes integrated RSS feed support for:
1. **External Feeds** - Fetch and display industry news (e.g., Bun.sh updates)
2. **Dashboard Feed** - Generate our own RSS feed for dashboard updates and announcements
3. **Feed Caching** - Reduce external API calls with intelligent caching

### **Supported Feeds**

| Feed | URL | Update Frequency | Purpose |
|------|-----|------------------|---------|
| **Bun.sh Blog** | `https://bun.sh/rss.xml` | Daily | Runtime updates, releases, tutorials |
| **Dashboard Updates** | `/api/rss` | Real-time | Dashboard announcements, feature releases |
| **Custom Feed** | Configurable | Configurable | User-defined RSS sources |

### **RSS Feed Service Architecture**

#### **Core Functions**

```typescript
// Parse RSS XML into structured feed
parseRSSXML(xml: string): RSSFeed

// Fetch external RSS feed with caching
fetchRSSFeed(url: string, options?: { cacheTTL?: number; forceRefresh?: boolean }): Promise<RSSFeed>

// Convenience function for Bun.sh feed
fetchBunFeed(forceRefresh?: boolean): Promise<RSSFeed>

// Add item to dashboard RSS feed
addDashboardNewsItem(item: Omit<RSSItem, 'pubDate' | 'guid'>): void

// Generate dashboard RSS XML
generateDashboardRSS(): string
```

#### **Data Structures**

```typescript
interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
  author?: string;
  category?: string[];
}

interface RSSFeed {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
  items: RSSItem[];
}
```

### **API Endpoints**

#### **GET /api/rss**
Returns dashboard's own RSS feed (XML format)

```bash
curl http://localhost:3000/api/rss
```

**Response**: RSS 2.0 XML with dashboard updates

#### **GET /api/rss/bun**
Fetches and proxies Bun.sh RSS feed

```bash
curl http://localhost:3000/api/rss/bun
```

**Response**: Bun.sh RSS feed (cached for 5 minutes)

#### **GET /api/rss/external?url=<feed-url>**
Fetch any external RSS feed

```bash
curl "http://localhost:3000/api/rss/external?url=https://example.com/feed.xml"
```

**Query Parameters**:
- `url` (required) - RSS feed URL
- `refresh` (optional) - Force refresh cache (`true`/`false`)

#### **POST /api/rss/add**
Add news item to dashboard RSS feed

```bash
curl -X POST http://localhost:3000/api/rss/add \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Feature Released",
    "link": "http://localhost:3000/features/new",
    "description": "Keyboard shortcuts now support custom themes",
    "author": "Dashboard Team",
    "category": ["features", "shortcuts"]
  }'
```

### **Frontend Integration**

#### **RSS Feed Panel Component**

```typescript
interface RSSPanelProps {
  feedUrl: string;
  maxItems?: number;
  refreshInterval?: number;
  theme?: ThemeProfile;
}

function RSSPanel({ feedUrl, maxItems = 10, refreshInterval = 300000 }: RSSPanelProps) {
  const [feed, setFeed] = useState<RSSFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        const response = await fetch(feedUrl);
        const xml = await response.text();
        const parsed = parseRSSXML(xml);
        setFeed(parsed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, refreshInterval);
    return () => clearInterval(interval);
  }, [feedUrl, refreshInterval]);

  if (loading) return <div>Loading feed...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!feed) return <div>No feed data</div>;

  return (
    <div className="rss-panel">
      <h3>{feed.title}</h3>
      <ul className="feed-items">
        {feed.items.slice(0, maxItems).map((item) => (
          <li key={item.guid || item.link} className="feed-item">
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              <strong>{item.title}</strong>
            </a>
            <p>{item.description}</p>
            <small>{new Date(item.pubDate).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### **Dashboard Integration**

Add RSS panels to dashboard tabs:

```typescript
// In Dashboard component
<Tab label="📰 News" icon="rss">
  <div className="news-grid">
    <RSSPanel
      feedUrl="/api/rss/bun"
      maxItems={5}
      theme={currentTheme}
    />
    <RSSPanel
      feedUrl="/api/rss"
      maxItems={5}
      theme={currentTheme}
    />
  </div>
</Tab>
```

### **Caching Strategy**

| Feed Type | Cache TTL | Refresh Trigger |
|-----------|-----------|-----------------|
| External feeds | 5 minutes | Manual refresh or TTL expiry |
| Dashboard feed | Real-time | New items added via API |
| Custom feeds | Configurable | User-defined |

### **CLI RSS Reader**

```bash
# View Bun.sh feed in terminal
bun run rss-reader --feed bun

# View dashboard feed
bun run rss-reader --feed dashboard

# View custom feed
bun run rss-reader --feed https://example.com/feed.xml

# Watch feed for updates (auto-refresh every 5 minutes)
bun run rss-reader --feed bun --watch
```

### **Configuration**

#### **Environment Variables**

```env
# RSS Feed Configuration
RSS_CACHE_TTL=300000              # Cache TTL in milliseconds (default: 5 min)
RSS_MAX_ITEMS=50                  # Max items to store in dashboard feed
RSS_EXTERNAL_FEEDS=true           # Enable external feed fetching
RSS_DASHBOARD_FEED=true           # Enable dashboard RSS generation
RSS_REFRESH_INTERVAL=300000       # Auto-refresh interval for UI
```

#### **Runtime Configuration**

```typescript
const rssConfig = {
  feeds: [
    {
      id: 'bun',
      url: 'https://bun.sh/rss.xml',
      title: 'Bun.sh Updates',
      cacheTTL: 5 * 60 * 1000,
      enabled: true,
    },
    {
      id: 'dashboard',
      url: '/api/rss',
      title: 'Dashboard Updates',
      cacheTTL: 0, // No caching for dashboard feed
      enabled: true,
    },
  ],
  maxItemsPerFeed: 10,
  refreshInterval: 5 * 60 * 1000,
  displayInDashboard: true,
};
```

### **Error Handling**

| Error | Handling |
|-------|----------|
| Network timeout | Show cached version or error message |
| Invalid XML | Log error, skip malformed items |
| Feed not found (404) | Show user-friendly error |
| Rate limiting (429) | Increase cache TTL, retry later |

### **Security Considerations**

- **CORS**: RSS endpoints respect CORS policies
- **XSS Prevention**: HTML content in feed items is sanitized
- **URL Validation**: External feed URLs are validated before fetching
- **Rate Limiting**: Implement rate limits on `/api/rss/external` endpoint
- **Content Security**: Feed content is escaped before rendering

---

## **NEW: Topics, Tags & Metadata System**

### **Metadata Architecture**

Every dashboard item, theme, shortcut, and content piece supports comprehensive metadata:

```typescript
interface ContentMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  created: number;
  updated: number;
  published: boolean;

  // Topics & Tags
  topics: string[];
  tags: string[];
  categories: string[];

  // SEO & Discovery
  slug: string;
  keywords: string[];
  summary: string;
  thumbnail?: string;

  // Publishing
  visibility: 'private' | 'internal' | 'public';
  license: string;
  repository?: string;

  // Metrics
  views: number;
  downloads: number;
  rating: number;
  reviews: number;

  // Relations
  relatedItems: string[];
  dependencies: string[];

  // Custom
  customFields?: Record<string, any>;
}
```

### **Topics Taxonomy**

```typescript
const TOPICS = {
  // Development
  'development': { icon: '💻', color: '#3B82F6', description: 'Development tools and practices' },
  'testing': { icon: '🧪', color: '#8B5CF6', description: 'Testing frameworks and strategies' },
  'debugging': { icon: '🐛', color: '#EF4444', description: 'Debugging and troubleshooting' },
  'performance': { icon: '⚡', color: '#F59E0B', description: 'Performance optimization' },

  // Blockchain
  'lightning-network': { icon: '⚡', color: '#F7931A', description: 'Lightning Network integration' },
  'bitcoin': { icon: '₿', color: '#F7931A', description: 'Bitcoin protocol' },
  'blockchain': { icon: '🔗', color: '#0EA5E9', description: 'Blockchain technology' },
  'crypto': { icon: '🪙', color: '#10B981', description: 'Cryptocurrency' },

  // Security
  'security': { icon: '🔒', color: '#EF4444', description: 'Security and compliance' },
  'authentication': { icon: '🔐', color: '#8B5CF6', description: 'Auth mechanisms' },
  'anomaly-detection': { icon: '⚠️', color: '#F59E0B', description: 'Anomaly detection' },

  // DevOps
  'deployment': { icon: '🚀', color: '#10B981', description: 'Deployment strategies' },
  'infrastructure': { icon: '🏗️', color: '#6366F1', description: 'Infrastructure setup' },
  'monitoring': { icon: '📊', color: '#0EA5E9', description: 'Monitoring and observability' },

  // Documentation
  'documentation': { icon: '📚', color: '#8B5CF6', description: 'Documentation' },
  'tutorial': { icon: '🎓', color: '#3B82F6', description: 'Tutorials and guides' },
  'api': { icon: '🔌', color: '#6366F1', description: 'API documentation' },
};
```

### **Tag Management**

```typescript
interface TagDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  itemCount: number;
  relatedTags: string[];
  metadata?: Record<string, any>;
}

class TagManager {
  private tags = new Map<string, TagDefinition>();

  createTag(tag: Omit<TagDefinition, 'id' | 'itemCount'>): TagDefinition {
    const id = `tag_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tagDef: TagDefinition = { ...tag, id, itemCount: 0 };
    this.tags.set(id, tagDef);
    return tagDef;
  }

  getTags(category?: string): TagDefinition[] {
    return Array.from(this.tags.values())
      .filter(t => !category || t.category === category)
      .sort((a, b) => b.itemCount - a.itemCount);
  }

  searchTags(query: string): TagDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.tags.values())
      .filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  getRelatedTags(tagId: string): TagDefinition[] {
    const tag = this.tags.get(tagId);
    if (!tag) return [];
    return tag.relatedTags
      .map(id => this.tags.get(id))
      .filter((t): t is TagDefinition => !!t);
  }
}
```

---

## **NEW: R2 Bucket Integration**

### **Cloudflare R2 Storage Setup**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucketName: string;
  endpoint: string;
}

class R2Storage {
  private client: S3Client;
  private bucketName: string;

  constructor(config: R2Config) {
    this.bucketName = config.bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.accessKeySecret,
      },
    });
  }

  async uploadFile(key: string, body: Buffer, metadata?: Record<string, string>): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      Metadata: metadata,
      ContentType: this.getContentType(key),
    });

    await this.client.send(command);
    return `https://${this.bucketName}.r2.dev/${key}`;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    return Buffer.from(await response.Body?.transformToByteArray() || []);
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    return (response.Contents || []).map(obj => obj.Key || '');
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  private getContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'gif': 'image/gif',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
    };
    return types[ext || ''] || 'application/octet-stream';
  }
}
```

### **R2 Usage Examples**

```typescript
// Upload theme profile
const themeBuffer = Buffer.from(JSON.stringify(themeProfile));
const themeUrl = await r2.uploadFile(
  `themes/${themeProfile.id}.json`,
  themeBuffer,
  { author: themeProfile.author, version: themeProfile.version }
);

// Upload dashboard export
const exportBuffer = Buffer.from(JSON.stringify(dashboardData));
const exportUrl = await r2.uploadFile(
  `exports/${Date.now()}_dashboard.json`,
  exportBuffer,
  { type: 'dashboard-export', user: userId }
);

// List all published themes
const themeFiles = await r2.listFiles('themes/');

// Download theme
const themeData = await r2.downloadFile(`themes/${themeId}.json`);
```

---

## **NEW: Private Registry Integration**

### **Package Registry Architecture**

```typescript
interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository: string;
  homepage?: string;
  bugs?: string;
  keywords: string[];

  // Registry specific
  registryUrl: string;
  tarball: string;
  shasum: string;
  integrity: string;

  // Dependencies
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;

  // Metadata
  dist: {
    tarball: string;
    shasum: string;
    integrity: string;
    fileCount: number;
    unpackedSize: number;
  };

  // Publishing
  publishedAt: number;
  publishedBy: string;
  downloads: number;
  rating: number;
}

class PrivateRegistry {
  private packages = new Map<string, PackageMetadata[]>();
  private r2Storage: R2Storage;

  constructor(r2Storage: R2Storage) {
    this.r2Storage = r2Storage;
  }

  async publishPackage(
    name: string,
    version: string,
    tarball: Buffer,
    metadata: Omit<PackageMetadata, 'dist' | 'publishedAt' | 'publishedBy'>
  ): Promise<PackageMetadata> {
    const shasum = this.calculateShasum(tarball);
    const integrity = this.calculateIntegrity(tarball);

    // Upload tarball to R2
    const tarballUrl = await this.r2Storage.uploadFile(
      `packages/${name}/${version}.tgz`,
      tarball,
      { name, version, shasum }
    );

    const packageMeta: PackageMetadata = {
      ...metadata,
      registryUrl: `https://registry.duoplus.dev/${name}`,
      tarball: tarballUrl,
      shasum,
      integrity,
      dist: {
        tarball: tarballUrl,
        shasum,
        integrity,
        fileCount: 0,
        unpackedSize: tarball.length,
      },
      publishedAt: Date.now(),
      publishedBy: metadata.author,
      downloads: 0,
      rating: 0,
    };

    if (!this.packages.has(name)) {
      this.packages.set(name, []);
    }
    this.packages.get(name)!.push(packageMeta);

    return packageMeta;
  }

  async getPackage(name: string, version?: string): Promise<PackageMetadata | null> {
    const versions = this.packages.get(name);
    if (!versions) return null;

    if (!version) {
      return versions[versions.length - 1];
    }

    return versions.find(v => v.version === version) || null;
  }

  async listPackages(author?: string): Promise<PackageMetadata[]> {
    const all = Array.from(this.packages.values()).flat();
    return author ? all.filter(p => p.author === author) : all;
  }

  private calculateShasum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(buffer).digest('hex');
  }

  private calculateIntegrity(buffer: Buffer): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha512').update(buffer).digest('base64');
    return `sha512-${hash}`;
  }
}
```

---

## **NEW: Publishing System**

### **Content Publishing Pipeline**

```typescript
interface PublishingConfig {
  title: string;
  description: string;
  content: string;
  author: string;
  topics: string[];
  tags: string[];
  visibility: 'draft' | 'scheduled' | 'published' | 'archived';
  publishedAt?: number;
  scheduledFor?: number;
  metadata: ContentMetadata;
}

class PublishingService {
  private r2Storage: R2Storage;
  private registry: PrivateRegistry;

  constructor(r2Storage: R2Storage, registry: PrivateRegistry) {
    this.r2Storage = r2Storage;
    this.registry = registry;
  }

  async publishContent(config: PublishingConfig): Promise<string> {
    // Validate content
    this.validateContent(config);

    // Generate slug
    const slug = this.generateSlug(config.title);

    // Create publishing metadata
    const publishMeta = {
      ...config.metadata,
      slug,
      published: true,
      publishedAt: config.publishedAt || Date.now(),
      visibility: config.visibility,
    };

    // Upload to R2
    const contentBuffer = Buffer.from(JSON.stringify({
      ...config,
      metadata: publishMeta,
    }));

    const contentUrl = await this.r2Storage.uploadFile(
      `content/${publishMeta.id}/${slug}.json`,
      contentBuffer,
      {
        author: config.author,
        topics: config.topics.join(','),
        tags: config.tags.join(','),
        visibility: config.visibility,
      }
    );

    return contentUrl;
  }

  async schedulePublishing(config: PublishingConfig, scheduledFor: number): Promise<string> {
    config.visibility = 'scheduled';
    config.scheduledFor = scheduledFor;

    // Store in scheduled queue
    const scheduleBuffer = Buffer.from(JSON.stringify(config));
    return await this.r2Storage.uploadFile(
      `scheduled/${scheduledFor}_${config.metadata.id}.json`,
      scheduleBuffer
    );
  }

  async publishTheme(theme: any): Promise<string> {
    const themeBuffer = Buffer.from(JSON.stringify(theme));
    return await this.r2Storage.uploadFile(
      `themes/${theme.id}/${theme.version}.json`,
      themeBuffer,
      {
        author: theme.author,
        category: theme.category,
        version: theme.version,
      }
    );
  }

  async publishPackage(name: string, version: string, tarball: Buffer, metadata: any): Promise<PackageMetadata> {
    return await this.registry.publishPackage(name, version, tarball, metadata);
  }

  private validateContent(config: PublishingConfig): void {
    if (!config.title || config.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (!config.content || config.content.trim().length === 0) {
      throw new Error('Content is required');
    }
    if (!config.author || config.author.trim().length === 0) {
      throw new Error('Author is required');
    }
    if (config.topics.length === 0) {
      throw new Error('At least one topic is required');
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
```

---

## **NEW: Blog System**

### **Blog Architecture**

```typescript
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  content: string;
  excerpt: string;
  thumbnail?: string;

  // Metadata
  topics: string[];
  tags: string[];
  categories: string[];
  keywords: string[];

  // Publishing
  status: 'draft' | 'published' | 'archived';
  publishedAt: number;
  updatedAt: number;
  scheduledFor?: number;

  // Engagement
  views: number;
  likes: number;
  comments: number;
  shares: number;

  // SEO
  metaDescription: string;
  metaImage?: string;
  canonicalUrl?: string;

  // Relations
  relatedPosts: string[];
  series?: string;
  seriesOrder?: number;
}

class BlogService {
  private posts = new Map<string, BlogPost>();
  private r2Storage: R2Storage;
  private tagManager: TagManager;

  constructor(r2Storage: R2Storage, tagManager: TagManager) {
    this.r2Storage = r2Storage;
    this.tagManager = tagManager;
  }

  async createPost(post: Omit<BlogPost, 'id' | 'slug' | 'views' | 'likes' | 'comments' | 'shares'>): Promise<BlogPost> {
    const id = `post_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const slug = this.generateSlug(post.title);

    const blogPost: BlogPost = {
      ...post,
      id,
      slug,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    this.posts.set(id, blogPost);

    // Upload to R2
    await this.r2Storage.uploadFile(
      `blog/${slug}.json`,
      Buffer.from(JSON.stringify(blogPost)),
      {
        author: post.author,
        topics: post.topics.join(','),
        tags: post.tags.join(','),
        status: post.status,
      }
    );

    return blogPost;
  }

  async publishPost(postId: string): Promise<BlogPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    post.status = 'published';
    post.publishedAt = Date.now();

    // Update R2
    await this.r2Storage.uploadFile(
      `blog/${post.slug}.json`,
      Buffer.from(JSON.stringify(post))
    );

    return post;
  }

  async getPost(slugOrId: string): Promise<BlogPost | null> {
    // Try by ID first
    let post = this.posts.get(slugOrId);
    if (post) return post;

    // Try by slug
    for (const p of this.posts.values()) {
      if (p.slug === slugOrId) {
        p.views++;
        return p;
      }
    }

    return null;
  }

  async listPosts(filters?: {
    author?: string;
    topic?: string;
    tag?: string;
    status?: string;
    limit?: number;
  }): Promise<BlogPost[]> {
    let posts = Array.from(this.posts.values());

    if (filters?.author) {
      posts = posts.filter(p => p.author === filters.author);
    }
    if (filters?.topic) {
      posts = posts.filter(p => p.topics.includes(filters.topic!));
    }
    if (filters?.tag) {
      posts = posts.filter(p => p.tags.includes(filters.tag!));
    }
    if (filters?.status) {
      posts = posts.filter(p => p.status === filters.status);
    }

    posts.sort((a, b) => b.publishedAt - a.publishedAt);

    return posts.slice(0, filters?.limit || 10);
  }

  async searchPosts(query: string): Promise<BlogPost[]> {
    const q = query.toLowerCase();
    return Array.from(this.posts.values())
      .filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.keywords.some(k => k.toLowerCase().includes(q))
      )
      .sort((a, b) => b.views - a.views);
  }

  async getRelatedPosts(postId: string, limit = 5): Promise<BlogPost[]> {
    const post = this.posts.get(postId);
    if (!post) return [];

    const related = Array.from(this.posts.values())
      .filter(p => p.id !== postId && p.status === 'published')
      .map(p => ({
        post: p,
        score: this.calculateRelevance(post, p),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.post);

    return related;
  }

  private calculateRelevance(post1: BlogPost, post2: BlogPost): number {
    let score = 0;

    // Topic matches
    const topicMatches = post1.topics.filter(t => post2.topics.includes(t)).length;
    score += topicMatches * 3;

    // Tag matches
    const tagMatches = post1.tags.filter(t => post2.tags.includes(t)).length;
    score += tagMatches * 2;

    // Category matches
    const categoryMatches = post1.categories.filter(c => post2.categories.includes(c)).length;
    score += categoryMatches * 2;

    // Keyword matches
    const keywordMatches = post1.keywords.filter(k => post2.keywords.includes(k)).length;
    score += keywordMatches;

    return score;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
```

### **Blog RSS Feed Generation**

```typescript
async function generateBlogRSSFeed(blogService: BlogService): Promise<string> {
  const posts = await blogService.listPosts({ status: 'published', limit: 20 });

  const rssItems = posts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://blog.duoplus.dev/${post.slug}</link>
      <guid>https://blog.duoplus.dev/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author>${escapeXml(post.author)}</author>
      <description>${escapeXml(post.excerpt)}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <category>${post.topics.join(', ')}</category>
      ${post.thumbnail ? `<image><url>${post.thumbnail}</url></image>` : ''}
    </item>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>DuoPlus Blog</title>
    <link>https://blog.duoplus.dev</link>
    <description>Latest updates and insights from DuoPlus</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;
}
```

---

## **NEW: Integrated Dashboard Features**

### **Dashboard Metadata Panel**

```typescript
interface DashboardMetadataPanel {
  // Topics & Tags
  topicsSection: {
    selectedTopics: string[];
    availableTopics: TopicDefinition[];
    onTopicSelect: (topic: string) => void;
    onTopicRemove: (topic: string) => void;
  };

  tagsSection: {
    selectedTags: string[];
    suggestedTags: TagDefinition[];
    onTagAdd: (tag: string) => void;
    onTagRemove: (tag: string) => void;
    onCreateTag: (tag: TagDefinition) => void;
  };

  // Publishing
  publishingSection: {
    visibility: 'private' | 'internal' | 'public';
    status: 'draft' | 'scheduled' | 'published';
    scheduledFor?: number;
    onPublish: () => void;
    onSchedule: (date: number) => void;
    onArchive: () => void;
  };

  // Storage
  storageSection: {
    r2Enabled: boolean;
    registryEnabled: boolean;
    onUploadToR2: () => void;
    onPublishToRegistry: () => void;
  };

  // Blog
  blogSection: {
    isBlogPost: boolean;
    blogMetadata?: BlogPost;
    onCreateBlogPost: () => void;
    onEditBlogPost: () => void;
  };
}
```

### **API Endpoints**

```typescript
// Topics
GET /api/topics                    // List all topics
GET /api/topics/:id               // Get topic details
POST /api/topics                  // Create topic (admin)
PUT /api/topics/:id               // Update topic (admin)

// Tags
GET /api/tags                     // List all tags
GET /api/tags/search?q=query      // Search tags
POST /api/tags                    // Create tag
PUT /api/tags/:id                 // Update tag
DELETE /api/tags/:id              // Delete tag

// Metadata
GET /api/metadata/:id             // Get item metadata
PUT /api/metadata/:id             // Update metadata
GET /api/metadata/search?q=query  // Search by metadata

// R2 Storage
POST /api/storage/upload          // Upload file to R2
GET /api/storage/:key             // Download file from R2
DELETE /api/storage/:key          // Delete file from R2
GET /api/storage/list?prefix=     // List files in R2

// Private Registry
GET /api/registry/packages        // List packages
GET /api/registry/packages/:name  // Get package info
POST /api/registry/publish        // Publish package
GET /api/registry/packages/:name/:version  // Get specific version

// Publishing
POST /api/publish                 // Publish content
POST /api/publish/schedule        // Schedule publishing
GET /api/publish/drafts           // List drafts
GET /api/publish/scheduled        // List scheduled

// Blog
GET /api/blog                     // List blog posts
GET /api/blog/:slug               // Get blog post
POST /api/blog                    // Create blog post
PUT /api/blog/:id                 // Update blog post
DELETE /api/blog/:id              // Delete blog post
GET /api/blog/search?q=query      // Search blog posts
GET /api/blog/related/:id         // Get related posts
GET /api/blog/rss                 // Blog RSS feed
```

---

This comprehensive system transforms your dashboard into a **complete content management, publishing, and distribution platform** with integrated storage, registry, and blog capabilities.