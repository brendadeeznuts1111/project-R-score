# [GOV][DASHBOARD][COMPLIANCE][GOV-DASH-001][v2.9][ACTIVE]

**🛡️ Syndicate Governance Dashboard v2.9 | 63 Rules | Live Compliance | PR-Gated Enforcement**

---

## 📊 Compliance Overview

```dataviewjs
// Governance Compliance Dashboard v2.9

let complianceData = {};
let validationResults = [];
let isLoading = true;

const updateComplianceData = async () => {
  if (isLoading) return;
  isLoading = true;

  const statusDiv = dv.el("div", "🔄 Updating compliance data...", {
    attr: { id: "compliance-status", style: "padding: 10px; background: #e3f2fd; border-radius: 5px; margin: 10px 0;" }
  });

  try {
    // Simulate fetching compliance data - in real implementation this would call the rules engine
    await new Promise(resolve => setTimeout(resolve, 2000));

    complianceData = {
      totalRules: 63,
      activeRules: 59,
      requiredRules: 46,
      coreRules: 17,
      passedValidations: 52,
      failedValidations: 7,
      warningValidations: 4,
      compliancePercentage: 82.5,
      lastAudit: new Date().toISOString(),
      criticalFailures: ['SEC-ENV-001', 'TEST-COVERAGE-001', 'GIT-FF-001']
    };

    validationResults = [
      { id: 'SEC-ENV-001', status: 'FAIL', message: '.env files detected', priority: 'REQUIRED' },
      { id: 'TEST-COVERAGE-001', status: 'FAIL', message: 'Coverage below 80%', priority: 'REQUIRED' },
      { id: 'GIT-FF-001', status: 'FAIL', message: 'Non-fast-forward merges detected', priority: 'REQUIRED' },
      { id: 'DP-ALERT-001', status: 'PASS', message: 'Profit alerts configured', priority: 'REQUIRED' },
      { id: 'OPS-BACKUP-001', status: 'WARN', message: 'Backup older than 24h', priority: 'REQUIRED' },
      { id: 'DATA-FRESH-001', status: 'PASS', message: 'Data updated within 1h', priority: 'CORE' },
      { id: 'WS-LIVE-001', status: 'PASS', message: 'WebSocket connections healthy', priority: 'REQUIRED' }
    ];

    statusDiv.innerHTML = `✅ Compliance data updated - ${complianceData.compliancePercentage}% compliant`;
    renderComplianceDashboard();

  } catch (error) {
    statusDiv.innerHTML = `❌ Failed to load compliance data: ${error.message}`;
    statusDiv.style.background = "#ffebee";
    statusDiv.style.color = "#c62828";
  } finally {
    isLoading = false;
  }
};

const renderComplianceDashboard = () => {
  if (Object.keys(complianceData).length === 0) return;

  // Main compliance score
  const complianceColor = complianceData.compliancePercentage >= 95 ? '#2e7d32' :
                         complianceData.compliancePercentage >= 80 ? '#f57c00' : '#d32f2f';

  const scoreCard = dv.el("div", "", {
    attr: {
      style: `background: linear-gradient(135deg, ${complianceColor}22 0%, ${complianceColor}44 100%); border: 2px solid ${complianceColor}; border-radius: 15px; padding: 25px; text-align: center; margin: 20px 0;`
    }
  });

  dv.el("div", "GOVERNANCE COMPLIANCE", {
    attr: { style: "font-size: 0.9em; color: #666; margin-bottom: 10px; letter-spacing: 2px;" }
  }).parentElement = scoreCard;

  dv.el("div", `${complianceData.compliancePercentage}%`, {
    attr: { style: `font-size: 3em; font-weight: bold; color: ${complianceColor}; margin: 10px 0;` }
  }).parentElement = scoreCard;

  const lastAudit = new Date(complianceData.lastAudit);
  dv.el("div", `Last Audit: ${lastAudit.toLocaleString()}`, {
    attr: { style: "font-size: 0.8em; color: #666; margin-top: 10px;" }
  }).parentElement = scoreCard;

  // Statistics grid
  const statsGrid = dv.el("div", "", {
    attr: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 25px 0;" }
  });

  const stats = [
    { label: "Total Rules", value: complianceData.totalRules, icon: "📋", color: "#2196f3" },
    { label: "Active Rules", value: complianceData.activeRules, icon: "✅", color: "#4caf50" },
    { label: "Required", value: complianceData.requiredRules, icon: "🔴", color: "#f44336" },
    { label: "Passed", value: complianceData.passedValidations, icon: "✅", color: "#4caf50" },
    { label: "Failed", value: complianceData.failedValidations, icon: "❌", color: "#f44336" },
    { label: "Warnings", value: complianceData.warningValidations, icon: "⚠️", color: "#ff9800" }
  ];

  stats.forEach(stat => {
    const statCard = dv.el("div", "", {
      attr: {
        style: `background: white; border: 2px solid ${stat.color}; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`
      }
    });

    dv.el("div", stat.icon, {
      attr: { style: `font-size: 1.5em; margin-bottom: 5px;` }
    }).parentElement = statCard;

    dv.el("div", `<strong style="font-size: 1.2em; color: ${stat.color};">${stat.value}</strong>`, {
      attr: { style: "margin-bottom: 3px;" }
    }).parentElement = statCard;

    dv.el("div", stat.label, {
      attr: { style: `color: #666; font-size: 0.8em;` }
    }).parentElement = statCard;

    statsGrid.appendChild(statCard);
  });

  // Critical failures alert
  if (complianceData.criticalFailures && complianceData.criticalFailures.length > 0) {
    const alertDiv = dv.el("div", "", {
      attr: {
        style: "background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border: 2px solid #f44336; border-radius: 10px; padding: 20px; margin: 20px 0;"
      }
    });

    dv.el("h3", "🚨 CRITICAL FAILURES - IMMEDIATE ACTION REQUIRED", {
      attr: { style: "color: #c62828; margin: 0 0 15px 0;" }
    }).parentElement = alertDiv;

    const failureList = dv.el("ul", "", {
      attr: { style: "margin: 0; padding-left: 20px;" }
    });

    complianceData.criticalFailures.forEach(failure => {
      dv.el("li", `<strong>${failure}</strong> - Requires immediate attention`, {
        attr: { style: "color: #c62828; margin: 5px 0;" }
      }).parentElement = failureList;
    });

    alertDiv.appendChild(failureList);
  }
};

// Auto-load compliance data
updateComplianceData();
```

---

## 🚨 Validation Results

```dataviewjs
// Rule Validation Results Display
const renderValidationResults = () => {
  if (validationResults.length === 0) return;

  const container = dv.el("div", "", { attr: { id: "validation-results", style: "margin: 20px 0;" } });

  // Group by status
  const grouped = validationResults.reduce((acc, result) => {
    if (!acc[result.status]) acc[result.status] = [];
    acc[result.status].push(result);
    return acc;
  }, {});

  ['FAIL', 'WARN', 'PASS'].forEach(status => {
    if (!grouped[status] || grouped[status].length === 0) return;

    const statusDiv = dv.el("div", "", {
      attr: { style: "margin: 15px 0;" }
    });

    const statusColor = status === 'FAIL' ? '#c62828' : status === 'WARN' ? '#f57c00' : '#2e7d32';
    const statusIcon = status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '✅';
    const statusTitle = status === 'FAIL' ? 'FAILED VALIDATIONS' : status === 'WARN' ? 'WARNINGS' : 'PASSED VALIDATIONS';

    dv.el("h4", `${statusIcon} ${statusTitle} (${grouped[status].length})`, {
      attr: { style: `color: ${statusColor}; margin: 0 0 10px 0; border-bottom: 2px solid ${statusColor}; padding-bottom: 5px;` }
    }).parentElement = statusDiv;

    grouped[status].forEach(result => {
      const resultDiv = dv.el("div", "", {
        attr: {
          style: `background: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 10px; margin: 5px 0; border-radius: 3px;`
        }
      });

      dv.el("div", `<strong>${result.id}</strong> <span style="color: ${statusColor};">[${result.priority}]</span>`, {
        attr: { style: "margin-bottom: 3px;" }
      }).parentElement = resultDiv;

      dv.el("div", result.message, {
        attr: { style: "font-size: 0.9em; color: #555;" }
      }).parentElement = resultDiv;

      statusDiv.appendChild(resultDiv);
    });

    container.appendChild(statusDiv);
  });
};

// Render validation results after compliance data loads
setTimeout(renderValidationResults, 2500);
```

---

## 📋 Rule Categories

```dataviewjs
// Rule Categories Overview
const categories = [
  { name: "Security", count: 15, required: 12, color: "#f44336" },
  { name: "Ops", count: 12, required: 8, color: "#2196f3" },
  { name: "Alerts", count: 10, required: 7, color: "#ff9800" },
  { name: "Git/Deploy", count: 8, required: 6, color: "#4caf50" },
  { name: "Data", count: 7, required: 5, color: "#9c27b0" },
  { name: "WS/Live", count: 5, required: 4, color: "#00bcd4" },
  { name: "Telegram", count: 6, required: 4, color: "#ff5722" },
  { name: "Agent", count: 6, required: 4, color: "#795548" },
  { name: "Compliance", count: 8, required: 6, color: "#607d8b" }
];

const categoriesGrid = dv.el("div", "", {
  attr: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 20px 0;" }
});

categories.forEach(cat => {
  const catCard = dv.el("div", "", {
    attr: {
      style: `background: white; border: 2px solid ${cat.color}; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`
    }
  });

  dv.el("h4", cat.name, {
    attr: { style: `color: ${cat.color}; margin: 0 0 10px 0; font-size: 1.1em;` }
  }).parentElement = catCard;

  dv.el("div", `<strong style="font-size: 1.3em;">${cat.count}</strong><br><small>rules</small>`, {
    attr: { style: "margin-bottom: 8px;" }
  }).parentElement = catCard;

  dv.el("div", `<span style="color: #d32f2f;">${cat.required}</span> required`, {
    attr: { style: "font-size: 0.8em; color: #666;" }
  }).parentElement = catCard;

  categoriesGrid.appendChild(catCard);
});
```

---

## 🎯 Quick Actions

```dataviewjs
// Governance Quick Actions Panel
const actionsDiv = dv.el("div", "", {
  attr: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 25px 0;" }
});

// Validation Actions
const validationActions = dv.el("div", "", {
  attr: { style: "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px;" }
});

dv.el("h3", "🔍 Validation & Audit", {
  attr: { style: "margin: 0 0 15px 0;" }
}).parentElement = validationActions;

const validationButtons = [
  { name: "✅ Full Compliance Check", cmd: "rules:validate", desc: "Validate all governance rules" },
  { name: "📊 Generate Audit Report", cmd: "rules:audit", desc: "Comprehensive governance audit" },
  { name: "📋 List All Rules", cmd: "rules:list", desc: "Browse governance rules" },
  { name: "🔄 Refresh Compliance", action: updateComplianceData, desc: "Update compliance dashboard" }
];

validationButtons.forEach(button => {
  dv.el("button", button.name, {
    attr: {
      title: button.desc,
      style: "display: block; width: 100%; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 10px; border-radius: 5px; cursor: pointer; margin: 5px 0; text-align: left; font-size: 0.9em;"
    },
    onclick: button.action || (() => {
      dv.el("div", `🚀 Executing: <code>bun ${button.cmd}</code>`, {
        attr: { style: "margin: 10px 0; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 3px; color: #2e7d32;" }
      });
    })
  }).parentElement = validationActions;
});

actionsDiv.appendChild(validationActions);

// Rule Management Actions
const ruleActions = dv.el("div", "", {
  attr: { style: "background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px;" }
});

dv.el("h3", "⚙️ Rule Management", {
  attr: { style: "margin: 0 0 15px 0;" }
}).parentElement = ruleActions;

const ruleButtons = [
  { name: "📝 Create New Rule", action: () => {
    dv.el("div", `📋 Use QuickAdd: "🛡️ New Rule" or Templater: "/templater: Create new rule"`, {
      attr: { style: "margin: 10px 0; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 3px; color: #2e7d32;" }
    });
  }, desc: "Create new governance rule" },
  { name: "🔧 Rule Statistics", cmd: "rules:stats", desc: "View governance statistics" },
  { name: "🔍 Search Rules", cmd: "rules:search profit", desc: "Search governance rules" },
  { name: "🚀 PR Workflow", cmd: "rules:pr RULE-ID", desc: "Create PR for rule implementation" }
];

ruleButtons.forEach(button => {
  dv.el("button", button.name, {
    attr: {
      title: button.desc,
      style: "display: block; width: 100%; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 10px; border-radius: 5px; cursor: pointer; margin: 5px 0; text-align: left; font-size: 0.9em;"
    },
    onclick: button.action || (() => {
      dv.el("div", `🚀 Executing: <code>bun ${button.cmd}</code>`, {
        attr: { style: "margin: 10px 0; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 3px; color: #2e7d32;" }
      });
    })
  }).parentElement = ruleActions;
});

actionsDiv.appendChild(ruleActions);
```

---

## 📈 Compliance Trends

```dataviewjs
// Compliance Trends Chart (simulated data)
const trendsDiv = dv.el("div", "", {
  attr: { style: "background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0;" }
});

dv.el("h3", "📈 Compliance Trends (Last 30 Days)", {
  attr: { style: "margin: 0 0 15px 0; color: #333;" }
}).parentElement = trendsDiv;

// Simulate trend data
const trendData = [
  { date: '2024-01-01', compliance: 78.5, violations: 12 },
  { date: '2024-01-08', compliance: 82.1, violations: 9 },
  { date: '2024-01-15', compliance: 85.3, violations: 7 },
  { date: '2024-01-22', compliance: 88.7, violations: 5 },
  { date: '2024-01-29', compliance: 82.5, violations: 7 }
];

const chartDiv = dv.el("div", "", {
  attr: { style: "display: flex; align-items: end; height: 150px; margin: 20px 0; padding: 0 10px;" }
});

trendData.forEach((point, index) => {
  const barHeight = (point.compliance / 100) * 120;
  const barColor = point.compliance >= 85 ? '#4caf50' : point.compliance >= 80 ? '#ff9800' : '#f44336';

  const barContainer = dv.el("div", "", {
    attr: {
      style: "display: flex; flex-direction: column; align-items: center; margin: 0 5px; flex: 1;"
    }
  });

  dv.el("div", `${point.compliance}%`, {
    attr: {
      style: `height: ${barHeight}px; width: 100%; background: ${barColor}; border-radius: 3px 3px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-size: 0.7em; font-weight: bold; padding-bottom: 3px;`
    }
  }).parentElement = barContainer;

  dv.el("div", point.date.slice(-2), {
    attr: { style: "font-size: 0.7em; color: #666; margin-top: 5px;" }
  }).parentElement = barContainer;

  chartDiv.appendChild(barContainer);
});

trendsDiv.appendChild(chartDiv);

// Trend summary
const latest = trendData[trendData.length - 1];
const previous = trendData[trendData.length - 2];
const trend = latest.compliance - previous.compliance;
const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
const trendColor = trend > 0 ? '#4caf50' : trend < 0 ? '#f44336' : '#ff9800';

dv.el("div", `${trendIcon} <strong style="color: ${trendColor};">${Math.abs(trend).toFixed(1)}% ${trend > 0 ? 'improvement' : trend < 0 ? 'decline' : 'stable'}</strong> from last week`, {
  attr: { style: "text-align: center; margin-top: 10px; padding: 10px; background: white; border-radius: 5px;" }
}).parentElement = trendsDiv;
```

---

## 📋 Recent Rule Activity

| Rule ID | Action | Status | Timestamp |
|---------|--------|--------|-----------|
| SEC-ENV-001 | Validation | ❌ FAIL | 2024-01-29 14:30 |
| TEST-COVERAGE-001 | Validation | ❌ FAIL | 2024-01-29 14:28 |
| DP-ALERT-001 | Enforcement | ✅ PASS | 2024-01-29 14:25 |
| OPS-BACKUP-001 | Validation | ⚠️ WARN | 2024-01-29 14:20 |
| GIT-PR-001 | PR Created | ✅ PASS | 2024-01-29 13:45 |
| WS-LIVE-001 | Validation | ✅ PASS | 2024-01-29 13:30 |
| DATA-FRESH-001 | Validation | ✅ PASS | 2024-01-29 13:15 |

---

## 🛠️ Development Tools

**Quick Rule Creation:**
- QuickAdd: `"🛡️ New Rule"` - Rapid rule template
- Templater: `/templater: Create new rule` - Full rule template

**CLI Commands:**
```bash
bun rules:validate          # Full compliance check
bun rules:enforce RULE-ID   # Force rule actions
bun rules:list Security     # List category rules
bun rules:pr RULE-ID        # Create PR workflow
bun rules:audit             # Generate audit report
```

**Templates:**
- `templates/new-rule.md` - Full Templater template
- `templates/quickadd-rule.md` - QuickAdd template

---

*Generated by Governance Dashboard v2.9 • 63 Rules Active • PR-Gated Enforcement*
