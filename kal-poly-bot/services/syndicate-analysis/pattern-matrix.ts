#!/usr/bin/env bun
/**
 * Pattern Matrix Analysis
 * 
 * Comprehensive matrix analysis including:
 * - Pattern properties
 * - Cross-references between patterns
 * - Submarket mappings
 * - Tension analysis
 */

import type {
  PatternType,
  PatternMetadata,
  PatternCrossReference,
  Submarket,
  TensionAnalysis
} from './types';

// =============================================================================
// PATTERN PROPERTIES
// =============================================================================

export const PATTERN_PROPERTIES: Record<PatternType, string[]> = {
  betting_frequency: ['Time-series data', 'Historical analysis', 'Batch processing'],
  game_selection: ['Structured data', 'Categorical analysis', 'Team/league focus'],
  bet_type_preference: ['Structured data', 'Categorical distribution', 'Strategy analysis'],
  real_time_frequency: ['Streaming data', 'Low-latency processing', 'Windowed analysis'],
  real_time_game_selection: ['Streaming data', 'Trend detection', 'Emerging patterns'],
  team_loyalty: ['Structured data', 'Categorical tracking', 'Bias detection'],
  late_night_betting: ['Time-series data', 'Temporal analysis', 'Regional behavior'],
  large_volume_trader: ['Structured data', 'Threshold detection', 'Institutional analysis'],
  market_hours_trading: ['Time-series data', 'Temporal analysis', 'Liquidity focus'],
  correlated_trading: ['Time-series data', 'Relationship analysis', 'Network detection'],
  high_risk_betting: ['Structured data', 'Threshold analysis', 'Fraud detection'],
  rapid_betting: ['Streaming data', 'Speed analysis', 'Bot detection'],
  consistent_losing: ['Structured data', 'Result analysis', 'Anomaly detection'],
  aggressive_betting: ['Structured data', 'Amount analysis', 'Strategy profiling'],
  high_risk_tolerance: ['Structured data', 'Odds analysis', 'Risk profiling'],
  consistent_risk_profile: ['Time-series data', 'Stability analysis', 'Behavioral tracking']
};

// =============================================================================
// CROSS-REFERENCE MATRIX
// =============================================================================

export const CROSS_REFERENCE_MATRIX: Record<PatternType, PatternType[]> = {
  betting_frequency: [
    'game_selection',
    'bet_type_preference',
    'team_loyalty',
    'real_time_frequency',
    'aggressive_betting',
    'rapid_betting'
  ],
  game_selection: [
    'betting_frequency',
    'team_loyalty',
    'aggressive_betting',
    'real_time_game_selection',
    'correlated_trading'
  ],
  bet_type_preference: [
    'betting_frequency',
    'aggressive_betting',
    'high_risk_tolerance',
    'consistent_risk_profile'
  ],
  real_time_frequency: [
    'real_time_game_selection',
    'rapid_betting',
    'correlated_trading',
    'betting_frequency'
  ],
  real_time_game_selection: [
    'real_time_frequency',
    'correlated_trading',
    'game_selection'
  ],
  team_loyalty: [
    'game_selection',
    'betting_frequency'
  ],
  late_night_betting: [
    'market_hours_trading'
  ],
  large_volume_trader: [
    'correlated_trading',
    'high_risk_betting',
    'aggressive_betting'
  ],
  market_hours_trading: [
    'late_night_betting',
    'correlated_trading'
  ],
  correlated_trading: [
    'large_volume_trader',
    'real_time_frequency',
    'market_hours_trading'
  ],
  high_risk_betting: [
    'rapid_betting',
    'consistent_losing',
    'high_risk_tolerance',
    'large_volume_trader'
  ],
  rapid_betting: [
    'high_risk_betting',
    'real_time_frequency',
    'consistent_losing'
  ],
  consistent_losing: [
    'high_risk_betting',
    'rapid_betting'
  ],
  aggressive_betting: [
    'bet_type_preference',
    'high_risk_tolerance',
    'large_volume_trader',
    'game_selection'
  ],
  high_risk_tolerance: [
    'aggressive_betting',
    'bet_type_preference',
    'high_risk_betting',
    'consistent_risk_profile'
  ],
  consistent_risk_profile: [
    'aggressive_betting',
    'high_risk_tolerance'
  ]
};

// =============================================================================
// SUBMARKETS
// =============================================================================

export const SUBMARKETS: Submarket[] = [
  {
    id: 'sports-team',
    name: 'Team Sports',
    category: 'Sports Betting',
    patterns: ['game_selection', 'team_loyalty', 'betting_frequency'],
    description: 'NFL, NBA, soccer, baseball - team-based sports betting'
  },
  {
    id: 'sports-individual',
    name: 'Individual Sports',
    category: 'Sports Betting',
    patterns: ['game_selection', 'betting_frequency', 'bet_type_preference'],
    description: 'Tennis, golf, boxing - individual competitor betting'
  },
  {
    id: 'sports-esports',
    name: 'Esports',
    category: 'Sports Betting',
    patterns: ['real_time_frequency', 'real_time_game_selection', 'rapid_betting'],
    description: 'League of Legends, CS:GO, Dota 2 - competitive gaming'
  },
  {
    id: 'sports-horse-racing',
    name: 'Horse Racing',
    category: 'Sports Betting',
    patterns: ['betting_frequency', 'bet_type_preference', 'late_night_betting'],
    description: 'Thoroughbred, harness, greyhound racing'
  },
  {
    id: 'sports-specialty',
    name: 'Specialty Markets',
    category: 'Sports Betting',
    patterns: ['bet_type_preference', 'high_risk_tolerance', 'aggressive_betting'],
    description: 'Prop bets, futures, parlays - specialized betting markets'
  },
  {
    id: 'financial-equities',
    name: 'Equities',
    category: 'Financial',
    patterns: ['market_hours_trading', 'correlated_trading', 'large_volume_trader'],
    description: 'Stock trading, index futures'
  },
  {
    id: 'financial-derivatives',
    name: 'Derivatives',
    category: 'Financial',
    patterns: ['correlated_trading', 'large_volume_trader', 'market_hours_trading'],
    description: 'Options, futures, swaps'
  },
  {
    id: 'financial-crypto',
    name: 'Cryptocurrency',
    category: 'Financial',
    patterns: ['correlated_trading', 'rapid_betting', 'real_time_frequency'],
    description: 'Bitcoin, Ethereum, altcoins'
  },
  {
    id: 'financial-commodities',
    name: 'Commodities',
    category: 'Financial',
    patterns: ['market_hours_trading', 'correlated_trading'],
    description: 'Oil, gold, agricultural products'
  },
  {
    id: 'financial-fx',
    name: 'FX',
    category: 'Financial',
    patterns: ['market_hours_trading', 'correlated_trading', 'real_time_frequency'],
    description: 'Currency pairs, forex trading'
  },
  {
    id: 'fraud-account-takeover',
    name: 'Account Takeover',
    category: 'Fraud Detection',
    patterns: ['rapid_betting', 'high_risk_betting', 'consistent_losing'],
    description: 'Compromised betting accounts'
  },
  {
    id: 'fraud-money-laundering',
    name: 'Money Laundering',
    category: 'Fraud Detection',
    patterns: ['consistent_losing', 'high_risk_betting', 'large_volume_trader'],
    description: 'Consistent losing patterns indicating money laundering'
  },
  {
    id: 'fraud-bot-activity',
    name: 'Bot Activity',
    category: 'Fraud Detection',
    patterns: ['rapid_betting', 'real_time_frequency', 'consistent_risk_profile'],
    description: 'Rapid betting, automated systems'
  },
  {
    id: 'fraud-syndicate-coordination',
    name: 'Syndicate Coordination',
    category: 'Fraud Detection',
    patterns: ['correlated_trading', 'large_volume_trader', 'real_time_frequency'],
    description: 'Correlated trading across accounts'
  },
  {
    id: 'fraud-market-manipulation',
    name: 'Market Manipulation',
    category: 'Fraud Detection',
    patterns: ['large_volume_trader', 'correlated_trading', 'rapid_betting'],
    description: 'Large volume trading to move odds'
  },
  {
    id: 'competitive-high-stakes',
    name: 'High-Stakes Betting',
    category: 'Competitive',
    patterns: ['aggressive_betting', 'large_volume_trader', 'high_risk_tolerance'],
    description: 'Professional syndicates, high-stakes betting'
  },
  {
    id: 'competitive-professional',
    name: 'Professional Betting',
    category: 'Competitive',
    patterns: ['consistent_risk_profile', 'bet_type_preference', 'game_selection'],
    description: 'Long-term syndicates, professional betting'
  }
];

// =============================================================================
// TENSION ANALYSIS
// =============================================================================

export const TENSION_ANALYSIS: Record<PatternType, TensionAnalysis> = {
  betting_frequency: {
    patternType: 'betting_frequency',
    tensions: [
      {
        type: 'Resource',
        description: 'High frequency may conflict with platform limits',
        impact: 'medium'
      },
      {
        type: 'Technical',
        description: 'Batch processing vs real-time requirements',
        impact: 'medium'
      }
    ]
  },
  game_selection: {
    patternType: 'game_selection',
    tensions: [
      {
        type: 'Strategy',
        description: 'Specialization may limit diversification opportunities',
        impact: 'medium'
      },
      {
        type: 'Market',
        description: 'Focus on specific games may reduce market coverage',
        impact: 'low'
      }
    ]
  },
  bet_type_preference: {
    patternType: 'bet_type_preference',
    tensions: [
      {
        type: 'Strategy',
        description: 'Preference rigidity may reduce adaptability',
        impact: 'medium'
      }
    ]
  },
  real_time_frequency: {
    patternType: 'real_time_frequency',
    tensions: [
      {
        type: 'Resource',
        description: 'Real-time processing requires significant resources',
        impact: 'high'
      },
      {
        type: 'Technical',
        description: 'Streaming vs batch processing infrastructure',
        impact: 'high'
      }
    ]
  },
  real_time_game_selection: {
    patternType: 'real_time_game_selection',
    tensions: [
      {
        type: 'Technical',
        description: 'Rapid shifts may create false positives',
        impact: 'medium'
      },
      {
        type: 'Strategy',
        description: 'Real-time detection vs historical accuracy',
        impact: 'medium'
      }
    ]
  },
  team_loyalty: {
    patternType: 'team_loyalty',
    tensions: [
      {
        type: 'Strategy',
        description: 'Loyalty bias may create predictable patterns',
        impact: 'medium'
      }
    ]
  },
  late_night_betting: {
    patternType: 'late_night_betting',
    tensions: [
      {
        type: 'Market',
        description: 'Low volume may reduce statistical significance',
        impact: 'low'
      }
    ]
  },
  large_volume_trader: {
    patternType: 'large_volume_trader',
    tensions: [
      {
        type: 'Market',
        description: 'Large bets may move markets, creating tension',
        impact: 'high'
      },
      {
        type: 'Resource',
        description: 'Institutional analysis requires significant resources',
        impact: 'medium'
      }
    ]
  },
  market_hours_trading: {
    patternType: 'market_hours_trading',
    tensions: [
      {
        type: 'Market',
        description: 'Market hours may not align with optimal betting times',
        impact: 'low'
      }
    ]
  },
  correlated_trading: {
    patternType: 'correlated_trading',
    tensions: [
      {
        type: 'Technical',
        description: 'Correlation doesn\'t imply causation, false positives',
        impact: 'high'
      },
      {
        type: 'Resource',
        description: 'Relationship analysis requires significant computation',
        impact: 'medium'
      }
    ]
  },
  high_risk_betting: {
    patternType: 'high_risk_betting',
    tensions: [
      {
        type: 'Strategy',
        description: 'High risk may indicate fraud or sophisticated strategy',
        impact: 'high'
      },
      {
        type: 'Market',
        description: 'Detection challenges between fraud and legitimate strategy',
        impact: 'high'
      }
    ]
  },
  rapid_betting: {
    patternType: 'rapid_betting',
    tensions: [
      {
        type: 'Technical',
        description: 'Speed may be legitimate or indicate manipulation',
        impact: 'high'
      },
      {
        type: 'Resource',
        description: 'Speed vs accuracy tradeoff in detection',
        impact: 'medium'
      }
    ]
  },
  consistent_losing: {
    patternType: 'consistent_losing',
    tensions: [
      {
        type: 'Strategy',
        description: 'Consistent losses may be strategy or exploitation',
        impact: 'high'
      },
      {
        type: 'Market',
        description: 'Distinguishing between poor strategy and money laundering',
        impact: 'high'
      }
    ]
  },
  aggressive_betting: {
    patternType: 'aggressive_betting',
    tensions: [
      {
        type: 'Market',
        description: 'Aggression may create market impact',
        impact: 'medium'
      }
    ]
  },
  high_risk_tolerance: {
    patternType: 'high_risk_tolerance',
    tensions: [
      {
        type: 'Strategy',
        description: 'High tolerance may indicate sophisticated strategy',
        impact: 'medium'
      }
    ]
  },
  consistent_risk_profile: {
    patternType: 'consistent_risk_profile',
    tensions: [
      {
        type: 'Strategy',
        description: 'Stability may indicate predictability',
        impact: 'low'
      }
    ]
  }
};

export function getCrossReferences(patternType: PatternType): PatternType[] {
  return CROSS_REFERENCE_MATRIX[patternType] || [];
}

export function areCrossReferenced(pattern1: PatternType, pattern2: PatternType): boolean {
  const refs = CROSS_REFERENCE_MATRIX[pattern1] || [];
  return refs.includes(pattern2);
}

export function getReverseCrossReferences(patternType: PatternType): PatternType[] {
  const reverseRefs: PatternType[] = [];
  Object.entries(CROSS_REFERENCE_MATRIX).forEach(([pattern, refs]) => {
    if (refs.includes(patternType)) {
      reverseRefs.push(pattern as PatternType);
    }
  });
  return reverseRefs;
}

export function getSubmarketsForPattern(patternType: PatternType): Submarket[] {
  return SUBMARKETS.filter(submarket => 
    submarket.patterns.includes(patternType)
  );
}

export function getPatternsForSubmarket(submarketId: string): PatternType[] {
  const submarket = SUBMARKETS.find(s => s.id === submarketId);
  return submarket?.patterns || [];
}

export function getSubmarketsByCategory(
  category: 'Sports Betting' | 'Financial' | 'Fraud Detection' | 'Competitive'
): Submarket[] {
  return SUBMARKETS.filter(s => s.category === category);
}

export function getTensionAnalysis(patternType: PatternType): TensionAnalysis {
  return TENSION_ANALYSIS[patternType] || {
    patternType,
    tensions: []
  };
}

export function getTensionsByType(
  tensionType: 'Resource' | 'Strategy' | 'Technical' | 'Market'
): Array<{ patternType: PatternType; tension: TensionAnalysis['tensions'][0] }> {
  return Object.entries(TENSION_ANALYSIS).flatMap(([patternType, analysis]) =>
    analysis.tensions
      .filter(tension => tension.type === tensionType)
      .map(tension => ({
        patternType: patternType as PatternType,
        tension
      }))
  );
}

export function buildCrossReferenceMatrix(): Map<PatternType, Map<PatternType, boolean>> {
  const matrix = new Map<PatternType, Map<PatternType, boolean>>();
  
  const allPatterns = Object.keys(CROSS_REFERENCE_MATRIX) as PatternType[];
  
  allPatterns.forEach(pattern1 => {
    const row = new Map<PatternType, boolean>();
    allPatterns.forEach(pattern2 => {
      row.set(pattern2, areCrossReferenced(pattern1, pattern2));
    });
    matrix.set(pattern1, row);
  });
  
  return matrix;
}

export function getPatternCluster(patternType: PatternType): PatternType[] {
  const cluster = new Set<PatternType>([patternType]);
  const refs = getCrossReferences(patternType);
  
  refs.forEach(ref => {
    cluster.add(ref);
    if (areCrossReferenced(ref, patternType)) {
      cluster.add(ref);
    }
  });
  
  return Array.from(cluster);
}

export function analyzePatternRelationships(): {
  stronglyConnected: Array<{ patterns: PatternType[]; strength: number }>;
  isolated: PatternType[];
  hubs: Array<{ pattern: PatternType; connections: number }>;
} {
  const allPatterns = Object.keys(CROSS_REFERENCE_MATRIX) as PatternType[];
  const connectionCounts = new Map<PatternType, number>();
  
  allPatterns.forEach(pattern => {
    const refs = getCrossReferences(pattern);
    const reverseRefs = getReverseCrossReferences(pattern);
    const totalConnections = new Set([...refs, ...reverseRefs]).size;
    connectionCounts.set(pattern, totalConnections);
  });
  
  const hubs = Array.from(connectionCounts.entries())
    .map(([pattern, count]) => ({ pattern, connections: count }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);
  
  const isolated = Array.from(connectionCounts.entries())
    .filter(([_, count]) => count <= 1)
    .map(([pattern]) => pattern);
  
  const stronglyConnected = allPatterns
    .map(pattern => {
      const cluster = getPatternCluster(pattern);
      if (cluster.length <= 2) {
        return null;
      }
      const strength = cluster.reduce((sum, p) => 
        sum + (connectionCounts.get(p) || 0), 0
      ) / cluster.length;
      return { patterns: cluster, strength };
    })
    .filter((cluster): cluster is { patterns: PatternType[]; strength: number } => cluster !== null)
    .slice(0, 10);
  
  return {
    stronglyConnected,
    isolated,
    hubs
  };
}

