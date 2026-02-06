# Contributing Guide

Thank you for considering contributing to the RSS Feed Optimization project! This guide will help you understand how to contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful in all interactions and follow these guidelines:

- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### 1. Find Something to Work On

- **Browse Issues**: Check the [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues) for bugs and feature requests
- **Look for Good First Issues**: Issues labeled with `good first issue` are great for new contributors
- **Join Discussions**: Participate in [GitHub Discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)

### 2. Set Up Your Development Environment

Follow the [Development Setup Guide](./setup.md) to get started.

### 3. Choose Your Contribution Type

#### Bug Fixes
- Fix existing issues
- Add tests to prevent regression
- Update documentation if needed

#### New Features
- Implement new functionality
- Add comprehensive tests
- Update documentation

#### Documentation
- Improve existing documentation
- Add new guides or tutorials
- Fix typos and grammatical errors

#### Performance Improvements
- Optimize existing code
- Add performance benchmarks
- Profile and identify bottlenecks

## Development Setup

### Prerequisites

- Bun.js 1.3.7+
- Git
- Text editor or IDE

### Setup Steps

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/rss-feed-optimization.git
   cd rss-feed-optimization
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Make Changes**
   - Follow the code style guidelines
   - Write tests for new functionality
   - Update documentation as needed

5. **Test Your Changes**
   ```bash
   bun test
   bun run lint
   ```

## Code Style

### JavaScript Style Guide

We follow these coding standards:

#### Formatting
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Max line length: 100 characters

#### Naming Conventions
- **Files**: kebab-case (`rss-generator.js`)
- **Classes**: PascalCase (`RSSGenerator`)
- **Functions/Variables**: camelCase (`generateRSSFeed`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CACHE_SIZE`)

#### Example

```javascript
// Good
export class RSSGenerator {
  constructor(options = {}) {
    this.title = options.title || 'Default Title';
    this.baseUrl = options.baseUrl;
  }

  generateFeed(posts) {
    if (!Array.isArray(posts)) {
      throw new Error('Posts must be an array');
    }

    return this.createRSS(posts);
  }

  createRSS(posts) {
    // Implementation
  }
}

// Bad
class rss_generator {
  constructor(options) {
    this.title = options.title || 'Default Title';
    this.baseUrl = options.baseUrl;
  }

  generate_feed(posts) {
    if (!Array.isArray(posts)) {
      throw new Error('Posts must be an array');
    }

    return this.create_rss(posts);
  }
}
```

### Import Organization

```javascript
// Standard library imports
import { serve } from 'bun';

// Third-party imports
import { someLibrary } from 'some-library';

// Local imports
import { RSSGenerator } from './rss-generator.js';
import { cache } from './utils/cache.js';
```

### Error Handling

```javascript
// Use custom error classes
export class BlogError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'BlogError';
    this.statusCode = statusCode;
  }
}

// Handle errors gracefully
export async function fetchPost(slug) {
  try {
    const post = await getPostFromStorage(slug);
    if (!post) {
      throw new NotFoundError('Post');
    }
    return post;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new BlogError('Failed to fetch post', 500);
  }
}
```

## Testing

### Test Structure

```javascript
// tests/example.test.js
import { test, expect } from 'bun:test';
import { RSSGenerator } from '../src/rss-generator.js';

test.describe('RSS Generator', () => {
  let generator;

  test.beforeEach(() => {
    generator = new RSSGenerator({
      title: 'Test Blog',
      baseUrl: 'https://example.com'
    });
  });

  test('generates valid RSS feed', async () => {
    const posts = [
      {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        publishedAt: new Date().toISOString()
      }
    ];

    const rss = await generator.generate(posts);
    
    expect(rss).toContain('<rss');
    expect(rss).toContain('Test Post');
    expect(rss).toContain('Test content');
  });

  test('handles empty posts array', async () => {
    const rss = await generator.generate([]);
    expect(rss).toContain('<channel>');
    expect(rss).not.toContain('<item>');
  });
});
```

### Test Categories

#### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Fast execution

#### Integration Tests
- Test component interactions
- Use real dependencies when possible
- Slower but more comprehensive

#### Performance Tests
- Benchmark critical operations
- Ensure performance requirements are met
- Monitor for regressions

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/rss-generator.test.js

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch

# Run specific test pattern
bun test --grep "RSS"
```

## Documentation

### Documentation Standards

#### File Organization
- Use the `/docs` directory for all documentation
- Follow the existing structure
- Create new sections as needed

#### Writing Style
- Use clear, concise language
- Include code examples
- Use proper Markdown formatting
- Add relevant links

#### Documentation Types

1. **API Documentation**
   ```markdown
   # Function Name
   
   Description of what the function does.
   
   ## Parameters
   
   - `param1` (Type): Description of parameter
   - `param2` (Type, optional): Description of optional parameter
   
   ## Returns
   
   (Type): Description of return value
   
   ## Example
   
   ```javascript
   const result = functionName(param1, param2);
   console.log(result);
   ```
   ```

2. **Guide Documentation**
   ```markdown
   # Guide Title
   
   ## Overview
   
   Brief description of what this guide covers.
   
   ## Prerequisites
   
   - List of requirements
   - Previous knowledge needed
   
   ## Step-by-Step
   
   1. First step
   2. Second step
   3. Third step
   
   ## Examples
   
   Code examples and explanations.
   
   ## Troubleshooting
   
   Common issues and solutions.
   ```

### Updating Documentation

When making changes:

1. **Update existing docs** if functionality changes
2. **Add new docs** for new features
3. **Review for accuracy** after implementation
4. **Test examples** to ensure they work

## Submitting Changes

### 1. Commit Your Changes

Follow our commit message format:

```text
[DOMAIN][SCOPE][TYPE] Brief description

- Detailed change 1
- Detailed change 2
```

**Examples:**

```text
[API][RSS][FEAT] Add support for custom RSS fields

- Add customFields option to RSSGenerator
- Update RSS feed generation to include custom fields
- Add tests for custom field functionality
```

```text
[UTILS][CACHE][FIX] Fix cache invalidation bug

- Fix cache key generation for complex objects
- Add proper cache cleanup on updates
- Update cache tests
```

### 2. Push to Your Fork

```bash
git add .
git commit -m "[TYPE][SCOPE] Your commit message"
git push origin your-branch-name
```

### 3. Create a Pull Request

1. **Go to GitHub** and navigate to your fork
2. **Create Pull Request** from your branch
3. **Fill out the PR template**:
   - Describe your changes
   - Explain why you made these changes
   - Link to related issues
   - Add screenshots if applicable

### 4. PR Review Process

1. **Automated Checks**: CI/CD will run tests and linting
2. **Code Review**: Maintainers will review your changes
3. **Feedback**: Address any feedback or suggestions
4. **Merge**: Once approved, your PR will be merged

### PR Template

```markdown
## Summary
Brief description of changes

## Test plan
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

## Documentation
- [ ] Documentation updated
- [ ] Examples added
- [ ] Changelog updated

## Breaking changes
- [ ] No breaking changes
- [ ] Breaking changes (list them here)

## Related issues
Fixes #XXX
```

## Issue Reporting

### Before Reporting an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for solutions
3. **Try the latest version** to see if the issue is already fixed

### How to Report an Issue

1. **Use the appropriate issue template**
2. **Provide detailed information**:
   - Environment details (OS, Bun version, etc.)
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and stack traces
   - Screenshots if applicable

3. **Minimal reproduction** if possible

### Issue Templates

#### Bug Report

```markdown
## Bug description
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected behavior
A clear and concise description of what you expected to happen.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment info
- OS: [e.g. macOS, Windows, Linux]
- Bun version: [e.g. 1.3.7]
- Node version: [if applicable]
- Browser: [if applicable]

## Additional context
Add any other context about the problem here.
```

#### Feature Request

```markdown
## Is your feature request related to a problem?
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

## Describe the solution you'd like
A clear and concise description of what you want to happen.

## Describe alternatives you've considered
A clear and concise description of any alternative solutions or features you've considered.

## Additional context
Add any other context or screenshots about the feature request here.
```

## Feature Requests

### Submitting Feature Requests

1. **Create a new issue** using the feature request template
2. **Provide detailed information** about the feature
3. **Explain the use case** and why it's needed
4. **Consider implementation** complexity

### Feature Request Guidelines

- **Be specific** about what you want
- **Explain the use case** clearly
- **Consider alternatives** and why they don't work
- **Be open to discussion** and feedback

### Feature Implementation Process

1. **Discussion**: Community and maintainers discuss the feature
2. **Design**: Implementation details are worked out
3. **Implementation**: Someone implements the feature
4. **Testing**: Comprehensive tests are added
5. **Documentation**: Feature is documented
6. **Release**: Feature is included in a release

## Getting Help

### Resources

- **Documentation**: Check the `/docs` directory
- **Issues**: Search existing issues for solutions
- **Discussions**: Ask questions in GitHub Discussions
- **Community**: Join community chat if available

### Support Channels

1. **GitHub Issues**: For bugs and feature requests
2. **GitHub Discussions**: For questions and general discussion
3. **Documentation**: For setup and usage guides

### Response Times

- **Issues**: We aim to respond within 48 hours
- **PRs**: We aim to review within 1 week
- **Discussions**: Community-driven, response times vary

## Recognition

We appreciate all contributions! Contributors may be recognized through:

- **Contributor wall** in README
- **Special mentions** in release notes
- **Feature naming** for significant contributions
- **Swag** (when available)

## Questions?

If you have questions about contributing:

1. **Check the documentation** first
2. **Search existing issues** and discussions
3. **Ask in GitHub Discussions**
4. **Create a new issue** if needed

Thank you for contributing to the RSS Feed Optimization project! Your efforts help make this project better for everyone.