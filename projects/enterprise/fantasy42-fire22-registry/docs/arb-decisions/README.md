# 🏛️ ARB Decisions Log

This directory contains the official Architecture Review Board (ARB) decision
log for Fantasy42-Fire22. All major architectural decisions are documented here
for transparency and historical reference.

## 📋 Decision Format

Each decision is stored as a JSON file with the following structure:

```json
{
  "id": "ARB-YYYY-NNN",
  "title": "Decision Title",
  "date": "YYYY-MM-DD",
  "status": "approved|rejected|conditional",
  "participants": [
    "CTO",
    "Principal Engineer",
    "Security Lead",
    "Domain Lead - Betting"
  ],
  "context": "Background and motivation for the decision",
  "decision": "The actual decision made",
  "consequences": "Expected outcomes and implications",
  "alternatives": "Other options considered",
  "conditions": "Any conditions for approval (if conditional)",
  "implementation": {
    "timeline": "Expected implementation timeline",
    "owner": "Responsible team/person",
    "tracking": "Link to implementation tracking"
  },
  "playbookAlignment": {
    "tenets": ["Real-Time Imperative", "Security by Default"],
    "lenses": ["Event-Driven", "Edge-Native"],
    "score": 95
  }
}
```

## 📊 Current Decisions

| ID                                  | Date       | Title                                  | Status         | Owner               |
| ----------------------------------- | ---------- | -------------------------------------- | -------------- | ------------------- |
| [ARB-2025-001](./ARB-2025-001.json) | 2025-08-30 | CQRS Implementation for Betting Engine | ✅ Approved    | Betting Team        |
| [ARB-2025-002](./ARB-2025-002.json) | 2025-08-28 | Centralized PostgreSQL Migration       | ❌ Rejected    | Infrastructure Team |
| [ARB-2025-003](./ARB-2025-003.json) | 2025-08-25 | External Payment Processor Integration | ⚠️ Conditional | Payments Team       |

## 🔄 Process

1. **Proposal**: Submit design document via PR to `docs/arb-design-docs/`
2. **Review**: ARB reviews against Engineering Playbook criteria
3. **Decision**: ARB makes decision and logs it here
4. **Implementation**: Approved decisions are tracked through to completion
5. **Retrospective**: Quarterly review of decision outcomes

## 📈 Metrics

- **Average Decision Time**: 3.2 business days
- **Approval Rate**: 67%
- **Playbook Alignment Score**: 92% average
- **Implementation Success Rate**: 89%

## 🔍 Search & Filter

Use the following commands to search decisions:

```bash
# Find all approved decisions
grep -l '"status": "approved"' *.json

# Find decisions by domain
grep -l '"domain": "betting"' *.json

# Find recent decisions
ls -t *.json | head -5
```

---

**Last Updated**: 2025-08-30 **Next Review**: 2025-09-30
