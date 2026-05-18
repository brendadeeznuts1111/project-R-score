# 🔥 Fire22 Dashboard Worker - Wiki

## Overview

This wiki contains all departmental definitions, implementation guides, and
coordination documentation for the Fire22 Dashboard Worker system.

## 📁 Wiki Structure

```text
wiki/
├── README.md                           # This file
├── departments/                        # Department definition documents
│   ├── README.md                      # Department overview
│   ├── sportsbook-operations.md      # Sportsbook Operations definition
│   ├── live-casino-operations.md     # Live Casino Operations definition
│   ├── technology-enhancement.md     # Technology Department enhancement
│   ├── finance-cashier-operations.md # Finance + Cashier Operations
│   └── templates/                     # Department definition templates
│       └── department-definition-template.md
├── language-keys/                     # Fire22 L-key management
│   ├── ownership-matrix.md           # L-key ownership by department
│   ├── implementation-guide.md       # Technical implementation guide
│   └── translation-validation.md     # Quality assurance guide
├── coordination/                      # Cross-functional coordination
│   ├── cross-department-workflows.md # Inter-department processes
│   ├── escalation-procedures.md      # Issue escalation paths
│   └── meeting-schedules.md          # Regular coordination meetings
└── templates/                         # Reusable templates
    ├── department-definition.md       # Standard department definition format
    ├── handover-package.md           # Team lead handover template
    └── implementation-timeline.md     # Standard implementation timeline
```

## 🎯 Quick Access

### Department Definitions

- [🎲 Sportsbook Operations](./departments/sportsbook-operations.md) - Marcus
  Rodriguez (Head), Linda Chen (Comms), Robert Taylor (Tasks)
- [🎰 Live Casino Operations](./departments/live-casino-operations.md) - _In
  Development_
- [💻 Technology Enhancement](./departments/technology-enhancement.md) - _In
  Development_
- [💰 Finance + Cashier Operations](./departments/finance-cashier-operations.md) -
  _In Development_

### Fire22 Language Keys

- [🔤 Language Key Ownership Matrix](./language-keys/ownership-matrix.md)
- [📋 Implementation Guide](./language-keys/implementation-guide.md)

### Coordination Documents

- [🤝 Cross-Department Workflows](./coordination/cross-department-workflows.md)
- [📞 Escalation Procedures](./coordination/escalation-procedures.md)

## 📋 Document Standards

### All department definition documents must include:

1. **TO/CC/FROM Header** - Clear addressee and distribution list
2. **Executive Summary** - High-level overview for department head
3. **Core Mission & KPIs** - Measurable objectives and success metrics
4. **Specialist Team Structure** - Detailed team breakdown with leads
5. **Fire22 L-Key Ownership** - Assigned language keys and implementation
   timeline
6. **Technology Stack Requirements** - Technical implementation details
7. **Implementation Timeline** - Week-by-week milestones
8. **Cross-Department Coordination** - Integration requirements
9. **Resource Requirements** - Budget, staffing, and technology needs
10. **Next Steps & Action Items** - Clear actionable tasks for all leads

### Naming Convention

- **Files**: `department-name-definition.md` (lowercase, hyphens)
- **Headers**: Department name with emoji, clear hierarchy
- **Cross-references**: Use relative links for wiki navigation

### Review Process

1. **Draft**: Created by Platform Development Team
2. **Review**: Department head review and approval required
3. **Distribution**: Communications lead distributes to team
4. **Implementation**: Task coordinator tracks progress
5. **Updates**: Monthly review and updates as needed

## 🔄 Git Workflow

### Branching Strategy

```bash
# Create feature branch for new department
git checkout -b feature/department-live-casino-ops

# Make changes to wiki documents
git add wiki/departments/live-casino-operations.md

# Commit with clear message
git commit -m "feat(wiki): add Live Casino Operations department definition

- Define 3 specialist teams (dealer, game ops, streaming)
- Establish KPIs and success metrics
- Outline Cloudflare Edge streaming requirements
- Set 4-week implementation timeline

Addresses: Department Head Jennifer Wilson
CC: Communications Lead, Task Coordinator"

# Push and create PR
git push origin feature/department-live-casino-ops
```

### Commit Message Format

```text
type(scope): brief description

- Detailed change 1
- Detailed change 2
- Integration requirements

Addresses: [Department Head Name]
CC: [Communications Lead], [Task Coordinator]
```

### PR Review Requirements

- [ ] Department head listed in TO field
- [ ] Communications lead listed in CC field
- [ ] Task coordinator listed in CC field
- [ ] All 10 required sections included
- [ ] Clear action items defined
- [ ] Timeline and milestones specified
- [ ] Cross-department coordination defined

## 📊 Implementation Tracking

### Current Status

| Department                      | Definition     | Review         | Distribution   | Implementation |
| ------------------------------- | -------------- | -------------- | -------------- | -------------- |
| 🎲 Sportsbook Operations        | ✅ Complete    | ⏳ Pending     | ⏳ Pending     | ❌ Not Started |
| 🎰 Live Casino Operations       | ⏳ In Progress | ❌ Not Started | ❌ Not Started | ❌ Not Started |
| 💻 Technology Enhancement       | ❌ Not Started | ❌ Not Started | ❌ Not Started | ❌ Not Started |
| 💰 Finance + Cashier Operations | ❌ Not Started | ❌ Not Started | ❌ Not Started | ❌ Not Started |

### Success Metrics

- **Documentation Coverage**: 100% of specialist departments defined
- **Review Completion**: All department heads approve within 48 hours
- **Distribution Efficiency**: Communications leads distribute within 24 hours
- **Implementation Progress**: Task coordinators track weekly progress

## 🔗 Related Documentation

### External References

- [Fire22 Language Keys Integration Guide](../FIRE22-LANGUAGE-KEYS-INTEGRATION.md)
- [Fire22 Department Language Ownership](../FIRE22-DEPARTMENT-LANGUAGE-OWNERSHIP.md)
- [Claude Code Documentation](../CLAUDE.md)

### Internal References

- [Dashboard Worker Source Code](../src/)
- [Department HTML Pages](../src/departments/)
- [API Documentation](../src/api/)

## 👥 Contributors & Maintainers

### Wiki Maintainers

- **Platform Development Team** - Primary content creation and updates
- **Department Heads** - Review and approval of department definitions
- **Communications Leads** - Distribution and feedback coordination
- **Task Coordinators** - Implementation tracking and progress updates

### Contribution Guidelines

1. **Create Issues**: Use GitHub issues for new department requests or updates
2. **Follow Templates**: Use provided templates for consistency
3. **Clear Communication**: Address department heads directly
4. **Track Progress**: Update implementation status regularly
5. **Version Control**: Use semantic versioning for major updates

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Maintained By**: Fire22 Platform Development Team  
**Review Schedule**: Weekly during active implementation, monthly thereafter
