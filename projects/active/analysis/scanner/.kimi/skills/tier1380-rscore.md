---
name: tier1380-rscore
description: Tier-1380 R-Score Performance Monitoring
---

## Commands

- Validate: `bun scripts/validate-pointers.ts --bun-native`
- Dashboard:
  `bun -e 'import{renderMetricsANSI}from"./lib/ansi-dashboard";console.log(renderMetricsANSI({p_ratio:1,m_impact:0.59,s_hardening:0.982,e_elimination:0.875,total:0.874}))'`
