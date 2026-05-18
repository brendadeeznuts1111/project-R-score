// scripts/bun-template-api.ts - Bun Template API for Surgical Precision Platform

export namespace BunTemplateAPI {
  export interface Template {
    name: string;
    version: string;
    description: string;
    scaffoldProject(dir: string, name: string, variant?: string): Promise<void>;
  }

  export interface ScaffoldOptions {
    dir: string;
    name: string;
    variant?: string;
    features?: string[];
    interactive?: boolean;
  }

  export interface TemplateConfig {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    repository?: string;
    variants?: Record<string, VariantConfig>;
  }

  export interface VariantConfig {
    description: string;
    features: string[];
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }

  /**
   * Scaffold a new project from a template
   */
  export async function scaffoldProject(
    template: Template,
    options: ScaffoldOptions
  ): Promise<void> {
    const { dir, name, variant = 'default' } = options;

    console.info(`🚀 Creating project: ${name}`);
    console.info(`📁 Directory: ${dir}`);
    console.info(`🎯 Template: ${template.name} (${template.version})`);
    console.info(`📝 Variant: ${variant}`);
    console.info('');

    await template.scaffoldProject(dir, name, variant);

    console.info('');
    console.info('✅ Project created successfully!');
    console.info('');
    console.info('🚀 Next steps:');
    console.info(`   cd ${dir}`);
    console.info('   bun install');
    console.info('   bun run dev');
  }

  /**
   * Create a new template instance
   */
  export function createTemplate(config: TemplateConfig): Template {
    return {
      name: config.name,
      version: config.version,
      description: config.description,

      async scaffoldProject(dir: string, name: string, variant: string = 'default'): Promise<void> {
        // Default implementation - can be overridden
        throw new Error(`Template ${config.name} does not implement scaffoldProject`);
      }
    };
  }

  /**
   * Validate template structure
   */
  export async function validateTemplate(dir: string): Promise<boolean> {
    const requiredFiles = [
      'package.json',
      'src/index.ts',
      'README.md'
    ];

    for (const file of requiredFiles) {
      const exists = await Bun.file(`${dir}/${file}`).exists();
      if (!exists) {
        console.error(`❌ Missing required file: ${file}`);
        return false;
      }
    }

    console.info('✅ Template structure is valid');
    return true;
  }

  /**
   * List available template variants
   */
  export function listVariants(config: TemplateConfig): void {
    if (!config.variants) {
      console.info('No variants available for this template.');
      return;
    }

    console.info(`📋 Available variants for ${config.name}:`);
    console.info('');

    for (const [key, variant] of Object.entries(config.variants)) {
      console.info(`🎯 ${key}`);
      console.info(`   ${variant.description}`);
      console.info(`   Features: ${variant.features.join(', ')}`);
      console.info('');
    }
  }

  /**
   * Interactive template selection
   */
  export async function interactiveScaffold(template: Template, config: TemplateConfig): Promise<void> {
    console.info(`🖥️  ${template.name} Template Creator`);
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('');
    console.info(template.description);
    console.info('');

    // Get project name
    const projectName = await prompt('Project name:');
    if (!projectName) {
      console.info('❌ Project name is required');
      return;
    }

    // Get directory
    const directory = await prompt('Directory (default: ./<name>):', `./${projectName}`);

    // Select variant
    let variant = 'default';
    if (config.variants && Object.keys(config.variants).length > 0) {
      console.info('');
      console.info('📋 Available variants:');
      listVariants(config);

      const variantInput = await prompt('Select variant (default: full-platform):', 'full-platform');
      if (variantInput && config.variants[variantInput]) {
        variant = variantInput;
      }
    }

    // Confirm
    console.info('');
    console.info('📋 Configuration:');
    console.info(`   Name: ${projectName}`);
    console.info(`   Directory: ${directory}`);
    console.info(`   Variant: ${variant}`);

    const confirm = await prompt('Proceed? (y/N):', 'y');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.info('❌ Operation cancelled');
      return;
    }

    await scaffoldProject(template, {
      dir: directory,
      name: projectName,
      variant
    });
  }
}

/**
 * Simple prompt utility for interactive mode
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  process.stdout.write(`${question}${suffix}: `);

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const input = data.toString().trim();
      resolve(input || defaultValue || '');
    });
  });
}

// Export the API
export default BunTemplateAPI;