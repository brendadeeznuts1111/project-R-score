# Custom ESLint Rules for Bun

This project includes custom ESLint rules specifically designed for Bun runtime patterns and conventions.

## Available Custom Rules

### `bun/require-bun-prefix`

**Purpose**: Enforces that constants related to Bun features must start with the `BUN_` prefix.

**Severity**: Warning (configurable)

**When it triggers**:

- Exported constants that contain Bun-related keywords (API, CATALOG, DOC, KEYWORD, ANNOTATION, CONFIG, FORMAT, VERSION,
  COOKIE, R2, S3, CLIENT, ENDPOINT, BUCKET, ACCOUNT, ACCESS, SECRET)
- Constants that are SCREAMING_SNAKE_CASE and exported

**Examples**:

```typescript
// ❌ Warning: Bun-related constant without BUN_ prefix
export const R2_COOKIE_FORMAT_VERSION = 1;
export const API_VERSION = '1.0.0';
export const S3_CLIENT_CONFIG = {};

// ✅ Correct: Has BUN_ prefix
export const BUN_R2_COOKIE_FORMAT_VERSION = 1;
export const BUN_API_VERSION = '1.0.0';

// ✅ Correct: Not Bun-related, no warning
export const MAX_RETRIES = 3;
export const DEFAULT_TIMEOUT = 5000;
```

## Configuration

The custom rule is configured in `eslint.config.mjs`:

```javascript
plugins: {
  '@typescript-eslint': tseslint.plugin,
  bun: bunPlugin,  // Custom Bun plugin
},
rules: {
  'bun/require-bun-prefix': 'warn',  // Enable as warning
},
```

## Adding New Custom Rules

To add a new custom rule:

1. **Define the rule** in `eslint-plugin-bun.js`:

```javascript
const myNewRule = {
  meta: {
    type: 'problem',  // or 'suggestion', 'layout'
    docs: {
      description: 'Description of what the rule does',
      recommended: true,
    },
    schema: [],  // Rule options schema
    messages: {
      errorMessage: 'Error message template with {{variable}}',
    },
  },
  create(context) {
    return {
      // AST node visitors
      VariableDeclaration(node) {
        // Rule logic
        if (/* condition */) {
          context.report({
            node,
            messageId: 'errorMessage',
            data: { variable: 'value' },
          });
        }
      },
    };
  },
};
```

2. **Export the rule** in the plugin:

```javascript
export default {
	rules: {
		'require-bun-prefix': requireBunPrefix,
		'my-new-rule': myNewRule, // Add here
	},
};
```

3. **Enable the rule** in `eslint.config.mjs`:

```javascript
rules: {
  'bun/my-new-rule': 'warn',  // or 'error', 'off'
},
```

## Rule Development Tips

1. **Use ESLint's AST**: Familiarize yourself with [ESTree](https://github.com/estree/estree) node types
2. **Test thoroughly**: Create test files to verify rule behavior
3. **Provide helpful messages**: Include context in error messages
4. **Consider auto-fix**: Add `fix` function if the rule can be auto-fixed
5. **Document keywords**: Update this file when adding Bun-related keywords

## Extending `require-bun-prefix`

To add more Bun-related keywords, edit `eslint-plugin-bun.js`:

```javascript
const bunKeywords = [
	'API',
	'CATALOG',
	// ... existing keywords
	'NEW_KEYWORD', // Add here
];
```

## Testing Custom Rules

Test your rules with a temporary file:

```bash
# Create test file
echo "export const TEST_CONSTANT = 1;" > test-rule.ts

# Run ESLint
bunx eslint test-rule.ts

# Clean up
rm test-rule.ts
```

## Resources

- [ESLint Rule Development Guide](https://eslint.org/docs/latest/extend/custom-rules)
- [TypeScript ESLint Custom Rules](https://typescript-eslint.io/developers/custom-rules/)
- [ESTree Specification](https://github.com/estree/estree)
