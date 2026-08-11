/**
 * Closed vocabularies shared by operator-research edge and alert surfaces.
 *
 * Edge classification, movement classification, and alert matching overlap,
 * but they are deliberately separate concepts. Keep their named types distinct
 * even where literal values overlap.
 */

export const EDGE_TYPES = ['arbitrage', 'value', 'steam'] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export const MOVEMENT_PATTERNS = ['spike', 'drift', 'reversal'] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

/** Patterns supported by the persisted matching-alert rules. */
export const ALERT_PATTERNS = ['arbitrage', ...MOVEMENT_PATTERNS] as const;
export type AlertPattern = (typeof ALERT_PATTERNS)[number];

/**
 * Patterns supported by the agent-odds simulator rule record.
 * This remains broader than AlertPattern because it can target value and steam
 * edge simulations; the two rule records must not be conflated.
 */
export const SIMULATOR_ALERT_PATTERNS = [...EDGE_TYPES, ...MOVEMENT_PATTERNS] as const;
export type SimulatorAlertPattern = (typeof SIMULATOR_ALERT_PATTERNS)[number];

export const ALERT_CHANNELS = ['ws', 'email', 'telegram'] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export const ALERT_PERIODS = ['prematch', 'live', 'all'] as const;
export type AlertPeriod = (typeof ALERT_PERIODS)[number];

export function isEdgeType(value: string): value is EdgeType {
  return (EDGE_TYPES as readonly string[]).includes(value);
}

export function isMovementPattern(value: string): value is MovementPattern {
  return (MOVEMENT_PATTERNS as readonly string[]).includes(value);
}

export function isAlertChannel(value: string): value is AlertChannel {
  return (ALERT_CHANNELS as readonly string[]).includes(value);
}

export function isAlertPeriod(value: string): value is AlertPeriod {
  return (ALERT_PERIODS as readonly string[]).includes(value);
}

export function isAlertPattern(value: string): value is AlertPattern {
  return (ALERT_PATTERNS as readonly string[]).includes(value);
}

export function isSimulatorAlertPattern(value: string): value is SimulatorAlertPattern {
  return (SIMULATOR_ALERT_PATTERNS as readonly string[]).includes(value);
}
