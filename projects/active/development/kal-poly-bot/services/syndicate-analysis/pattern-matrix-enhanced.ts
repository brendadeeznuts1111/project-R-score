#!/usr/bin/env bun

import type { PatternType } from './types';

export const PATTERN_PROPERTIES_DETAILED: Record<PatternType, string> = {
  betting_frequency: 'Time-series, windowed aggregation, historical/batch, user/game/time segmentation',
  game_selection: 'Structured, categorical mapping, unsupervised clustering (game types)',
  bet_type_preference: 'Structured, distribution analysis (ANOVA), behavioral segmentation',
  real_time_frequency: 'Streaming data, low-latency processing, micro-batching, anomaly detection',
  real_time_game_selection: 'Streaming data, trending algorithms, sentiment analysis (optional)',
  team_loyalty: 'Structured, NLP for team extraction, historical tracking, bias quantification',
  late_night_betting: 'Time-series, temporal segmentation, cross-timezone mapping',
  large_volume_trader: 'Structured, threshold detection, statistical outliers (Z-score, IQR)',
  market_hours_trading: 'Time-series, temporal segmentation, liquidity metrics',
  correlated_trading: 'Time-series, statistical correlation (Pearson, Granger), network graph analysis',
  high_risk_betting: 'Structured, combined thresholding (amount * odds), anomaly detection',
  rapid_betting: 'Streaming data, velocity metrics (bets/sec), sequence analysis',
  consistent_losing: 'Structured, win/loss ratio, EV analysis, statistical deviation from random',
  aggressive_betting: 'Structured, average bet size, frequency, position sizing',
  high_risk_tolerance: 'Structured, odds distribution, volatility of bets',
  consistent_risk_profile: 'Time-series, variance analysis (odds, amounts), behavioral drift detection'
};


export const PATTERN_KEY_METRICS: Record<PatternType, string[]> = {
  betting_frequency: ['Bets/hour', 'Bets/day', 'Peak hours'],
  game_selection: ['Top N games', 'League %'],
  bet_type_preference: ['Moneyline %', 'Spread %', 'Prop %'],
  real_time_frequency: ['Bets/second', 'Burst volume'],
  real_time_game_selection: ['Emerging favorite %', 'Odds movement speed'],
  team_loyalty: ['% Bets on favorite team', '% Success on favorite team'],
  late_night_betting: ['% Bets during specific hours', 'Regional %'],
  large_volume_trader: ['Avg Bet Size', 'Total Volume/Game'],
  market_hours_trading: ['% Volume during market hours', 'Volume spikes'],
  correlated_trading: ['Correlation coefficient', 'Syndicate cluster size'],
  high_risk_betting: ['Odds/Amount ratio', 'Payout potential'],
  rapid_betting: ['Bets/second', 'Time between bets'],
  consistent_losing: ['Loss Streak Length', 'P&L over N bets', 'ROI'],
  aggressive_betting: ['Avg Bet Size', '% Bankroll risked'],
  high_risk_tolerance: ['Avg Odds', '% Bets on >X Odds'],
  consistent_risk_profile: ['Std Dev of Odds', 'Coeff of Variation of Bet Size']
};


export const CROSS_REFERENCE_DETAILS: Record<PatternType, Array<{
  pattern: PatternType;
  nature: 'informs' | 'correlates_with' | 'influenced_by' | 'triggers' | 'complements' | 'identifies';
  description?: string;
}>> = {
  betting_frequency: [
    { pattern: 'game_selection', nature: 'informs', description: 'Frequency patterns inform game selection preferences' },
    { pattern: 'bet_type_preference', nature: 'informs', description: 'Betting frequency correlates with bet type preferences' },
    { pattern: 'team_loyalty', nature: 'informs', description: 'Frequency analysis reveals team loyalty patterns' },
    { pattern: 'real_time_frequency', nature: 'correlates_with', description: 'Historical frequency correlates with real-time patterns' },
    { pattern: 'aggressive_betting', nature: 'informs', description: 'High frequency may indicate aggressive betting' },
    { pattern: 'rapid_betting', nature: 'correlates_with', description: 'Very high frequency correlates with rapid betting' }
  ],
  game_selection: [
    { pattern: 'betting_frequency', nature: 'influenced_by', description: 'Game selection influenced by betting frequency' },
    { pattern: 'team_loyalty', nature: 'influenced_by', description: 'Team loyalty influences game selection' },
    { pattern: 'aggressive_betting', nature: 'informs', description: 'Game selection patterns inform aggressive betting behavior' },
    { pattern: 'real_time_game_selection', nature: 'influenced_by', description: 'Historical game selection influences real-time patterns' },
    { pattern: 'correlated_trading', nature: 'informs', description: 'Game selection patterns inform correlated trading detection' }
  ],
  bet_type_preference: [
    { pattern: 'betting_frequency', nature: 'influenced_by', description: 'Bet type preferences influenced by frequency' },
    { pattern: 'aggressive_betting', nature: 'influenced_by', description: 'Aggressive betting influences bet type preferences' },
    { pattern: 'high_risk_tolerance', nature: 'influenced_by', description: 'Risk tolerance influences bet type preferences' },
    { pattern: 'consistent_risk_profile', nature: 'informs', description: 'Bet type preferences inform risk profile consistency' }
  ],
  real_time_frequency: [
    { pattern: 'real_time_game_selection', nature: 'correlates_with', description: 'Real-time frequency correlates with game selection' },
    { pattern: 'rapid_betting', nature: 'correlates_with', description: 'High real-time frequency correlates with rapid betting' },
    { pattern: 'correlated_trading', nature: 'informs', description: 'Real-time frequency patterns inform correlated trading' },
    { pattern: 'betting_frequency', nature: 'correlates_with', description: 'Real-time frequency correlates with historical frequency' }
  ],
  real_time_game_selection: [
    { pattern: 'real_time_frequency', nature: 'influenced_by', description: 'Game selection influenced by real-time frequency' },
    { pattern: 'correlated_trading', nature: 'informs', description: 'Real-time game selection informs correlated trading patterns' },
    { pattern: 'game_selection', nature: 'influenced_by', description: 'Real-time patterns influenced by historical game selection' }
  ],
  team_loyalty: [
    { pattern: 'game_selection', nature: 'influenced_by', description: 'Team loyalty influences game selection' },
    { pattern: 'betting_frequency', nature: 'influenced_by', description: 'Team loyalty influences betting frequency patterns' }
  ],
  late_night_betting: [
    { pattern: 'market_hours_trading', nature: 'complements', description: 'Late-night betting complements market hours trading analysis' }
  ],
  large_volume_trader: [
    { pattern: 'correlated_trading', nature: 'correlates_with', description: 'Large volume trading correlates with correlated trading' },
    { pattern: 'high_risk_betting', nature: 'triggers', description: 'Large volume may trigger high-risk betting flags' },
    { pattern: 'aggressive_betting', nature: 'identifies', description: 'Large volume identifies aggressive betting behavior' }
  ],
  market_hours_trading: [
    { pattern: 'late_night_betting', nature: 'complements', description: 'Market hours trading complements late-night analysis' },
    { pattern: 'correlated_trading', nature: 'correlates_with', description: 'Market hours trading correlates with correlated patterns' }
  ],
  correlated_trading: [
    { pattern: 'large_volume_trader', nature: 'informs', description: 'Correlated trading informs large volume trader detection' },
    { pattern: 'real_time_frequency', nature: 'informs', description: 'Correlated trading informed by real-time frequency' },
    { pattern: 'market_hours_trading', nature: 'correlates_with', description: 'Correlated trading correlates with market hours patterns' }
  ],
  high_risk_betting: [
    { pattern: 'rapid_betting', nature: 'triggers', description: 'High-risk betting may trigger rapid betting detection' },
    { pattern: 'consistent_losing', nature: 'triggers', description: 'High-risk betting triggers consistent losing analysis' },
    { pattern: 'high_risk_tolerance', nature: 'identifies', description: 'High-risk betting identifies risk tolerance patterns' },
    { pattern: 'large_volume_trader', nature: 'triggers', description: 'Large volume may trigger high-risk betting flags' }
  ],
  rapid_betting: [
    { pattern: 'high_risk_betting', nature: 'triggers', description: 'Rapid betting triggers high-risk analysis' },
    { pattern: 'real_time_frequency', nature: 'triggers', description: 'Rapid betting triggers real-time frequency monitoring' },
    { pattern: 'consistent_losing', nature: 'correlates_with', description: 'Rapid betting correlates with consistent losing patterns' }
  ],
  consistent_losing: [
    { pattern: 'high_risk_betting', nature: 'correlates_with', description: 'Consistent losing correlates with high-risk betting' },
    { pattern: 'rapid_betting', nature: 'correlates_with', description: 'Consistent losing correlates with rapid betting' }
  ],
  aggressive_betting: [
    { pattern: 'bet_type_preference', nature: 'informs', description: 'Aggressive betting informs bet type preferences' },
    { pattern: 'high_risk_tolerance', nature: 'informs', description: 'Aggressive betting informs risk tolerance assessment' },
    { pattern: 'large_volume_trader', nature: 'identifies', description: 'Aggressive betting identifies large volume traders' },
    { pattern: 'game_selection', nature: 'informs', description: 'Aggressive betting informs game selection patterns' }
  ],
  high_risk_tolerance: [
    { pattern: 'aggressive_betting', nature: 'influences', description: 'Risk tolerance influences aggressive betting' },
    { pattern: 'bet_type_preference', nature: 'influences', description: 'Risk tolerance influences bet type preferences' },
    { pattern: 'high_risk_betting', nature: 'identifies', description: 'Risk tolerance identifies high-risk betting patterns' },
    { pattern: 'consistent_risk_profile', nature: 'informs', description: 'Risk tolerance informs risk profile consistency' }
  ],
  consistent_risk_profile: [
    { pattern: 'aggressive_betting', nature: 'complements', description: 'Risk profile complements aggressive betting analysis' },
    { pattern: 'high_risk_tolerance', nature: 'complements', description: 'Risk profile complements risk tolerance assessment' }
  ]
};


export const RESOLUTION_STRATEGIES: Record<PatternType, string> = {
  betting_frequency: 'Implement distributed rate limiting & optimized data ingestion pipelines',
  game_selection: 'Proactive monitoring for shifts & recommended diversification alerts',
  bet_type_preference: 'Alerting on low market depth for preferred types; dynamic strategy adjustments',
  real_time_frequency: 'Leverage FFI for critical path; stream processing frameworks (e.g., Flink)',
  real_time_game_selection: 'Implement adaptive thresholding based on market liquidity/volume',
  team_loyalty: 'Cross-reference with performance data to quantify loyalty-induced negative EV',
  late_night_betting: 'Aggregate data over longer periods; combine with cross-regional data for larger sample size',
  large_volume_trader: 'Implement market impact modeling and dynamic position sizing for large orders',
  market_hours_trading: 'Dynamic optimization of betting window based on real-time liquidity/volatility',
  correlated_trading: 'Integrate with news/event feeds; causal inference modeling (e.g., Bayesian networks)',
  high_risk_betting: 'Integrate with historical profit/loss; context-aware risk profiling (new vs. old user)',
  rapid_betting: 'Behavioral fingerprinting; human verification challenges (CAPTCHA after threshold)',
  consistent_losing: 'Combine with source of funds analysis; anomaly detection on withdrawal patterns',
  aggressive_betting: 'Monitor market depth; dynamic risk limits based on syndicate\'s capital/reputation',
  high_risk_tolerance: 'Cross-reference with long-term performance (ROI); differentiate calculated vs. impulsive risk',
  consistent_risk_profile: 'Anomaly detection on deviations from historical profile; alert on significant strategy shifts'
};


export const TENSIONS_DETAILED: Record<PatternType, string> = {
  betting_frequency: 'High frequency may conflict with platform rate limits & data acquisition speed',
  game_selection: 'Specialization may limit diversification and expose blind spots',
  bet_type_preference: 'Preference rigidity may reduce adaptability to market changes',
  real_time_frequency: 'Real-time processing requires significant compute & low-latency infrastructure',
  real_time_game_selection: 'Rapid shifts may create false positives or noise from small volumes',
  team_loyalty: 'Loyalty bias may lead to predictable and exploitable betting patterns',
  late_night_betting: 'Low volume may reduce statistical significance and increase noise',
  large_volume_trader: 'Large bets may move markets against syndicate\'s own positions',
  market_hours_trading: 'Optimal betting times may vary and require constant re-evaluation',
  correlated_trading: 'Correlation doesn\'t imply causation; false positives from unrelated events',
  high_risk_betting: 'High risk may indicate fraud or genuinely sophisticated, high-edge strategy',
  rapid_betting: 'Speed may be legitimate for arbitrage or indicate manipulation',
  consistent_losing: 'Consistent losses may be a deliberate strategy for money laundering or simply bad betting',
  aggressive_betting: 'Aggression may create market impact or trigger risk flags',
  high_risk_tolerance: 'High tolerance may indicate sophisticated strategy or poor risk management',
  consistent_risk_profile: 'Stability may indicate predictability or a successful, covert strategy'
};

export function getDetailedProperties(patternType: PatternType): string {
  return PATTERN_PROPERTIES_DETAILED[patternType] || '';
}

export function getKeyMetrics(patternType: PatternType): string[] {
  return PATTERN_KEY_METRICS[patternType] || [];
}

export function getCrossReferenceDetails(patternType: PatternType): Array<{
  pattern: PatternType;
  nature: 'informs' | 'correlates_with' | 'influenced_by' | 'triggers' | 'complements' | 'identifies';
  description?: string;
}> {
  return CROSS_REFERENCE_DETAILS[patternType] || [];
}

export function getResolutionStrategy(patternType: PatternType): string {
  return RESOLUTION_STRATEGIES[patternType] || '';
}

export function getDetailedTension(patternType: PatternType): string {
  return TENSIONS_DETAILED[patternType] || '';
}
