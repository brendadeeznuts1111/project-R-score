#!/usr/bin/env bun
/**
 * Nebula Flow Configuration Manager
 * 
 * 🚀 **NEBULA-FLOW CONFIG APOCALYPSE: Structured Metadata Mastery + Grep-First Tags + Schema-Validated Profiles**
 * 
 * This script provides comprehensive management capabilities for the VSCode Project Manager configuration
 * with dual-tag system, schema validation, performance optimizations, and search functionality.
 * 
 * @version 3.5.0
 * @author DuoPlus Team
 * @license MIT
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration file paths
const CONFIG_PATH = path.join(process.env.HOME || '/Users/nolarose', 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'alefragnani.project-manager', 'projects.json');
const TAGS_INDEX_PATH = path.join(process.env.HOME || '/Users/nolarose', 'd-network', '.nebula-tags.index');

// Schema validation rules
const VALIDATION_SCHEMA = {
  requiredFields: ['name', 'rootPath', 'tags', 'group', 'profile', 'description'],
  optionalFields: ['readableTag', 'grepTag', 'paths', 'enabled', 'ui', 'customConfig'],
  validGroups: ['Production Systems', 'AI/ML Systems', 'Development Tools', 'Security Systems', 'Frontend Systems', 'DevOps Systems', 'Quality Assurance', 'Documentation', 'Learning Resources', 'Financial Systems'],
  validProfiles: ['nebula-production', 'ai-development', 'cli-development', 'compliance-production', 'web-production', 'deployment-production', 'testing-development', 'documentation', 'demo-showcase', 'finance-production'],
  tagPattern: /^[a-zA-Z0-9-_.]+$/,
  versionPattern: /^v\d+\.\d+(\.\d+)?$/,
  severityLevels: ['critical-infrastructure', 'high-compliance', 'financial-critical', 'devops-critical', 'frontend-production', 'tooling-development', 'testing-quality', 'research-experimental', 'demo-educational', 'information-reference']
};

// Color mapping for severity levels (HSL values)
const SEVERITY_COLORS: Record<string, string> = {
  'critical-infrastructure': 'hsl(135, 85%, 52%)',    // Green - Infrastructure
  'high-compliance': 'hsl(45, 90%, 52%)',              // Yellow - Compliance
  'financial-critical': 'hsl(45, 90%, 52%)',           // Yellow - Finance
  'devops-critical': 'hsl(180, 60%, 50%)',             // Cyan - DevOps
  'frontend-production': 'hsl(210, 40%, 65%)',         // Gray - Frontend
  'tooling-development': 'hsl(270, 70%, 60%)',         // Purple - Tooling
  'testing-quality': 'hsl(270, 70%, 60%)',             // Purple - Testing
  'research-experimental': 'hsl(200, 80%, 55%)',       // Blue - Research
  'demo-educational': 'hsl(270, 70%, 60%)',            // Purple - Demo
  'information-reference': 'hsl(210, 40%, 65%)'        // Gray - Docs
};

/**
 * Convert HSL color to HEX
 */
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#000000';

  const h = parseInt(match[1]);
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h / 360 + 1/3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate dual-tag system for projects
 */
function generateDualTags(name: string, group: string, profile: string, index: number): { readableTag: string; grepTag: string } {
  // Extract category from profile
  let category = 'GEN';
  if (profile.includes('nebula')) category = 'CORE';
  else if (profile.includes('ai')) category = 'AI';
  else if (profile.includes('cli')) category = 'CLI';
  else if (profile.includes('compliance')) category = 'SEC';
  else if (profile.includes('web')) category = 'WEB';
  else if (profile.includes('deployment')) category = 'OPS';
  else if (profile.includes('testing')) category = 'TEST';
  else if (profile.includes('documentation')) category = 'DOC';
  else if (profile.includes('demo')) category = 'DEMO';
  else if (profile.includes('finance')) category = 'FIN';

  // Determine environment type
  let environment = 'DEV';
  if (profile.includes('production')) environment = 'PROD';
  else if (profile.includes('development')) environment = 'DEV';
  else if (profile.includes('testing')) environment = 'TEST';

  // Generate unique ID
  const id = `NEB-${category}-${String(index + 1).padStart(3, '0')}`;

  // Extract version from profile or use default
  let version = 'v1.0';
  if (profile.includes('v')) {
    const match = profile.match(/v\d+\.\d+(\.\d+)?/);
    if (match) version = match[0];
  }

  // Status
  const status = 'ACTIVE';

  // Create tags
  const readableTag = `[NEBULA][${category}][${environment}][${id}][${version}][${status}]`;
  const grepTag = readableTag.toLowerCase();

  return { readableTag, grepTag };
}

/**
 * Validate single project against schema
 */
function validateProject(project: any, index: number): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  VALIDATION_SCHEMA.requiredFields.forEach(field => {
    if (!project[field]) {
      errors.push(`Project ${index + 1}: Missing required field "${field}"`);
    }
  });

  // Validate tag format
  if (project.tags && Array.isArray(project.tags)) {
    project.tags.forEach((tag: string, tagIndex: number) => {
      if (!VALIDATION_SCHEMA.tagPattern.test(tag)) {
        errors.push(`Project ${index + 1}: Tag at index ${tagIndex} ("${tag}") contains invalid characters`);
      }
    });
  }

  // Validate group
  if (project.group && !VALIDATION_SCHEMA.validGroups.includes(project.group)) {
    errors.push(`Project ${index + 1}: Invalid group "${project.group}"`);
  }

  // Validate profile
  if (project.profile && !VALIDATION_SCHEMA.validProfiles.includes(project.profile)) {
    errors.push(`Project ${index + 1}: Invalid profile "${project.profile}"`);
  }

  // Validate severity
  if (project.ui?.severity && !VALIDATION_SCHEMA.severityLevels.includes(project.ui.severity)) {
    errors.push(`Project ${index + 1}: Invalid severity level "${project.ui.severity}"`);
  }

  // Validate version pattern
  if (project.readableTag) {
    const versionMatch = project.readableTag.match(VALIDATION_SCHEMA.versionPattern);
    if (!versionMatch) {
      warnings.push(`Project ${index + 1}: Version format not detected in readable tag`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate entire configuration file
 */
async function validateConfiguration(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    config.forEach((project: any, index: number) => {
      const validation = validateProject(project, index);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`JSON Parse Error: ${(error as Error).message}`],
      warnings: []
    };
  }
}

/**
 * Generate tags index for fast searching
 */
async function generateTagsIndex(): Promise<void> {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const indexData: any[] = [];

    config.forEach((project: any, index: number) => {
      const entry: any = {
        index,
        name: project.name,
        group: project.group,
        profile: project.profile,
        rootPath: project.rootPath
      };

      if (project.readableTag) entry.readableTag = project.readableTag;
      if (project.grepTag) entry.grepTag = project.grepTag;
      if (project.tags) entry.tags = project.tags;
      if (project.ui?.statusColor) entry.color = project.ui.statusColor;

      indexData.push(entry);
    });

    fs.writeFileSync(TAGS_INDEX_PATH, JSON.stringify(indexData, null, 2));
    console.log('✅ Tags index generated successfully');
  } catch (error) {
    console.error('❌ Error generating tags index:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Grep configuration using ripgrep
 */
async function grepProjects(query: string): Promise<string[]> {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const results: string[] = [];

    config.forEach((project: any, index: number) => {
      const searchText = `${project.name} ${project.readableTag || ''} ${project.grepTag || ''} ${project.tags?.join(' ') || ''} ${project.profile} ${project.group}`.toLowerCase();
      
      if (searchText.includes(query.toLowerCase())) {
        results.push(`[${index + 1}] ${project.name} (${project.group}) - ${project.profile}`);
      }
    });

    return results;
  } catch (error) {
    console.error('❌ Error searching projects:', (error as Error).message);
    return [];
  }
}

/**
 * Display status overview with color coding
 */
async function displayStatus(): Promise<void> {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const total = config.length;
    const enabled = config.filter((p: any) => p.enabled).length;
    const production = config.filter((p: any) => p.profile.includes('production')).length;

    console.log('📊 Nebula Flow Configuration Status');
    console.log('==================================');
    console.log(`Total Projects:    ${total}`);
    console.log(`Enabled Projects:  ${enabled}`);
    console.log(`Production Profiles: ${production}`);
    console.log();
    console.log('Projects by Severity Level:');
    
    const severityCount: Record<string, number> = {};
    VALIDATION_SCHEMA.severityLevels.forEach(severity => {
      severityCount[severity] = 0;
    });

    config.forEach((p: any) => {
      if (p.ui?.severity && severityCount[p.ui.severity] !== undefined) {
        severityCount[p.ui.severity]++;
      }
    });

    Object.entries(severityCount).forEach(([severity, count]) => {
      if (count > 0) {
        console.log(`  ${severity}: ${count}`);
      }
    });

    console.log();
    console.log('Projects by Group:');
    const groupCount: Record<string, number> = {};
    config.forEach((p: any) => {
      groupCount[p.group] = (groupCount[p.group] || 0) + 1;
    });

    Object.entries(groupCount).forEach(([group, count]) => {
      console.log(`  ${group}: ${count}`);
    });
  } catch (error) {
    console.error('❌ Error displaying status:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Generate new project profile stub
 */
async function generateProfileStub(options: { profile: string; name: string; group?: string; tags?: string[] }): Promise<void> {
  const { profile, name, group, tags = [] } = options;
  
  // Determine default group based on profile
  let defaultGroup = group || 'Development Tools';
  if (profile.includes('production')) defaultGroup = 'Production Systems';
  else if (profile.includes('ai')) defaultGroup = 'AI/ML Systems';
  else if (profile.includes('cli')) defaultGroup = 'Development Tools';
  else if (profile.includes('compliance')) defaultGroup = 'Security Systems';
  else if (profile.includes('web')) defaultGroup = 'Frontend Systems';
  else if (profile.includes('deployment')) defaultGroup = 'DevOps Systems';
  else if (profile.includes('testing')) defaultGroup = 'Quality Assurance';
  else if (profile.includes('documentation')) defaultGroup = 'Documentation';
  else if (profile.includes('demo')) defaultGroup = 'Learning Resources';
  else if (profile.includes('finance')) defaultGroup = 'Financial Systems';

  // Determine severity level
  let severity = 'tooling-development';
  if (profile.includes('production')) {
    if (profile.includes('core') || profile.includes('sec')) {
      severity = 'critical-infrastructure';
    } else if (profile.includes('finance')) {
      severity = 'financial-critical';
    } else {
      severity = 'frontend-production';
    }
  } else if (profile.includes('ai')) {
    severity = 'research-experimental';
  } else if (profile.includes('testing')) {
    severity = 'testing-quality';
  } else if (profile.includes('demo')) {
    severity = 'demo-educational';
  } else if (profile.includes('documentation')) {
    severity = 'information-reference';
  }

  // Create stub
  const stub = {
    name,
    rootPath: '/Users/nolarose/d-network',
    paths: [],
    tags: [...tags],
    readableTag: '',
    grepTag: '',
    enabled: true,
    group: defaultGroup,
    profile,
    ui: {
      statusColor: {
        hsl: SEVERITY_COLORS[severity],
        hex: hslToHex(SEVERITY_COLORS[severity]),
        cssVar: `--nebula-${profile.replace('-', '')}: ${SEVERITY_COLORS[severity]}`
      },
      severity
    },
    description: '',
    customConfig: {
      runtime: 'bun@1.0+',
      environment: {},
      features: []
    }
  };

  console.log('Generated Profile Stub:');
  console.log('======================');
  console.log(JSON.stringify(stub, null, 2));
}

/**
 * Export configuration to YAML format
 */
async function exportToYaml(outputPath: string = 'nebula-profiles.yaml'): Promise<void> {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    let yaml = '# Nebula Flow Configuration\n';
    yaml += '# Generated on ' + new Date().toISOString() + '\n';
    yaml += '\n';

    config.forEach((project: any, index: number) => {
      yaml += `# Project ${index + 1}: ${project.name}\n`;
      yaml += `- name: ${project.name}\n`;
      yaml += `  readableTag: ${project.readableTag || ''}\n`;
      yaml += `  grepTag: ${project.grepTag || ''}\n`;
      yaml += `  rootPath: ${project.rootPath}\n`;
      
      if (project.paths && project.paths.length > 0) {
        yaml += `  paths:\n`;
        project.paths.forEach((p: string) => {
          yaml += `    - ${p}\n`;
        });
      }
      
      if (project.tags && project.tags.length > 0) {
        yaml += `  tags:\n`;
        project.tags.forEach((t: string) => {
          yaml += `    - ${t}\n`;
        });
      }
      
      yaml += `  enabled: ${project.enabled || true}\n`;
      yaml += `  group: ${project.group}\n`;
      yaml += `  profile: ${project.profile}\n`;
      
      if (project.ui) {
        yaml += `  ui:\n`;
        if (project.ui.statusColor) {
          yaml += `    statusColor:\n`;
          yaml += `      hsl: ${project.ui.statusColor.hsl}\n`;
          yaml += `      hex: ${project.ui.statusColor.hex}\n`;
          yaml += `      cssVar: ${project.ui.statusColor.cssVar}\n`;
        }
        if (project.ui.severity) {
          yaml += `    severity: ${project.ui.severity}\n`;
        }
      }
      
      yaml += `  description: ${project.description}\n`;
      
      if (project.customConfig) {
        yaml += `  customConfig: !!omap\n`;
        Object.entries(project.customConfig).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object') {
            yaml += `    ${key}: !!omap\n`;
            if (Array.isArray(value)) {
              value.forEach((item: any) => {
                yaml += `      - ${item}\n`;
              });
            } else {
              Object.entries(value).forEach(([k, v]: [string, any]) => {
                yaml += `      ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}\n`;
              });
            }
          } else {
            yaml += `    ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}\n`;
          }
        });
      }
      
      yaml += '\n';
    });

    fs.writeFileSync(outputPath, yaml);
    console.log(`✅ Configuration exported to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error exporting to YAML:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'validate':
      {
        const validation = await validateConfiguration();
        
        if (validation.valid) {
          console.log('✅ Configuration valid');
        } else {
          console.error('❌ Configuration invalid:');
          validation.errors.forEach(error => console.error(`  - ${error}`));
        }
        
        if (validation.warnings.length > 0) {
          console.warn('\n⚠️  Warnings:');
          validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }
        
        process.exit(validation.valid ? 0 : 1);
      }
      break;
      
    case 'grep':
      {
        const query = args.slice(1).join(' ');
        if (!query) {
          console.error('❌ Usage: bun nebula:grep <search-query>');
          process.exit(1);
        }
        
        const results = await grepProjects(query);
        if (results.length === 0) {
          console.log('No matches found');
        } else {
          console.log(`Found ${results.length} match${results.length > 1 ? 'es' : ''}:`);
          results.forEach(result => console.log(`  ${result}`));
        }
      }
      break;
      
    case 'status':
      await displayStatus();
      break;
      
    case 'generate':
      {
        const options = parseGenerateOptions(args.slice(1));
        await generateProfileStub(options);
      }
      break;
      
    case 'export':
      {
        const format = args[1] || 'yaml';
        const outputPath = args[2] || 'nebula-profiles.yaml';
        
        if (format === 'yaml') {
          await exportToYaml(outputPath);
        } else if (format === 'json') {
          fs.copyFileSync(CONFIG_PATH, outputPath);
          console.log(`✅ Configuration exported to ${outputPath}`);
        } else {
          console.error('❌ Unsupported format. Use "yaml" or "json".');
          process.exit(1);
        }
      }
      break;
      
    case 'index':
      await generateTagsIndex();
      break;
      
    case 'help':
    case '--help':
      displayHelp();
      break;
      
    default:
      console.error('❌ Unknown command. Use "help" for available commands.');
      process.exit(1);
  }
}

/**
 * Parse generate command options
 */
function parseGenerateOptions(options: string[]): { profile: string; name: string; group?: string; tags?: string[] } {
  const result: any = {};
  
  for (let i = 0; i < options.length; i++) {
    const arg = options[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = options[i + 1];
      
      if (key === 'profile' && value) {
        result.profile = value;
        i++;
      } else if (key === 'name' && value) {
        result.name = value;
        i++;
      } else if (key === 'group' && value) {
        result.group = value;
        i++;
      } else if (key === 'tags' && value) {
        result.tags = value.split(',');
        i++;
      }
    }
  }
  
  if (!result.profile || !result.name) {
    console.error('❌ Usage: bun nebula:generate --profile <profile-name> --name <project-name> [--group <group-name>] [--tags <tag1,tag2>]');
    process.exit(1);
  }
  
  return result;
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log('Nebula Flow Configuration Manager');
  console.log('==================================');
  console.log();
  console.log('Usage:');
  console.log('  bun nebula:validate        - Validate configuration schema');
  console.log('  bun nebula:grep <query>    - Search projects by keyword');
  console.log('  bun nebula:status          - Display configuration status');
  console.log('  bun nebula:generate        - Generate profile stub');
  console.log('  bun nebula:export <format> - Export configuration');
  console.log('  bun nebula:index           - Generate tags index');
  console.log('  bun nebula:help            - Show this help');
  console.log();
  console.log('Examples:');
  console.log('  bun nebula:grep production core');
  console.log('  bun nebula:generate --profile nebula-production --name "New Core Feature"');
  console.log('  bun nebula:export yaml nebula-config.yaml');
  console.log();
  console.log('Profiles available:');
  VALIDATION_SCHEMA.validProfiles.forEach(profile => {
    console.log(`  - ${profile}`);
  });
}

// Run the main function
main().catch(error => {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
});
