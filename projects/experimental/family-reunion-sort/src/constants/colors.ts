// Color constants for Venmo QR Code Dispute Handling System
// Following hex-color-consistency rule from user global rules

export const CATEGORY_COLORS = {
  // Enterprise colors for dispute categories
  SECURITY: '#3b82f6',    // Blue for security-related disputes
  R2: '#22c55e',          // Green for R2 compliance issues  
  ISOLATION: '#f59e0b',   // Warning orange for isolation cases
  ZSTD: '#ef4444',        // Error red for Zstd compression disputes
  DEMO: '#1f2937',        // Dark gray for demo/test disputes
} as const;

Object.freeze(CATEGORY_COLORS);

export const STATUS_COLORS = {
  // Status indicator colors following enterprise scheme
  success: '#22c55e',     // Green for successful operations
  warning: '#f59e0b',     // Orange for warning states
  error: '#ef4444',       // Red for error states
  info: '#3b82f6',        // Blue for informational states
  pending: '#6b7280',     // Gray for pending states
  resolved: '#10b981',    // Emerald green for resolved disputes
  escalated: '#f97316',   // Dark orange for escalated cases
} as const;

Object.freeze(STATUS_COLORS);

export const PERFORMANCE_THRESHOLDS = {
  // Performance thresholds for system monitoring
  latency: {
    excellent: 100,      // ms
    good: 200,           // ms
    acceptable: 500,     // ms
    poor: 1000,          // ms
  },
  errorRate: {
    excellent: 0.01,     // 1%
    good: 0.05,          // 5%
    acceptable: 0.1,     // 10%
    poor: 0.2,           // 20%
  },
  resolutionTime: {
    excellent: 28,       // seconds (28-second rule)
    good: 60,            // seconds
    acceptable: 300,      // 5 minutes
    poor: 900,           // 15 minutes
  },
} as const;

Object.freeze(PERFORMANCE_THRESHOLDS);
Object.freeze(PERFORMANCE_THRESHOLDS.latency);
Object.freeze(PERFORMANCE_THRESHOLDS.errorRate);
Object.freeze(PERFORMANCE_THRESHOLDS.resolutionTime);

// Adaptive hooks for future extensions
export const COLOR_EXTENSIONS = {
  // Reserved for future color scheme adaptations
  merchantTiers: {
    enterprise: '#3b82f6',
    premium: '#8b5cf6', 
    standard: '#6b7280',
  },
  disputePriority: {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#22c55e',
  },
  // Hook for duoplus.com integration (purple color scheme)
  duoplus: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    accent: '#7c3aed',
  },
} as const;

Object.freeze(COLOR_EXTENSIONS);
Object.freeze(COLOR_EXTENSIONS.merchantTiers);
Object.freeze(COLOR_EXTENSIONS.disputePriority);
Object.freeze(COLOR_EXTENSIONS.duoplus);

// Utility functions for color operations
export const getColorForStatus = (status: string): string => {
  const statusKey = status.toLowerCase() as keyof typeof STATUS_COLORS;
  return STATUS_COLORS[statusKey] || STATUS_COLORS.info;
};

export const getColorForCategory = (category: string): string => {
  const categoryKey = category.toUpperCase() as keyof typeof CATEGORY_COLORS;
  return CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.DEMO;
};

export const getPerformanceColor = (value: number, type: keyof typeof PERFORMANCE_THRESHOLDS): string => {
  const thresholds = PERFORMANCE_THRESHOLDS[type];
  if (value <= thresholds.excellent) return STATUS_COLORS.success;
  if (value <= thresholds.good) return STATUS_COLORS.info;
  if (value <= thresholds.acceptable) return STATUS_COLORS.warning;
  return STATUS_COLORS.error;
};