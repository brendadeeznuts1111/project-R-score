/**
 * @golden/templates - Official Templates
 *
 * Pre-configured templates for common use cases
 */

// ============================================================================
// Template Registry
// ============================================================================

export interface TemplateDefinition {
	name: string;
	description: string;
	category: "web" | "api" | "cli" | "library" | "fullstack";
	files: Record<string, string | ((options: TemplateOptions) => string)>;
}

export interface TemplateOptions {
	name: string;
	author?: string;
	description?: string;
	features?: string[];
}

// ============================================================================
// Web Template
// ============================================================================

export const webTemplate: TemplateDefinition = {
	name: "web",
	description: "Modern web application with Bun",
	category: "web",
	files: {
		"package.json": (opts) =>
			JSON.stringify(
				{
					name: opts.name,
					version: "1.0.0",
					description: opts.description || "A modern web app",
					module: "index.ts",
					type: "module",
					scripts: {
						dev: "bun --hot run src/index.ts",
						build: "bun build src/index.ts --outdir ./dist",
						start: "bun run dist/index.js",
					},
					dependencies: {
						"@golden/core": "^1.0.0",
					},
					devDependencies: {
						"@types/bun": "latest",
					},
				},
				null,
				2,
			),

		"src/index.ts": `import { serve } from "bun";

serve({
  port: process.env.PORT || 3000,
  fetch(req) {
    return new Response("Hello from ${opts.name}!");
  },
});

console.log("Server running on http://localhost:3000");
`,

		"README.md": `# ${opts.name}

${opts.description || "A modern web application"}

## Getting Started

\`\`\`bash
bun install
bun run dev
\`\`\`

## Scripts

- \`bun run dev\` - Start development server
- \`bun run build\` - Build for production
- \`bun run start\` - Start production server
`,
	},
};

// ============================================================================
// API Template
// ============================================================================

export const apiTemplate: TemplateDefinition = {
	name: "api",
	description: "REST API with Bun and @golden/core",
	category: "api",
	files: {
		"package.json": (opts) =>
			JSON.stringify(
				{
					name: opts.name,
					version: "1.0.0",
					description: opts.description || "A REST API",
					module: "index.ts",
					type: "module",
					scripts: {
						dev: "bun --hot run src/index.ts",
						test: "bun test",
					},
					dependencies: {
						"@golden/core": "^1.0.0",
						"@golden/rss": "^1.0.0",
					},
				},
				null,
				2,
			),

		"src/index.ts": `import { serve } from "bun";
import { resolveConfig } from "@golden/core/config";

const config = resolveConfig();

serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", profile: config.profile });
    }
    
    if (url.pathname === "/api/hello") {
      return Response.json({ message: "Hello from ${opts.name}!" });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(\`API running on http://localhost:\${process.env.PORT || 3000}\`);
`,

		"src/routes.ts": `// Define your API routes here
export const routes = {
  "/api/hello": {
    GET: () => ({ message: "Hello!" }),
  },
};
`,
	},
};

// ============================================================================
// Library Template
// ============================================================================

export const libraryTemplate: TemplateDefinition = {
	name: "library",
	description: "TypeScript library with Bun",
	category: "library",
	files: {
		"package.json": (opts) =>
			JSON.stringify(
				{
					name: opts.name,
					version: "1.0.0",
					description: opts.description || "A TypeScript library",
					main: "./dist/index.js",
					types: "./dist/index.d.ts",
					type: "module",
					scripts: {
						build: "bun build src/index.ts --outdir ./dist",
						test: "bun test",
						prepublishOnly: "bun run build",
					},
					devDependencies: {
						"bun-types": "latest",
					},
				},
				null,
				2,
			),

		"src/index.ts": `/**
 * ${opts.name}
 * 
 * ${opts.description || "A TypeScript library"}
 */

export function hello(): string {
  return "Hello from ${opts.name}!";
}
`,

		"src/index.test.ts": `import { describe, it, expect } from "bun:test";
import { hello } from "./index";

describe("${opts.name}", () => {
  it("should say hello", () => {
    expect(hello()).toBe("Hello from ${opts.name}!");
  });
});
`,

		"tsconfig.json": JSON.stringify(
			{
				compilerOptions: {
					lib: ["ESNext"],
					module: "esnext",
					target: "esnext",
					moduleResolution: "bundler",
					strict: true,
					declaration: true,
					outDir: "./dist",
				},
				include: ["src/**/*"],
			},
			null,
			2,
		),
	},
};

// ============================================================================
// Template Registry
// ============================================================================

const templates = new Map<string, TemplateDefinition>([
	["web", webTemplate],
	["api", apiTemplate],
	["library", libraryTemplate],
]);

export function getTemplate(name: string): TemplateDefinition | undefined {
	return templates.get(name);
}

export function listTemplates(): TemplateDefinition[] {
	return [...templates.values()];
}

export function listTemplatesByCategory(
	category: TemplateDefinition["category"],
): TemplateDefinition[] {
	return [...templates.values()].filter((t) => t.category === category);
}

/**
 * Apply a template with options
 */
export function applyTemplate(
	name: string,
	options: TemplateOptions,
): Record<string, string> {
	const template = getTemplate(name);
	if (!template) {
		throw new Error(`Template not found: ${name}`);
	}

	const result: Record<string, string> = {};

	for (const [path, content] of Object.entries(template.files)) {
		result[path] = typeof content === "function" ? content(options) : content;
	}

	return result;
}
