import { createMermaidTheme } from "./utils/colors";

const mermaid = `graph TD
  subgraph Frontend
    A[React App] --> B[FileAnalyzer]
    B --> C[Drag & Drop]
  end
  
  subgraph API
    D[Hono Server] --> E[Analyze Endpoint]
    E --> F[File Processing]
  end
  
  ${createMermaidTheme()}
  
  A --> D
  classDef frontend fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
  classDef api fill:#22c55e,stroke:#16a34a,stroke-width:2px,color:#fff`;

console.log("Architecture Diagram:");
console.log(mermaid);
console.log("\n# Save to docs/diagrams/architecture.mermaid");
