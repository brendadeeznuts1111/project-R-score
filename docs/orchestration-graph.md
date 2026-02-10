# Orchestration Graphs (Bun v1.3.9)

These diagrams document script orchestration semantics for:
- `bun run --parallel`
- `bun run --sequential`
- `bun --filter`
- Bun automatic pre/post grouping (`pre<name>` -> `<name>` -> `post<name>`)

## Orchestration Flow

```mermaid
flowchart TD
    A["Script Execution"] --> B{"Select Mode"}

    B -->|"Watch Scripts"| C["--parallel"]
    B -->|"Memory Constrained"| D["--sequential"]
    B -->|"Cross-Package Deps"| E["--filter"]
    B -->|"Default"| C

    C --> F["Start All Immediately"]
    D --> G["One at a Time"]
    E --> H["Resolve Dependencies"]

    F --> I["Interleaved Prefixed Output"]
    G --> J["Ordered Output"]
    H --> K["Package-Grouped Output"]

    I --> L{"Failure?"}
    J --> L
    K --> L

    L -->|"Yes + Default"| M["Kill All"]
    L -->|"Yes + --no-exit-on-error"| N["Continue Others"]
    L -->|"No"| O["Complete"]

    M --> P["Exit Error"]
    N --> O
    O --> Q["Report Results"]
```

## Pre/Post Grouping

```mermaid
flowchart LR
    subgraph "Build Group"
        A["prebuild<br/>lint"] --> B["build<br/>compile"]
        B --> C["postbuild<br/>deploy"]
    end

    subgraph "Test Group"
        D["pretest<br/>setup"] --> E["test<br/>run"]
        E --> F["posttest<br/>cleanup"]
    end

    subgraph "Lint Group"
        G["prelint<br/>check"] --> H["lint<br/>eslint"]
        H --> I["postlint<br/>report"]
    end

    A -.->|"parallel"| D
    B -.->|"parallel"| E
    C -.->|"parallel"| F
```

## Filter Dependency Order

```mermaid
flowchart TD
    subgraph "Monorepo Packages"
        A["pkg:utils"] --> B["pkg:core"]
        A --> C["pkg:helpers"]
        B --> D["app:frontend"]
        B --> E["app:backend"]
        C --> E
    end

    F["bun --filter build"] --> G{"Dependency Order"}

    G -->|"First"| A
    G -->|"Second"| B
    G -->|"Second"| C
    G -->|"Last"| D
    G -->|"Last"| E

    H["--parallel"] -.->|"Ignores"| I["Dep Order"]
    J["--sequential"] -.->|"Ignores"| I
    F -->|"Respects"| I
```

## Tier-1380 Sequence

```mermaid
sequenceDiagram
    participant User
    participant CLI as bun run
    participant Parser as Script Parser
    participant Grouper as Pre/Post Grouper
    participant Runner as Parallel Runner
    participant P1 as prebuild
    participant P2 as build
    participant P3 as postbuild

    User->>CLI: --parallel build test
    CLI->>Parser: Parse package.json
    Parser->>Grouper: Extract scripts

    Grouper->>Grouper: Group prebuild/build/postbuild
    Grouper->>Grouper: Group pretest/test/posttest

    CLI->>Runner: Execute groups in parallel

    par Build Group
        Runner->>P1: Start prebuild
        P1-->>Runner: Complete
        Runner->>P2: Start build
        P2-->>Runner: Complete
        Runner->>P3: Start postbuild
        P3-->>Runner: Complete
    and Test Group
        Runner->>P1: Start pretest
        P1-->>Runner: Complete
        Runner->>P2: Start test
        P2-->>Runner: Complete
        Runner->>P3: Start posttest
        P3-->>Runner: Complete
    end

    Runner-->>CLI: All groups complete
    CLI-->>User: Exit 0
```

## Decision Matrix

```mermaid
flowchart TD
    Start(["Start"]) --> Q1{"Long-running<br/>watch scripts?"}

    Q1 -->|"Yes"| Parallel["--parallel<br/>Non-blocking"]
    Q1 -->|"No"| Q2{"Memory<br/>constrained?"}

    Q2 -->|"Yes"| Sequential["--sequential<br/>One at a time"]
    Q2 -->|"No"| Q3{"Cross-package<br/>dependencies?"}

    Q3 -->|"Yes"| Filter["--filter<br/>Respects deps"]
    Q3 -->|"No"| Parallel

    Parallel --> P1["Start all immediately"]
    Sequential --> P2["Queue sequentially"]
    Filter --> P3["Resolve dep graph"]

    P1 --> Output["Interleaved prefixed"]
    P2 --> Output
    P3 --> Output2["Package-grouped"]

    Output --> Fail{"Failure?"}
    Output2 --> Fail

    Fail -->|"Default"| Kill["Kill all scripts"]
    Fail -->|"--no-exit-on-error"| Continue["Continue others"]

    Kill --> Exit1["Exit error"]
    Continue --> Exit2["Exit with report"]
    Output --> Exit3["Exit success"]
```

