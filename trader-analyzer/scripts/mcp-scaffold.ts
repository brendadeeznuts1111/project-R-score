#!/usr/bin/env bun
/**
 * Enhanced MCP Scaffolding Tool
 * Auto-generates components, MCP tools, scripts, and other code artifacts with comprehensive metadata
 *
 * [SCAFFOLD.METADATA.RG:META] [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-SCAFFOLD-ENHANCED@1.3.4;instance-id=MCP-SCAFFOLD-ENHANCED-001;version=1.3.4}][PROPERTIES:{scaffold={value:"mcp-scaffold-enhanced";@root:"23.0.0.0.0.0.0";@chain:["BP-MCP-TOOLS","BP-CODE-INTEGRITY"];@version:"1.3.4"}}][CLASS:MCPScaffoldEnhanced][#REF:v-1.3.4.BP.MCP.SCAFFOLD.ENHANCED.1.0.A.1.1.SCRIPT.1.1]]
 * [SCAFFOLD.INTEGRATION.RG:META] [[TECH][MODULE][INTEGRATION][META:{blueprint=BP-MCP-SCAFFOLD@2.0.0;instance-id=MCP-SCAFFOLD-INTEGRATION-001;version=2.0.0;checksum=sha256:d3e4f5...;last-executed=2025-01-10}][PROPERTIES:{integration={value:"mcp-scaffold-lifecycle";@root:"PATCHED_DEPENDENCIES:SCOPE:platform_tools";@chain:["BP-BUN-PATCH-INTEGRATION","BP-RSS-PUBLISHER","BP-TELEGRAM-ENHANCED"];@version:"2.0.0"}}][CLASS:MCPScaffoldIntegration][#REF:v-2.0.0.BP.MCP.SCAFFOLD.INTEGRATION.1.0.A.1.1.DOC.1.1]]
 *
 * @fileoverview [23.0.0.0.0.0.0] Automated, Metadata-Driven Component & Tool Generation Subsystem
 * @description Provides a robust CLI for rapidly generating Hyper-Bun components, MCP tools, and scripts
 * with immediate adherence to architectural standards, team workflows, and metadata propagation.
 *
 * Usage:
 *   # Component scaffolding
 *   bun run scripts/mcp-scaffold.ts --type component --name test-status --path apps/@registry-dashboard/src/components/ --team platform_tools --notify --rss
 *
 *   # MCP Tool scaffolding
 *   bun run scripts/mcp-scaffold.ts --type mcp-tool --name alert-manager --path src/mcp/tools/ --team platform_tools --description "Manages alert routing" --dependencies "zod,telegram-client" --notify
 *
 *   # Script scaffolding
 *   bun run scripts/mcp-scaffold.ts --type script --name deploy-staging --path scripts/ --description "Deploy to staging" --exports "deployStaging,validateDeployment"
 */

// ═══════════════════════════════════════════════════════════════
// TABLE OF CONTENTS [SCAFFOLD.TOC.RG]
// ═══════════════════════════════════════════════════════════════
// 1. IMPORTS AND TYPE DEFINITIONS
//    1.1 Type Definitions
// 2. VALIDATION SCHEMAS
//    2.1 Argument Validation Schema
// 3. TEMPLATE ENGINE
//    3.1 Template Engine Class
//       3.1.1 Helper Registration
//       3.1.2 Template Loading
//       3.1.3 Template Rendering
// 4. AI-ASSISTED CODE GENERATION
//    4.1 AI Code Assist Class
//       4.1.1 Code Suggestion Generation
//       4.1.2 AI Prompt Building
//       4.1.3 Team Guidelines
//       4.1.4 AI Response Parsing
// 5. METADATA GENERATION
//    5.1 Metadata Generator Class
//       5.1.1 Enhanced Metadata Generation
//       5.1.2 Team Config Updates
//       5.1.3 Metadata ID Generation
//       5.1.4 Type and Team Coding
//       5.1.5 Helper Methods
//       5.1.6 Git Integration
// 6. CONFIGURATION MANAGEMENT
//    6.1 Config Manager Class
//       6.1.1 Package.json Updates
//       6.1.2 Bunfig.toml Updates
//       6.1.3 Team Config Updates
//       6.1.4 Deep Merge Utility
// 7. GIT AUTOMATION
//    7.1 Git Automation Class
//       7.1.1 Feature Branch Creation
//       7.1.2 File Committing
//       7.1.3 Push and PR Creation
//       7.1.4 PR Template Generation
//       7.1.5 Git Helper Methods
// 8. MAIN SCAFFOLDING ENGINE
//    8.1 Enhanced MCP Scaffold Class
//       8.1.1 Main Scaffold Method
//       8.1.2 Template Key Determination
//       8.1.3 File Path Generation
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 1. IMPORTS AND TYPE DEFINITIONS [IMPORTS.TYPES.RG]
// ═══════════════════════════════════════════════════════════════

import { $ } from "bun"
import { Database } from "bun:sqlite"
import { dirname, join } from "path"
import { z } from "zod"
import { getTelegramClient } from "../src/telegram/client.js"
import { RSS_INTERNAL, RSS_TEAM_CATEGORIES, TELEGRAM_CONFIG } from "../src/utils/rss-constants.js"
import { getAICodeSuggestionService } from "../src/services/ai-code-suggestion.js"

// ═══════════════════════════════════════════════════════════════
// 1.1 Type Definitions [TYPE.DEFINITIONS.RG]
// ═══════════════════════════════════════════════════════════════

type ScaffoldType =
  | "component"
  | "mcp-tool"
  | "script"
  | "utility"
  | "service"
  | "interface"
  | "enum"
type TeamId = keyof typeof RSS_TEAM_CATEGORIES

// ═══════════════════════════════════════════════════════════════
// 2. VALIDATION SCHEMAS [VALIDATION.SCHEMAS.RG]
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 2.1 Argument Validation Schema [ARGUMENT.VALIDATION.RG:SCHEMA]
// ═══════════════════════════════════════════════════════════════

const ScaffoldOptionsSchema = z.object({
  type: z.enum(["component", "mcp-tool", "script", "utility", "service", "interface", "enum"]),
  name: z.string().min(1, "Name is required"),
  path: z.string().min(1, "Path is required"),
  team: z.enum(["platform_tools", "sports_correlation", "market_analytics"]).optional(),
  coverage: z.number().min(0).max(1).default(0.95),
  critical: z.boolean().default(true),
  updateManifest: z.boolean().default(true),
  notify: z.boolean().default(false),
  rss: z.boolean().default(false),
  rssChannel: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  dependencies: z.array(z.string()).default([]),
  exports: z.array(z.string()).default([]),
  apiVersion: z.string().optional(),
  templateVariant: z.string().optional(),
  aiContext: z.string().optional(),
  template: z.string().optional(),
  git: z.boolean().default(false), // Optional git commit after scaffolding
})

type ScaffoldOptions = z.infer<typeof ScaffoldOptionsSchema>

interface GitUser {
  name: string
  email: string
}

// ═══════════════════════════════════════════════════════════════
// ARGUMENT PARSING [ARGUMENT.PARSING.RG:IMPLEMENTATION]
// ═══════════════════════════════════════════════════════════════

function parseArgs(): ScaffoldOptions {
  const args = process.argv.slice(2)
  const rawOptions: Record<string, any> = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    if (arg === "--type" && nextArg) {
      rawOptions.type = nextArg
      i++
    } else if (arg === "--name" && nextArg) {
      rawOptions.name = nextArg
      i++
    } else if (arg === "--path" && nextArg) {
      rawOptions.path = nextArg
      i++
    } else if (arg === "--team" && nextArg) {
      rawOptions.team = nextArg
      i++
    } else if (arg === "--coverage" && nextArg) {
      rawOptions.coverage = parseFloat(nextArg)
      i++
    } else if (arg === "--critical") {
      rawOptions.critical = args[i + 1] !== "false"
      i++
    } else if (arg === "--description" && nextArg) {
      rawOptions.description = nextArg
      i++
    } else if (arg === "--dependencies" && nextArg) {
      rawOptions.dependencies = nextArg.split(",").map((d) => d.trim())
      i++
    } else if (arg === "--exports" && nextArg) {
      rawOptions.exports = nextArg.split(",").map((e) => e.trim())
      i++
    } else if (arg === "--api-version" && nextArg) {
      rawOptions.apiVersion = nextArg
      i++
    } else if (arg === "--template-variant" && nextArg) {
      rawOptions.templateVariant = nextArg
      i++
    } else if (arg === "--ai-context" && nextArg) {
      rawOptions.aiContext = nextArg
      i++
    } else if (arg === "--template" && nextArg) {
      rawOptions.template = nextArg
      i++
    } else if (arg === "--rss-channel" && nextArg) {
      rawOptions.rssChannel = nextArg
      i++
    } else if (arg === "--no-manifest") {
      rawOptions.updateManifest = false
    } else if (arg === "--notify") {
      rawOptions.notify = true
    } else if (arg === "--rss") {
      rawOptions.rss = true
    } else if (arg === "--git") {
      rawOptions.git = true
    }
  }

  // Validate with zod schema
  try {
    const options = ScaffoldOptionsSchema.parse(rawOptions)

    // Team is mandatory for most types (except interface and enum)
    if (!options.team && !["interface", "enum"].includes(options.type)) {
      console.error("Error: --team is required for this type")
      console.error("Available teams: platform_tools, sports_correlation, market_analytics")
      process.exit(1)
    }

    return options
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Error: Invalid arguments")
      console.error(
        error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n")
      )
    } else {
      console.error("Error: Argument parsing failed", error)
    }

    console.error("\nUsage:")
    console.error(
      "  bun run scripts/mcp-scaffold.ts --type <type> --name <name> --path <path> [options]"
    )
    console.error("\nTypes: component, mcp-tool, script, utility, service, interface, enum")
    console.error("\nRequired Options:")
    console.error("  --description <text>        Description for the artifact (required)")
    console.error("  --team <teamId>             Team ID (required for most types)")
    console.error("\nOptional Options:")
    console.error("  --coverage <number>         Test coverage target (default: 0.95)")
    console.error("  --critical                  Mark as critical (default: true)")
    console.error("  --dependencies <list>       Comma-separated dependencies")
    console.error("  --exports <list>            Comma-separated export names")
    console.error("  --api-version <version>     API version (e.g., v17)")
    console.error(
      "  --template-variant <variant> Template variant (e.g., react-hook, singleton-service)"
    )
    console.error("  --ai-context <text>          AI context for code suggestions")
    console.error("  --rss-channel <channel>     Custom RSS channel name")
    console.error("  --notify                    Send Telegram notification")
    console.error("  --rss                       Publish to RSS feed")
    console.error("  --git                       Auto-commit to git")
    console.error("  --no-manifest               Skip manifest update")
    process.exit(1)
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. TEMPLATE ENGINE [TEMPLATE.ENGINE.RG]
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 3.1 Template Engine Class [TEMPLATE.ENGINE.CLASS.RG]
// ═══════════════════════════════════════════════════════════════
// Note: Currently implemented as functions. Future enhancement: Convert to class-based architecture.

// ═══════════════════════════════════════════════════════════════
// 3.1.1 Helper Registration [TEMPLATE.HELPER.REGISTRATION.RG]
// ═══════════════════════════════════════════════════════════════
// Note: Template helpers are currently inline. Future enhancement: Registerable helper system.

interface TemplateContext {
  name: string
  pascalName: string
  camelName: string
  description: string
  team?: string
  teamLead?: string
  author: string
  email: string
  createdDate: string
  dependencies: string[]
  exports: string[]
  apiVersion?: string
  metadata: string
  ref: string
  sectionNumber: string
  blueprint: string
  instanceId: string
  fileoverview?: string
  modulePath?: string
  authorInfo?: string
  teamInfo?: string
  depsInfo?: string
  exportsInfo?: string
  interfaceName?: string
  enumName?: string
  exportFunctions?: string
}

/**
 * Simple template engine using string replacement
 */
function renderTemplate(template: string, context: TemplateContext): string {
  let result = template

  // Replace all template variables
  Object.entries(context).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    if (Array.isArray(value)) {
      result = result.replace(regex, value.join(", "))
    } else {
      result = result.replace(regex, value || "")
    }
  })

  return result
}

// ═══════════════════════════════════════════════════════════════
// 3.1.2 Template Loading [TEMPLATE.LOADING.RG]
// ═══════════════════════════════════════════════════════════════

/**
 * Load template variant or fallback to default
 */
async function loadTemplate(type: ScaffoldType, variant?: string): Promise<string> {
  const templateDir = "templates"
  const defaultTemplateFile = join(templateDir, `${type}.template`)
  const variantTemplateFile = variant ? join(templateDir, `${type}/${variant}.template`) : null

  // Try variant template first, then default
  const templateFile =
    variantTemplateFile && (await Bun.file(variantTemplateFile).exists())
      ? variantTemplateFile
      : defaultTemplateFile

  try {
    const template = await Bun.file(templateFile).text()
    return template
  } catch {
    // Fallback to inline templates if template files don't exist
    console.warn(`⚠️  Template file not found: ${templateFile}, using inline template`)
    return ""
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. AI-ASSISTED CODE GENERATION [AI.CODE.GENERATION.RG]
// ═══════════════════════════════════════════════════════════════
// Note: AI-assisted code generation features are planned for future enhancement.
// ═══════════════════════════════════════════════════════════════
// 4.1 AI Code Assist Class [AI.CODE.ASSIST.CLASS.RG]
// ═══════════════════════════════════════════════════════════════
// Future: Implement AI-powered code suggestions and generation assistance.
// ═══════════════════════════════════════════════════════════════
// 4.1.1 Code Suggestion Generation [AI.CODE.SUGGESTION.RG]
// ═══════════════════════════════════════════════════════════════
// Future: Generate code suggestions based on context and team guidelines.
// ═══════════════════════════════════════════════════════════════
// 4.1.2 AI Prompt Building [AI.PROMPT.BUILDING.RG]
// ═══════════════════════════════════════════════════════════════
// Future: Build optimized prompts for AI code generation.
// ═══════════════════════════════════════════════════════════════
// 4.1.3 Team Guidelines [AI.TEAM.GUIDELINES.RG]
// ═══════════════════════════════════════════════════════════════
// Future: Integrate team-specific coding guidelines into AI suggestions.
// ═══════════════════════════════════════════════════════════════
// 4.1.4 AI Response Parsing [AI.RESPONSE.PARSING.RG]
// ═══════════════════════════════════════════════════════════════
// Future: Parse and validate AI-generated code responses.

// ═══════════════════════════════════════════════════════════════
// 5. METADATA GENERATION [METADATA.GENERATION.RG]
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 5.1 Metadata Generator Class [METADATA.GENERATOR.CLASS.RG]
// ═══════════════════════════════════════════════════════════════
// Note: Currently implemented as functions. Future enhancement: Convert to class-based architecture.

// ═══════════════════════════════════════════════════════════════
// 5.1.5 Helper Methods [METADATA.HELPER.METHODS.RG]
// ═══════════════════════════════════════════════════════════════

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

// ═══════════════════════════════════════════════════════════════
// 5.1.3 Metadata ID Generation [METADATA.ID.GENERATION.RG]
// ═══════════════════════════════════════════════════════════════

function generateInstanceId(type: string, name: string): string {
  const prefix = type.toUpperCase().replace(/-/g, "_")
  const suffix = name.toUpperCase().replace(/-/g, "_")
  return `${prefix}-${suffix}-001`
}

function generateBlueprint(type: string, name: string, version: string = "1.3.4"): string {
  const blueprintName = `BP-${type.toUpperCase().replace(/-/g, "-")}-${toPascalCase(name)}`
  return `${blueprintName}@${version}`
}

// ═══════════════════════════════════════════════════════════════
// 5.1.4 Type and Team Coding [METADATA.TYPE.TEAM.CODING.RG:IMPLEMENTATION]
// ═══════════════════════════════════════════════════════════════

/**
 * Generate hierarchical REF tag following Hyper-Bun metadata standards
 * Enhanced format: v-{version}.{TYPE_CODE}.{NAME_CODE}.{TEAM_CODE}.{API_VERSION}.{MAJOR}.{MINOR}.{A}.{PATCH}.{DOC}.{SUB}
 * Example: v-1.3.4.COMP.TESTSTATUS.PLAT.1.0.1.0.A.1.1.DOC.1.1
 *
 * @param type - Entity type (component, mcp-tool, script, etc.)
 * @param name - Entity name
 * @param teamId - Team identifier (optional)
 * @param version - Hyper-Bun system version (default: 1.3.4)
 * @param apiVersion - API version for this entity (optional, defaults to 1.0)
 */
function generateRef(
  type: string,
  name: string,
  teamId?: TeamId,
  version: string = "1.3.4",
  apiVersion: string = "1.0"
): string {
  // Type codes
  const typeCodeMap: Record<string, string> = {
    component: "COMP",
    "mcp-tool": "MCPT",
    script: "SCRP",
    utility: "UTIL",
    service: "SERV",
  }
  const typeCode = typeCodeMap[type] || "UNKN"

  // Name code (uppercase, max 8 chars)
  const nameCode = toPascalCase(name).toUpperCase().slice(0, 8)

  // Team code mapping
  const teamCodeMap: Record<string, string> = {
    platform_tools: "PLAT",
    sports_correlation: "SPRT",
    market_analytics: "MRKT",
  }
  const teamCode = teamId ? teamCodeMap[teamId] || "N/A" : "N/A"

  // Normalize API version (ensure format like "1.0" or "2.3")
  const apiVer = apiVersion || "1.0"
  const [apiMajor = "1", apiMinor = "0"] = apiVer.split(".")

  // Section numbering: {API_MAJOR}.{API_MINOR}.A.{PATCH}.DOC.{SUB}
  // Format: Major.Minor.Alpha.Patch.Doc.SubDoc
  return `v-${version}.${typeCode}.${nameCode}.${teamCode}.${apiMajor}.${apiMinor}.A.1.1.DOC.1.1`
}

// ═══════════════════════════════════════════════════════════════
// 5.1.6 Git Integration [METADATA.GIT.INTEGRATION.RG]
// ═══════════════════════════════════════════════════════════════

/**
 * Get git user information for JSDoc @author tag
 */
async function getGitUser(): Promise<GitUser> {
  try {
    const name = await $`git config user.name`.text()
    const email = await $`git config user.email`.text()
    return {
      name: name.trim(),
      email: email.trim(),
    }
  } catch {
    // Fallback to environment variables
    return {
      name: process.env.USER || process.env.USERNAME || "Unknown",
      email: process.env.EMAIL || process.env.GIT_AUTHOR_EMAIL || "unknown@company.com",
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT TEMPLATES
// ═══════════════════════════════════════════════════════════════

async function generateComponentStub(
  name: string,
  options: ScaffoldOptions,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES],
  gitUser?: GitUser
): Promise<string> {
  const className = toPascalCase(name) + "Component"
  const instanceId = generateInstanceId("component", name)
  const blueprint = generateBlueprint("component", name)
  const ref = generateRef("component", name, options.team)
  const description = options.description || `${toPascalCase(name)} Component`
  const sectionNumber = "23.1.0.0.0.0.0" // Component generation section
  const createdDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

  const metadata = `[[TECH][MODULE][INSTANCE][META:{blueprint=${blueprint};instance-id=${instanceId};version=1.3.4}][PROPERTIES:{component={value:"${name}";@root:"23.0.0.0.0.0.0";@chain:["BP-COMPONENT-SCAFFOLD"];@version:"1.3.4"}}][CLASS:${className}][#REF:${ref}]]`

  // Prepare template variables
  const teamInfo = team ? ` * @team ${team.id}\n * Team Lead: ${team.team_lead}` : ""
  const authorInfo = gitUser ? ` * @author ${gitUser.name} <${gitUser.email}>` : ""
  const depsInfo =
    options.dependencies && options.dependencies.length > 0
      ? ` * @dependencies ${options.dependencies.join(", ")}`
      : ""
  const exportsInfo =
    options.exports && options.exports.length > 0 ? ` * @exports ${options.exports.join(", ")}` : ""

  // Enhanced @fileoverview with strategic tag
  const strategicTag = team ? `[${team.id.toUpperCase()}]` : "[PLATFORM]"
  const apiVersion = options.apiVersion || "1.0"
  const fileoverview = `[6.1.1.2.2.8.1.1.2.9.0.0] ${team?.name || "Platform"} ${toPascalCase(name)} Component ${apiVersion} ${strategicTag}`

  // Enhanced REF tag with API version
  const enhancedRef = generateRef("component", name, options.team, "1.3.4", apiVersion)

  // Try to load template first
  const template = await loadTemplate("component", options.templateVariant)
  if (template) {
    const context: TemplateContext = {
      name,
      pascalName: toPascalCase(name),
      camelName: toCamelCase(name),
      description,
      team: team?.id,
      teamLead: team?.team_lead,
      author: gitUser?.name || "Unknown",
      email: gitUser?.email || "unknown@company.com",
      createdDate,
      dependencies: options.dependencies || [],
      exports: options.exports || [],
      apiVersion: options.apiVersion,
      metadata,
      ref,
      sectionNumber,
      blueprint,
      instanceId,
      fileoverview,
      modulePath: `apps/@registry-dashboard/src/components/${name}`,
      authorInfo,
      teamInfo,
      depsInfo,
      exportsInfo,
    }
    return renderTemplate(template, context)
  }

  // Fallback to inline template

  return `/**
 * @fileoverview ${fileoverview}
 * @module apps/@registry-dashboard/src/components/${name}
 * @description ${description}
${authorInfo}
 * @created ${createdDate}
${teamInfo}
${depsInfo}
${exportsInfo}
 * @version 1.3.4
 *
 * ${metadata}
 *
 * @ref ${enhancedRef}
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

interface ${className}Props {
	// TODO: Define component props
	testResults?: Array<{ status: 'pass' | 'fail' | 'pending'; name: string }>;
	displayName?: string;
}

/**
 * ${toPascalCase(name)} Component
 * ${description}
 */
export function ${className}({ testResults = [], displayName }: ${className}Props) {
	const [status, setStatus] = useState<'pass' | 'fail' | 'pending'>('pending');

	useEffect(() => {
		if (testResults.length === 0) {
			setStatus('pending');
			return;
		}

		const hasFailures = testResults.some((result) => result.status === 'fail');
		setStatus(hasFailures ? 'fail' : 'pass');
	}, [testResults]);

	const statusClass = \`test-status \${status}\`;

	return (
		<div class={statusClass}>
			<div class="test-status-header">
				<h4>{displayName || '${toPascalCase(name)}'}</h4>
				<span class={\`status-badge \${status}\`}>{status.toUpperCase()}</span>
			</div>
			<div class="test-status-body">
				<p>Total Tests: {testResults.length}</p>
				<p>Status: {status}</p>
			</div>
		</div>
	);
}

/**
 * Legacy function export for backward compatibility
 */
export function render${toPascalCase(name)}Card(testPattern: string, displayName: string): string {
	// TODO: Implement legacy render function if needed
	return \`<div class="test-status-card">\${displayName}</div>\`;
}
`
}

// ═══════════════════════════════════════════════════════════════
// MCP TOOL TEMPLATES
// ═══════════════════════════════════════════════════════════════

async function generateMCPToolStub(
  name: string,
  options: ScaffoldOptions,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES],
  gitUser?: GitUser
): Promise<string> {
  const toolName = name.replace(/-/g, "-")
  const className = toPascalCase(name) + "MCPTool"
  const instanceId = generateInstanceId("mcp-tool", name)
  const blueprint = generateBlueprint("mcp-tool", name)
  const ref = generateRef("mcp-tool", name, options.team)
  const description = options.description || `MCP tool for ${name}`
  const camelName = toCamelCase(name)
  const sectionNumber = "23.1.1.0.0.0.0" // MCP Tool generation section
  const createdDate = new Date().toISOString().split("T")[0]

  const metadata = `[[TECH][MODULE][INSTANCE][META:{blueprint=${blueprint};instance-id=${instanceId};version=1.3.4}][PROPERTIES:{mcp={value:"${name}";@root:"23.0.0.0.0.0.0";@chain:["BP-MCP-TOOLS"];@version:"1.3.4"}}][CLASS:${className}][#REF:${ref}]]`

  const teamInfo = team ? ` * @team ${team.id}\n * Team Lead: ${team.team_lead}` : ""
  const authorInfo = gitUser ? ` * @author ${gitUser.name} <${gitUser.email}>` : ""
  const depsInfo =
    options.dependencies && options.dependencies.length > 0
      ? ` * @dependencies ${options.dependencies.join(", ")}`
      : ""
  const exportsInfo =
    options.exports && options.exports.length > 0 ? ` * @exports ${options.exports.join(", ")}` : ""

  // Enhanced @fileoverview with strategic tag
  const strategicTag = team ? `[${team.id.toUpperCase()}]` : "[PLATFORM]"
  const apiVersion = options.apiVersion || "1.0"
  const fileoverview = `[23.3.1.0.0.0.0] ${team?.name || "Platform"} ${toPascalCase(name)} MCP Tool API-${apiVersion} ${strategicTag}`

  // Enhanced REF tag with API version
  const enhancedRef = generateRef("mcp-tool", name, options.team, "1.3.4", apiVersion)

  return `/**
 * @fileoverview ${fileoverview}
 * @module mcp/tools/${name}
 * @description ${description}
${authorInfo}
 * @created ${createdDate}
${teamInfo}
${depsInfo}
${exportsInfo}
 * @version 1.3.4
 * 
 * ${metadata}
 * 
 * @ref ${enhancedRef}
 * 
 * @see {@link ../server.ts} - MCP server implementation
 * @see {@link ../../mcp/tools/ai-team-tools.ts} - AI team tools integration
 */

import { z } from 'zod';
import type { MCPTool } from '../server.js';

/**
 * ${toolName} tool input schema
 */
const ${camelName}InputSchema = z.object({
	// TODO: Define input schema properties
	example: z.string().optional().describe('Example input parameter'),
});

/**
 * Create ${toolName} MCP tool
 * @returns {MCPTool} Configured MCP tool definition
 */
export function create${toPascalCase(name)}Tool(): MCPTool {
	return {
		name: '${toolName}',
		description: '${description}',
		inputSchema: {
			type: 'object',
			properties: {
				example: {
					type: 'string',
					description: 'Example input parameter',
				},
			},
			required: [],
		},
	};
}

/**
 * Execute ${toolName} tool
 * @param {z.infer<typeof ${camelName}InputSchema>} args - Tool input arguments
 * @returns {Promise<{content: Array<{type: string; text: string}>}>} Tool execution result
 */
export async function execute${toPascalCase(name)}Tool(
	args: z.infer<typeof ${camelName}InputSchema>,
): Promise<{
	content: Array<{ type: string; text: string }>;
}> {
	try {
		// TODO: Implement tool logic
		
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						status: 'success',
						message: '${toolName} executed successfully',
						result: {},
					}, null, 2),
				},
			],
		};
	} catch (error: any) {
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						error: 'Execution failed',
						message: error.message,
					}, null, 2),
				},
			],
			isError: true,
		};
	}
}
`
}

// ═══════════════════════════════════════════════════════════════
// SERVICE TEMPLATES [SERVICE.TEMPLATES.RG]
// ═══════════════════════════════════════════════════════════════

async function generateServiceStub(
  name: string,
  options: ScaffoldOptions,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES],
  gitUser?: GitUser
): Promise<string> {
  const className = toPascalCase(name) + "Service"
  const instanceId = generateInstanceId("service", name)
  const blueprint = generateBlueprint("service", name)
  const ref = generateRef("service", name, options.team)
  const description = options.description || `Service for ${name}`
  const sectionNumber = "23.1.3.0.0.0.0" // Service generation section
  const createdDate = new Date().toISOString().split("T")[0]

  const metadata = `[[TECH][MODULE][INSTANCE][META:{blueprint=${blueprint};instance-id=${instanceId};version=1.3.4}][PROPERTIES:{service={value:"${name}";@root:"23.0.0.0.0.0.0";@chain:["BP-SERVICES"];@version:"1.3.4"}}][CLASS:${className}][#REF:${ref}]]`

  // Prepare template variables
  const teamInfo = team ? ` * @team ${team.id}\n * Team Lead: ${team.team_lead}` : ""
  const authorInfo = gitUser ? ` * @author ${gitUser.name} <${gitUser.email}>` : ""
  const depsInfo =
    options.dependencies && options.dependencies.length > 0
      ? ` * @dependencies ${options.dependencies.join(", ")}`
      : ""
  const exportsInfo =
    options.exports && options.exports.length > 0 ? ` * @exports ${options.exports.join(", ")}` : ""

  const strategicTag = team ? `[${team.id.toUpperCase()}]` : "[PLATFORM]"
  const fileoverview = `[6.1.1.2.2.8.1.1.2.9.0.0] ${team?.name || "Platform"} ${toPascalCase(name)} Service ${options.apiVersion || "N/A"} ${strategicTag}`

  // Try to load template first
  const template = await loadTemplate("service", options.templateVariant)
  if (template) {
    const context: TemplateContext = {
      name,
      pascalName: toPascalCase(name),
      camelName: toCamelCase(name),
      description,
      team: team?.id,
      teamLead: team?.team_lead,
      author: gitUser?.name || "Unknown",
      email: gitUser?.email || "unknown@company.com",
      createdDate,
      dependencies: options.dependencies || [],
      exports: options.exports || [],
      apiVersion: options.apiVersion,
      metadata,
      ref,
      sectionNumber,
      blueprint,
      instanceId,
      fileoverview,
      modulePath: `src/services/${name}`,
      authorInfo,
      teamInfo,
      depsInfo,
      exportsInfo,
    }
    return renderTemplate(template, context)
  }

  // Fallback to inline template
  return `/**
 * @fileoverview ${fileoverview}
 * @module src/services/${name}
 * @description ${description}
${authorInfo}
 * @created ${createdDate}
${teamInfo}
${depsInfo}
${exportsInfo}
 * @version 1.3.4
 *
 * ${metadata}
 *
 * @ref ${ref}
 */

import { logger } from '../utils/logger.js';

/**
 * ${toPascalCase(name)} Service
 * ${description}
 */
export class ${className} {
	private initialized = false;

	constructor() {}

	/**
	 * Initialize the service
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// TODO: Implement service initialization
			logger.info('Service initialized successfully');
			this.initialized = true;
		} catch (error) {
			logger.error('Failed to initialize service', error);
			throw error;
		}
	}

	/**
	 * Shutdown the service
	 */
	async shutdown(): Promise<void> {
		try {
			// TODO: Implement service shutdown
			logger.info('Service shutdown successfully');
			this.initialized = false;
		} catch (error) {
			logger.error('Failed to shutdown service', error);
			throw error;
		}
	}

	/**
	 * Check if service is healthy
	 */
	isHealthy(): boolean {
		// TODO: Implement health check
		return this.initialized;
	}
}

/**
 * Singleton instance
 */
let instance: ${className} | null = null;

/**
 * Get singleton instance of ${className}
 */
export function get${toPascalCase(name)}Service(): ${className} {
	if (!instance) {
		instance = new ${className}();
	}
	return instance;
}
`
}

// ═══════════════════════════════════════════════════════════════
// INTERFACE TEMPLATES [INTERFACE.TEMPLATES.RG]
// ═══════════════════════════════════════════════════════════════

async function generateInterfaceStub(
  name: string,
  options: ScaffoldOptions,
  gitUser?: GitUser
): Promise<string> {
  const interfaceName = toPascalCase(name)
  const instanceId = generateInstanceId("interface", name)
  const blueprint = generateBlueprint("interface", name)
  const ref = generateRef("interface", name)
  const description = options.description || `Interface for ${name}`
  const sectionNumber = "23.1.4.0.0.0.0" // Interface generation section
  const createdDate = new Date().toISOString().split("T")[0]

  const metadata = `[[TECH][MODULE][INSTANCE][META:{blueprint=${blueprint};instance-id=${instanceId};version=1.3.4}][PROPERTIES:{interface={value:"${name}";@root:"23.0.0.0.0.0.0";@chain:["BP-INTERFACES"];@version:"1.3.4"}}][CLASS:${interfaceName}][#REF:${ref}]]`

  const authorInfo = gitUser ? ` * @author ${gitUser.name} <${gitUser.email}>` : ""
  const depsInfo =
    options.dependencies && options.dependencies.length > 0
      ? ` * @dependencies ${options.dependencies.join(", ")}`
      : ""
  const exportsInfo =
    options.exports && options.exports.length > 0 ? ` * @exports ${options.exports.join(", ")}` : ""

  return `/**
 * @fileoverview [${sectionNumber}] ${description}
 * @module src/types/${name}
 * @description ${description}
${authorInfo}
 * @created ${createdDate}
${depsInfo}
${exportsInfo}
 *
 * ${metadata}
 *
 * @ref ${ref}
 */

/**
 * ${interfaceName} interface
 * ${description}
 */
export interface ${interfaceName} {
	// TODO: Define interface properties and methods
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * ${interfaceName} creation options
 */
export interface ${interfaceName}CreateOptions {
	// TODO: Define creation options
	name: string;
}

/**
 * ${interfaceName} update options
 */
export interface ${interfaceName}UpdateOptions {
	// TODO: Define update options
	name?: string;
}
`
}

// ═══════════════════════════════════════════════════════════════
// ENUM TEMPLATES [ENUM.TEMPLATES.RG]
// ═══════════════════════════════════════════════════════════════

async function generateEnumStub(
  name: string,
  options: ScaffoldOptions,
  gitUser?: GitUser
): Promise<string> {
  const enumName = toPascalCase(name)
  const instanceId = generateInstanceId("enum", name)
  const blueprint = generateBlueprint("enum", name)
  const ref = generateRef("enum", name)
  const description = options.description || `Enum for ${name}`
  const sectionNumber = "23.1.5.0.0.0.0" // Enum generation section
  const createdDate = new Date().toISOString().split("T")[0]

  const metadata = `[[TECH][MODULE][INSTANCE][META:{blueprint=${blueprint};instance-id=${instanceId};version=1.3.4}][PROPERTIES:{enum={value:"${name}";@root:"23.0.0.0.0.0.0";@chain:["BP-ENUMS"];@version:"1.3.4"}}][CLASS:${enumName}][#REF:${ref}]]`

  const authorInfo = gitUser ? ` * @author ${gitUser.name} <${gitUser.email}>` : ""
  const depsInfo =
    options.dependencies && options.dependencies.length > 0
      ? ` * @dependencies ${options.dependencies.join(", ")}`
      : ""
  const exportsInfo =
    options.exports && options.exports.length > 0 ? ` * @exports ${options.exports.join(", ")}` : ""

  return `/**
 * @fileoverview [${sectionNumber}] ${description}
 * @module src/types/${name}
 * @description ${description}
${authorInfo}
 * @created ${createdDate}
${depsInfo}
${exportsInfo}
 *
 * ${metadata}
 *
 * @ref ${ref}
 */

/**
 * ${enumName} enum
 * ${description}
 */
export enum ${enumName} {
	// TODO: Define enum values
	VALUE_ONE = 'value_one',
	VALUE_TWO = 'value_two',
	VALUE_THREE = 'value_three',
}

/**
 * ${enumName} type alias
 */
export type ${enumName}Type = keyof typeof ${enumName};

/**
 * ${enumName} values array
 */
export const ${enumName}Values = Object.values(${enumName}) as ${enumName}Type[];

/**
 * Check if value is a valid ${enumName}
 */
export function is${enumName}(value: unknown): value is ${enumName} {
	return typeof value === 'string' && Object.values(${enumName}).includes(value as ${enumName});
}
`
}

// ═══════════════════════════════════════════════════════════════
// SCRIPT TEMPLATES [SCRIPT.TEMPLATES.RG]
// ═══════════════════════════════════════════════════════════════

async function generateScriptStub(
  name: string,
  options: ScaffoldOptions,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES],
  gitUser?: GitUser
): Promise<string> {
  const className = toPascalCase(name) + "Script"
  const instanceId = generateInstanceId("script", name)
  const blueprint = generateBlueprint("script", name)
  const ref = generateRef("script", name, options.team)
  const description = options.description || `Script for ${name}`
  const sectionNumber = "23.1.2.0.0.0.0" // Script generation section
  const createdDate = new Date().toISOString().split("T")[0]

  const metadata = `[[TECH][MODULE][INSTANCE][META:{blueprint=${blueprint};instance-id=${instanceId};version=1.3.4}][PROPERTIES:{script={value:"${name}";@root:"23.0.0.0.0.0.0";@chain:["BP-SCRIPTS"];@version:"1.3.4"}}][CLASS:${className}][#REF:${ref}]]`

  const teamInfo = team ? ` * @team ${team.id}\n * Team Lead: ${team.team_lead}` : ""
  const authorInfo = gitUser ? ` * @author ${gitUser.name} <${gitUser.email}>` : ""
  const depsInfo =
    options.dependencies && options.dependencies.length > 0
      ? ` * @dependencies ${options.dependencies.join(", ")}`
      : ""
  const exportsInfo =
    options.exports && options.exports.length > 0 ? ` * @exports ${options.exports.join(", ")}` : ""

  // Generate export functions if specified
  const exportFunctions =
    options.exports && options.exports.length > 0
      ? options.exports
          .map((exp) => {
            const camelExp = toCamelCase(exp)
            return `
/**
 * ${exp}
 * TODO: Implement ${exp} function
 */
export async function ${camelExp}(): Promise<void> {
	// TODO: Implement function logic
	console.log('${exp} executed');
}
`
          })
          .join("")
      : ""

  // Enhanced @fileoverview with strategic tag
  const strategicTag = team ? `[${team.id.toUpperCase()}]` : "[PLATFORM]"
  const apiVersion = options.apiVersion || "1.0"
  const fileoverview = `[23.3.1.0.0.0.0] ${team?.name || "Platform"} ${toPascalCase(name)} Script API-${apiVersion} ${strategicTag}`

  // Enhanced REF tag with API version
  const enhancedRef = generateRef("script", name, options.team, "1.3.4", apiVersion)

  return `#!/usr/bin/env bun
/**
 * @fileoverview ${fileoverview}
 * @module scripts/${name}
 * @description ${description}
${authorInfo}
 * @created ${createdDate}
${teamInfo}
${depsInfo}
${exportsInfo}
 * @version 1.3.4
 * 
 * ${metadata}
 * 
 * @ref ${enhancedRef}
 * 
 * Usage:
 *   bun run scripts/${name}.ts [options]
 */

interface ${className}Options {
	// TODO: Define options interface
}

/**
 * Parse command-line arguments
 */
function parseArgs(): ${className}Options {
	const args = process.argv.slice(2);
	const options: Partial<${className}Options> = {};

	// TODO: Parse command-line arguments
	
	return options as ${className}Options;
}

/**
 * Main script execution function
 */
async function main() {
	const options = parseArgs();
	
	try {
		// TODO: Implement script logic
		console.log('✅ ${name} completed successfully');
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}
${exportFunctions}
if (import.meta.main) {
	main();
}
`
}

// ═══════════════════════════════════════════════════════════════
// TEST FILE GENERATION [TEST.FILE.GENERATION.RG]
// ═══════════════════════════════════════════════════════════════

function generateTestFile(
  name: string,
  type: ScaffoldType,
  importPath: string,
  options: ScaffoldOptions
): string {
  const className =
    toPascalCase(name) +
    (type === "component" ? "Component" : type === "mcp-tool" ? "MCPTool" : "Script")

  const testImports =
    type === "component"
      ? `import { ${className}, render${toPascalCase(name)}Card } from "${importPath}";`
      : type === "mcp-tool"
        ? `import { create${toPascalCase(name)}Tool, execute${toPascalCase(name)}Tool } from "${importPath}";`
        : `// Import functions from "${importPath}"`

  return `/**
 * Test file for ${className}
 * Coverage target: ${((options.coverage || 0.95) * 100).toFixed(0)}%
 * Generated: ${new Date().toISOString()}
 */

import { test, expect, describe } from "bun:test";
${testImports}

describe("${className}", () => {
	test("should initialize correctly", () => {
		// TODO: Add initialization tests
		expect(true).toBe(true);
	});

	test("should handle basic operations", () => {
		// TODO: Add operation tests
		expect(true).toBe(true);
	});

	test("should handle error cases", () => {
		// TODO: Add error handling tests
		expect(true).toBe(true);
	});
});
`
}

// ═══════════════════════════════════════════════════════════════
// 6. CONFIGURATION MANAGEMENT [CONFIGURATION.MANAGEMENT.RG]
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 6.1 Config Manager Class [CONFIG.MANAGER.CLASS.RG]
// ═══════════════════════════════════════════════════════════════
// Note: Currently implemented as functions. Future enhancement: Convert to class-based architecture.

// ═══════════════════════════════════════════════════════════════
// 6.1.1 Package.json Updates [CONFIG.PACKAGE.JSON.RG:CONFIG]
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MANIFEST UPDATES [MANIFEST.UPDATES.RG:IMPLEMENTATION]
// ═══════════════════════════════════════════════════════════════

async function updateManifest(
  manifestPath: string,
  name: string,
  type: ScaffoldType,
  filePath: string,
  options: ScaffoldOptions,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES]
): Promise<void> {
  const manifestFile = Bun.file(manifestPath)
  if (!(await manifestFile.exists())) {
    console.warn(`⚠️  Manifest not found at ${manifestPath}, skipping manifest update`)
    return
  }

  const manifest = JSON.parse(await manifestFile.text())

  // Determine manifest structure based on type
  if (type === "component") {
    if (!manifest.components) {
      manifest.components = {}
    }

    const className = toPascalCase(name) + "Component"
    const exports = options.exports || [className, `render${toPascalCase(name)}Card`]

    manifest.components[name] = {
      path: filePath.replace(/^apps\/@registry-dashboard\//, ""),
      critical: options.critical,
      "test-coverage-required": options.coverage || 0.95,
      exports,
      description: options.description || `Auto-generated ${name} component`,
      dependencies: options.dependencies || [],
      "last-validated": new Date().toISOString(),
      ...(team && { team: team.id }),
    }
  } else if (type === "mcp-tool") {
    if (!manifest.mcp_tools) {
      manifest.mcp_tools = {}
    }

    manifest.mcp_tools[name] = {
      path: filePath,
      description: options.description || `Auto-generated ${name} MCP tool`,
      dependencies: options.dependencies || [],
      exports: options.exports || [
        `create${toPascalCase(name)}Tool`,
        `execute${toPascalCase(name)}Tool`,
      ],
      "last-validated": new Date().toISOString(),
      ...(team && { team: team.id }),
    }
  }

  manifest.metadata = manifest.metadata || {}
  manifest.metadata.last_audit = new Date().toISOString()
  manifest.metadata.last_validated = new Date().toISOString()

  // Calculate checksum
  const manifestContent = JSON.stringify(manifest, null, 2)
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(manifestContent)
  const checksum = `sha256:${hasher.digest("hex")}`

  manifest.metadata.checksum = checksum
  const finalContent = JSON.stringify(manifest, null, 2)

  await Bun.write(manifestPath, finalContent)
  console.log(`✅ Updated manifest: ${manifestPath}`)
  console.log(`   Checksum: ${checksum}`)
}

// ═══════════════════════════════════════════════════════════════
// RSS INTEGRATION [RSS.INTEGRATION.RG:IMPLEMENTATION]
// ═══════════════════════════════════════════════════════════════

async function publishToRSS(
  name: string,
  type: ScaffoldType,
  filePath: string,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES]
): Promise<void> {
  if (!team) return

  try {
    const db = new Database("data/registry.db")
    db.exec(`
			CREATE TABLE IF NOT EXISTS rss_items (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				feed_type TEXT,
				package_name TEXT,
				title TEXT,
				content TEXT,
				timestamp TEXT,
				severity TEXT,
				category TEXT,
				metadata TEXT
			)
		`)

    const title = `🆕 Scaffolded ${type}: ${name}`
    const content = `New ${type} "${name}" has been scaffolded${team ? ` for ${team.name}` : ""}.`

    db.prepare(`
			INSERT INTO rss_items (feed_type, package_name, title, content, timestamp, severity, category, metadata)
			VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)
		`).run(
      "scaffold",
      `@scaffold/${name}`,
      title,
      content,
      "low",
      "development",
      JSON.stringify({
        type,
        name,
        team: team.id,
        scaffolded_at: new Date().toISOString(),
      })
    )

    // Refresh RSS cache
    try {
      await fetch(`${RSS_INTERNAL.team_metrics}/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REGISTRY_API_TOKEN || ""}`,
        },
      })
    } catch {
      // Ignore RSS refresh errors
    }

    console.log(`✅ Published to RSS feed`)
  } catch (error) {
    console.warn(`⚠️  Failed to publish to RSS:`, error)
  }
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM NOTIFICATIONS [TELEGRAM.NOTIFICATIONS.RG:IMPLEMENTATION]
// ═══════════════════════════════════════════════════════════════

async function notifyTeam(
  name: string,
  type: ScaffoldType,
  team?: (typeof RSS_TEAM_CATEGORIES)[keyof typeof RSS_TEAM_CATEGORIES]
): Promise<void> {
  if (!team) return

  try {
    const telegram = getTelegramClient()
    // Map RSS_TEAM_CATEGORIES team.id to TELEGRAM_CONFIG.supergroups keys
    // RSS_TEAM_CATEGORIES uses: sports, markets, platform
    // TELEGRAM_CONFIG.supergroups uses: sports_correlation, market_analytics, platform_tools
    const teamKeyMap: Record<string, keyof typeof TELEGRAM_CONFIG.supergroups> = {
      sports: "sports_correlation",
      markets: "market_analytics",
      platform: "platform_tools",
    }
    const telegramTeamKey =
      teamKeyMap[team.id] || (team.id as keyof typeof TELEGRAM_CONFIG.supergroups)
    const teamConfig = TELEGRAM_CONFIG.supergroups[telegramTeamKey]

    if (!teamConfig) {
      console.warn(`⚠️  No Telegram config for team: ${team.id} (mapped to ${telegramTeamKey})`)
      return
    }

    const message =
      `🆕 **New ${type} scaffolded**: \`${name}\`\n\n` +
      `Team: ${team.name}\n` +
      `Type: ${type}\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `🔗 [View in codebase](https://github.com/brendadeeznuts1111/trader-analyzer-bun)`

    await telegram.sendMessage({
      chatId: teamConfig.id,
      threadId: teamConfig.topics.general,
      text: message,
      parseMode: "Markdown",
      disable_notification: true, // Low priority notification
    })

    console.log(`✅ Notified team via Telegram`)
  } catch (error) {
    console.warn(`⚠️  Failed to notify Telegram:`, error)
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. AI ENHANCEMENT FUNCTIONS [AI.ENHANCEMENT.FUNCTIONS.RG]
// ═══════════════════════════════════════════════════════════════

/**
 * Enhance generated code with AI suggestions
 */
async function enhanceCodeWithAISuggestions(
  code: string,
  suggestions: any,
  options: ScaffoldOptions
): Promise<string> {
  let enhancedCode = code

  // Add AI-generated imports
  if (suggestions.imports && suggestions.imports.length > 0) {
    // Find the last import line and add AI imports after it
    const lines = enhancedCode.split("\n")
    let lastImportIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("import")) {
        lastImportIndex = i
      }
    }

    if (lastImportIndex >= 0) {
      const aiImports = suggestions.imports
        .map((imp: string) => `// AI-enhanced import\n${imp}`)
        .join("\n")
      lines.splice(lastImportIndex + 1, 0, "", aiImports)
      enhancedCode = lines.join("\n")
    }
  }

  // Add AI-generated interfaces
  if (suggestions.interfaces && suggestions.interfaces.length > 0) {
    // Find a good place to add interfaces (after imports, before main code)
    const interfaceBlock = suggestions.interfaces
      .map((int: string) => `// AI-generated interface\n${int}`)
      .join("\n\n")
    enhancedCode = enhancedCode.replace(
      /(\/\/ ═══════════════════════════════════════════════════════════════\n\/\/ TYPES\n\/\/ ═══════════════════════════════════════════════════════════════\n\n)/,
      `$1${interfaceBlock}\n\n`
    )
  }

  // Add AI-generated method stubs
  if (suggestions.methodStubs && suggestions.methodStubs.length > 0) {
    for (const stub of suggestions.methodStubs) {
      // Find TODO comments and replace them with AI-generated implementations
      const todoPattern = new RegExp(`// TODO: ${stub.name}`, "g")
      if (todoPattern.test(enhancedCode)) {
        const methodImplementation = `
  /**
   * ${stub.description}
   * AI-generated implementation
   */
  ${stub.signature} {
    ${stub.implementation}
  }`
        enhancedCode = enhancedCode.replace(todoPattern, methodImplementation.trim())
      }
    }
  }

  // Add performance optimizations as comments
  if (suggestions.performanceOptimizations && suggestions.performanceOptimizations.length > 0) {
    const perfComments = suggestions.performanceOptimizations
      .map((opt: string) => `// PERFORMANCE: ${opt}`)
      .join("\n")
    enhancedCode = enhancedCode.replace(/(export class \w+ \{)/, `${perfComments}\n\n$1`)
  }

  // Add error handling patterns
  if (suggestions.errorHandling) {
    // Add error handling comment near the class
    enhancedCode = enhancedCode.replace(
      /(export class \w+ \{)/,
      `// ERROR HANDLING: ${suggestions.errorHandling}\n\n$1`
    )
  }

  return enhancedCode
}

// ═══════════════════════════════════════════════════════════════
// 8. MAIN SCAFFOLDING ENGINE [MAIN.SCAFFOLDING.ENGINE.RG]
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 8.1.1 Main Scaffold Method [MAIN.SCAFFOLD.METHOD.RG]
// ═══════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs()

  // ═══════════════════════════════════════════════════════════════
  // 8.1.3 File Path Generation [MAIN.FILE.PATH.GENERATION.RG]
  // ═══════════════════════════════════════════════════════════════
  // Normalize path
  const targetPath = options.path.endsWith("/") ? options.path.slice(0, -1) : options.path

  // Determine file extension based on type
  let fileExtension = ".ts"
  if (options.type === "component") {
    fileExtension = ".tsx" // Components use TSX
  }

  const finalTargetFile = join(targetPath, `${options.name}${fileExtension}`)
  const testFile = join(targetPath, `${options.name}.test.ts`)

  // ═══════════════════════════════════════════════════════════════
  // 8.1.2 Template Key Determination [MAIN.TEMPLATE.KEY.DETERMINATION.RG]
  // ═══════════════════════════════════════════════════════════════
  // Determine manifest path based on type
  let manifestPath: string
  if (targetPath.startsWith("apps/@registry-dashboard/")) {
    manifestPath = join(dirname(targetPath), "manifest.json")
  } else if (targetPath.startsWith("src/mcp/tools/")) {
    manifestPath = join("src/mcp", "tools-manifest.json")
  } else {
    manifestPath = join(targetPath, "manifest.json")
  }

  // Get team info if specified
  const team = options.team ? RSS_TEAM_CATEGORIES[options.team] : undefined

  // Get git user info for JSDoc
  const gitUser = await getGitUser()

  // Generate code based on type
  let code: string
  switch (options.type) {
    case "component":
      code = await generateComponentStub(options.name, options, team, gitUser)
      break
    case "mcp-tool":
      code = await generateMCPToolStub(options.name, options, team, gitUser)
      break
    case "script":
      code = await generateScriptStub(options.name, options, team, gitUser)
      break
    case "service":
      code = await generateServiceStub(options.name, options, team, gitUser)
      break
    case "interface":
      code = await generateInterfaceStub(options.name, options, gitUser)
      break
    case "enum":
      code = await generateEnumStub(options.name, options, gitUser)
      break
    default:
      console.error(`❌ Unsupported type: ${options.type}`)
      process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════════
  // 8.1.4 AI Enhancement [MAIN.AI.ENHANCEMENT.RG]
  // ═══════════════════════════════════════════════════════════════
  // Apply AI enhancement if context is provided
  if (options.aiContext) {
    try {
      const aiService = getAICodeSuggestionService()
      await aiService.initialize()

      if (aiService.isAvailable()) {
        console.log(`🤖 Enhancing with AI context: ${options.aiContext.substring(0, 50)}...`)

        const aiRequest = {
          type: options.type,
          name: options.name,
          description: options.description,
          aiContext: options.aiContext,
          dependencies: options.dependencies,
          existingCode: code,
          templateVariant: options.templateVariant,
        }

        const aiSuggestions = await aiService.generateSuggestions(aiRequest)

        if (aiSuggestions.confidence > 0.5) {
          // Apply AI suggestions to enhance the generated code
          code = await enhanceCodeWithAISuggestions(code, aiSuggestions, options)
          console.log(
            `✅ AI-enhanced with ${aiSuggestions.methodStubs.length} method stubs (confidence: ${(aiSuggestions.confidence * 100).toFixed(0)}%)`
          )
        } else {
          console.log(
            `⚠️  AI suggestions available but low confidence (${(aiSuggestions.confidence * 100).toFixed(0)}%), using base template`
          )
        }
      } else {
        console.log(`⚠️  AI service not available, using base template`)
      }
    } catch (error) {
      console.warn(`⚠️  AI enhancement failed, using base template:`, error)
    }
  }

  // Write main file
  const targetFileObj = Bun.file(finalTargetFile)
  if (!(await targetFileObj.exists())) {
    await Bun.write(finalTargetFile, code)
    console.log(`✅ Generated ${options.type}: ${finalTargetFile}`)
  } else {
    console.log(`⚠️  File already exists: ${finalTargetFile}`)
  }

  // Generate test file
  const testFileObj = Bun.file(testFile)
  if (!(await testFileObj.exists())) {
    // Calculate relative import path without extension
    let importPath = finalTargetFile
    if (finalTargetFile.startsWith("apps/@registry-dashboard/src/")) {
      importPath = finalTargetFile.replace(/^apps\/@registry-dashboard\/src\//, "../../")
    } else if (finalTargetFile.startsWith("src/")) {
      importPath = finalTargetFile.replace(/^src\//, "../")
    } else if (finalTargetFile.startsWith("scripts/")) {
      importPath = finalTargetFile.replace(/^scripts\//, "../../")
    }
    // Remove extension for import
    importPath = importPath.replace(/\.(ts|tsx)$/, "")

    const testCode = generateTestFile(options.name, options.type, importPath, options)
    await Bun.write(testFile, testCode)
    console.log(`✅ Generated test file: ${testFile}`)
  } else {
    console.log(`⚠️  Test file already exists: ${testFile}`)
  }

  // Update manifest
  if (options.updateManifest) {
    await updateManifest(manifestPath, options.name, options.type, finalTargetFile, options, team)
  }

  // Update package.json dependencies if mcp-tool type and dependencies specified
  if (options.type === "mcp-tool" && options.dependencies && options.dependencies.length > 0) {
    try {
      const packageJsonPath = join(process.cwd(), "package.json")
      const packageJsonFile = Bun.file(packageJsonPath)
      if (await packageJsonFile.exists()) {
        const packageJson = JSON.parse(await packageJsonFile.text())
        if (!packageJson.dependencies) {
          packageJson.dependencies = {}
        }

        for (const dep of options.dependencies) {
          // Skip if already exists
          if (!packageJson.dependencies[dep]) {
            // Try to get version from existing dependencies or use latest
            packageJson.dependencies[dep] = "*" // User should specify version
          }
        }

        await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log(`✅ Updated package.json with dependencies: ${options.dependencies.join(", ")}`)
        console.log(`   ⚠️  Please verify and set correct versions for dependencies`)
      }
    } catch (error) {
      console.warn(`⚠️  Failed to update package.json:`, error)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. GIT AUTOMATION [GIT.AUTOMATION.RG]
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════
  // 7.1 Git Automation Class [GIT.AUTOMATION.CLASS.RG]
  // ═══════════════════════════════════════════════════════════════
  // Note: Currently implemented as inline functions. Future enhancement: Convert to class-based architecture.

  // ═══════════════════════════════════════════════════════════════
  // 7.1.1 Feature Branch Creation [GIT.FEATURE.BRANCH.RG]
  // ═══════════════════════════════════════════════════════════════
  // Future: Add support for automatic feature branch creation.

  // ═══════════════════════════════════════════════════════════════
  // 7.1.2 File Committing [GIT.FILE.COMMITTING.RG:IMPLEMENTATION]
  // ═══════════════════════════════════════════════════════════════
  // Git integration (optional)
  if (options.git) {
    try {
      await $`git add ${finalTargetFile} ${testFile}`
      const commitMessage = `feat(scaffold): Added ${options.type} ${options.name}${team ? ` for ${team.id}` : ""}`
      await $`git commit -m ${commitMessage}`
      console.log(`✅ Committed files to git: ${commitMessage}`)
    } catch (error) {
      console.warn(`⚠️  Git commit failed (this is okay if not in a git repo):`, error)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7.1.3 Push and PR Creation [GIT.PUSH.PR.CREATION.RG]
  // ═══════════════════════════════════════════════════════════════
  // Future: Add support for automatic push and PR creation.

  // ═══════════════════════════════════════════════════════════════
  // 7.1.4 PR Template Generation [GIT.PR.TEMPLATE.RG]
  // ═══════════════════════════════════════════════════════════════
  // Future: Generate PR templates with scaffolded component details.

  // ═══════════════════════════════════════════════════════════════
  // 7.1.5 Git Helper Methods [GIT.HELPER.METHODS.RG]
  // ═══════════════════════════════════════════════════════════════
  // Git helper methods are currently inline. Future: Extract to dedicated utility class.

  // Publish to RSS
  if (options.rss && team) {
    await publishToRSS(options.name, options.type, finalTargetFile, team)
  }

  // Send Telegram notification
  if (options.notify && team) {
    await notifyTeam(options.name, options.type, team)
  }

  console.log("\n✅ Scaffolding complete!")
  console.log(`\n📝 Next steps:`)
  console.log(`   1. Review generated ${options.type}: ${finalTargetFile}`)
  console.log(`   2. Run tests: bun test ${testFile}`)
  if (options.coverage) {
    console.log(`   3. Verify coverage: bun test --coverage ${testFile}`)
  }
  if (options.type === "mcp-tool") {
    console.log(`   4. Register tool in src/mcp/server.ts`)
    console.log(`   5. Test via MCP: bun run scripts/mcp-server.ts`)
  }
  if (options.type === "component") {
    console.log(`   4. Import and use in your dashboard components`)
  }
  if (options.dependencies && options.dependencies.length > 0) {
    console.log(`   6. Install dependencies: bun install`)
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Scaffolding failed:", error)
    process.exit(1)
  })
}
