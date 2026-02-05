/**
 * Black Swan Alert System
 * Real-time detection and notification for extreme FD events
 */

import type { BlackSwanAlert, MarketFeed, FDResult } from '../types';
import { createQuantumAuditLog } from './quantum-audit';

// FD thresholds for classification
export const FD_THRESHOLDS = {
  blackSwan: 2.5,
  persistent: 1.5,
  random: 1.0,
  meanReversion: 0.5,
};

// Alert storage
const alertStore: BlackSwanAlert[] = [];
const PTY_ENABLED = Bun.env.PTY_ENABLED === 'true';

/**
 * Trigger black swan alert for extreme FD values
 */
export async function triggerBlackSwanAlert(
  gameId: string,
  fd: FDResult,
  cause: string,
): Promise<BlackSwanAlert> {
  const alertId = crypto.randomUUID();

  const alert: BlackSwanAlert = {
    id: alertId,
    gameId,
    fd: fd.fd,
    cause,
    requiresReview: fd.fd > FD_THRESHOLDS.blackSwan,
    timestamp: Date.now(),
  };

  // Store alert
  alertStore.push(alert);

  // Log to console with visual indicator
  console.log(`
┌─────────────────────────────────────────────────────┐
│  🚨 BLACK SWAN DETECTED                              │
├─────────────────────────────────────────────────────┤
│  Game:      ${gameId.padEnd(38)}│
│  FD:        ${fd.fd.toFixed(4).padEnd(38)}│
│  Threshold: ${FD_THRESHOLDS.blackSwan.toFixed(1).padEnd(38)}│
│  Cause:     ${cause.slice(0, 38).padEnd(38)}│
│  Alert ID:  ${alertId.slice(0, 36).padEnd(38)}│
│  Status:    REQUIRES MANUAL REVIEW                   │
└─────────────────────────────────────────────────────┘
`);

  // PTY notification if enabled
  if (PTY_ENABLED) {
    await sendPTYNotification({
      type: 'BLACK_SWAN_DETECTED',
      market: gameId,
      fd: fd.fd,
      glyph: '⟳⟲⟜(▵⊗⥂)',
      threshold: FD_THRESHOLDS.blackSwan,
      timestamp: Date.now(),
    });
  }

  // Create quantum audit entry
  await createQuantumAuditLog({
    type: 'BLACK_SWAN_ALERT',
    alertId,
    gameId,
    fd: fd.fd,
    threshold: FD_THRESHOLDS.blackSwan,
    requiresReview: true,
  });

  return alert;
}

/**
 * Send notification via PTY Terminal (Component #13)
 */
async function sendPTYNotification(message: Record<string, unknown>): Promise<void> {
  // In production, this would connect to the PTY endpoint
  // For now, log to stdout with formatted output
  const formatted = JSON.stringify(message, null, 2);
  console.log(`[PTY] ${formatted}`);
}

/**
 * Get all alerts
 */
export function getAlerts(): BlackSwanAlert[] {
  return [...alertStore];
}

/**
 * Get alerts requiring review
 */
export function getPendingReviews(): BlackSwanAlert[] {
  return alertStore.filter(a => a.requiresReview);
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = alertStore.find(a => a.id === alertId);
  if (alert) {
    alert.requiresReview = false;
    return true;
  }
  return false;
}

/**
 * Clear all alerts
 */
export function clearAlerts(): number {
  const count = alertStore.length;
  alertStore.length = 0;
  return count;
}

/**
 * Classify FD value
 */
export function classifyFD(fd: number): {
  classification: string;
  glyph: string;
  action: string;
} {
  if (fd > FD_THRESHOLDS.blackSwan) {
    return {
      classification: 'BLACK_SWAN',
      glyph: '⟳⟲⟜(▵⊗⥂)',
      action: 'MANUAL_REVIEW_REQUIRED',
    };
  }
  if (fd > FD_THRESHOLDS.persistent) {
    return {
      classification: 'PERSISTENT_TREND',
      glyph: '(▵⊗⥂)⟂⟳',
      action: 'FOLLOW_TREND',
    };
  }
  if (fd > FD_THRESHOLDS.random) {
    return {
      classification: 'RANDOM_WALK',
      glyph: '⥂⟂(▵⟜⟳)',
      action: 'NO_EDGE',
    };
  }
  return {
    classification: 'MEAN_REVERSION',
    glyph: '▵⟂⥂',
    action: 'FADE_MOVEMENT',
  };
}
