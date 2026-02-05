/**
 * Pattern Registry - Enhanced Pattern Type Definitions
 * 
 * Comprehensive registry of all pattern types with metadata including
 * grading, priority, category, content type, and protocol type.
 */

import type {
  PatternType,
  PatternGrading,
  PatternPriority,
  PatternCategory,
  ContentType,
  ProtocolType,
  PatternMetadata
} from './types';
import { PATTERN_PROPERTIES, CROSS_REFERENCE_MATRIX, SUBMARKETS, TENSION_ANALYSIS } from './pattern-matrix';
import {
  PATTERN_PROPERTIES_DETAILED,
  PATTERN_KEY_METRICS,
  CROSS_REFERENCE_DETAILS,
  RESOLUTION_STRATEGIES,
  TENSIONS_DETAILED
} from './pattern-matrix-enhanced';

/**
 * Pattern Registry - Complete metadata for all pattern types
 */
export const PATTERN_REGISTRY: Record<PatternType, PatternMetadata> = {
  betting_frequency: {
    patternType: 'betting_frequency',
    domain: 'Sports Betting',
    detectionMethod: 'Analyzes bet frequency over time (e.g., bets/hr)',
    typicalUseCase: 'Identify high-frequency syndicates',
    confidenceRange: { min: 0.6, max: 0.9 },
    grading: 'Medium',
    priority: 'P3',
    category: 'Analytical',
    contentType: 'Time-series Data',
    protocolType: 'N/A (Internal Logic)',
    description: 'Tracks betting frequency patterns to identify syndicates with unusually high activity rates',
    implementationNotes: 'Requires time-series analysis of bet timestamps. Calculate bets per hour/day.',
    properties: PATTERN_PROPERTIES['betting_frequency'],
    crossReferences: CROSS_REFERENCE_MATRIX['betting_frequency'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('betting_frequency')).map(s => s.name),
    tension: 'High frequency may conflict with platform rate limits & data acquisition speed',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['betting_frequency'],
    keyMetrics: PATTERN_KEY_METRICS['betting_frequency'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['betting_frequency'],
    resolutionStrategy: RESOLUTION_STRATEGIES['betting_frequency'],
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['betting_frequency'],
    keyMetrics: PATTERN_KEY_METRICS['betting_frequency'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['betting_frequency'],
    resolutionStrategy: RESOLUTION_STRATEGIES['betting_frequency']
  },

  game_selection: {
    patternType: 'game_selection',
    domain: 'Sports Betting',
    detectionMethod: 'Tracks preferred games (e.g., top N games, specific leagues)',
    typicalUseCase: 'Detect team/league loyalty or specialization',
    confidenceRange: { min: 0.7, max: 0.9 },
    grading: 'Medium',
    priority: 'P3',
    category: 'Analytical',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies games or leagues that a syndicate consistently bets on',
    implementationNotes: 'Group bets by game identifier, calculate frequency distribution.',
    properties: PATTERN_PROPERTIES['game_selection'],
    crossReferences: CROSS_REFERENCE_MATRIX['game_selection'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('game_selection')).map(s => s.name),
    tension: 'Specialization may limit diversification and expose blind spots',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['game_selection'],
    keyMetrics: PATTERN_KEY_METRICS['game_selection'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['game_selection'],
    resolutionStrategy: RESOLUTION_STRATEGIES['game_selection']},

  bet_type_preference: {
    patternType: 'bet_type_preference',
    domain: 'Sports Betting',
    detectionMethod: 'Analyzes bet type distribution (e.g., moneyline, spread, total)',
    typicalUseCase: 'Identify betting style or strategy',
    confidenceRange: { min: 0.8, max: 0.9 },
    grading: 'Medium',
    priority: 'P3',
    category: 'Analytical',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Determines preferred bet types (moneyline, spread, totals, etc.)',
    implementationNotes: 'Count bet types, calculate percentage distribution, identify dominant type.',
    properties: PATTERN_PROPERTIES['bet_type_preference'],
    crossReferences: CROSS_REFERENCE_MATRIX['bet_type_preference'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('bet_type_preference')).map(s => s.name),
    tension: 'Preference rigidity may reduce adaptability to market changes',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['bet_type_preference'],
    keyMetrics: PATTERN_KEY_METRICS['bet_type_preference'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['bet_type_preference'],
    resolutionStrategy: RESOLUTION_STRATEGIES['bet_type_preference']},

  real_time_frequency: {
    patternType: 'real_time_frequency',
    domain: 'Real-Time',
    detectionMethod: 'Monitors recent betting activity (e.g., bets/min last 5 min)',
    typicalUseCase: 'Detect rapid betting patterns / emerging interest',
    confidenceRange: { min: 0.6, max: 0.8 },
    grading: 'High',
    priority: 'P2',
    category: 'Real-Time',
    contentType: 'Streaming Data',
    protocolType: 'WebSocket',
    description: 'Real-time detection of high-frequency betting activity within short time windows',
    implementationNotes: 'Requires streaming data processing. Use sliding window (e.g., 5-minute windows).',
    properties: PATTERN_PROPERTIES['real_time_frequency'],
    crossReferences: CROSS_REFERENCE_MATRIX['real_time_frequency'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('real_time_frequency')).map(s => s.name),
    tension: 'Real-time processing requires significant compute & low-latency infrastructure',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['real_time_frequency'],
    keyMetrics: PATTERN_KEY_METRICS['real_time_frequency'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['real_time_frequency'],
    resolutionStrategy: RESOLUTION_STRATEGIES['real_time_frequency']},

  real_time_game_selection: {
    patternType: 'real_time_game_selection',
    domain: 'Real-Time',
    detectionMethod: 'Analyzes recent game preferences (e.g., trending games)',
    typicalUseCase: 'Identify emerging favorites or market shifts',
    confidenceRange: { min: 0.6, max: 0.8 },
    grading: 'High',
    priority: 'P2',
    category: 'Real-Time',
    contentType: 'Streaming Data',
    protocolType: 'WebSocket',
    description: 'Detects shifts in game selection preferences in real-time',
    implementationNotes: 'Process recent bets (last N minutes), identify trending games.',
    properties: PATTERN_PROPERTIES['real_time_game_selection'],
    crossReferences: CROSS_REFERENCE_MATRIX['real_time_game_selection'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('real_time_game_selection')).map(s => s.name),
    tension: 'Rapid shifts may create false positives or noise from small volumes',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['real_time_game_selection'],
    keyMetrics: PATTERN_KEY_METRICS['real_time_game_selection'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['real_time_game_selection'],
    resolutionStrategy: RESOLUTION_STRATEGIES['real_time_game_selection']},

  team_loyalty: {
    patternType: 'team_loyalty',
    domain: 'Sports Betting',
    detectionMethod: 'Extracts team from game name & tracks betting frequency',
    typicalUseCase: 'Detect favorite teams / bias',
    confidenceRange: { min: 0.8, max: 0.9 },
    grading: 'Medium',
    priority: 'P3',
    category: 'Analytical',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies teams that a syndicate consistently bets on or against',
    implementationNotes: 'Parse game names to extract team identifiers, track betting frequency per team.',
    properties: PATTERN_PROPERTIES['team_loyalty'],
    crossReferences: CROSS_REFERENCE_MATRIX['team_loyalty'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('team_loyalty')).map(s => s.name),
    tension: 'Loyalty bias may lead to predictable and exploitable betting patterns',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['team_loyalty'],
    keyMetrics: PATTERN_KEY_METRICS['team_loyalty'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['team_loyalty'],
    resolutionStrategy: RESOLUTION_STRATEGIES['team_loyalty']},

  late_night_betting: {
    patternType: 'late_night_betting',
    domain: 'Sports Betting',
    detectionMethod: 'Analyzes betting time patterns (e.g., 10 PM - 4 AM local time)',
    typicalUseCase: 'Identify late-night activity / specific regional behavior',
    confidenceRange: { min: 0.7, max: 0.8 },
    grading: 'Low',
    priority: 'P4',
    category: 'Analytical',
    contentType: 'Time-series Data',
    protocolType: 'N/A (Internal Logic)',
    description: 'Detects betting activity during late-night hours, potentially indicating regional patterns',
    implementationNotes: 'Convert timestamps to local time, analyze hour-of-day distribution.',
    properties: PATTERN_PROPERTIES['late_night_betting'],
    crossReferences: CROSS_REFERENCE_MATRIX['late_night_betting'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('late_night_betting')).map(s => s.name),
    tension: 'Low volume may reduce statistical significance and increase noise',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['late_night_betting'],
    keyMetrics: PATTERN_KEY_METRICS['late_night_betting'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['late_night_betting'],
    resolutionStrategy: RESOLUTION_STRATEGIES['late_night_betting']},

  large_volume_trader: {
    patternType: 'large_volume_trader',
    domain: 'Financial',
    detectionMethod: 'Detects single/aggregated large bet amounts (e.g., >$10k)',
    typicalUseCase: 'Identify institutional players or significant market movers',
    confidenceRange: { min: 0.9, max: 0.95 },
    grading: 'Critical',
    priority: 'P1',
    category: 'Financial',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies syndicates placing unusually large bets, indicating institutional or high-value players',
    implementationNotes: 'Track bet amounts, identify thresholds (e.g., >$10k), aggregate by syndicate.',
    properties: PATTERN_PROPERTIES['large_volume_trader'],
    crossReferences: CROSS_REFERENCE_MATRIX['large_volume_trader'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('large_volume_trader')).map(s => s.name),
    tension: 'Large bets may move markets against syndicate\'s own positions',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['large_volume_trader'],
    keyMetrics: PATTERN_KEY_METRICS['large_volume_trader'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['large_volume_trader'],
    resolutionStrategy: RESOLUTION_STRATEGIES['large_volume_trader']},

  market_hours_trading: {
    patternType: 'market_hours_trading',
    domain: 'Financial',
    detectionMethod: 'Analyzes betting time patterns during specific market hours',
    typicalUseCase: 'Detect activity during peak market liquidity',
    confidenceRange: { min: 0.8, max: 0.85 },
    grading: 'Low',
    priority: 'P4',
    category: 'Financial',
    contentType: 'Time-series Data',
    protocolType: 'N/A (Internal Logic)',
    description: 'Detects betting activity aligned with financial market trading hours',
    implementationNotes: 'Map timestamps to market hours (e.g., 9:30 AM - 4:00 PM EST), analyze correlation.',
    properties: PATTERN_PROPERTIES['market_hours_trading'],
    crossReferences: CROSS_REFERENCE_MATRIX['market_hours_trading'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('market_hours_trading')).map(s => s.name),
    tension: 'Optimal betting times may vary and require constant re-evaluation',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['market_hours_trading'],
    keyMetrics: PATTERN_KEY_METRICS['market_hours_trading'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['market_hours_trading'],
    resolutionStrategy: RESOLUTION_STRATEGIES['market_hours_trading']},

  correlated_trading: {
    patternType: 'correlated_trading',
    domain: 'Financial',
    detectionMethod: 'Finds correlated bet movements/volumes across assets/games',
    typicalUseCase: 'Identify coordinated trading or shared information',
    confidenceRange: { min: 0.85, max: 0.9 },
    grading: 'High',
    priority: 'P2',
    category: 'Financial',
    contentType: 'Time-series Data',
    protocolType: 'DB',
    description: 'Detects coordinated betting patterns across multiple games/assets, indicating shared information or coordination',
    implementationNotes: 'Calculate correlation coefficients between bet volumes/timing across different games.',
    properties: PATTERN_PROPERTIES['correlated_trading'],
    crossReferences: CROSS_REFERENCE_MATRIX['correlated_trading'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('correlated_trading')).map(s => s.name),
    tension: 'Correlation doesn\'t imply causation; false positives from unrelated events',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['correlated_trading'],
    keyMetrics: PATTERN_KEY_METRICS['correlated_trading'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['correlated_trading'],
    resolutionStrategy: RESOLUTION_STRATEGIES['correlated_trading']
  },

  high_risk_betting: {
    patternType: 'high_risk_betting',
    domain: 'Fraud Detection',
    detectionMethod: 'Detects high amount + high odds combination',
    typicalUseCase: 'Identify potential fraud attempts / unusual risk profiles',
    confidenceRange: { min: 0.9, max: 0.95 },
    grading: 'Critical',
    priority: 'P1',
    category: 'Fraud',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies bets with both high amounts and high odds, potentially indicating fraud or money laundering',
    implementationNotes: 'Set thresholds (e.g., amount >$5k AND odds >5.0), flag combinations.',
    properties: PATTERN_PROPERTIES['high_risk_betting'],
    crossReferences: CROSS_REFERENCE_MATRIX['high_risk_betting'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('high_risk_betting')).map(s => s.name),
    tension: 'High risk may indicate fraud or genuinely sophisticated, high-edge strategy',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['high_risk_betting'],
    keyMetrics: PATTERN_KEY_METRICS['high_risk_betting'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['high_risk_betting'],
    resolutionStrategy: RESOLUTION_STRATEGIES['high_risk_betting']},

  rapid_betting: {
    patternType: 'rapid_betting',
    domain: 'Fraud Detection',
    detectionMethod: 'Monitors betting speed (e.g., >5 bets/sec, >10 bets/min)',
    typicalUseCase: 'Detect bot activity or account compromise',
    confidenceRange: { min: 0.85, max: 0.9 },
    grading: 'Critical',
    priority: 'P1',
    category: 'Fraud',
    contentType: 'Streaming Data',
    protocolType: 'WebSocket',
    description: 'Detects abnormally fast betting patterns, indicating automated bots or compromised accounts',
    implementationNotes: 'Real-time monitoring required. Calculate bets per second/minute, flag thresholds.',
    properties: PATTERN_PROPERTIES['rapid_betting'],
    crossReferences: CROSS_REFERENCE_MATRIX['rapid_betting'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('rapid_betting')).map(s => s.name),
    tension: 'Speed may be legitimate for arbitrage or indicate manipulation',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['rapid_betting'],
    keyMetrics: PATTERN_KEY_METRICS['rapid_betting'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['rapid_betting'],
    resolutionStrategy: RESOLUTION_STRATEGIES['rapid_betting']},

  consistent_losing: {
    patternType: 'consistent_losing',
    domain: 'Fraud Detection',
    detectionMethod: 'Analyzes long-term results (e.g., >70% loss rate over 100 bets)',
    typicalUseCase: 'Identify potential money laundering or account abuse',
    confidenceRange: { min: 0.9, max: 0.95 },
    grading: 'Critical',
    priority: 'P1',
    category: 'Fraud',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies syndicates with consistently high loss rates, potentially indicating money laundering',
    implementationNotes: 'Calculate win/loss ratio over time window (e.g., last 100 bets), flag high loss rates.',
    properties: PATTERN_PROPERTIES['consistent_losing'],
    crossReferences: CROSS_REFERENCE_MATRIX['consistent_losing'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('consistent_losing')).map(s => s.name),
    tension: 'Consistent losses may be a deliberate strategy for money laundering or simply bad betting',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['consistent_losing'],
    keyMetrics: PATTERN_KEY_METRICS['consistent_losing'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['consistent_losing'],
    resolutionStrategy: RESOLUTION_STRATEGIES['consistent_losing']},

  aggressive_betting: {
    patternType: 'aggressive_betting',
    domain: 'Competitive',
    detectionMethod: 'Analyzes bet amounts & frequency (e.g., average bet size, bet cadence)',
    typicalUseCase: 'Identify aggressive players or strategies',
    confidenceRange: { min: 0.8, max: 0.85 },
    grading: 'Medium',
    priority: 'P3',
    category: 'Competitive',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies syndicates with aggressive betting patterns (high amounts, high frequency)',
    implementationNotes: 'Calculate average bet size and frequency, compare to baseline, identify outliers.',
    properties: PATTERN_PROPERTIES['aggressive_betting'],
    crossReferences: CROSS_REFERENCE_MATRIX['aggressive_betting'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('aggressive_betting')).map(s => s.name),
    tension: 'Aggression may create market impact or trigger risk flags',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['aggressive_betting'],
    keyMetrics: PATTERN_KEY_METRICS['aggressive_betting'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['aggressive_betting'],
    resolutionStrategy: RESOLUTION_STRATEGIES['aggressive_betting']},

  high_risk_tolerance: {
    patternType: 'high_risk_tolerance',
    domain: 'Competitive',
    detectionMethod: 'Analyzes odds preferences (e.g., avg odds bet, % of high odds)',
    typicalUseCase: 'Identify risk-tolerant players/syndicates',
    confidenceRange: { min: 0.9, max: 0.9 },
    grading: 'Medium',
    priority: 'P3',
    category: 'Competitive',
    contentType: 'Structured Data',
    protocolType: 'DB',
    description: 'Identifies syndicates that consistently bet on high-odds outcomes, indicating high risk tolerance',
    implementationNotes: 'Calculate average odds, percentage of bets above threshold (e.g., odds >3.0).',
    properties: PATTERN_PROPERTIES['high_risk_tolerance'],
    crossReferences: CROSS_REFERENCE_MATRIX['high_risk_tolerance'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('high_risk_tolerance')).map(s => s.name),
    tension: 'High tolerance may indicate sophisticated strategy or poor risk management',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['high_risk_tolerance'],
    keyMetrics: PATTERN_KEY_METRICS['high_risk_tolerance'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['high_risk_tolerance'],
    resolutionStrategy: RESOLUTION_STRATEGIES['high_risk_tolerance']},

  consistent_risk_profile: {
    patternType: 'consistent_risk_profile',
    domain: 'Competitive',
    detectionMethod: 'Analyzes consistency of odds and bet amount preferences',
    typicalUseCase: 'Identify stable player strategy or behavioral shift',
    confidenceRange: { min: 0.85, max: 0.9 },
    grading: 'Low',
    priority: 'P4',
    category: 'Competitive',
    contentType: 'Time-series Data',
    protocolType: 'DB',
    description: 'Tracks consistency of risk preferences over time, detecting strategy changes or stability',
    implementationNotes: 'Calculate variance in odds and bet amounts over time windows, identify shifts.',
    properties: PATTERN_PROPERTIES['consistent_risk_profile'],
    crossReferences: CROSS_REFERENCE_MATRIX['consistent_risk_profile'],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes('consistent_risk_profile')).map(s => s.name),
    tension: 'Stability may indicate predictability or a successful, covert strategy',
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['consistent_risk_profile'],
    keyMetrics: PATTERN_KEY_METRICS['consistent_risk_profile'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['consistent_risk_profile'],
    resolutionStrategy: RESOLUTION_STRATEGIES['consistent_risk_profile']}
};

/**
 * Get pattern metadata by type
 */
export function getPatternMetadata(patternType: PatternType): PatternMetadata {
  return PATTERN_REGISTRY[patternType];
}

/**
 * Get patterns by grading
 */
export function getPatternsByGrading(grading: PatternGrading): PatternMetadata[] {
  return Object.values(PATTERN_REGISTRY).filter(p => p.grading === grading);
}

/**
 * Get patterns by priority
 */
export function getPatternsByPriority(priority: PatternPriority): PatternMetadata[] {
  return Object.values(PATTERN_REGISTRY).filter(p => p.priority === priority);
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: PatternCategory): PatternMetadata[] {
  return Object.values(PATTERN_REGISTRY).filter(p => p.category === category);
}

/**
 * Get critical patterns (P1 priority)
 */
export function getCriticalPatterns(): PatternMetadata[] {
  return Object.values(PATTERN_REGISTRY).filter(p => 
    p.priority === 'P1' || p.grading === 'Critical'
  );
}

/**
 * Get real-time patterns
 */
export function getRealTimePatterns(): PatternMetadata[] {
  return Object.values(PATTERN_REGISTRY).filter(p => 
    p.category === 'Real-Time' || p.contentType === 'Streaming Data'
  );
}

/**
 * Get fraud detection patterns
 */
export function getFraudPatterns(): PatternMetadata[] {
  return Object.values(PATTERN_REGISTRY).filter(p => p.category === 'Fraud');
}

/**
 * Validate pattern type
 */
export function isValidPatternType(type: string): type is PatternType {
  return type in PATTERN_REGISTRY;
}

/**
 * Get implementation priority order (P1 -> P2 -> P3 -> P4)
 */
export function getPatternsByImplementationOrder(): PatternMetadata[] {
  const priorityOrder: PatternPriority[] = ['P1', 'P2', 'P3', 'P4'];
  const result: PatternMetadata[] = [];

  for (const priority of priorityOrder) {
    const patterns = getPatternsByPriority(priority);
    // Sort by grading within each priority (Critical -> High -> Medium -> Low)
    const gradingOrder: PatternGrading[] = ['Critical', 'High', 'Medium', 'Low'];
    patterns.sort((a, b) => {
      const aIndex = gradingOrder.indexOf(a.grading);
      const bIndex = gradingOrder.indexOf(b.grading);
      return aIndex - bIndex;
    });
    result.push(...patterns);
  }

  return result;
}

/**
 * Get enhanced pattern metadata with cross-references, submarkets, and tension analysis
 */
export function getEnhancedPatternMetadata(patternType: PatternType): PatternMetadata & {
  properties: string[];
  crossReferences: PatternType[];
  submarkets: string[];
  tension: import('./pattern-matrix').TensionAnalysis;
} {
  const base = PATTERN_REGISTRY[patternType];
  
  return {
    ...base,
    properties: PATTERN_PROPERTIES[patternType] || [],
    crossReferences: CROSS_REFERENCE_MATRIX[patternType] || [],
    submarkets: SUBMARKETS.filter(s => s.patterns.includes(patternType)).map(s => s.name),
    tension: TENSION_ANALYSIS[patternType] || {
      patternType,
      tensions: []
    }
  };
}
