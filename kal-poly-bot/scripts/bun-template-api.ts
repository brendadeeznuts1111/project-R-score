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

    console.log(`🚀 Creating project: ${name}`);
    console.log(`📁 Directory: ${dir}`);
    console.log(`🎯 Template: ${template.name} (${template.version})`);
    console.log(`📝 Variant: ${variant}`);
    console.log('');

    await template.scaffoldProject(dir, name, variant);

    console.log('');
    console.log('✅ Project created successfully!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log(`   cd ${dir}`);
    console.log('   bun install');
    console.log('   bun run dev');
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

    console.log('✅ Template structure is valid');
    return true;
  }

  /**
   * List available template variants
   */
  export function listVariants(config: TemplateConfig): void {
    if (!config.variants) {
      console.log('No variants available for this template.');
      return;
    }

    console.log(`📋 Available variants for ${config.name}:`);
    console.log('');

    for (const [key, variant] of Object.entries(config.variants)) {
      console.log(`🎯 ${key}`);
      console.log(`   ${variant.description}`);
      console.log(`   Features: ${variant.features.join(', ')}`);
      console.log('');
    }
  }

  /**
   * Interactive template selection
   */
  export async function interactiveScaffold(template: Template, config: TemplateConfig): Promise<void> {
    console.log(`🖥️  ${template.name} Template Creator`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(template.description);
    console.log('');

    // Get project name
    const projectName = await prompt('Project name:');
    if (!projectName) {
      console.log('❌ Project name is required');
      return;
    }

    // Get directory
    const directory = await prompt('Directory (default: ./<name>):', `./${projectName}`);

    // Select variant
    let variant = 'default';
    if (config.variants && Object.keys(config.variants).length > 0) {
      console.log('');
      console.log('📋 Available variants:');
      listVariants(config);

      const variantInput = await prompt('Select variant (default: full-platform):', 'full-platform');
      if (variantInput && config.variants[variantInput]) {
        variant = variantInput;
      }
    }

    // Confirm
    console.log('');
    console.log('📋 Configuration:');
    console.log(`   Name: ${projectName}`);
    console.log(`   Directory: ${directory}`);
    console.log(`   Variant: ${variant}`);

    const confirm = await prompt('Proceed? (y/N):', 'y');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
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