import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { validateProjectId, createProjectContext, logProjectContext } from "../src/project-utils.ts";

interface SetupOptions {
  projectId: string;
  template: "minimal" | "full" | "websocket" | "ml";
  includeTests: boolean;
  includeCI: boolean;
  skipInstall?: boolean;
}

const TEMPLATES = {
  minimal: {
    dependencies: ["@types/bun", "typescript", "zod"],
    devDependencies: ["bun-types"],
    files: {
      "src/index.ts": `// Minimal Odds Protocol Application
console.log("🚀 Odds Protocol Minimal App Started");

export function greet(name: string): string {
  return \`Hello from \${name}!\`;
}

if (import.meta.main) {
  console.log(greet("Odds Protocol"));
}`,
      "README.md": `# Minimal Odds Protocol App

## Getting Started
\`\`\`bash
bun run dev
\`\`\`

## Features
- Bun runtime optimization
- TypeScript support
- Minimal configuration
`,
      "bunfig.toml": `# Minimal Bun Configuration
[install]
cache = true
frozen-lockfile = false

[test]
concurrent = true
timeout = 5000
`,
    },
  },
  full: {
    dependencies: [
      "@types/bun",
      "typescript",
      "zod",
      "fast-check",
      "@js-temporal/polyfill",
      "uuid",
      "debug",
    ],
    devDependencies: [
      "bun-types",
      "vitest",
      "@vitest/coverage-v8",
      "happy-dom",
      "eslint",
      "@typescript-eslint/parser",
      "@typescript-eslint/eslint-plugin",
    ],
    files: {
      "src/index.ts": `// Full Odds Protocol Application
import { z } from "zod";

const AppConfig = z.object({
  port: z.number().default(3000),
  host: z.string().default("localhost"),
  env: z.enum(["development", "production"]).default("development"),
});

const config = AppConfig.parse(process.env);

console.log("🚀 Odds Protocol Full App Started");
console.log(\`📍 Server: http://\${config.host}:\${config.port}\`);
console.log(\`🌍 Environment: \${config.env}\`);

export { config };

if (import.meta.main) {
  console.log("Server running in production mode");
}`,
      "src/utils/logger.ts": `import { debug } from "debug";

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(\`ℹ️  \${message}\`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(\`❌ \${message}\`, ...args);
  },
  debug: debug("odds:app"),
  warn: (message: string, ...args: any[]) => {
    console.warn(\`⚠️  \${message}\`, ...args);
  },
};`,
      "__tests__/basic.test.ts": `import { describe, it, expect } from "vitest";
import { config } from "../src/index";

describe("Basic Tests", () => {
  it("should have valid config", () => {
    expect(config).toBeDefined();
    expect(config.port).toBeTypeOf("number");
    expect(config.host).toBeTypeOf("string");
  });

  it("should handle environment variables", () => {
    expect(config.env).toMatch(/development|production/);
  });
});`,
      "bun.test.toml": `# Test Configuration
[test]
concurrent = true
timeout = 10000
coverage = true

[coverage]
provider = "v8"
reporter = ["text", "html"]
threshold = 80
`,
      "README.md": `# Full Odds Protocol App

## Features
- ✅ TypeScript support
- ✅ Comprehensive testing
- ✅ Linting and formatting
- ✅ Development tools
- ✅ Production optimization

## Development
\`\`\`bash
bun run dev
bun run test
bun run lint
\`\`\`

## Production
\`\`\`bash
bun run build
bun run start
\`\`\``,
    },
  },
  websocket: {
    dependencies: [
      "@types/bun",
      "typescript",
      "zod",
      "uWebSockets.js",
      "ws",
      "@types/ws",
    ],
    devDependencies: ["bun-types", "vitest", "@vitest/coverage-v8"],
    files: {
      "src/server.ts": `// High-Performance WebSocket Server
import uWS from "uWebSockets.js";

const port = Number(process.env.PORT) || 3001;

const app = uWS.App({
  key_file_name: "key.pem",
  cert_file_name: "cert.pem",
  passphrase: "1234",
}).ws("/*", {
  /* Options */
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 10,
  /* Handlers */
  open: (ws) => {
    console.log("A WebSocket connected!");
    ws.subscribe("odds:updates");
    ws.send("Welcome to Odds Protocol WebSocket!");
  },
  message: (ws, message, isBinary) => {
    const messageStr = Buffer.from(message).toString();
    console.log(\`Received message: \${messageStr}\`);
    
    // Echo back with timestamp
    ws.send(\`Echo: \${messageStr} at \${new Date().toISOString()}\`);
  },
  drain: (ws) => {
    console.log("WebSocket backpressure: " + ws.getBufferedAmount());
  },
  close: (ws, code, message) => {
    console.log("WebSocket closed");
  },
}).get("/*", (res, req) => {
  res.end("Nothing to see here!");
}).listen(port, (token) => {
  if (token) {
    console.log(\`🚀 WebSocket server listening on port \${port}\`);
  } else {
    console.log(\`❌ Failed to listen on port \${port}\`);
  }
});

export default app;`,
      "src/client.ts": `// WebSocket Client Example
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3001");

ws.on("open", () => {
  console.log("Connected to WebSocket server");
  ws.send("Hello from client!");
});

ws.on("message", (data) => {
  console.log(\`Received: \${data}\`);
});

ws.on("error", (error) => {
  console.error(\`WebSocket error: \${error}\`);
});

ws.on("close", () => {
  console.log("WebSocket connection closed");
});

export { ws };`,
      "__tests__/websocket.test.ts": `import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";

describe("WebSocket Server", () => {
  let server: any;
  let client: WebSocket;

  beforeAll(async () => {
    // Start server in test mode
    process.env.PORT = "3002";
    server = await import("../src/server");
  });

  afterAll(() => {
    if (client) client.close();
  });

  const WS_TEST_HOST = process.env.WS_TEST_HOST || process.env.SERVER_HOST || 'localhost';
  const WS_TEST_PORT = parseInt(process.env.WS_TEST_PORT || '3002', 10);
  it("should establish WebSocket connection", (done) => {
    client = new WebSocket(`ws://${WS_TEST_HOST}:${WS_TEST_PORT}`);

    client.on("open", () => {
      expect(client.readyState).toBe(WebSocket.OPEN);
      done();
    });

    client.on("error", done);
  });

  it("should echo messages", (done) => {
    client = new WebSocket(`ws://${WS_TEST_HOST}:${WS_TEST_PORT}`);

    client.on("open", () => {
      client.send("test message");
    });

    client.on("message", (data) => {
      expect(data.toString()).toContain("Echo: test message");
      done();
    });

    client.on("error", done);
  });
});`,
      "README.md": `# WebSocket Odds Protocol App

## Features
- ⚡ Ultra-high performance WebSocket server
- 🔄 Real-time bidirectional communication
- 📊 Message compression and optimization
- 🛡️ Built-in security and validation

## Quick Start
\`\`\`bash
bun run dev
\`\`\`

## Testing
\`\`\`bash
bun run test:websocket
\`\`\``,
    },
  },
  ml: {
    dependencies: [
      "@types/bun",
      "typescript",
      "zod",
      "@tensorflow/tfjs",
      "@tensorflow/tfjs-node",
      "ml-matrix",
      "simple-statistics",
    ],
    devDependencies: ["bun-types", "vitest", "@vitest/coverage-v8"],
    files: {
      "src/model.ts": `// Machine Learning Model for Odds Prediction
import * as tf from "@tensorflow/tfjs-node";

class OddsPredictionModel {
  private model: tf.LayersModel | null = null;
  
  constructor() {
    this.initializeModel();
  }

  private async initializeModel() {
    // Create a simple neural network for odds prediction
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [10], // 10 features
          units: 64,
          activation: "relu",
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: "relu",
        }),
        tf.layers.dense({
          units: 3, // 3 outcomes: win, lose, draw
          activation: "softmax",
        }),
      ],
    });

    this.model.compile({
      optimizer: "adam",
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });

    console.log("🧠 ML Model initialized");
  }

  async predict(features: number[]): Promise<number[]> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    const input = tf.tensor2d([features]);
    const prediction = this.model.predict(input) as tf.Tensor;
    const probabilities = await prediction.data();
    
    input.dispose();
    prediction.dispose();
    
    return Array.from(probabilities);
  }

  async train(data: number[][], labels: number[][]) {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    const features = tf.tensor2d(data);
    const targets = tf.tensor2d(labels);

    const history = await this.model.fit(features, targets, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
    });

    features.dispose();
    targets.dispose();

    return history.history;
  }
}

export const model = new OddsPredictionModel();
export { OddsPredictionModel };`,
      "src/predictor.ts": `// Odds Prediction Service
import { model } from "./model";

interface OddsData {
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds: number;
  timestamp: number;
}

export class OddsPredictor {
  static extractFeatures(data: OddsData): number[] {
    // Extract numerical features from odds data
    return [
      data.homeOdds,
      data.awayOdds,
      data.drawOdds,
      1 / data.homeOdds, // Implied probability
      1 / data.awayOdds,
      1 / data.drawOdds,
      data.timestamp % 86400, // Time of day
      Math.floor(data.timestamp / 86400) % 7, // Day of week
      (data.homeOdds - data.awayOdds) / data.awayOdds, // Relative odds
      data.drawOdds / Math.min(data.homeOdds, data.awayOdds), // Draw ratio
    ];
  }

  static async predictOutcome(data: OddsData): Promise<{
    win: number;
    lose: number;
    draw: number;
    recommendation: string;
  }> {
    const features = this.extractFeatures(data);
    const probabilities = await model.predict(features);

    const [winProb, loseProb, drawProb] = probabilities;
    
    let recommendation = "HOLD";
    if (winProb > 0.6) recommendation = "BET_HOME";
    else if (loseProb > 0.6) recommendation = "BET_AWAY";
    else if (drawProb > 0.4) recommendation = "BET_DRAW";

    return {
      win: winProb,
      lose: loseProb,
      draw: drawProb,
      recommendation,
    };
  }
}

export { OddsData };`,
      "__tests__/ml.test.ts": `import { describe, it, expect } from "vitest";
import { model, OddsPredictionModel } from "../src/model";
import { OddsPredictor, OddsData } from "../src/predictor";

describe("ML Model Tests", () => {
  it("should initialize model", async () => {
    expect(model).toBeDefined();
  });

  it("should make predictions", async () => {
    const features = Array(10).fill(0).map(() => Math.random());
    const predictions = await model.predict(features);
    
    expect(predictions).toHaveLength(3);
    expect(predictions.every(p => p >= 0 && p <= 1)).toBe(true);
  });

  it("should extract features from odds data", () => {
    const data: OddsData = {
      homeTeam: "Team A",
      awayTeam: "Team B",
      homeOdds: 2.5,
      awayOdds: 2.8,
      drawOdds: 3.2,
      timestamp: Date.now(),
    };

    const features = OddsPredictor.extractFeatures(data);
    expect(features).toHaveLength(10);
    expect(features.every(f => typeof f === "number")).toBe(true);
  });

  it("should predict outcome", async () => {
    const data: OddsData = {
      homeTeam: "Team A",
      awayTeam: "Team B",
      homeOdds: 2.5,
      awayOdds: 2.8,
      drawOdds: 3.2,
      timestamp: Date.now(),
    };

    const prediction = await OddsPredictor.predictOutcome(data);
    
    expect(prediction.win).toBeTypeOf("number");
    expect(prediction.lose).toBeTypeOf("number");
    expect(prediction.draw).toBeTypeOf("number");
    expect(prediction.recommendation).toMatch(/BET_|HOLD/);
  });
});`,
      "README.md": `# ML Odds Protocol App

## Features
- 🧠 TensorFlow.js integration
- 📊 Neural network for odds prediction
- 🎯 Smart betting recommendations
- 📈 Model training and evaluation

## Quick Start
\`\`\`bash
bun run dev
\`\`\`

## Training
\`\`\`bash
bun run train
\`\`\``,
    },
  },
};

async function executeCommand(cmd: string, cwd: string): Promise<string> {
  const proc = Bun.spawn({
    cmd: cmd.split(" "),
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }

  return output;
}

async function createProject(options: SetupOptions): Promise<void> {
  // Validate project ID
  const validatedProjectId = validateProjectId(options.projectId);
  const projectContext = createProjectContext(validatedProjectId);
  
  console.log(`🚀 Setting up ${projectContext.projectId}...`);
  logProjectContext(projectContext, true);

  // Create project directory
  const projectPath = join(process.cwd(), projectContext.projectId);
  
  if (await exists(projectPath)) {
    throw new Error(`Project directory ${projectContext.projectId} already exists`);
  }

  await executeCommand(`mkdir -p ${projectContext.projectId}`, process.cwd());
  console.log(`📁 Created directory: ${projectContext.projectId}`);

  // Initialize package.json
  const template = TEMPLATES[options.template];
  const packageJson = {
    name: projectContext.projectId,
    version: "1.0.0",
    description: `Odds Protocol ${options.template} template`,
    type: "module",
    main: "src/index.ts",
    scripts: {
      dev: "bun --watch run src/index.ts",
      start: "bun run src/index.ts",
      build: "bun build src/index.ts --outdir ./dist --target bun",
      test: "bun test",
      "test:watch": "bun test --watch",
      lint: "bunx eslint . --ext .ts",
      typecheck: "bunx tsc --noEmit",
    },
    dependencies: {},
    devDependencies: {},
    engines: {
      bun: ">=1.3.0",
    },
  };

  // Add dependencies based on template
  template.dependencies.forEach((dep: string) => {
    (packageJson.dependencies as Record<string, string>)[dep] = "latest";
  });

  template.devDependencies.forEach((dep: string) => {
    (packageJson.devDependencies as Record<string, string>)[dep] = "latest";
  });

  // Write package.json
  await Bun.write(
    join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Create project structure
  await executeCommand("mkdir -p src __tests__", projectPath);

  // Write template files
  for (const [filePath, content] of Object.entries(template.files as Record<string, string>)) {
    const fullPath = join(projectPath, filePath);
    const dir = dirname(fullPath);
    
    if (!existsSync(dir)) {
      await executeCommand(`mkdir -p ${dir}`, projectPath);
    }
    
    await Bun.write(fullPath, content);
    console.log(`📄 Created: ${filePath}`);
  }

  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/
bun.lockb

# Build outputs
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
logs
*.log

# Coverage
coverage/

# IDE
.vscode/
.idea/

# OS
.DS_Store
`;

  await Bun.write(join(projectPath, ".gitignore"), gitignore);

  // Install dependencies
  if (!options.skipInstall) {
    console.log("📦 Installing dependencies...");
    await executeCommand("bun install", projectPath);
  }

  // Create GitHub Actions if requested
  if (options.includeCI) {
    await createCIConfig(projectPath);
  }

  console.log(`✅ Project ${projectContext.projectId} created successfully!`);
  console.log();
  console.log("🎉 Next steps:");
  console.log(`   cd ${projectContext.projectId}`);
  console.log(`   bun run dev`);
}

async function createCIConfig(projectPath: string): Promise<void> {
  const ciConfig = `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        bun-version: [latest]
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: \${{ matrix.bun-version }}
        
    - name: Install dependencies
      run: bun install --frozen-lockfile
      
    - name: Type check
      run: bun run typecheck
      
    - name: Lint
      run: bun run lint
      
    - name: Test
      run: bun run test --coverage
      
    - name: Build
      run: bun run build

  security:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      
    - name: Install dependencies
      run: bun install
      
    - name: Security audit
      run: bun audit
`;

  await executeCommand("mkdir -p .github/workflows", projectPath);
  await Bun.write(join(projectPath, ".github/workflows/ci.yml"), ciConfig);
  console.log("🔄 Created GitHub Actions CI/CD");
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: bun run automated-setup.ts <project-name> [options]

Examples:
  bun run automated-setup.ts my-app --template=full
  bun run automated-setup.ts ws-server --template=websocket --include-ci
  bun run automated-setup.ts ml-model --template=ml --skip-install

Options:
  --template=<type>     Project template (minimal, full, websocket, ml)
  --include-tests       Include test setup (default: true)
  --include-ci          Include CI/CD setup (default: false)
  --skip-install        Skip dependency installation
  --help                Show this help
    `);
    process.exit(0);
  }

  const projectId = args[0];
  const options: SetupOptions = {
    projectId,
    template: "full",
    includeTests: true,
    includeCI: false,
  };

  // Parse options
  for (const arg of args.slice(1)) {
    if (arg === "--help") {
      // Show help and exit
      process.exit(0);
    } else if (arg.startsWith("--template=")) {
      const templateValue = arg.split("=")[1];
      if (!templateValue) {
        console.error("❌ Template value is required");
        process.exit(1);
      }
      const template = templateValue as SetupOptions["template"];
      if (!TEMPLATES[template]) {
        console.error(`❌ Invalid template: ${template}`);
        process.exit(1);
      }
      options.template = template;
    } else if (arg === "--include-tests") {
      options.includeTests = true;
    } else if (arg === "--include-ci") {
      options.includeCI = true;
    } else if (arg === "--skip-install") {
      options.skipInstall = true;
    }
  }

  try {
    await createProject(options);
  } catch (error: any) {
    console.error(`❌ Setup failed: ${error.message}`);
    process.exit(1);
  }
}

export { createProject, SetupOptions, TEMPLATES };
