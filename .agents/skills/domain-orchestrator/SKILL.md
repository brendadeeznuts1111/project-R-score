---
name: domain-orchestrator
description: |
  Bridges Kimi Agent Skills with Dynamic Domain APIs. Parses SKILL.md files,
  executes flow diagrams, and maps skill instructions to domain methods.
  Use for domain orchestration, flow-skill execution, and domain-method mapping.
---

# Domain Skill Orchestrator

## Flow: Execute Domain Skill

```mermaid
flowchart TD
    A([Receive Skill Request]) --> B[Load SKILL.md]
    B --> C{Parse Type}
    C -->|Standard| D[Extract Knowledge]
    C -->|Flow| E[Parse Mermaid Diagram]
    D --> F[Return Guidance]
    E --> G[Execute Flow Steps]
    G --> H{Next Node}
    H -->|Action| I[Call Domain API]
    H -->|Decision| J[Evaluate Condition]
    H -->|End| K([Log & Return])
    I --> H
    J --> H
```

## Domain API Mapping

| Skill Instruction | Domain Method |
|-------------------|---------------|
| "Check health" | `domain.checkHealth()` |
| "Optimize" | `domain.optimize()` |
| "Collapse state" | `domain.collapse('property')` |
| "Entangle" | `domain.entangleWith(other)` |
| "Self-heal" | `domain.triggerHealing()` |

## Usage

```typescript
// Execute a flow skill on a domain
const orchestrator = new SkillOrchestrator();
const results = await orchestrator.executeFlowSkill(
  'domain-diagnostic-flow',
  myDomain
);

// Load guidance skill
const guidance = await orchestrator.loadSkill('quantum-domain-ops');
```

## Agent tooling

| Tool | Use when |
|------|----------|
| `ast_grep_skill_loop` | `action: matrix` — health across all registered skills |
| `ast_grep_search` | Find `SkillOrchestrator` / flow skill wiring |
| `/workflow` | Post-remediation continuous scan loops |

Registry: `.agents/skills/ast-grep/skill-loop-registry.json` · Shared: [agent-tooling.md](../references/agent-tooling.md)
