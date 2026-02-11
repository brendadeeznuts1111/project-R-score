export type Domain =
  | "presentation"
  | "orchestration"
  | "protocol"
  | "security"
  | "performance"
  | "observability";

const graphs: Record<Domain, string> = {
  presentation: `flowchart TD
    Start(["User Input"]) --> Q1{"Interface Type?"}
    Q1 -->|"CLI"| CLI["Terminal Output"]
    Q1 -->|"Web"| Web["Dashboard UI"]
    Q1 -->|"API"| API["JSON API"]`,

  orchestration: `flowchart TD
    Start(["Script Request"]) --> Q1{"Execution Mode?"}
    Q1 -->|"Watch"| P["--parallel"]
    Q1 -->|"Memory"| S["--sequential"]
    Q1 -->|"Deps"| F["--filter"]`,

  protocol: `flowchart TD
    Start(["URL Request"]) --> Q1{"Protocol?"}
    Q1 -->|"http:"| H1["HTTP Handler"]
    Q1 -->|"https:"| H2["HTTPS Handler"]
    Q1 -->|"s3:"| S1["S3 Handler"]`,

  security: `flowchart TD
    Start(["Request"]) --> Q1{"Auth Required?"}
    Q1 -->|"Yes"| A1["Auth Manager"]
    Q1 -->|"No"| P1["Proxy Handler"]
    A1 --> A2{"Method?"}`,

  performance: `flowchart TD
    Start(["Optimize"]) --> Q1{"Bottleneck?"}
    Q1 -->|"CPU"| C1["CPU Profiler"]
    Q1 -->|"Memory"| M1["Bytecode Compile"]
    Q1 -->|"Throughput"| T1["SIMD Optimize"]`,

  observability: `flowchart TD
    Start(["Observe"]) --> Q1{"Data Type?"}
    Q1 -->|"Metrics"| M1["Collector"]
    Q1 -->|"Logs"| L1["Aggregator"]
    Q1 -->|"Alerts"| A1["Alert Manager"]`,
};

const fullHierarchy = `flowchart TB
    subgraph "Tier-1380 Platform"
      direction TB
      P["Presentation"] --> O["Orchestration"]
      O --> Pr["Protocol"]
      Pr --> S["Security"]
      O --> Pe["Performance"]
      Pe --> Ob["Observability"]
    end`;

export function renderDomainGraph(domain: Domain): string {
  return wrapMermaid(graphs[domain]);
}

export function renderFullHierarchy(): string {
  return wrapMermaid(fullHierarchy);
}

export function listDomains(): Domain[] {
  return Object.keys(graphs) as Domain[];
}

function wrapMermaid(body: string): string {
  return ["```mermaid", body, "```"].join("\n");
}

if (import.meta.main) {
  const arg = process.argv[2];
  if (!arg || arg === "full") {
    console.log(renderFullHierarchy());
    process.exit(0);
  }
  if (arg === "list") {
    console.log(listDomains().join("\n"));
    process.exit(0);
  }
  if (arg in graphs) {
    console.log(renderDomainGraph(arg as Domain));
    process.exit(0);
  }
  console.error(`Unknown domain: ${arg}`);
  process.exit(1);
}
