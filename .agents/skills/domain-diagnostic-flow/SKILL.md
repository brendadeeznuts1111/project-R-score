---
name: domain-diagnostic-flow
type: flow
description: Comprehensive domain health check with automated remediation
version: 1.0.0

resilience:
  # Global default policy for all steps
  default_policy:
    retries: 2
    retry_strategy: exponential_backoff
    timeout_ms: 5000
    on_failure: escalate
    idempotent: false
  
  # Per-step overrides
  step_policies:
    "Check Vital Signs":
      retries: 1
      timeout_ms: 2000
      on_failure: skip
      
    "Run Deep Diagnostics":
      retries: 3
      retry_strategy: fixed
      timeout_ms: 30000
      on_failure: fallback
      fallback_node: "Escalate to Council"
      
    "Execute Treatment":
      retries: 2
      timeout_ms: 10000
      on_failure: compensate
      compensation_step: "Rollback Treatment"
      idempotent: true
      
    "Rebuild Domain":
      retries: 0
      timeout_ms: 60000
      on_failure: halt
---

# Domain Diagnostic Flow

Automated diagnostic and remediation workflow for Dynamic Domains.

## Flow Diagram

```mermaid
flowchart TD
    A([BEGIN]) --> B[Check Vital Signs]
    B --> C{All vitals normal?}
    C -->|Yes| D[Log Health Status]
    C -->|No| E[Run Deep Diagnostics]
    
    E --> F{Diagnosis found?}
    F -->|No| G[Escalate to Council]
    F -->|Yes| H[Execute Treatment]
    
    H --> I{Treatment successful?}
    I -->|Yes| D
    I -->|No| J[Rollback Treatment]
    J --> G
    
    D --> K([END])
    G --> K
```

## Step Descriptions

1. **Check Vital Signs** - Quick health check with 2s timeout
2. **Run Deep Diagnostics** - Comprehensive analysis with 30s timeout
3. **Execute Treatment** - Apply remediation with compensation on failure
4. **Rebuild Domain** - Full reconstruction (no retries, halt on failure)
5. **Escalate to Council** - Human intervention required

## Error Handling

| Step | Retries | Timeout | On Failure |
|------|---------|---------|------------|
| Check Vital Signs | 1 | 2s | Skip |
| Run Deep Diagnostics | 3 | 30s | Fallback to Council |
| Execute Treatment | 2 | 10s | Compensate |
| Rebuild Domain | 0 | 60s | Halt |

## Usage

```typescript
import { SkillOrchestrator } from './lib/skill-orchestrator';

const orchestrator = new SkillOrchestrator();
const results = await orchestrator.executeFlowSkill(
  'domain-diagnostic-flow',
  targetDomain
);

// Check results
for (const step of results) {
  console.log(`${step.status}: ${step.attempts} attempts, ${step.durationMs}ms`);
}
```
