# Stylelint Configuration

This project includes a comprehensive Stylelint configuration for maintaining
consistent CSS code quality and following modern CSS best practices.

## Files

- `.stylelintrc` - Main Stylelint configuration file
- `test-style.css` - Test CSS file for validating configuration
- `package.json` - Contains Stylelint npm scripts

## Installation

The Stylelint packages have been added to your `package.json` as dev
dependencies. To install them using your private scoped registry:

```bash
# Install all dependencies including Stylelint
bun install

# If packages are not available in your private registry, you can install from npm:
bun add -d stylelint stylelint-config-standard stylelint-config-recommended stylelint-order --registry=https://registry.npmjs.org/
```

**Note:** The packages are already listed in your `package.json` devDependencies
section. If your private registry doesn't have these packages, you'll need to
either:

1. Add them to your private registry, or
2. Install from the public npm registry as shown above

## Configuration Features

### Extended Rules

- **stylelint-config-standard**: Standard CSS rules
- **stylelint-config-recommended**: Recommended rules for better code quality
- **stylelint-order**: Property ordering for consistent CSS structure

### Custom Rules

- **Modern CSS Support**: Custom properties, backdrop-filter, modern color
  functions
- **Property Ordering**: Logical grouping of CSS properties
- **Naming Conventions**: Flexible class and ID patterns
- **Performance**: Optimized rules for better CSS performance

### Key Features

- ✅ Custom CSS properties (`--variable-name`)
- ✅ Modern CSS features (backdrop-filter, gradients)
- ✅ Flexible naming patterns
- ✅ Comprehensive property ordering
- ✅ Responsive design support
- ✅ Animation and transition support

## Usage

### Check CSS files

```bash
# Check all CSS files
npm run stylelint

# Check specific file
npx stylelint path/to/file.css
```

### Auto-fix issues

```bash
# Auto-fix all CSS files
npm run stylelint:fix

# Auto-fix specific file
npx stylelint path/to/file.css --fix
```

### CI/CD Integration

```bash
# Fail on warnings (for CI/CD)
npm run stylelint:check
```

## Configuration Details

### Property Ordering

Properties are ordered logically:

1. Positioning (position, top, left, etc.)
2. Display & Box Model
3. Flexbox & Grid
4. Colors & Backgrounds
5. Typography
6. Effects & Transforms
7. Animations & Transitions

### Ignored Files

- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/*.min.css`
- `**/vendor/**`

### Custom Property Support

- CSS custom properties are fully supported
- No naming restrictions on variables
- Modern color functions (hsl, rgb with alpha)

## Testing Configuration

Use the included test file to validate your Stylelint setup:

```bash
npx stylelint test-style.css
```

This should pass without any errors or warnings.

## Troubleshooting

### Common Issues

1. **Registry Issues**: If installation fails due to registry configuration,
   use:

   ```bash
   npm install --save-dev stylelint --registry=https://registry.npmjs.org/
   ```

2. **Permission Issues**: Try with sudo if needed:

   ```bash
   sudo npm install --save-dev stylelint
   ```

3. **Cache Issues**: Clear npm cache:
   ```bash
   npm cache clean --force
   ```

### Configuration Validation

To validate your `.stylelintrc` file:

```bash
npx stylelint --print-config .stylelintrc
```

## Integration with Editors

### VS Code

Install the "stylelint" extension and it will automatically use the
`.stylelintrc` configuration.

### Other Editors

Most modern editors support Stylelint through plugins or extensions.

## Best Practices

1. **Run Stylelint Before Commits**: Use pre-commit hooks
2. **Auto-fix When Possible**: Use `--fix` flag for automatic corrections
3. **Regular Updates**: Keep Stylelint and plugins updated
4. **Team Consistency**: Ensure all team members use the same configuration

## Contributing

When modifying the Stylelint configuration:

1. Test changes with `test-style.css`
2. Update this README if adding new rules
3. Ensure backward compatibility
4. Document any breaking changes
