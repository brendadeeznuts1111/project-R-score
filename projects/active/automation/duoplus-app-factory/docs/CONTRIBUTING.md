# 🤝 Contributing to Nebula-Flow™ DuoPlus

Thank you for your interest in contributing to the Nebula-Flow™ DuoPlus Lightning Network Integration project!

## 📋 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Report issues responsibly

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/duoplus-app-factory.git
   cd duoplus-app-factory
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 💻 Development Workflow

### Setup Development Environment

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Setup project
bun install
cp .env.example .env

# Configure LND (if needed)
sudo bash scripts/setup/setup-lnd.sh
```

### Running Tests

```bash
# Run all tests
bun test tests/

# Run specific test file
bun test tests/lightning.integration.test.ts

# Watch mode
bun test --watch tests/
```

### Building

```bash
# Build the project
bun run build

# Sync version across files
bun run sync-version
```

### Code Style

- Use TypeScript for new code
- Follow existing code patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

## 📝 Commit Guidelines

- Use clear, descriptive commit messages
- Reference issues when applicable: `Fixes #123`
- Keep commits focused on a single change
- Format: `type: description`

Examples:
- `feat: add EventSource streaming for live updates`
- `fix: correct broken link in documentation`
- `docs: update installation guide`
- `refactor: simplify compliance validator`
- `test: add tests for KYC validation`

## 🔄 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Run tests** to ensure they pass:
   ```bash
   bun test tests/
   ```
4. **Update CHANGELOG** if applicable
5. **Create PR** with clear description
6. **Link related issues** in PR description
7. **Wait for review** and address feedback

### PR Title Format

- `feat: description` - New feature
- `fix: description` - Bug fix
- `docs: description` - Documentation
- `refactor: description` - Code refactoring
- `test: description` - Test additions
- `chore: description` - Maintenance

## 🐛 Reporting Issues

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Bun version, etc.)
- Error messages or logs

## 📚 Documentation

- Update relevant docs when making changes
- Keep README.md current
- Add comments to complex code
- Update API documentation
- Include examples for new features

## 🔐 Security

- Never commit secrets or credentials
- Use `.env.example` for configuration templates
- Report security issues privately
- Follow security best practices

## 📦 Project Structure

See [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for detailed directory organization.

Key directories:
- `src/` - Source code
- `tests/` - Test files
- `docs/` - Documentation
- `scripts/` - Build and deployment
- `web-app/` - Web dashboard

## 🎯 Areas for Contribution

- Lightning Network features
- Compliance and KYC improvements
- Device management enhancements
- Web dashboard improvements
- Documentation and examples
- Bug fixes and optimizations
- Test coverage

## ✅ Before Submitting

- [ ] Code follows project style
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Commit messages are clear
- [ ] PR description is complete

## 📞 Questions?

- Check [docs/INDEX.md](docs/INDEX.md) for documentation
- Review existing issues and PRs
- Open a discussion for questions

---

**Thank you for contributing!** 🙏

