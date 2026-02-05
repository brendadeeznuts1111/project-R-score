# Documentation Structure

This directory contains organized documentation for the Windsurf Project.

## Directory Structure

### `guides/`
User guides and how-to documentation:
- `CHANGELOG.md` - Project changelog and version history
- `CLAUDE.md` - Claude AI integration guide
- `CONSOLE_DEPTH_10.md` - Console depth exploration guide
- `CONSOLE_DEPTH_DEMO.md` - Console depth demonstration
- `CONSOLE_DEPTH_EXAMPLE.md` - Console depth examples
- `CONSOLE_DEPTH_N.md` - Advanced console depth techniques
- `SMOL_FLAG_GUIDE.md` - Smol mode usage guide
- `TYPESCRIPT_FIXES.md` - TypeScript fixes and optimizations
- `UNIT_TEST_APOCALYPSE.md` - Comprehensive testing guide

### `api/`
API documentation and references:
- `GITHUB_METADATA.md` - GitHub integration metadata
- Additional API documentation files

### `deployment/`
Deployment and operations documentation:
- `PRODUCTION_HARDCODED.md` - Production deployment guide
- Additional deployment documentation files

### `architecture/`
System architecture and design documentation:
- `COSMIC_BUNDLE_EMPIRE.md` - Cosmic bundle architecture
- `DUOPLUS-ADMIN.md` - DuoPlus admin architecture
- `GDPR_ONEPAY_INTEGRATION.md` - GDPR compliance architecture
- `GENESIS-PHASE-01.md` - Genesis phase architecture
- `IMPLEMENTATION_COMPLETE.md` - Implementation status
- Additional architecture documentation files

## Legacy Documentation

The original `docs/README.md` contains the URLPattern v1.3.4 Example Site documentation. This is maintained for backward compatibility.

## Documentation Standards

### File Naming Conventions
- Use kebab-case for file names
- Include version numbers for major releases
- Use descriptive names that clearly indicate content

### Documentation Structure
1. **Title** - Clear, descriptive title
2. **Overview** - Brief description of content
3. **Prerequisites** - Required knowledge or setup
4. **Content** - Main documentation content
5. **Examples** - Code examples and use cases
6. **Troubleshooting** - Common issues and solutions
7. **Related Links** - Cross-references to other documentation

### Markdown Standards
- Use proper markdown formatting
- Include code blocks with language specification
- Use tables for structured data
- Include proper heading hierarchy
- Add internal links for navigation

## Accessing Documentation

### Local Documentation Server
```bash
# Start documentation server
bun run docs:serve

# Access at http://localhost:8080
```

### Direct File Access
```bash
# View specific documentation
cat docs/guides/CONSOLE_DEPTH_10.md

# Search documentation
grep -r "search term" docs/
```

## Contributing to Documentation

### Adding New Documentation
1. Choose appropriate category (guides/api/deployment/architecture)
2. Follow naming conventions
3. Include proper metadata and structure
4. Add cross-references where appropriate
5. Update this README with new content

### Updating Existing Documentation
1. Maintain existing structure and formatting
2. Update version numbers and dates
3. Add changelog entries for significant changes
4. Test all examples and code snippets

### Documentation Review Process
1. Technical accuracy review
2. Grammar and spelling check
3. Link validation
4. Example testing
5. Accessibility compliance

## Documentation Tools

### Markdown Linting
```bash
# Lint markdown files
bunx markdownlint docs/**/*.md

# Fix common issues
bunx markdownlint --fix docs/**/*.md
```

### Link Checking
```bash
# Check for broken links
bunx markdown-link-check docs/**/*.md
```

### Documentation Generation
```bash
# Generate API documentation
bun run docs:generate

# Build static documentation site
bun run docs:build
```

## Search and Navigation

### Full-Text Search
```bash
# Search across all documentation
grep -r "pattern" docs/

# Search in specific category
grep -r "pattern" docs/guides/
```

### Documentation Index
- Check the main `README.md` for complete index
- Each category has its own README with specific content
- Use internal links for quick navigation

## Documentation Maintenance

### Regular Tasks
- Update version numbers in changelog
- Review and update outdated content
- Check and fix broken links
- Validate code examples
- Update screenshots and diagrams

### Documentation Metrics
- Track documentation coverage
- Monitor user feedback
- Analyze search patterns
- Measure documentation effectiveness

## Best Practices

### Writing Style
- Use clear, concise language
- Write for your target audience
- Include practical examples
- Use consistent terminology
- Provide context and background

### Technical Documentation
- Include code examples with explanations
- Provide configuration samples
- Document error conditions
- Include troubleshooting steps
- Add performance considerations

### User Guides
- Start with prerequisites
- Provide step-by-step instructions
- Include screenshots where helpful
- Add common use cases
- Provide next steps and related topics
