// lib/ansi-dashboard.ts
import { CONTENT_TYPES } from '../config/content-types';

// Mock metrics feed (would integrate with your tier1380-metrics.ts)
interface MetricsData {
  rscore: {
    current: number;
    components: {
      p_ratio: number;
      m_impact: number;
      s_hardening: number;
      e_elimination: number;
    };
  };
  timestamp: string;
}

const mockMetrics: MetricsData = {
  rscore: {
    current: 0.874,
    components: {
      p_ratio: 1.0,
      m_impact: 0.59,
      s_hardening: 0.982,
      e_elimination: 0.875,
    },
  },
  timestamp: new Date().toISOString(),
};

export function renderMetricsANSI(): string {
  const latest = mockMetrics;

  return Bun.markdown.render(
    `
# R-Score Performance Report

## Current Metrics
| Component | Score | Status |
|-----------|-------|--------|
| P_ratio | ${latest.rscore.components.p_ratio.toFixed(3)} | ${latest.rscore.components.p_ratio >= 0.95 ? '✅ Optimal' : '⚠️ Tuning'} |
| M_impact | ${latest.rscore.components.m_impact.toFixed(3)} | ${latest.rscore.components.m_impact >= 0.8 ? '✅ Optimal' : '⚠️ Tuning'} |
| S_hardening | ${latest.rscore.components.s_hardening.toFixed(3)} | ${latest.rscore.components.s_hardening >= 0.9 ? '✅ Secure' : '⚠️ Review'} |
| E_elimination | ${latest.rscore.components.e_elimination.toFixed(3)} | ${latest.rscore.components.e_elimination >= 0.8 ? '✅ Stable' : '⚠️ Review'} |

**Total R-Score: ${latest.rscore.current.toFixed(3)}**

*Generated: ${latest.timestamp}*
  `,
    {
      heading: (children, { level }) => {
        const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;33m', '\x1b[1;32m'];
        return `${colors[level - 1] || '\x1b[1m'}${children}\x1b[0m\n`;
      },
      paragraph: children => children + '\n',
      strong: children => `\x1b[1m${children}\x1b[22m`,
      table: children => children,
      td: children => {
        // Color code based on content
        if (children.includes('✅')) return `\x1b[32m${children}\x1b[0m | `;
        if (children.includes('⚠️')) return `\x1b[33m${children}\x1b[0m | `;
        return `\x1b[37m${children}\x1b[0m | `;
      },
      th: children => `\x1b[1;4m${children}\x1b[0m | `,
      tr: children => `| ${children}\n`,
    }
  );
}

export function renderProjectDashboardANSI(): string {
  return Bun.markdown.render(
    `
# 🗂️ Project Management Dashboard

## Active Services
| Service | Port | Status | Command |
|---------|------|--------|---------|
| Main Portal | 3000 | ✅ Running | bun run dev |
| Content-Type Server | 3001 | ✅ Running | bun run start:content-type |
| Advanced Fetch | - | 🟡 Ready | bun run fetch:advanced |
| Content-Type Demo | - | 🟡 Ready | bun run content-type |
| Verbose Demo | - | 🟡 Ready | bun run verbose |
| Test Suite | - | 🟡 Ready | bun run test:all |

## Quick Actions
- **Install All**: bun install
- **Test All**: bun run test:all
- **Start Services**: bun run dev && bun run start:content-type

*Last updated: ${new Date().toISOString()}*
  `,
    {
      heading: (children, { level }) => {
        const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;33m'];
        return `${colors[level - 1] || '\x1b[1m'}${children}\x1b[0m\n`;
      },
      paragraph: children => children + '\n',
      strong: children => `\x1b[1m${children}\x1b[22m`,
      table: children => children,
      td: children => {
        if (children.includes('✅')) return `\x1b[32m${children}\x1b[0m | `;
        if (children.includes('🟡')) return `\x1b[33m${children}\x1b[0m | `;
        if (children.includes('3000') || children.includes('3001'))
          return `\x1b[34m${children}\x1b[0m | `;
        return `\x1b[37m${children}\x1b[0m | `;
      },
      th: children => `\x1b[1;4m${children}\x1b[0m | `,
      tr: children => `| ${children}\n`,
    }
  );
}

// Live dashboard that updates every 5 seconds
export function startLiveDashboard(): void {
  setInterval(() => {
    console.clear();
    console.log(renderMetricsANSI());
    console.log('\n' + '='.repeat(60));
    console.log(renderProjectDashboardANSI());
  }, 5000);
}

// One-liner usage
if (import.meta.main) {
  console.log(renderMetricsANSI());
  console.log('\n' + '='.repeat(60));
  console.log(renderProjectDashboardANSI());
}
