#!/usr/bin/env bun
/**
 * OpenAPI Specification Generator
 * Generates comprehensive OpenAPI 3.0 spec with 14 unified tags
 * Discovers API endpoints from multiple sources
 */

import { join } from "path";
import { inspect } from "bun";

interface ApiEndpoint {
  path: string;
  method: string;
  handler: string;
  tags: string[];
  summary?: string;
  description?: string;
}

interface TagDefinition {
  name: string;
  description: string;
  color?: string;
}

const OPENAPI_TAGS: TagDefinition[] = [
  { name: "security", description: "Security scanning and vulnerability assessment", color: "#B60205" },
  { name: "performance", description: "Performance monitoring and benchmarking", color: "#FBCA04" },
  { name: "api", description: "Core API operations and endpoints", color: "#0E8A16" },
  { name: "cli", description: "Command-line interface operations", color: "#5319E7" },
  { name: "deployment", description: "Build, deployment, and distribution", color: "#006B75" },
  { name: "monitoring", description: "System monitoring and telemetry", color: "#D93F0B" },
  { name: "bun-runtime", description: "Bun runtime-specific features", color: "#FBCA04" },
  { name: "testing", description: "Test execution and validation", color: "#C5DEF5" },
  { name: "priority:high", description: "High priority features and fixes", color: "#B60205" },
  { name: "priority:medium", description: "Medium priority features", color: "#FBCA04" },
  { name: "priority:low", description: "Low priority features", color: "#0E8A16" },
  { name: "breaking-change", description: "Breaking changes and migrations", color: "#D93F0B" },
  { name: "dependencies", description: "Package management and dependencies", color: "#006B75" },
  { name: "refactor", description: "Code refactoring and cleanup", color: "#5319E7" }
];

const ROUTE_TAG_MAPPING: Record<string, string[]> = {
  // Security endpoints
  "/api/security-scan": ["security"],
  "/api/security/policy": ["security", "api"],

  // Performance endpoints
  "/api/run-test": ["testing", "performance"],
  "/api/baselines/comparison": ["performance", "monitoring"],

  // Package management
  "/api/pkg/get": ["dependencies", "api"],
  "/api/pkg/set": ["dependencies", "api"],
  "/api/pkg/fix": ["dependencies", "api"],
  "/api/pkg/version": ["dependencies", "deployment"],
  "/api/pkg/pack": ["dependencies", "deployment"],
  "/api/pkg/publish": ["dependencies", "deployment"],

  // Shell operations
  "/api/shell/run": ["cli", "bun-runtime"],
  "/api/shell/command": ["cli", "bun-runtime"],
  "/api/shell/commands": ["cli", "bun-runtime"],

  // HTML operations
  "/api/htmlrewriter/run": ["bun-runtime", "api"],
  "/api/large-html": ["performance", "api"],

  // Workflow operations
  "/api/workflow/convert-prompt": ["api", "refactor"],

  // Core API endpoints
  "/api/executables": ["deployment", "api"],
  "/api/health": ["monitoring", "api"],
  "/api/status": ["monitoring", "api"],
  "/api/agents": ["api", "monitoring"],
  "/api/commands": ["api", "cli"],
  "/api/workflows": ["api", "refactor"]
};

class OpenApiGenerator {
  private endpoints: ApiEndpoint[] = [];

  async discoverEndpoints(): Promise<void> {
    console.log("🔍 Discovering API endpoints...");

    // Discover from src/api/ directory
    await this.discoverFromApiDirectory();

    // Discover from main server file
    await this.discoverFromServerFile();

    console.log(`📊 Found ${this.endpoints.length} API endpoints`);
  }

  private async discoverFromApiDirectory(): Promise<void> {
    try {
      const apiDir = join(process.cwd(), "src", "api");

      // Use Bun-native Glob for file discovery
      const glob = new Bun.Glob("*.bun.ts");
      for await (const file of glob.scan(apiDir)) {
        const [route, method] = file.replace(".bun.ts", "").split(".");
        if (!route || !method) continue;

        const filePath = join(apiDir, file);
        const content = await Bun.file(filePath).text();

        // Extract path and summary from JSDoc
        const path = `/api/${route}`;
        const summary = this.extractSummary(content);
        const tags = ROUTE_TAG_MAPPING[path] || ["api"];

        this.endpoints.push({
          path,
          method: method.toUpperCase(),
          handler: file,
          tags,
          summary,
          description: this.extractDescription(content)
        });
      }
    } catch (error) {
      console.warn("⚠️  Could not read API directory:", error.message);
    }
  }

  private async discoverFromServerFile(): Promise<void> {
    try {
      const serverFile = join(process.cwd(), "src", "entry-point", "cli", "security-arena.bun.ts");
      const content = await Bun.file(serverFile).text();

      // Use regex to find API route patterns
      const routePattern = /if\s*\(\s*url\.pathname\s*===\s*"\/api\/([^"]+)"\s*\)/g;
      let match;

      while ((match = routePattern.exec(content)) !== null) {
        const routePath = `/api/${match[1]}`;
        const tags = ROUTE_TAG_MAPPING[routePath] || ["api"];

        // Check if we already have this endpoint
        if (!this.endpoints.find(e => e.path === routePath)) {
          this.endpoints.push({
            path: routePath,
            method: "POST", // Most server endpoints are POST
            handler: "security-arena.bun.ts",
            tags,
            summary: this.generateSummary(routePath),
            description: this.generateDescription(routePath)
          });
        }
      }
    } catch (error) {
      console.warn("⚠️  Could not read server file:", error.message);
    }
  }

  private extractSummary(content: string): string {
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^*\n]+)/);
    return jsdocMatch ? jsdocMatch[1].trim() : "";
  }

  private extractDescription(content: string): string {
    const lines = content.split("\n");
    const descriptions: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("*/")) break;
      if (line.startsWith("*") && !line.includes("@")) {
        const desc = line.substring(1).trim();
        if (desc && !desc.includes("GET") && !desc.includes("POST")) {
          descriptions.push(desc);
        }
      }
    }

    return descriptions.join(" ").replace(/\s+/g, " ");
  }

  private generateSummary(path: string): string {
    const segments = path.split("/");
    const lastSegment = segments[segments.length - 1];
    return lastSegment.split("-").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  }

  private generateDescription(path: string): string {
    const operations: Record<string, string> = {
      "pkg/get": "Retrieve package.json configuration",
      "pkg/set": "Update package.json configuration",
      "pkg/fix": "Fix package.json issues",
      "pkg/version": "Manage package versioning",
      "pkg/pack": "Package distribution artifacts",
      "pkg/publish": "Publish package to registry",
      "shell/run": "Execute shell scripts",
      "shell/command": "Run shell commands",
      "shell/commands": "List available shell commands",
      "security-scan": "Scan code for security vulnerabilities",
      "security/policy": "View security policy configuration",
      "run-test": "Execute bundler tests",
      "baselines/comparison": "Compare performance baselines",
      "htmlrewriter/run": "Execute HTML transformations",
      "workflow/convert-prompt": "Convert natural language to workflow YAML",
      "executables": "List available executable builds"
    };

    return operations[path.replace("/api/", "")] || `Operations for ${path}`;
  }

  async generateOpenApiSpec(): Promise<string> {
    const spec = {
      openapi: "3.0.3",
      info: {
        title: "Full-Stack Bun.io API",
        description: "Comprehensive API for Bun-based full-stack applications with security scanning, performance monitoring, and development tools",
        version: "1.3.5",
        contact: {
          name: "Mission Control",
          email: "contact@full-stack-bun.io"
        },
        license: {
          name: "MIT"
        }
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server"
        }
      ],
      tags: OPENAPI_TAGS.map(tag => ({
        name: tag.name,
        description: tag.description
      })),
      paths: this.generatePaths(),
      components: {
        schemas: this.generateSchemas(),
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    };

    return JSON.stringify(spec, null, 2);
  }

  private generatePaths(): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const endpoint of this.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        tags: endpoint.tags,
        summary: endpoint.summary,
        description: endpoint.description,
        operationId: `${endpoint.method.toLowerCase()}_${endpoint.path.replace(/\//g, "_").replace(/^_/, "")}`,
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "object" },
                    timestamp: { type: "string", format: "date-time" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      };

      // Add specific response schemas for known endpoints
      if (endpoint.path === "/api/health") {
        paths[endpoint.path][endpoint.method.toLowerCase()].responses["200"].content["application/json"].schema = {
          $ref: "#/components/schemas/HealthStatus"
        };
      }
    }

    return paths;
  }

  private generateSchemas(): Record<string, any> {
    return {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          timestamp: { type: "string", format: "date-time" }
        }
      },
      HealthStatus: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "unhealthy"] },
          timestamp: { type: "string", format: "date-time" },
          version: { type: "string" },
          uptime: { type: "number" },
          memory: {
            type: "object",
            properties: {
              used: { type: "number" },
              total: { type: "number" },
              external: { type: "number" }
            }
          },
          databases: {
            type: "object",
            properties: {
              agents: { type: "number" },
              baselines: { type: "number" }
            }
          },
          services: {
            type: "object",
            properties: {
              websocket: { type: "string" },
              ipfs: { type: "string" },
              blockchain: { type: "string" },
              temporal: { type: "string" }
            }
          }
        }
      }
    };
  }

  async writeSpec(): Promise<void> {
    const spec = await this.generateOpenApiSpec();
    const outputPath = join(process.cwd(), "docs", "openapi.json");

    await Bun.write(outputPath, spec);
    console.log(`📄 OpenAPI spec written to ${outputPath}`);
  }

  getTags(): TagDefinition[] {
    return OPENAPI_TAGS;
  }

  getEndpointCount(): number {
    return this.endpoints.length;
  }
}

// CLI execution
async function main() {
  console.log("🚀 Full-Stack Bun.io OpenAPI Generator");
  console.log("=====================================");

  const generator = new OpenApiGenerator();

  try {
    await generator.discoverEndpoints();

    const endpointCount = generator.getEndpointCount();
    console.log(`✅ Discovered ${endpointCount} API endpoints`);

    await generator.writeSpec();

    const tags = generator.getTags();
    console.log(`🏷️  Generated OpenAPI spec with ${tags.length} unified tags:`);
    tags.forEach(tag => {
      console.log(`  • ${tag.name}: ${tag.description}`);
    });

    console.log("\n🎉 OpenAPI generation complete!");
    console.log("Run 'bun run docs:serve' to view the API documentation");

  } catch (error) {
    console.error("❌ OpenAPI generation failed:", inspect(error, { colors: true }));
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { OpenApiGenerator, OPENAPI_TAGS, ROUTE_TAG_MAPPING };
