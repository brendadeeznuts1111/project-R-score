#!/usr/bin/env bun
/**
 * 🎨 Theme utilities (stub for testing)
 */

export const FW_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#6b7280',
  accent: '#06b6d4',
} as const;

export function styled(text: string, color: keyof typeof FW_COLORS): string {
  // Return plain text for tests
  return text;
}
