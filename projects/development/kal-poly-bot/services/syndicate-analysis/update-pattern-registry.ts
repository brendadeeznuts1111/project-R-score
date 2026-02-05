#!/usr/bin/env bun

const filePath = './services/syndicate-analysis/pattern-registry.ts';
const file = Bun.file(filePath);
if (!await file.exists()) {
  throw new Error(`File not found: ${filePath}`);
}
const content = await file.text();

// Update each pattern with enhanced fields
const updates = [
  {
    pattern: 'betting_frequency',
    tension: 'High frequency may conflict with platform rate limits & data acquisition speed',
    after: 'tension: \'High frequency may conflict with platform limits\''
  },
  {
    pattern: 'game_selection',
    tension: 'Specialization may limit diversification and expose blind spots',
    after: 'tension: \'Specialization may limit diversification opportunities\''
  },
  {
    pattern: 'bet_type_preference',
    tension: 'Preference rigidity may reduce adaptability to market changes',
    after: 'tension: \'Preference rigidity may reduce adaptability\''
  },
  {
    pattern: 'real_time_frequency',
    tension: 'Real-time processing requires significant compute & low-latency infrastructure',
    after: 'tension: \'Real-time processing requires significant resources\''
  },
  {
    pattern: 'real_time_game_selection',
    tension: 'Rapid shifts may create false positives or noise from small volumes',
    after: 'tension: \'Rapid shifts may create false positives\''
  },
  {
    pattern: 'team_loyalty',
    tension: 'Loyalty bias may lead to predictable and exploitable betting patterns',
    after: 'tension: \'Loyalty bias may create predictable patterns\''
  },
  {
    pattern: 'late_night_betting',
    tension: 'Low volume may reduce statistical significance and increase noise',
    after: 'tension: \'Low volume may reduce statistical significance\''
  },
  {
    pattern: 'large_volume_trader',
    tension: 'Large bets may move markets against syndicate\'s own positions',
    after: 'tension: \'Large bets may move markets, creating tension\''
  },
  {
    pattern: 'market_hours_trading',
    tension: 'Optimal betting times may vary and require constant re-evaluation',
    after: 'tension: \'Market hours may not align with optimal betting times\''
  },
  {
    pattern: 'correlated_trading',
    tension: 'Correlation doesn\'t imply causation; false positives from unrelated events',
    after: 'tension: \'Correlation doesn\\\'t imply causation, false positives\''
  },
  {
    pattern: 'high_risk_betting',
    tension: 'High risk may indicate fraud or genuinely sophisticated, high-edge strategy',
    after: 'tension: \'High risk may indicate fraud or sophisticated strategy\''
  },
  {
    pattern: 'rapid_betting',
    tension: 'Speed may be legitimate for arbitrage or indicate manipulation',
    after: 'tension: \'Speed may be legitimate or indicate manipulation\''
  },
  {
    pattern: 'consistent_losing',
    tension: 'Consistent losses may be a deliberate strategy for money laundering or simply bad betting',
    after: 'tension: \'Consistent losses may be strategy or exploitation\''
  },
  {
    pattern: 'aggressive_betting',
    tension: 'Aggression may create market impact or trigger risk flags',
    after: 'tension: \'Aggression may create market impact\''
  },
  {
    pattern: 'high_risk_tolerance',
    tension: 'High tolerance may indicate sophisticated strategy or poor risk management',
    after: 'tension: \'High tolerance may indicate sophisticated strategy\''
  },
  {
    pattern: 'consistent_risk_profile',
    tension: 'Stability may indicate predictability or a successful, covert strategy',
    after: 'tension: \'Stability may indicate predictability\''
  }
];

const updatedContent = updates.reduce((currentContent, update) => {
  const patternRegex = new RegExp(
    `(${update.pattern}:\\s*{[\\s\\S]*?tension:\\s*)'[^']*'`,
    'm'
  );
  
  if (!patternRegex.test(currentContent)) {
    return currentContent;
  }
  
  const withTension = currentContent.replace(
    patternRegex,
    `$1'${update.tension}'`
  );
  
  const enhancedFields = `,
    propertiesDetailed: PATTERN_PROPERTIES_DETAILED['${update.pattern}'],
    keyMetrics: PATTERN_KEY_METRICS['${update.pattern}'],
    crossReferenceDetails: CROSS_REFERENCE_DETAILS['${update.pattern}'],
    resolutionStrategy: RESOLUTION_STRATEGIES['${update.pattern}']`;
  
  const insertRegex = new RegExp(
    `(${update.pattern}:\\s*{[\\s\\S]*?tension:\\s*'${update.tension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}')\\s*([,\\}])`,
    'm'
  );
  
  if (!insertRegex.test(withTension)) {
    return withTension;
  }
  
  return withTension.replace(
    insertRegex,
    `$1${enhancedFields}$2`
  );
}, content);

await Bun.write(filePath, updatedContent);
console.log('Pattern registry updated!');
