# GitHub Configuration

This directory contains GitHub-specific configuration files for Dev HQ.

## Files

### 🔄 Workflows (`.github/workflows/`)
- **`ci.yml`** - Continuous Integration pipeline
  - Runs on every push and PR
  - Tests with Bun 1.3.6+
  - Type checking and linting
  - Security auditing

- **`release.yml`** - Automated releases
  - Triggers on version tags
  - Builds and publishes releases
  - Creates GitHub releases

### 📝 Issue Templates (`.github/ISSUE_TEMPLATE/`)
- **`bug_report.md`** - Bug report template
- **`feature_request.md`** - Feature request template
- **`docs_request.md`** - Documentation improvement template

### 🛡️ Policies
- **`CODE_OF_CONDUCT.md`** - Community code of conduct
- **`CONTRIBUTING.md`** - Contribution guidelines
- **`SECURITY.md`** - Security policy and vulnerability reporting

### 🤖 Automation
- **`dependabot.yml`** - Automated dependency updates
- **`FUNDING.yml`** - Sponsorship links

### 📋 Pull Requests
- **`PULL_REQUEST_TEMPLATE.md`** - PR template with checklists

## Repository Topics

The repository should have these GitHub topics:
- `bun`
- `typescript`
- `developer-tools`
- `code-analysis`
- `automation`
- `feature-flags`
- `performance-monitoring`
- `cli`
- `build-tools`
- `runtime-optimization`
- `dashboard`
- `web-socket`
- `http-server`
- `testing-framework`
- `security-scanning`

## Repository Settings

### General
- **Repository name**: geelark
- **Description**: Dev HQ - Advanced codebase analysis and automation platform built with Bun
- **Website**: https://github.com/brendadeeznuts1111/geelark#readme
- **Topics**: See above

### Features
- ✅ Issues
- ✅ Discussions
- ✅ Projects
- ✅ Wiki
- ✅ Sponsorships
- ✅ Security

### Pull Requests
- ✅ Allow merge commits
- ✅ Allow squash merging
- ✅ Allow rebase merging
- ✅ Require linear history (optional)

### Branch Protection (main)
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Include administrators
