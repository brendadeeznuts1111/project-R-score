# 🎲 Sportsbook Operations - Package Ownership

**Department**: Sportsbook Operations **Head**: Marcus Rodriguez
(marcus.rodriguez@apexodds.net) **Communications Lead**: Linda Chen
(linda.chen@apexodds.net) **Task Coordinator**: Robert Taylor
(robert.taylor@apexodds.net)

---

## 📦 Package Ownership Matrix

| Package                    | Primary Owner    | Secondary Owners          | Purpose                                 |
| -------------------------- | ---------------- | ------------------------- | --------------------------------------- |
| `@fire22/betting-engine`   | Marcus Rodriguez | Linda Chen, Robert Taylor | Core betting logic and odds calculation |
| `@fire22/sports-data`      | Marcus Rodriguez | Linda Chen                | Sports event data management            |
| `@fire22/odds-calculation` | Linda Chen       | Marcus Rodriguez          | Live odds calculation and updates       |
| `@fire22/wager-processing` | Robert Taylor    | Marcus Rodriguez          | Bet placement and settlement            |
| `@fire22/live-betting`     | Marcus Rodriguez | Linda Chen                | Real-time betting interfaces            |

---

## 🔧 Maintenance Responsibilities

### **Marcus Rodriguez** (Department Head)

- **Primary Focus**: Strategic oversight and major feature development
- **Review Requirements**: All betting engine changes, architectural decisions
- **Communication**: Weekly status updates to executive team

### **Linda Chen** (Communications Lead)

- **Primary Focus**: Odds calculation and sports data integration
- **Review Requirements**: All odds-related changes, API integrations
- **Communication**: Daily team coordination and client communications

### **Robert Taylor** (Task Coordinator)

- **Primary Focus**: Wager processing and transaction management
- **Review Requirements**: All wager processing changes, settlement logic
- **Communication**: Transaction monitoring and performance reporting

---

## 📋 Code Review Process

### **Review Requirements by Package Type**

#### **Critical Changes** (Require all 3 approvals)

- Core betting engine modifications
- Odds calculation algorithm changes
- Database schema changes
- Security-related updates

#### **Major Changes** (Require 2 approvals)

- New betting features
- API endpoint modifications
- Performance optimizations
- Third-party integration updates

#### **Minor Changes** (Require 1 approval)

- Bug fixes
- Documentation updates
- Test additions
- Configuration changes

---

## 🚨 Emergency Contacts

- **System Outages**: Marcus Rodriguez (Primary), Linda Chen (Secondary)
- **Odds Calculation Issues**: Linda Chen (Primary), Robert Taylor (Secondary)
- **Transaction Problems**: Robert Taylor (Primary), Marcus Rodriguez
  (Secondary)
- **Security Incidents**: All team members + security@apexodds.net

---

## 📊 Performance Metrics

- **System Uptime**: 99.5% minimum
- **Bet Processing Speed**: <2 seconds average
- **Odds Update Frequency**: <5 seconds global
- **Transaction Success Rate**: 99.99%

---

## 🔗 Related Documentation

- [Sportsbook Operations Department Definition](../departments/sportsbook-operations.md)
- [Betting Engine README](../../src/packages/betting/README.md)
- [Live Betting Architecture](../../docs/architecture/live-betting.md)

---

**Last Updated**: 2025-08-28 **Version**: 1.0.0 **Maintained By**: Sportsbook
Operations Team
