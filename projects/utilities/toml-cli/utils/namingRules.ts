/**
 * DuoPlus Naming Convention Rules
 *
 * Comprehensive naming standards for TypeScript/JavaScript code,
 * ensuring consistency across the entire codebase.
 */

import { BUN_INSPECT_CUSTOM } from "../../types/symbols.ts";

// ============================================================================
// Naming Convention Types
// ============================================================================

/**
 * Supported naming conventions
 */
export type NamingConvention =
  | "camelCase"              // firstName, getUserData
  | "PascalCase"             // FirstName, GetUserData
  | "SCREAMING_SNAKE_CASE"   // FIRST_NAME, GET_USER_DATA
  | "kebab-case"             // first-name, get-user-data
  | "snake_case"             // first_name, get_user_data
  | "UPPERCASE"              // FIRSTNAME, GETUSERDATA
  | "lowercase"              // firstname, getuserdata
  | "_camelCase"             // _firstName, _getUserData (private)
  | "_PascalCase"            // _FirstName, _GetUserData (private)
  | "#camelCase"             // #firstName, #getUserData (private)
  | "#PascalCase";           // #FirstName, #GetUserData (private)

/**
 * Code element categories
 */
export type CodeElement =
  | "functions"      // Function declarations
  | "methods"        // Class methods
  | "variables"      // Variable declarations
  | "constants"      // Constant values
  | "classes"        // Class declarations
  | "interfaces"     // Interface declarations
  | "types"          // Type aliases
  | "enums"          // Enum declarations
  | "files"          // File names
  | "directories"    // Directory names
  | "privateMembers" // Private class members
  | "protectedMembers" // Protected class members
  | "publicMembers"  // Public class members
  | "getters"        // Getter methods
  | "setters"        // Setter methods
  | "constructors"   // Constructor methods
  | "destructors"    // Destructor methods
  | "events"         // Event names
  | "hooks"          // React hooks
  | "components"     // React components
  | "props"          // Component props
  | "state"          // State variables
  | "actions"        // Redux actions
  | "reducers"       // Redux reducers
  | "selectors"      // Redux selectors
  | "middlewares"    // Redux middlewares
  | "guards"         // Route guards
  | "interceptors"   // HTTP interceptors
  | "validators"     // Validation functions
  | "formatters"     // Data formatters
  | "parsers"        // Data parsers
  | "serializers"    // Data serializers
  | "deserializers"  // Data deserializers
  | "utilities"      // Utility functions
  | "helpers"        // Helper functions
  | "services"       // Service classes
  | "repositories"   // Repository classes
  | "controllers"    // Controller classes
  | "models"         // Data models
  | "entities"       // Domain entities
  | "valueObjects"   // Value objects
  | "aggregates"     // Aggregate roots
  | "commands"       // Command objects
  | "queries"        // Query objects
  | "events"         // Domain events
  | "handlers"       // Event handlers
  | "listeners"       // Event listeners
  | "middlewares"     // HTTP middlewares
  | "filters"        // Data filters
  | "pipes"          // Data transformation pipes
  | "decorators"     // TypeScript decorators
  | "annotations"    // Java annotations (if applicable)
  | "mixins"         // Mixin classes
  | "traits"         // Trait classes
  | "modules"        // Module names
  | "packages"       // Package names
  | "namespaces"     // Namespace names
  | "testFiles"      // Test file names
  | "specFiles"      // Spec file names
  | "fixtureFiles"   // Test fixture files
  | "mockFiles"      // Mock files
  | "configFiles"    // Configuration files
  | "envFiles"       // Environment files
  | "readmeFiles"    // README files
  | "licenseFiles"   // License files
  | "changelogFiles" // Changelog files
  | "dockerfiles"    // Dockerfile names
  | "makefiles"      // Makefile names
  | "scripts"        // Script file names
  | "binaries"       // Binary file names
  | "assets"         // Asset file names
  | "images"         // Image file names
  | "videos"         // Video file names
  | "audios"         // Audio file names
  | "documents"      // Document file names
  | "archives"       // Archive file names
  | "databases"      // Database file names
  | "logs"           // Log file names
  | "tempFiles"      // Temporary file names
  | "cacheFiles"     // Cache file names
  | "lockFiles"      // Lock file names
  | "pidFiles"       // PID file names
  | "socketFiles";   // Socket file names

/**
 * Complete naming convention ruleset
 */
export interface NamingConventionRules {
  readonly [key: string]: NamingConvention;
}

/**
 * Validation result for naming convention checks
 */
export interface NamingValidationResult {
  readonly isValid: boolean;
  readonly expectedConvention: NamingConvention;
  readonly actualConvention?: string;
  readonly suggestions: string[];
  readonly errors: string[];
}

/**
 * Naming convention rule with metadata
 */
export interface NamingRule {
  readonly element: CodeElement;
  readonly convention: NamingConvention;
  readonly description: string;
  readonly examples: string[];
  readonly rationale: string;
  readonly exceptions?: string[];
}

// ============================================================================
// DuoPlus Naming Convention Standards
// ============================================================================

/**
 * DuoPlus comprehensive naming convention rules
 */
export const DUOPLUS_NAMING_CONVENTIONS: NamingConventionRules = {
  // Core language constructs
  functions: "camelCase",
  methods: "camelCase",
  variables: "camelCase",
  constants: "SCREAMING_SNAKE_CASE",
  classes: "PascalCase",
  interfaces: "PascalCase",
  types: "PascalCase",
  enums: "PascalCase",

  // File system
  files: "kebab-case",
  directories: "kebab-case",
  testFiles: "kebab-case",
  specFiles: "kebab-case",
  configFiles: "kebab-case",
  envFiles: "UPPERCASE",

  // Class members
  privateMembers: "_camelCase",
  protectedMembers: "_camelCase",
  publicMembers: "camelCase",
  getters: "camelCase",
  setters: "camelCase",
  constructors: "PascalCase",
  destructors: "camelCase",

  // React specific
  components: "PascalCase",
  hooks: "camelCase",
  props: "camelCase",
  state: "camelCase",

  // State management
  actions: "camelCase",
  reducers: "camelCase",
  selectors: "camelCase",
  middlewares: "camelCase",

  // Architecture patterns
  services: "PascalCase",
  repositories: "PascalCase",
  controllers: "PascalCase",
  models: "PascalCase",
  entities: "PascalCase",
  valueObjects: "PascalCase",
  aggregates: "PascalCase",

  // CQRS patterns
  commands: "PascalCase",
  queries: "PascalCase",
  events: "PascalCase",
  handlers: "PascalCase",
  listeners: "camelCase",

  // Data processing
  validators: "camelCase",
  formatters: "camelCase",
  parsers: "camelCase",
  serializers: "camelCase",
  deserializers: "camelCase",
  utilities: "camelCase",
  helpers: "camelCase",

  // HTTP layer
  guards: "PascalCase",
  interceptors: "PascalCase",
  middlewares: "camelCase",
  filters: "camelCase",
  pipes: "camelCase",

  // Decorators and annotations
  decorators: "camelCase",
  annotations: "PascalCase",
  mixins: "PascalCase",
  traits: "PascalCase",

  // Modules and packages
  modules: "camelCase",
  packages: "kebab-case",
  namespaces: "PascalCase",

  // Special files
  readmeFiles: "UPPERCASE",
  licenseFiles: "UPPERCASE",
  changelogFiles: "UPPERCASE",
  dockerfiles: "PascalCase",
  makefiles: "UPPERCASE",
  scripts: "kebab-case",

  // Assets and resources
  assets: "kebab-case",
  images: "kebab-case",
  videos: "kebab-case",
  audios: "kebab-case",
  documents: "kebab-case",
  archives: "kebab-case",

  // System files
  databases: "snake_case",
  logs: "kebab-case",
  tempFiles: "kebab-case",
  cacheFiles: "kebab-case",
  lockFiles: "kebab-case",
  pidFiles: "kebab-case",
  socketFiles: "kebab-case",

  // Test artifacts
  fixtureFiles: "kebab-case",
  mockFiles: "kebab-case",
  binaries: "kebab-case"
};

/**
 * Detailed naming rules with explanations
 */
export const DUOPLUS_NAMING_RULES: NamingRule[] = [
  {
    element: "functions",
    convention: "camelCase",
    description: "Regular function declarations and expressions",
    examples: ["getUserData", "calculateTotal", "validateInput"],
    rationale: "JavaScript/TypeScript standard for functions"
  },
  {
    element: "classes",
    convention: "PascalCase",
    description: "Class declarations and constructor functions",
    examples: ["UserService", "DataValidator", "ApiController"],
    rationale: "Distinguishes classes from functions and variables"
  },
  {
    element: "interfaces",
    convention: "PascalCase",
    description: "TypeScript interface declarations",
    examples: ["UserRepository", "ValidationResult", "ApiResponse"],
    rationale: "Consistent with class naming, starts with capital I implicitly"
  },
  {
    element: "constants",
    convention: "SCREAMING_SNAKE_CASE",
    description: "Constant values that don't change",
    examples: ["MAX_RETRY_COUNT", "API_BASE_URL", "DEFAULT_TIMEOUT"],
    rationale: "Clearly distinguishes constants from variables"
  },
  {
    element: "privateMembers",
    convention: "_camelCase",
    description: "Private class properties and methods",
    examples: ["_userData", "_calculateTotal", "_validateInput"],
    rationale: "Underscore prefix indicates privacy, camelCase for readability"
  },
  {
    element: "files",
    convention: "kebab-case",
    description: "Source code and configuration files",
    examples: ["user-service.ts", "data-validator.js", "api-controller.ts"],
    rationale: "URL-safe, readable, and consistent across platforms"
  },
  {
    element: "directories",
    convention: "kebab-case",
    description: "Folder and directory names",
    examples: ["user-service", "data-validation", "api-controllers"],
    rationale: "Consistent with file naming, URL-safe"
  },
  {
    element: "components",
    convention: "PascalCase",
    description: "React and UI component names",
    examples: ["UserProfile", "DataTable", "NavigationMenu"],
    rationale: "JSX requires PascalCase for component declarations"
  },
  {
    element: "hooks",
    convention: "camelCase",
    description: "React custom hooks",
    examples: ["useUserData", "useApiCall", "useLocalStorage"],
    rationale: "Follows function naming, 'use' prefix distinguishes hooks"
  },
  {
    element: "services",
    convention: "PascalCase",
    description: "Service classes and instances",
    examples: ["UserService", "EmailService", "DatabaseService"],
    rationale: "Classes that provide services, follow class naming"
  },
  {
    element: "testFiles",
    convention: "kebab-case",
    description: "Unit and integration test files",
    examples: ["user-service.test.ts", "data-validator.spec.js"],
    rationale: "Consistent with source files, .test. or .spec. suffix"
  }
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Regular expressions for naming convention validation
 */
const NAMING_PATTERNS: Record<NamingConvention, RegExp> = {
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  "SCREAMING_SNAKE_CASE": /^[A-Z][A-Z0-9_]*$/,
  "kebab-case": /^[a-z][a-z0-9-]*$/,
  snake_case: /^[a-z][a-z0-9_]*$/,
  UPPERCASE: /^[A-Z][A-Z0-9]*$/,
  lowercase: /^[a-z][a-z0-9]*$/,
  "_camelCase": /^_[a-z][a-zA-Z0-9]*$/,
  "_PascalCase": /^_[A-Z][a-zA-Z0-9]*$/,
  "#camelCase": /^#[a-z][a-zA-Z0-9]*$/,
  "#PascalCase": /^#[A-Z][a-zA-Z0-9]*$/
};

/**
 * Validate a name against naming convention rules
 */
export function validateNamingConvention(
  name: string,
  element: CodeElement,
  customRules?: Partial<NamingConventionRules>
): NamingValidationResult {
  const rules = { ...DUOPLUS_NAMING_CONVENTIONS, ...customRules };
  const expectedConvention = rules[element];

  if (!expectedConvention) {
    return {
      isValid: true,
      expectedConvention,
      suggestions: [],
      errors: [`No naming rule defined for element type: ${element}`]
    };
  }

  const pattern = NAMING_PATTERNS[expectedConvention];
  const isValid = pattern.test(name);

  const result: NamingValidationResult = {
    isValid,
    expectedConvention,
    suggestions: [],
    errors: []
  };

  if (!isValid) {
    result.errors.push(
      `Name "${name}" does not match ${expectedConvention} convention for ${element}`
    );

    // Generate suggestions
    result.suggestions = generateNamingSuggestions(name, expectedConvention);
  }

  return result;
}

/**
 * Generate naming suggestions for invalid names
 */
function generateNamingSuggestions(name: string, convention: NamingConvention): string[] {
  const suggestions: string[] = [];

  switch (convention) {
    case "camelCase":
      suggestions.push(
        name.toLowerCase().replace(/[_-](.)/g, (_, letter) => letter.toUpperCase())
      );
      break;
    case "PascalCase":
      const camelCase = name.toLowerCase().replace(/[_-](.)/g, (_, letter) => letter.toUpperCase());
      suggestions.push(camelCase.charAt(0).toUpperCase() + camelCase.slice(1));
      break;
    case "SCREAMING_SNAKE_CASE":
      suggestions.push(
        name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
      );
      break;
    case "kebab-case":
      suggestions.push(
        name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      );
      break;
    case "snake_case":
      suggestions.push(
        name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
      );
      break;
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Batch validate multiple names
 */
export function validateMultipleNames(
  names: Array<{ name: string; element: CodeElement }>,
  customRules?: Partial<NamingConventionRules>
): Map<string, NamingValidationResult> {
  const results = new Map<string, NamingValidationResult>();

  for (const { name, element } of names) {
    results.set(name, validateNamingConvention(name, element, customRules));
  }

  return results;
}

/**
 * Get all naming violations in a codebase (placeholder for future implementation)
 */
export function scanCodebaseForViolations(
  directory: string,
  customRules?: Partial<NamingConventionRules>
): Promise<Array<{ file: string; violations: NamingValidationResult[] }>> {
  // This would scan actual files in the future
  // For now, return empty array
  return Promise.resolve([]);
}

/**
 * Auto-fix naming violations (placeholder for future implementation)
 */
export function autoFixNamingViolations(
  violations: Array<{ file: string; violations: NamingValidationResult[] }>
): Promise<Array<{ file: string; fixed: boolean; changes: string[] }>> {
  // This would auto-fix violations in the future
  // For now, return empty array
  return Promise.resolve([]);
}

// ============================================================================
// Custom Inspection
// ============================================================================

Object.defineProperty(DUOPLUS_NAMING_CONVENTIONS, BUN_INSPECT_CUSTOM, {
  value(depth: number, options: any, inspect: Function) {
    const summary = {
      "[NAMING:v1.0]": {
        totalRules: Object.keys(DUOPLUS_NAMING_CONVENTIONS).length,
        conventions: [...new Set(Object.values(DUOPLUS_NAMING_CONVENTIONS))],
        categories: {
          core: ["functions", "classes", "variables", "constants"],
          files: ["files", "directories", "testFiles"],
          react: ["components", "hooks", "props"],
          architecture: ["services", "controllers", "models"]
        },
        detailedRules: DUOPLUS_NAMING_RULES.length
      },
    };

    if (depth > 0) {
      summary["[NAMING:v1.0]"].examples = DUOPLUS_NAMING_RULES.slice(0, 5).map(rule => ({
        element: rule.element,
        convention: rule.convention,
        example: rule.examples[0]
      }));
    }

    return summary;
  },
  writable: false,
});

// ============================================================================
// Exports
// ============================================================================

export {
  type NamingConvention,
  type CodeElement,
  type NamingConventionRules,
  type NamingValidationResult,
  type NamingRule
};