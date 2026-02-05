/**
 * Enterprise Semantic Color System - FactoryWager/DuoPlus Integration
 * Enforces consistent hex colors across dashboard with no purple policy
 */

export const ENTERPRISE_COLORS = {
  // Primary enterprise colors (no purple)
  enterprise: '#3b82f6',    // Blue - Primary brand
  success: '#22c55e',      // Green - Success states
  warning: '#f59e0b',      // Amber - Warning states
  error: '#ef4444',        // Red - Error states
  background: '#1f2937',    // Dark gray - Backgrounds
  inspector: '#111827',     // Near black - Inspector tool
  merchant: '#92400e',      // Brown - Merchant sections
  zone: '#6366f1',          // Indigo - Zone indicators
  
  // Extended palette (purple-free)
  primary: '#3b82f6',       // Blue
  secondary: '#64748b',     // Slate gray
  accent: '#06b6d4',       // Cyan
  neutral: '#6b7280',       // Medium gray
  muted: '#f3f4f6',         // Light gray
  
  // Status colors
  active: '#22c55e',        // Green
  inactive: '#94a3b8',      // Slate
  pending: '#f59e0b',       // Amber
  critical: '#dc2626',     // Red
  
  // Data visualization
  chart1: '#3b82f6',        // Blue
  chart2: '#22c55e',        // Green
  chart3: '#f59e0b',        // Amber
  chart4: '#ef4444',        // Red
  chart5: '#06b6d4',        // Cyan
} as const;

export const URL_COLOR_MATRIX = {
  '/dashboard': {
    color: ENTERPRISE_COLORS.enterprise,
    status: '🟢 Active',
    inspector: '✅ Metrics'
  },
  '/qr-onboard': {
    color: ENTERPRISE_COLORS.success,
    status: '🟢 Production',
    inspector: '✅ Device'
  },
  '/inspector': {
    color: ENTERPRISE_COLORS.inspector,
    status: '🟢 Integrated',
    inspector: '🔍 Primary'
  },
  '/inspector/query': {
    color: ENTERPRISE_COLORS.warning,
    status: '🟢 Query Engine',
    inspector: '📊 JQ/JSON'
  },
  '/inspector/redact': {
    color: ENTERPRISE_COLORS.error,
    status: '🟢 PCI/GDPR',
    inspector: '🛡️ Masking'
  },
  '/merchant/*': {
    color: ENTERPRISE_COLORS.merchant,
    status: '🟢 19 Active',
    inspector: '✅ Audit'
  }
} as const;

export class ColorValidator {
  static validateNoPurple(hex: string): boolean {
    // Hex codes that contain purple-like values
    const purpleRanges = [
      { min: 0x800080, max: 0x8B008B }, // Purple variations
      { min: 0x9370DB, max: 0x9400D3 }, // Medium purple
      { min: 0x8A2BE2, max: 0x9932CC }, // Blue violet
      { min: 0x6A0DAD, max: 0x7B68EE }, // Slate blue
    ];
    
    const color = parseInt(hex.replace('#', ''), 16);
    
    return !purpleRanges.some(range => 
      color >= range.min && color <= range.max
    );
  }
  
  static enforceEnterpriseColors(color: string): string {
    const cleanColor = color.replace('#', '').toLowerCase();
    
    // Check if it's a valid enterprise color
    const validColors = Object.values(ENTERPRISE_COLORS);
    const isValid = validColors.some(valid => 
      valid.replace('#', '').toLowerCase() === cleanColor
    );
    
    if (!isValid) {
      console.warn(`⚠️ Non-enterprise color detected: ${color}. Using enterprise blue instead.`);
      return ENTERPRISE_COLORS.enterprise;
    }
    
    if (!this.validateNoPurple(color)) {
      console.warn(`🚫 Purple color detected: ${color}. Using enterprise blue instead.`);
      return ENTERPRISE_COLORS.enterprise;
    }
    
    return color;
  }
  
  static getColorForRoute(route: string): string {
    // Check exact matches first
    if (URL_COLOR_MATRIX[route as keyof typeof URL_COLOR_MATRIX]) {
      return URL_COLOR_MATRIX[route as keyof typeof URL_COLOR_MATRIX].color;
    }
    
    // Check pattern matches
    if (route.startsWith('/merchant/')) {
      return URL_COLOR_MATRIX['/merchant/*'].color;
    }
    if (route.startsWith('/inspector/')) {
      return URL_COLOR_MATRIX['/inspector'].color;
    }
    
    // Default to enterprise blue
    return ENTERPRISE_COLORS.enterprise;
  }
  
  static generateColorReport(): string {
    const report = [
      '🎨 ENTERPRISE COLOR COMPLIANCE REPORT',
      '=====================================',
      '',
      '✅ Semantic Colors (Purple-Free):',
      ...Object.entries(ENTERPRISE_COLORS).map(([name, hex]) => 
        `   ${name}: ${hex} ${this.validateNoPurple(hex) ? '✅' : '🚫'}`
      ),
      '',
      '✅ URL Matrix Colors:',
      ...Object.entries(URL_COLOR_MATRIX).map(([route, config]) => 
        `   ${route}: ${config.color} ${config.status}`
      ),
      '',
      '🚫 Policy: No purple colors allowed in enterprise dashboard',
      '🎯 Target: 100% semantic color compliance'
    ].join('\n');
    
    return report;
  }
}

export class ThemeManager {
  private static currentTheme: 'light' | 'dark' = 'dark';
  
  static setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
  }
  
  static getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
  
  static adaptColors(theme: 'light' | 'dark'): typeof ENTERPRISE_COLORS {
    const baseColors = { ...ENTERPRISE_COLORS };
    
    if (theme === 'light') {
      return {
        ...baseColors,
        background: '#f9fafb',    // Light gray
        inspector: '#374151',     // Darker gray
        neutral: '#9ca3af',       // Lighter gray
        muted: '#e5e7eb',         // Very light gray
      };
    }
    
    return baseColors;
  }
}

// Export singleton instance
export const ColorSystem = {
  colors: ENTERPRISE_COLORS,
  urlMatrix: URL_COLOR_MATRIX,
  validator: ColorValidator,
  theme: ThemeManager
};
