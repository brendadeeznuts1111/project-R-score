/**
 * Partner Profile OS — Template Loader
 *
 * Uses Bun-native APIs exclusively:
 *   - Bun.TOML.parse()   — zero-dependency TOML parsing
 *   - new Glob()         — template file discovery
 *
 * Validates all templates against Zod schemas. Malformed TOML is skipped
 * with stderr logging (includes line/column when available from parse errors).
 *
 * Zero non-Bun dependencies except Zod.
 */

import { Glob } from "bun";
import {
  ProfileTemplateSchema,
  type ProfileTemplate,
} from "./partner-profile-schema";
import { ZodError } from "zod";

/** In-memory cache of loaded templates: templateId -> parsed template */
const templateCache = new Map<string, ProfileTemplate>();

/**
 * Load a single TOML template file from disk, parse, and validate.
 *
 * @param filePath Absolute or relative path to the .toml file
 * @returns Validated ProfileTemplate
 * @throws SyntaxError for malformed TOML (with line/column info)
 * @throws ZodError for schema validation failures
 */
export async function loadProfileTemplate(filePath: string): Promise<ProfileTemplate> {
  const file = Bun.file(filePath);
  if (!file.exists()) {
    throw new Error(`Template file not found: ${filePath}`);
  }

  const content = await file.text();
  const raw = Bun.TOML.parse(content);

  // Validate against strict Zod schema
  const parsed = ProfileTemplateSchema.parse(raw);
  return parsed;
}

/**
 * Discover and load all .toml templates in a directory.
 *
 * @param templateDir Directory containing *.toml profile templates
 * @returns Map of templateId -> validated ProfileTemplate
 *
 * Malformed TOML files are logged to stderr and skipped — boot continues
 * with the remaining valid templates.
 */
export async function discoverTemplates(
  templateDir: string = "./profiles"
): Promise<Map<string, ProfileTemplate>> {
  const templates = new Map<string, ProfileTemplate>();
  const glob = new Glob("*.toml");

  for await (const file of glob.scan(templateDir)) {
    const filePath = `${templateDir}/${file}`;
    try {
      const template = await loadProfileTemplate(filePath);

      // Duplicate detection
      if (templates.has(template.meta.template_id)) {
        console.warn(
          `[LOADER] Duplicate template ID "${template.meta.template_id}" from ${filePath} — last one wins`
        );
      }

      templates.set(template.meta.template_id, template);
      console.log(`[LOADER] Loaded template "${template.meta.template_id}" from ${file}`);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        // Bun.TOML.parse() syntax errors include line/column info
        console.error(`[LOADER] Malformed TOML in ${filePath}: ${err.message}`);
      } else if (err instanceof ZodError) {
        const issues = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        console.error(`[LOADER] Validation failed for ${filePath}: ${issues}`);
      } else {
        console.error(`[LOADER] Failed to load ${filePath}: ${err.message}`);
      }
      // Skip malformed template — boot continues
    }
  }

  console.log(`[LOADER] ${templates.size} template(s) loaded from ${templateDir}`);
  return templates;
}

/**
 * Get a previously loaded template by ID (synchronous, O(1)).
 */
export function getTemplate(templateId: string): ProfileTemplate | undefined {
  return templateCache.get(templateId);
}

/**
 * Store a template in the in-memory cache.
 */
export function cacheTemplate(templateId: string, template: ProfileTemplate): void {
  templateCache.set(templateId, template);
}

/**
 * Clear the template cache.
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Return all cached template IDs.
 */
export function listTemplateIds(): string[] {
  return Array.from(templateCache.keys());
}

/**
 * Full load: discover templates from disk + cache them. Used at boot.
 */
export async function loadAndCacheTemplates(
  templateDir: string = "./profiles"
): Promise<Map<string, ProfileTemplate>> {
  clearTemplateCache();
  const templates = await discoverTemplates(templateDir);
  for (const [id, tmpl] of templates) {
    cacheTemplate(id, tmpl);
  }
  return templates;
}
