# Domain Hierarchy Graphs (Tier-1380)

## Domain Hierarchy

```mermaid
flowchart TB
    subgraph "Tier-1380 Platform"
        direction TB

        subgraph "Presentation Domain"
            P1["CLI Interface"]
            P2["Dashboard UI"]
            P3["API Gateway"]
        end

        subgraph "Orchestration Domain"
            O1["Script Runner"]
            O2["Mode Selector"]
            O3["Process Pool"]
            O4["Resilience Chain"]
        end

        subgraph "Protocol Domain"
            Pr1["HTTP/HTTPS"]
            Pr2["S3/File"]
            Pr3["Unix Socket"]
            Pr4["WebSocket"]
        end

        subgraph "Security Domain"
            S1["Auth Manager"]
            S2["Proxy Handler"]
            S3["TLS/mTLS"]
            S4["NO_PROXY Filter"]
        end

        subgraph "Performance Domain"
            Pe1["CPU Profiler"]
            Pe2["Bytecode Compiler"]
            Pe3["SIMD Optimizer"]
            Pe4["Cache Layer"]
        end

        subgraph "Observability Domain"
            Ob1["Metrics Collector"]
            Ob2["Mini Dashboard"]
            Ob3["Alert Manager"]
            Ob4["Log Aggregator"]
        end
    end

    P1 --> O1
    P2 --> O2
    P3 --> O4

    O1 --> Pr1
    O2 --> Pr2
    O3 --> Pr3
    O4 --> Pr4

    Pr1 --> S3
    Pr2 --> S2
    Pr3 --> S1
    Pr4 --> S4

    O1 --> Pe1
    O2 --> Pe2
    O3 --> Pe3
    O4 --> Pe4

    Pe1 --> Ob1
    Pe2 --> Ob2
    Pe3 --> Ob3
    Pe4 --> Ob4
```

## Tension Map

```mermaid
flowchart LR
    subgraph "High Tension"
        T1["Parallel vs Sequential<br/>Memory vs Speed"]
        T2["Filter vs Parallel<br/>Deps vs Throughput"]
        T3["Security vs Performance<br/>Validation vs Latency"]
    end

    subgraph "Medium Tension"
        T4["Watch Scripts vs Build<br/>Long-lived vs One-shot"]
        T5["ARM vs x64<br/>Compatibility vs Optimization"]
        T6["Bytecode vs Source<br/>Startup vs Debuggability"]
    end

    subgraph "Low Tension"
        T7["Markdown SIMD<br/>Universal benefit"]
        T8["Abort Optimize<br/>Low-cost gain"]
        T9["NO_PROXY Fix<br/>Behavior correctness"]
    end

    T1 -->|"Resolve"| R1["Auto-mode selection"]
    T2 -->|"Resolve"| R2["Hybrid orchestration"]
    T3 -->|"Resolve"| R3["Lazy validation"]
```

## Domain-Scoped Trees

### Presentation Domain

```mermaid
flowchart TD
    Start(["User Input"]) --> Q1{"Interface Type?"}
    Q1 -->|"CLI"| CLI["Terminal Output"]
    Q1 -->|"Web"| Web["Dashboard UI"]
    Q1 -->|"API"| API["JSON API"]
    CLI --> C1{"Verbosity?"}
    Web --> W1{"Live Updates?"}
    API --> A1{"Format?"}
    C1 -->|"High"| C2["Verbose output"]
    C1 -->|"Low"| C3["Default output"]
    W1 -->|"Yes"| W2["WebSocket stream"]
    W1 -->|"No"| W3["Static render"]
    A1 -->|"JSON"| A2["application/json"]
    A1 -->|"YAML"| A3["application/yaml"]
```

### Orchestration Domain

```mermaid
flowchart TD
    Start(["Script Request"]) --> Q1{"Execution Mode?"}
    Q1 -->|"Watch"| P["--parallel"]
    Q1 -->|"Memory"| S["--sequential"]
    Q1 -->|"Deps"| F["--filter"]
    P --> P1{"Failure?"}
    S --> S1{"Failure?"}
    F --> F1{"Failure?"}
    P1 -->|"Yes"| P2["--no-exit-on-error?"]
    S1 -->|"Yes"| S2["Kill remaining"]
    F1 -->|"Yes"| F2["Block dependents"]
    P2 -->|"Yes"| P3["Continue others"]
    P2 -->|"No"| P4["Kill all"]
```

### Protocol Domain

```mermaid
flowchart TD
    Start(["URL Request"]) --> Q1{"Protocol?"}
    Q1 -->|"http:"| H1["HTTP Handler"]
    Q1 -->|"https:"| H2["HTTPS Handler"]
    Q1 -->|"s3:"| S1["S3 Handler"]
    Q1 -->|"file:"| F1["File Handler"]
    Q1 -->|"unix:"| U1["Unix Socket Handler"]
    Q1 -->|"ws:"| W1["WebSocket Handler"]
    H1 --> C1{"NO_PROXY?"}
    C1 -->|"Yes"| C1a["Bypass Proxy"]
    C1 -->|"No"| C1b["Use Proxy"]
```

### Security Domain

```mermaid
flowchart TD
    Start(["Request"]) --> Q1{"Auth Required?"}
    Q1 -->|"Yes"| A1["Auth Manager"]
    Q1 -->|"No"| P1["Proxy Handler"]
    A1 --> A2{"Method?"}
    A2 -->|"Bearer"| A3["JWT Validate"]
    A2 -->|"mTLS"| A4["Cert Validate"]
    A2 -->|"API Key"| A5["Key Validate"]
    A3 --> V1{"Valid?"}
    V1 -->|"Yes"| P1
    V1 -->|"No"| R1["Reject 401"]
```

### Performance Domain

```mermaid
flowchart TD
    Start(["Optimize"]) --> Q1{"Bottleneck?"}
    Q1 -->|"CPU"| C1["CPU Profiler"]
    Q1 -->|"Memory"| M1["Bytecode Compile"]
    Q1 -->|"Throughput"| T1["SIMD Optimize"]
    Q1 -->|"Latency"| L1["Cache Layer"]
    C1 --> C2{"Hotspot?"}
    C2 -->|"JIT"| C3["Optimize JS"]
    C2 -->|"I/O"| C4["Batch/async"]
```

### Observability Domain

```mermaid
flowchart TD
    Start(["Observe"]) --> Q1{"Data Type?"}
    Q1 -->|"Metrics"| M1["Collector"]
    Q1 -->|"Logs"| L1["Aggregator"]
    Q1 -->|"Traces"| T1["Tracer"]
    Q1 -->|"Alerts"| A1["Alert Manager"]
    A1 --> A2{"Severity?"}
    A2 -->|"P0"| A3["Page + SMS"]
    A2 -->|"P1"| A4["Slack + Email"]
    A2 -->|"P2"| A5["Dashboard only"]
```
