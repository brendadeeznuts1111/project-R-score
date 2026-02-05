# CSS Migration Guide

## Files to Update

Replace inline styles and style blocks in these HTML files with:

```html
<link rel="stylesheet" href="/css/styles.css" />
```

### Files with extracted styles:

- src/unified-dashboard.html
- src/dashboard-index.html
- src/enhanced-dashboard.html
- src/fire22-dashboard.html
- src/staging-reviews/security-registry-review.html
- src/staging-reviews/performance-monitor-enhanced.html
- src/staging-reviews/one-click-setup.html
- src/staging-reviews/telegram-bot-review.html
- src/staging-reviews/telegram-dashboard-review.html
- src/staging-reviews/performance-monitor.html
- src/staging-reviews/telegram-workflows-review.html
- src/staging-reviews/telegram-benchmarks-review.html
- src/staging-reviews/multilingual-review.html
- src/staging-reviews/core-dashboard-review.html
- src/staging-reviews/queue-system-review.html
- src/staging-reviews/api-client-review.html
- src/staging-reviews/pattern-system-review.html
- src/staging-reviews/sports-betting-review.html
- src/water-dashboard-enhanced-staging.html
- src/water-dashboard.html
- src/dashboard.html
- src/performance-dashboard.html
- src/components/kpi-demo.html
- src/components/language-switcher.html
- src/components/fire22-navigation.html
- src/terminal-dashboard.html
- src/monitoring/monitoring-dashboard.html
- src/dark-mode-test.html
- src/FIRE22-DASHBOARD-WORKER-REFERENCE.html
- src/enhanced-dashboard-demo.html
- src/staging-review.html
- src/enhanced-water-dashboard-v2.html
- src/water-dashboard-enhanced.html

## Next Steps

1. Review the generated styles.css
2. Remove duplicate styles
3. Update HTML files to use the consolidated CSS
4. Test dark mode toggle across all pages
