#!/usr/bin/env bun

// scripts/assign-critical-violations.ts
import { GoldenRuleEnforcer } from '../packages/odds-core/src/standards/rule-enforcement.js';
import { writeFile } from 'fs/promises';

interface TeamAssignment {
  teamMember: string;
  role: string;
  violations: AssignedViolation[];
  totalEffort: 'quick' | 'moderate' | 'complex';
  estimatedDays: number;
}

interface AssignedViolation {
  rule: string;
  file: string;
  line?: number;
  message: string;
  suggestion: string;
  priority: 'critical';
  effort: 'quick' | 'moderate' | 'complex';
  category: string;
}

interface AssignmentPlan {
  totalViolations: number;
  teamMembers: TeamAssignment[];
  timeline: {
    phase: string;
    startDate: string;
    endDate: string;
    targetViolations: number;
  }[];
  dailyStandup: {
    time: string;
    focus: string[];
    attendees: string[];
  };
}

async function assignCriticalViolations() {
  console.log('👥 Assigning critical violations to team members...\n');
  
  const enforcer = new GoldenRuleEnforcer();
  const result = await enforcer.validateCodebase();
  
  const criticalViolations = result.violations.filter(v => v.severity === 'error');
  
  // Team structure
  const team = [
    {
      name: 'Alex Chen',
      role: 'Lead Developer',
      expertise: ['Error Handling', 'Resource Management', 'Security'],
      capacity: 5 // violations per day
    },
    {
      name: 'Sarah Johnson', 
      role: 'Senior Developer',
      expertise: ['Track API Usage', 'Performance Testing', 'Bun Optimizations'],
      capacity: 4
    },
    {
      name: 'Mike Wilson',
      role: 'Senior Developer', 
      expertise: ['Type Safety', 'Memory Monitoring', 'Logging & Monitoring'],
      capacity: 4
    },
    {
      name: 'Emily Davis',
      role: 'Junior Developer',
      expertise: ['Stay Updated', 'Use Bun Builtins'],
      capacity: 3
    }
  ];
  
  const assignmentPlan = createAssignmentPlan(criticalViolations, team);
  
  // Generate assignment reports
  await generateAssignmentReports(assignmentPlan);
  
  console.log('✅ Critical violations assigned successfully!');
  console.log(`📊 ${criticalViolations.length} violations assigned to ${team.length} team members`);
  console.log('📋 See reports/team-assignments.md for details');
}

function createAssignmentPlan(violations: any[], team: any[]): AssignmentPlan {
  // Categorize and prioritize violations
  const categorizedViolations = violations.map(v => ({
    ...v,
    effort: determineEffort(v),
    category: determineCategory(v)
  }));
  
  // Assign violations based on expertise and capacity
  const assignments: TeamAssignment[] = team.map(member => ({
    teamMember: member.name,
    role: member.role,
    violations: [],
    totalEffort: 'moderate' as const,
    estimatedDays: 0
  }));
  
  // Smart assignment algorithm
  categorizedViolations.forEach(violation => {
    // Find best match based on expertise
    const bestMatch = assignments.sort((a, b) => {
      const aExpertise = team.find(t => t.name === a.teamMember)?.expertise || [];
      const bExpertise = team.find(t => t.name === b.teamMember)?.expertise || [];
      
      const aScore = aExpertise.includes(violation.rule) ? 1 : 0;
      const bScore = bExpertise.includes(violation.rule) ? 1 : 0;
      
      const aLoad = a.violations.length;
      const bLoad = b.violations.length;
      
      return (bScore - aScore) * 10 + (aLoad - bLoad);
    })[0];
    
    bestMatch.violations.push(violation as AssignedViolation);
  });
  
  // Calculate effort and timeline
  assignments.forEach(assignment => {
    const effortCounts = assignment.violations.reduce((acc, v) => {
      acc[v.effort] = (acc[v.effort] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    assignment.totalEffort = effortCounts.complex > 0 ? 'complex' : 
                            effortCounts.moderate > 0 ? 'moderate' : 'quick';
    
    const memberCapacity = team.find(t => t.name === assignment.teamMember)?.capacity || 3;
    assignment.estimatedDays = Math.ceil(assignment.violations.length / memberCapacity);
  });
  
  // Create timeline
  const timeline = [
    {
      phase: 'Phase 1: Critical Security',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targetViolations: violations.filter(v => 
        ['Error Handling', 'Resource Management', 'Track API Usage'].includes(v.rule)
      ).length
    },
    {
      phase: 'Phase 2: Performance & Monitoring',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targetViolations: violations.filter(v => 
        ['Performance Testing', 'Logging & Monitoring', 'Memory Monitoring'].includes(v.rule)
      ).length
    },
    {
      phase: 'Phase 3: Code Quality',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targetViolations: violations.filter(v => 
        ['Type Safety', 'Stay Updated', 'Use Bun Builtins', 'Bun Optimizations'].includes(v.rule)
      ).length
    }
  ];
  
  // Daily standup structure
  const dailyStandup = {
    time: '09:00 AM',
    focus: [
      'Critical violation progress',
      'Blockers and dependencies',
      'Code review requirements',
      'Testing and validation'
    ],
    attendees: team.map(t => t.name)
  };
  
  return {
    totalViolations: violations.length,
    teamMembers: assignments,
    timeline,
    dailyStandup
  };
}

function determineEffort(violation: any): 'quick' | 'moderate' | 'complex' {
  if (violation.rule === 'Stay Updated') return 'quick';
  if (violation.rule === 'Use Bun Builtins') return 'moderate';
  if (violation.rule === 'Error Handling') return 'complex';
  if (violation.rule === 'Resource Management') return 'complex';
  return 'moderate';
}

function determineCategory(violation: any): string {
  const rule = violation.rule;
  if (rule === 'Error Handling' || rule === 'Resource Management') return 'security';
  if (rule === 'Performance Testing' || rule === 'Bun Optimizations') return 'performance';
  if (rule === 'Track API Usage' || rule === 'Logging & Monitoring') return 'monitoring';
  return 'maintainability';
}

async function generateAssignmentReports(plan: AssignmentPlan) {
  const report = `# 👥 TEAM ASSIGNMENTS - CRITICAL VIOLATIONS

**Generated**: ${new Date().toISOString()}
**Total Violations**: ${plan.totalViolations}
**Team Members**: ${plan.teamMembers.length}

## 📊 Overview

| Team Member | Role | Violations | Est. Days | Focus Area |
|-------------|------|------------|-----------|------------|
${plan.teamMembers.map(member => 
  `| ${member.teamMember} | ${member.role} | ${member.violations.length} | ${member.estimatedDays} | ${member.violations[0]?.category || 'General'} |`
).join('\n')}

## 🎯 Detailed Assignments

${plan.teamMembers.map(member => `
### ${member.teamMember} - ${member.role}

**Capacity**: ${member.violations.length} violations  
**Estimated Time**: ${member.estimatedDays} days  
**Effort Level**: ${member.totalEffort}

#### Assigned Violations

${member.violations.map((v, i) => `
${i + 1}. **${v.rule}** - \`${v.file}:${v.line}\`
   - **Issue**: ${v.message}
   - **Category**: ${v.category}
   - **Effort**: ${v.effort}
   - **Fix**: ${v.suggestion}
`).join('')}

---
`).join('')}

## 📅 Implementation Timeline

${plan.timeline.map((phase, i) => `
### ${phase.phase}

**Dates**: ${phase.startDate} to ${phase.endDate}
**Target**: ${phase.targetViolations} violations

**Focus**: ${getPhaseFocus(phase.phase)}
`).join('')}

## 🗓️ Daily Standup Structure

**Time**: ${plan.dailyStandup.time}  
**Attendees**: ${plan.dailyStandup.attendees.join(', ')}

### Agenda

${plan.dailyStandup.focus.map((item, i) => `
${i + 1}. ${item}
`).join('')}

### Progress Tracking

- **Daily**: Violation count reduction
- **Blockers**: Technical impediments  
- **Dependencies**: Cross-team requirements
- **Code Review**: Pending approvals

## 🎯 Success Metrics

### Week 1 Goals
- [ ] All critical security violations resolved
- [ ] API tracking infrastructure implemented
- [ ] Error handling patterns standardized

### Week 2 Goals  
- [ ] Performance optimizations completed
- [ ] Monitoring and logging enhanced
- [ ] Code review process optimized

### Week 3 Goals
- [ ] All remaining violations resolved
- [ ] Team training completed
- [ ] Documentation updated

## 📞 Escalation Path

1. **Technical Blockers** → Lead Developer (Alex Chen)
2. **Resource Constraints** → Project Manager  
3. **Timeline Issues** → Product Owner
4. **Quality Concerns** → Architecture Review Board

## 📋 Commands for Team

\`\`\`bash
# Check current assignment status
bun run scripts/assign-critical-violations.ts

# Validate individual fixes
bun run rules:validate

# Generate progress report
bun run rules:organize
\`\`\`

---

**Next Action**: Team members review assignments and begin Phase 1  
**Daily Check**: 09:00 AM standup meeting  
**Weekly Review**: Friday EOD progress assessment  
*Generated by Golden Rules Enforcement System*
`;
  
  await writeFile('./reports/team-assignments.md', report);
  
  // Save JSON for programmatic access
  await writeFile('./reports/team-assignments.json', JSON.stringify(plan, null, 2));
}

function getPhaseFocus(phaseName: string): string {
  if (phaseName.includes('Security')) return 'Error handling, resource management, API tracking';
  if (phaseName.includes('Performance')) return 'Optimization, monitoring, memory management';
  if (phaseName.includes('Quality')) return 'Type safety, code modernization, standards compliance';
  return 'General violation resolution';
}

// Run if called directly
if (import.meta.main) {
  await assignCriticalViolations().catch(error => {
    console.error('❌ Assignment failed:', error);
    process.exit(1);
  });
}
