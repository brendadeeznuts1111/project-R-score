# Advanced bun why Examples

## Pattern Matching for Enterprise Analysis
bun why '@fire22/*'     # All Fire22 workspace packages
bun why '*-webpack-*'   # Webpack-related packages
bun why '@types/react*' # React-related types

## Depth Control for Different Analysis Levels
bun why webpack --depth 1    # Immediate dependencies only
bun why webpack --depth 3    # Three levels deep
bun why webpack             # Full dependency tree

## Top-Level Analysis for Quick Insights
bun why 'semver*' --top      # Only direct dependents
bun why '@babel/*' --top     # Babel ecosystem overview

## Integration with Enterprise Scripts
bun why 'semver*' > version-conflicts.txt
bun why '@types/*' | grep -c '@types/' > types-count.txt
bun why 'webpack*' --depth 1 | wc -l > webpack-complexity.txt

## CI/CD Integration Examples
if bun why 'semver*' | grep -q 'semver@.*semver@'; then
    echo '🚨 Version conflict detected!'
    bun why 'semver*' --depth 2
fi
