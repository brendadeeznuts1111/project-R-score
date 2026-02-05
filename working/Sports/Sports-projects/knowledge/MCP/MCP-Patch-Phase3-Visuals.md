# Phase 3: Visual Representations

## 📊 Mermaid Diagrams

### 1. Recommendation Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Generated: Recommendation Created
    
    Generated --> Applied: Patch Detected<br/>(syncRecommendationStatuses)
    Generated --> Dismissed: User Dismisses<br/>(dismissPatchRecommendation)
    Generated --> Generated: Still Active<br/>(getPatchRecommendations)
    
    Dismissed --> Generated: Dismissal Expires<br/>(isRecommendationActive)
    Dismissed --> [*]: Permanent Dismissal
    
    Applied --> Effective: Improvement > 0%<br/>(recordEffectivenessMeasurement)
    Applied --> Ineffective: Degradation < -5%<br/>(recordEffectivenessMeasurement)
    
    Effective --> [*]: Success
    Ineffective --> [*]: Failed
    
    note right of Generated
        Initial state when
        recommendation is created
        via createRecommendationEntry()
    end note
    
    note right of Applied
        Auto-detected when patch
        found in package.json
        patchedDependencies
    end note
    
    note right of Dismissed
        Temporary dismissal
        with dismissedUntil timestamp
        Auto-reactivates on expiry
    end note
```

---

### 2. Data Flow Architecture

```mermaid
graph TB
    subgraph "Phase 1: Predictive"
        A[Historical Trends] --> B[Anomaly Detection]
        B --> C[Predictive Recommendations]
    end
    
    subgraph "Phase 2: Project Context"
        D[package.json] --> E[Dependency Detection]
        E --> F[Confidence Boost]
        F --> G[Contextual Queries]
    end
    
    subgraph "Phase 3: Lifecycle"
        C --> H[createRecommendationEntry]
        G --> H
        H --> I[mcp-recommendations-log.json]
        
        I --> J[syncRecommendationStatuses]
        J --> K{Check package.json}
        K -->|Patch Found| L[Status: applied]
        K -->|No Patch| M[Status: generated]
        
        L --> N[recordEffectivenessMeasurement]
        N --> O{Improvement?}
        O -->|> 0%| P[Status: effective]
        O -->|< -5%| Q[Status: ineffective]
        
        M --> R[dismissPatchRecommendation]
        R --> S[Status: dismissed]
        S -->|Expires| M
    end
    
    subgraph "Learning System"
        P --> T[updateLearnedPackage]
        Q --> T
        T --> U[learned-packages.json]
    end
    
    style H fill:#e1f5ff
    style I fill:#fff4e1
    style L fill:#e8f5e9
    style Q fill:#ffebee
```

---

### 3. Status Transition Diagram

```mermaid
graph LR
    A[Generated<br/>status: generated] -->|syncRecommendationStatuses<br/>checkPatchApplied| B{Patch Applied?}
    
    B -->|Yes| C[Applied<br/>status: applied<br/>appliedTimestamp set]
    B -->|No| D[Still Generated<br/>status: generated]
    
    A -->|dismissPatchRecommendation| E[Dismissed<br/>status: dismissed<br/>dismissedUntil set]
    
    E -->|isRecommendationActive<br/>dismissedUntil expired| D
    
    C -->|recordEffectivenessMeasurement| F{Effectiveness?}
    
    F -->|improvementPercent > 0%| G[Effective<br/>status: applied<br/>effectivenessData set]
    F -->|improvementPercent < -5%| H[Ineffective<br/>status: ineffective<br/>effectivenessData set]
    
    D -->|getPatchRecommendations| A
    
    style A fill:#fff9c4
    style C fill:#c8e6c9
    style E fill:#ffccbc
    style G fill:#a5d6a7
    style H fill:#ef9a9a
```

---

### 4. System Component Architecture

```mermaid
graph TB
    subgraph "Core Functions"
        A[getPatchRecommendations]
        B[commitPatchWithResources]
        C[syncRecommendationStatuses]
    end
    
    subgraph "Lifecycle Management"
        D[createRecommendationEntry]
        E[updateRecommendationStatus]
        F[recordEffectivenessMeasurement]
        G[isRecommendationActive]
    end
    
    subgraph "Dismiss System"
        H[dismissPatchRecommendation]
        I[dismissPackageRecommendations]
    end
    
    subgraph "Detection"
        J[checkPatchApplied]
        K[getRecommendationsByPackage]
    end
    
    subgraph "Storage"
        L[mcp-recommendations-log.json]
        M[package.json<br/>patchedDependencies]
    end
    
    A --> C
    A --> D
    A --> G
    
    B --> E
    B --> K
    
    C --> J
    J --> M
    
    D --> L
    E --> L
    F --> L
    G --> L
    
    H --> E
    I --> E
    
    K --> L
    
    style L fill:#fff4e1
    style M fill:#e3f2fd
    style A fill:#e1f5ff
    style B fill:#e8f5e9
```

---

### 5. Complete Workflow Sequence

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Log as Recommendation Log
    participant PackageJSON
    participant Metrics
    
    User->>System: getPatchRecommendations()
    System->>Log: syncRecommendationStatuses()
    Log->>PackageJSON: checkPatchApplied()
    PackageJSON-->>Log: Patch status
    Log->>Log: Update statuses
    
    System->>System: Generate recommendations
    System->>Log: createRecommendationEntry()
    Log-->>System: recommendationId
    System-->>User: Return recommendations
    
    User->>System: dismissPatchRecommendation(id)
    System->>Log: updateRecommendationStatus(id, "dismissed")
    Log-->>System: Success
    
    User->>System: bun patch --commit zod
    System->>PackageJSON: Update patchedDependencies
    System->>Log: updateRecommendationStatus(id, "applied")
    Log-->>System: Success
    
    Note over Metrics: Observation Window (24h)
    
    Metrics->>System: recordEffectivenessMeasurement(id, data)
    System->>Log: Update effectivenessData
    System->>Log: Check improvementPercent
    alt improvementPercent < -5%
        Log->>Log: status = "ineffective"
    else improvementPercent > 0%
        Log->>Log: status = "applied" (effective)
    end
```

---

### 6. Node Graph: Recommendation States

```mermaid
graph TD
    Start([Start]) --> Generate[Generate Recommendation]
    
    Generate --> CheckActive{Is Active?}
    
    CheckActive -->|Yes| Show[Show Recommendation]
    CheckActive -->|No| Filter[Filter Out]
    
    Show --> UserAction{User Action}
    
    UserAction -->|Dismiss| Dismiss[Dismiss Recommendation]
    UserAction -->|Apply| Apply[Apply Patch]
    UserAction -->|Ignore| Wait[Wait]
    
    Dismiss --> SetDismissed[Set dismissedUntil]
    SetDismissed --> CheckExpiry{Expired?}
    CheckExpiry -->|Yes| Generate
    CheckExpiry -->|No| Filter
    
    Apply --> Commit[Commit Patch]
    Commit --> UpdateJSON[Update package.json]
    UpdateJSON --> Sync[Sync Statuses]
    Sync --> SetApplied[Set status: applied]
    
    SetApplied --> Measure[Measure Effectiveness]
    Measure --> CheckEffect{Effective?}
    
    CheckEffect -->|Yes| Success([Success])
    CheckEffect -->|No| Failure([Failure])
    
    Wait --> Sync
    
    Filter --> End([End])
    Success --> End
    Failure --> End
    
    style Generate fill:#fff9c4
    style Apply fill:#c8e6c9
    style Dismiss fill:#ffccbc
    style Success fill:#a5d6a7
    style Failure fill:#ef9a9a
```

---

### 7. Data Model Relationships

```mermaid
erDiagram
    RECOMMENDATION_LOG ||--o{ RECOMMENDATION_STATUS : has
    RECOMMENDATION_LOG ||--o| EFFECTIVENESS_DATA : measures
    RECOMMENDATION_LOG ||--o{ DEPENDENCY_PATH : references
    PACKAGE_JSON ||--o{ PATCHED_DEPENDENCY : contains
    
    RECOMMENDATION_LOG {
        string recommendationId PK
        number timestamp
        string package
        string version
        string reason
        string urgency
        number confidence
        string source
        boolean isProjectDependency
    }
    
    RECOMMENDATION_STATUS {
        string status
        number appliedTimestamp
        number dismissedUntil
        string feedback
    }
    
    EFFECTIVENESS_DATA {
        string metric
        number before
        number after
        number improvementPercent
        number measuredAt
    }
    
    DEPENDENCY_PATH {
        array path
    }
    
    PATCHED_DEPENDENCY {
        string package
        string patchFile
    }
```

---

### 8. Integration Points Flow

```mermaid
graph TB
    subgraph "Phase 1: Predictive"
        P1[Trend Analysis]
    end
    
    subgraph "Phase 2: Context"
        P2[Project Dependencies]
    end
    
    subgraph "Phase 3: Lifecycle"
        P3A[Create Entry]
        P3B[Sync Statuses]
        P3C[Measure Effectiveness]
        P3D[Dismiss Mechanism]
    end
    
    subgraph "Storage Layer"
        S1[mcp-recommendations-log.json]
        S2[package.json]
        S3[learned-packages.json]
    end
    
    subgraph "Learning System"
        L1[updateLearnedPackage]
        L2[getLearnedPackages]
    end
    
    P1 --> P3A
    P2 --> P3A
    P3A --> S1
    
    P3B --> S2
    S2 --> P3B
    
    P3C --> S1
    P3C --> L1
    L1 --> S3
    
    P3D --> S1
    S1 --> P3D
    
    L2 --> P1
    L2 --> P2
    
    style P3A fill:#e1f5ff
    style P3B fill:#e8f5e9
    style P3C fill:#fff4e1
    style P3D fill:#ffebee
    style S1 fill:#f3e5f5
```

---

### 9. Status Decision Tree

```mermaid
flowchart TD
    Start([Recommendation Created]) --> Status{Current Status}
    
    Status -->|generated| CheckPatch{Patch Applied?}
    Status -->|dismissed| CheckExpiry{Dismissal Expired?}
    Status -->|applied| CheckEffect{Effectiveness Measured?}
    Status -->|ineffective| End1([End: Ineffective])
    
    CheckPatch -->|Yes| SetApplied[Set status: applied<br/>Set appliedTimestamp]
    CheckPatch -->|No| Show[Show Recommendation]
    
    CheckExpiry -->|Yes| Reactivate[Reactivate: generated]
    CheckExpiry -->|No| Filter[Filter Out]
    
    CheckEffect -->|Yes| CheckImprovement{Improvement > 0%?}
    CheckEffect -->|No| Wait[Wait for Measurement]
    
    CheckImprovement -->|Yes| Success([Success])
    CheckImprovement -->|No| SetIneffective[Set status: ineffective]
    
    SetApplied --> Wait
    Reactivate --> Show
    SetIneffective --> End1
    Wait --> CheckEffect
    
    Show --> UserAction{User Action}
    UserAction -->|Dismiss| Dismiss[Set dismissedUntil]
    UserAction -->|Apply| Apply[Apply Patch]
    UserAction -->|Ignore| CheckPatch
    
    Dismiss --> Filter
    Apply --> SetApplied
    
    Filter --> End2([End: Filtered])
    Success --> End3([End: Success])
    
    style Start fill:#fff9c4
    style SetApplied fill:#c8e6c9
    style Success fill:#a5d6a7
    style SetIneffective fill:#ef9a9a
    style Filter fill:#ffccbc
```

---

### 10. Complete System Overview

```mermaid
graph TB
    subgraph "Input Sources"
        I1[Historical Trends]
        I2[Bun Documentation]
        I3[Project Dependencies]
        I4[Learned Packages]
    end
    
    subgraph "Processing"
        P1[getPatchRecommendations]
        P2[Anomaly Detection]
        P3[Context Analysis]
        P4[Lifecycle Management]
    end
    
    subgraph "Storage"
        S1[mcp-recommendations-log.json]
        S2[package.json]
        S3[learned-packages.json]
        S4[mcp-patch-config.json]
    end
    
    subgraph "Output"
        O1[Recommendations]
        O2[Status Updates]
        O3[Effectiveness Metrics]
        O4[Learning Updates]
    end
    
    I1 --> P2
    I2 --> P3
    I3 --> P3
    I4 --> P1
    
    P2 --> P1
    P3 --> P1
    P1 --> P4
    
    P4 --> S1
    P4 --> S2
    P4 --> S3
    
    S1 --> O1
    S1 --> O2
    S1 --> O3
    S3 --> O4
    
    S4 --> P1
    S4 --> P2
    S4 --> P4
    
    style P1 fill:#e1f5ff
    style P4 fill:#e8f5e9
    style S1 fill:#fff4e1
    style O1 fill:#f3e5f5
```

---

## 📝 Usage in Documentation

These diagrams can be embedded in:

1. **Markdown files** - GitHub, GitLab, etc. support Mermaid
2. **Documentation sites** - MkDocs, Docusaurus, etc.
3. **Notion/Obsidian** - With Mermaid plugins
4. **VS Code** - With Mermaid preview extensions

### Example Embedding

```markdown
# My Documentation

Here's the lifecycle flow:

```mermaid
stateDiagram-v2
    [*] --> Generated
    Generated --> Applied
    ...
```

```

---

## 🎨 Diagram Types

1. **State Diagram** - Status transitions
2. **Flowchart** - Decision trees and workflows
3. **Sequence Diagram** - Interaction sequences
4. **Graph** - Component relationships
5. **ER Diagram** - Data model relationships

All diagrams use Mermaid syntax and can be rendered in any Mermaid-compatible viewer.

