export const mermaidGraphs = {
  flow: `flowchart TD
    A["Script Execution"] --> B{"Select Mode"}
    B -->|"Watch Scripts"| C["--parallel"]
    B -->|"Memory Constrained"| D["--sequential"]
    B -->|"Cross-Package Deps"| E["--filter"]
    B -->|"Default"| C
    C --> F["Start All Immediately"]
    D --> G["One at a Time"]
    E --> H["Resolve Dependencies"]`,

  grouping: `flowchart LR
    A["prebuild"] --> B["build"]
    B --> C["postbuild"]
    D["pretest"] --> E["test"]
    E --> F["posttest"]`,

  filter: `flowchart TD
    A["pkg:utils"] --> B["pkg:core"]
    A --> C["pkg:helpers"]
    B --> D["app:frontend"]
    B --> E["app:backend"]
    C --> E`,

  sequence: `sequenceDiagram
    participant User
    participant CLI as bun run
    participant Runner as Parallel Runner
    User->>CLI: --parallel build test
    CLI->>Runner: execute grouped scripts`,

  decision: `flowchart TD
    Start(["Start"]) --> Q1{"Watch scripts?"}
    Q1 -->|"Yes"| Parallel["--parallel"]
    Q1 -->|"No"| Q2{"Need dependency order?"}
    Q2 -->|"Yes"| Filter["--filter"]
    Q2 -->|"No"| Sequential["--sequential"]`,
} as const;

export function renderGraph(type: keyof typeof mermaidGraphs): string {
  const body = mermaidGraphs[type];
  return [
    "```mermaid",
    body,
    "```",
  ].join("\n");
}

if (import.meta.main) {
  const key = (process.argv[2] || "flow") as keyof typeof mermaidGraphs;
  if (!(key in mermaidGraphs)) {
    console.error(`Unknown graph type: ${key}`);
    process.exit(1);
  }
  console.log(renderGraph(key));
}
