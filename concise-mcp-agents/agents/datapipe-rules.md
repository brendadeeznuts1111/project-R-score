# 🛡️ **DATAPIPE GOVERNANCE RULES**

*[DATAPIPE][RULES][FULL][DP-RULES-001][v2.0][ACTIVE]*

## [AGENT][GLOBAL][RULE][REQUIRED][DP-ALERT-001][v2.0][ACTIVE]

### High Profit Alert Rule
- **Trigger**: Agent profit > $10,000 in single period
- **Action**: Immediate Telegram alert to admin channel
- **Escalation**: Email notification if profit > $50,000
- **Evidence**: Logged in dashboards/agent-reports.md
- **Owner**: @admin
- **Review**: Monthly

## [AGENT][GLOBAL][RULE][REQUIRED][DP-VOLUME-001][v2.0][ACTIVE]

### Volume Anomaly Detection
- **Trigger**: Agent bets > 1,000 in 24 hours
- **Action**: Warning flag in dashboard + email alert
- **Escalation**: Suspend if volume > 5,000
- **Evidence**: Volume tracking in agent-reports.md
- **Owner**: @compliance
- **Review**: Weekly

## [AGENT][GLOBAL][RULE][OPTIONAL][DP-WINRATE-001][v2.0][EXPERIMENTAL]

### Win Rate Monitoring
- **Trigger**: Agent win rate > 60% or < 30%
- **Action**: Dashboard highlight + investigation flag
- **Escalation**: Manual review if pattern persists > 3 days
- **Evidence**: Win rate tracking in reports
- **Owner**: @analytics
- **Review**: Bi-weekly

## [DATAPIPE][SYSTEM][RULE][REQUIRED][DP-UPTIME-001][v2.0][ACTIVE]

### System Health Monitoring
- **Trigger**: API fetch failure > 3 consecutive attempts
- **Action**: Telegram alert + fallback to cached data
- **Escalation**: Manual intervention if > 1 hour downtime
- **Evidence**: Error logs in scripts/datapipe.ts
- **Owner**: @devops
- **Review**: Daily

## [DATAPIPE][DATA][RULE][REQUIRED][DP-VALIDATION-001][v2.0][ACTIVE]

### Data Integrity Checks
- **Trigger**: Missing or invalid agent data in API response
- **Action**: Log warning + attempt data repair
- **Escalation**: Halt pipeline if > 50% data corruption
- **Evidence**: Validation logs in datapipe.ts
- **Owner**: @data
- **Review**: Daily

---

## Rule Validation Commands

```bash
# Check all rules
bun run rules:validate

# Run datapipe with governance
bun run gov:datapipes

# Audit rule compliance
bun run audit:rules
```

## Emergency Procedures

1. **API Down**: Use cached data, alert @devops
2. **Data Corruption**: Halt pipeline, investigate API changes
3. **Alert Storm**: Adjust thresholds, review rules
4. **Performance Issues**: Scale infrastructure, optimize queries

---

*Rules are PR-gated • Changes require approval from @admin and @compliance*
