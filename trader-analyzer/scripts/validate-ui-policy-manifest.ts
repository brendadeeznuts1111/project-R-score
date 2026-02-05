#!/usr/bin/env bun
/**
 * @fileoverview UI Policy Manifest Validator
 * @description Validates Hyper-Bun UI Policy Manifest YAML/JSON files
 * @module scripts/validate-ui-policy-manifest
 * 
 * Version: 8.0.0.0.0.0.0
 * Ripgrep Pattern: validate-ui-policy-manifest|validate:manifest
 */

import { join } from 'path';

/**
 * 8.2.6.0.0.0.0: Validation result structure
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: any;
  metadata?: {
    version?: string;
    last_updated?: string;
    schema_version?: string;
  };
}

/**
 * 8.2.6.0.0.0.0: Validate UI Policy Manifest
 * 
 * @param manifestPath - Path to manifest file
 * @returns Validation result
 */
async function validateManifest(manifestPath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Check if file exists
    const file = Bun.file(manifestPath);
    if (!(await file.exists())) {
      result.valid = false;
      result.errors.push(`Manifest file not found: ${manifestPath}`);
      return result;
    }

    // Read and parse file
    const manifestText = await file.text();
    let parsed: any;

    if (manifestPath.endsWith('.yaml') || manifestPath.endsWith('.yml')) {
      try {
        parsed = Bun.YAML.parse(manifestText);
      } catch (error) {
        result.valid = false;
        result.errors.push(
          `YAML parsing failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return result;
      }
    } else if (manifestPath.endsWith('.json')) {
      try {
        parsed = JSON.parse(manifestText);
      } catch (error) {
        result.valid = false;
        result.errors.push(
          `JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return result;
      }
    } else {
      result.valid = false;
      result.errors.push(
        `Unsupported file format. Expected .yaml, .yml, or .json`
      );
      return result;
    }

    result.manifest = parsed;

    // Validate required sections
    if (!parsed.metadata) {
      result.valid = false;
      result.errors.push('Missing required section: metadata');
    } else {
      result.metadata = parsed.metadata;
      
      // Validate metadata fields
      if (!parsed.metadata.version) {
        result.warnings.push('metadata.version is missing');
      }
      if (!parsed.metadata.schema_version) {
        result.warnings.push('metadata.schema_version is missing');
      } else if (parsed.metadata.schema_version !== '8.0.0.0.0.0.0') {
        result.warnings.push(
          `metadata.schema_version is ${parsed.metadata.schema_version}, expected 8.0.0.0.0.0.0`
        );
      }
    }

    if (!parsed.ui_context_defaults) {
      result.valid = false;
      result.errors.push('Missing required section: ui_context_defaults');
    } else {
      // Validate ui_context_defaults
      if (parsed.ui_context_defaults.apiBaseUrl === undefined) {
        result.warnings.push('ui_context_defaults.apiBaseUrl is missing (will default to AUTO_DETECT)');
      }
      if (parsed.ui_context_defaults.defaultUserRole === undefined) {
        result.warnings.push('ui_context_defaults.defaultUserRole is missing (will default to "guest")');
      }
    }

    if (!parsed.feature_flags) {
      result.valid = false;
      result.errors.push('Missing required section: feature_flags');
    } else {
      // Validate feature flags structure
      for (const [flagName, flagConfig] of Object.entries(parsed.feature_flags)) {
        if (typeof flagConfig !== 'object' || flagConfig === null) {
          result.errors.push(`feature_flags.${flagName} must be an object`);
          result.valid = false;
          continue;
        }

        const flag = flagConfig as any;
        if (typeof flag.enabled !== 'boolean') {
          result.errors.push(`feature_flags.${flagName}.enabled must be a boolean`);
          result.valid = false;
        }
        if (!flag.description) {
          result.warnings.push(`feature_flags.${flagName}.description is missing`);
        }
      }
    }

    if (!parsed.html_rewriter_policies) {
      result.valid = false;
      result.errors.push('Missing required section: html_rewriter_policies');
    } else {
      // Validate html_rewriter_policies
      const policies = parsed.html_rewriter_policies;

      if (policies.inject_context_script === undefined) {
        result.errors.push('html_rewriter_policies.inject_context_script is missing');
        result.valid = false;
      } else {
        // Support both boolean (simple) and object (advanced) formats
        if (typeof policies.inject_context_script === 'boolean') {
          // Simple boolean format is valid
        } else if (typeof policies.inject_context_script === 'object' && policies.inject_context_script !== null) {
          if (typeof policies.inject_context_script.enabled !== 'boolean') {
            result.errors.push('html_rewriter_policies.inject_context_script.enabled must be a boolean');
            result.valid = false;
          }
        } else {
          result.errors.push('html_rewriter_policies.inject_context_script must be a boolean or object');
          result.valid = false;
        }
      }

      if (!policies.data_feature_pruning) {
        result.errors.push('html_rewriter_policies.data_feature_pruning is missing');
        result.valid = false;
      } else {
        if (typeof policies.data_feature_pruning.enabled !== 'boolean') {
          result.errors.push('html_rewriter_policies.data_feature_pruning.enabled must be a boolean');
          result.valid = false;
        }
        if (!policies.data_feature_pruning.target_attribute) {
          result.errors.push('html_rewriter_policies.data_feature_pruning.target_attribute is missing');
          result.valid = false;
        }
      }

      if (!policies.data_access_pruning) {
        result.errors.push('html_rewriter_policies.data_access_pruning is missing');
        result.valid = false;
      } else {
        if (typeof policies.data_access_pruning.enabled !== 'boolean') {
          result.errors.push('html_rewriter_policies.data_access_pruning.enabled must be a boolean');
          result.valid = false;
        }
        if (!Array.isArray(policies.data_access_pruning.allowed_roles)) {
          result.errors.push('html_rewriter_policies.data_access_pruning.allowed_roles must be an array');
          result.valid = false;
        }
      }

      if (!policies.dynamic_content_implantation) {
        result.errors.push('html_rewriter_policies.dynamic_content_implantation is missing');
        result.valid = false;
      } else if (typeof policies.dynamic_content_implantation.enabled !== 'boolean') {
        result.errors.push('html_rewriter_policies.dynamic_content_implantation.enabled must be a boolean');
        result.valid = false;
      }
    }

    // Validate optional sections
    if (parsed.security_policies) {
      if (parsed.security_policies.content_security_policy) {
        if (typeof parsed.security_policies.content_security_policy.enabled !== 'boolean') {
          result.errors.push('security_policies.content_security_policy.enabled must be a boolean');
          result.valid = false;
        }
      }
    }

    if (parsed.performance_policies) {
      if (typeof parsed.performance_policies.enable_metrics !== 'boolean') {
        result.warnings.push('performance_policies.enable_metrics should be a boolean');
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Validation error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

/**
 * 8.2.6.0.0.0.0: Main validation function
 */
async function main() {
  const args = process.argv.slice(2);
  const isCI = process.argv[1]?.includes('validate:manifest:ci') || args.includes('--ci');
  
  // Filter out flags
  const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));
  
  // Get manifest path from args or use default
  const manifestPath = nonFlagArgs[0] || 
                       join(process.cwd(), 'config', 'ui-policy-manifest.yaml');

  console.log(`🔍 Validating UI Policy Manifest: ${manifestPath}\n`);

  const result = await validateManifest(manifestPath);

  // Print results
  if (result.metadata) {
    console.log('📋 Manifest Metadata:');
    console.log(`   Version: ${result.metadata.version || 'N/A'}`);
    console.log(`   Schema Version: ${result.metadata.schema_version || 'N/A'}`);
    console.log(`   Last Updated: ${result.metadata.last_updated || 'N/A'}`);
    console.log('');
  }

  if (result.errors.length > 0) {
    console.log('❌ Validation Errors:');
    for (const error of result.errors) {
      console.log(`   • ${error}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`   • ${warning}`);
    }
    console.log('');
  }

  if (result.valid) {
    console.log('✅ Manifest is valid!');
    
    // Print summary
    if (result.manifest) {
      const featureFlags = Object.keys(result.manifest.feature_flags || {});
      console.log(`\n📊 Summary:`);
      console.log(`   Feature Flags: ${featureFlags.length}`);
      console.log(`   Policies: ${Object.keys(result.manifest.html_rewriter_policies || {}).length}`);
    }
    
    if (isCI) {
      process.exit(0);
    }
  } else {
    console.log('❌ Manifest validation failed!');
    console.log(`\nFound ${result.errors.length} error(s) and ${result.warnings.length} warning(s).`);
    console.log('\n💡 Tip: Check the manifest structure against the schema in docs/8.0.0.0.0.0.0-FRONTEND-CONFIG-POLICY.md');
    
    if (isCI) {
      process.exit(1);
    } else {
      process.exit(1);
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('💥 Validation script error:', error);
    process.exit(1);
  });
}

export { validateManifest };
