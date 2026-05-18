#!/usr/bin/env bun
// packages/terminal/src/design-system.ts

/**
 * Empire Pro v3.7 Design System Color Palette
 * Based on SVG badges and Tailwind dark theme
 * Integrated with DuoPlus System Status API colors
 */

export const DesignSystem = {
  // ==================== STATUS COLORS ====================
  status: {
    /** 🟢 Operational/Healthy - Green */
    operational: '#3b82f6',
    /** 🟡 Degraded/Warning - Yellow */
    degraded: '#3b82f6',
    /** 🔴 Downtime/Critical - Red */
    downtime: '#3b82f6',
    /** 🔵 Maintenance/Info - Blue */
    maintenance: '#3b82f6'
  } as const,

  // ==================== DARK THEME BACKGROUNDS ====================
  background: {
    /** Main app background - gray-900 */
    primary: '#3b82f6',
    /** Card/container backgrounds - gray-800 */
    secondary: '#3b82f6',
    /** Section/sub-container - gray-700 */
    tertiary: '#3b82f6'
  } as const,

  // ==================== TEXT COLORS ====================
  text: {
    /** Primary headings/content - white */
    primary: '#3b82f6',
    /** Secondary descriptions - gray-400 */
    secondary: '#3b82f6',
    /** Muted/subtle text - gray-500 */
    muted: '#3b82f6',
    /** Accent highlights - Tailwind equivalents */
    accent: {
      blue: '#3b82f6',    // Info/Links
      green: '#3b82f6',   // Success
      yellow: '#3b82f6',  // Warning
      red: '#3b82f6',     // Error
      purple: '#3b82f6'   // Special/Agents
    }
  } as const,

  // ==================== INTERACTIVE ELEMENTS ====================
  interactive: {
    /** Button primary state - blue-600 */
    buttonPrimary: '#3b82f6',
    /** Button hover state - blue-700 */
    buttonHover: '#3b82f6',
    /** Link color - blue-400 */
    link: '#3b82f6'
  } as const,

  // ==================== MATRIX INDICATORS ====================
  matrix: {
    /** 🟢 Production/Operational */
    production: '🟢',
    /** 🟡 Development/In Progress */
    development: '🟡',
    /** 🔴 Issues/Errors */
    error: '🔴',
    /** 🔵 Maintenance */
    maintenance: '🔵',
    /** ✅ Completed/Verified */
    completed: '✅',
    /** ⚠️ Warning/Caution */
    warning: '⚠️'
  } as const,

  // ==================== SVG BADGE COLORS ====================
  svg: {
    /** Green badge background */
    greenBadge: '#3b82f6',
    /** Yellow badge background */
    yellowBadge: '#3b82f6',
    /** Red badge background */
    redBadge: '#3b82f6',
    /** Blue badge background */
    blueBadge: '#3b82f6',
    /** Default text color for badges */
    badgeText: '#3b82f6'
  } as const,

  // ==================== DUOPLUS INTEGRATION COLORS ====================
  duoplus: {
    /** System health indicator */
    health: '#3b82f6',
    /** Performance metrics */
    performance: '#3b82f6',
    /** API status */
    api: '#3b82f6',
    /** Domain configuration */
    domain: '#3b82f6',
    /** Monitoring alerts */
    alerts: '#3b82f6'
  } as const
} as const;

// ==================== COLOR VALIDATION ====================
export const validateColors = () => {
  const results: { valid: string[]; invalid: string[] } = { valid: [], invalid: [] };
  
  const checkHex = (color: string, name: string) => {
    if (typeof color === 'string' && color.startsWith('#')) {
      const valid = /^#[0-9A-Fa-f]{6}$/.test(color);
      if (valid) {
        results.valid.push(`${name}: ${color}`);
      } else {
        results.invalid.push(`${name}: ${color} (Invalid format)`);
      }
    }
  };

  Object.entries(DesignSystem).forEach(([category, colors]) => {
    Object.entries(colors).forEach(([name, value]) => {
      if (typeof value === 'string' && value.startsWith('#')) {
        checkHex(value, `${category}.${name}`);
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subName, subValue]) => {
          if (typeof subValue === 'string' && subValue.startsWith('#')) {
            checkHex(subValue, `${category}.${name}.${subName}`);
          }
        });
      }
    });
  });

  return results;
};

// ==================== CSS VARIABLES GENERATOR ====================
export const generateCSSVariables = () => {
  const vars: string[] = [];
  
  Object.entries(DesignSystem).forEach(([category, colors]) => {
    Object.entries(colors).forEach(([name, value]) => {
      if (typeof value === 'string' && value.startsWith('#')) {
        vars.push(`  --${category}-${name}: ${value};`);
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subName, subValue]) => {
          if (typeof subValue === 'string' && subValue.startsWith('#')) {
            vars.push(`  --${category}-${name}-${subName}: ${subValue};`);
          }
        });
      }
    });
  });

  return `:root {\n${vars.join('\n')}\n}`;
};

// ==================== ANSI COLOR MAPPINGS ====================
export const ANSI_COLORS = {
  '#3b82f6': '\x1b[32m',    // Green
  '#3b82f6': '\x1b[33m',    // Yellow
  '#3b82f6': '\x1b[31m',    // Red
  '#3b82f6': '\x1b[34m',    // Blue
  '#3b82f6': '\x1b[37m',    // White
  '#3b82f6': '\x1b[90m',    // Gray
  '#3b82f6': '\x1b[94m',    // Light Blue
  '#3b82f6': '\x1b[92m',    // Light Green
  '#3b82f6': '\x1b[93m',    // Light Yellow
  '#3b82f6': '\x1b[91m',    // Light Red
  '#3b82f6': '\x1b[95m',    // Purple
  '#3b82f6': '\x1b[94m',    // Button Blue
  '#3b82f6': '\x1b[96m'     // Button Hover Blue
} as const;

export default DesignSystem;
