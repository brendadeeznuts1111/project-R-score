---
name: quantum-domain-ops
description: |
  Protocols for operating QuantumDomain instances including state collapse,
  entanglement management, coherence monitoring, and tunneling analysis.
  Safety rules and optimization procedures for quantum domains.
triggers: ["quantum", "domain", "collapse", "entangle", "coherence", "superposition"]
---

# Quantum Domain Operations

## Core Principles

1. **State Collapse**: Measurement collapses wave function
   ```javascript
   const value = domain.collapse('property');
   ```

2. **Entanglement**: Link domains with shared state
   ```javascript
   domain.entangleWith([otherDomain1, otherDomain2]);
   ```
   ⚠️ Max 7 domains per entanglement group

3. **Coherence Threshold**: Monitor for decoherence
   ```javascript
   if (domain.coherence < 0.5) {
     domain.triggerDecoherenceProtocol();
   }
   ```

## Operations

### Optimize Superposition
```javascript
const weights = domain.waveFunction;
const optimal = weights.indexOf(Math.max(...weights));
return domain.getCollapsedProperty(optimal, 'configuration');
```

### Check Tunneling
```javascript
if (domain.tunnelingProbability > 0.3) {
  DomainPerformanceMonitor.log('tunneling_risk', {
    probability: domain.tunnelingProbability,
    domain: domain.id
  });
}
```

## Safety
- Log all operations via `DomainPerformanceMonitor`
- Never observe entangled domains separately
- Coherence < 0.5 triggers automatic recovery
