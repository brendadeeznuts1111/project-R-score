# 🔥 Fantasy42-Fire22 Commit Convention

## 📋 **Conventional Commits Standard**

This repository follows the
[Conventional Commits](https://conventionalcommits.org/) specification with
enterprise extensions for Fantasy42-Fire22.

### **🎯 Commit Format**

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### **🔥 Commit Types**

| Type       | Description              | Release | Example                               |
| ---------- | ------------------------ | ------- | ------------------------------------- |
| `feat`     | New feature              | Minor   | `feat: add user authentication`       |
| `fix`      | Bug fix                  | Patch   | `fix: resolve memory leak in worker`  |
| `docs`     | Documentation            | -       | `docs: update API documentation`      |
| `style`    | Code style changes       | -       | `style: format code with prettier`    |
| `refactor` | Code refactoring         | -       | `refactor: simplify database queries` |
| `perf`     | Performance improvements | Patch   | `perf: optimize bundle size`          |
| `test`     | Testing                  | -       | `test: add unit tests for auth`       |
| `build`    | Build system             | -       | `build: update webpack config`        |
| `ci`       | CI/CD changes            | -       | `ci: add github actions workflow`     |
| `chore`    | Maintenance              | -       | `chore: update dependencies`          |
| `revert`   | Revert changes           | -       | `revert: undo last commit`            |

### **🏗️ Enterprise Extensions**

#### **Architecture Types**

| Type       | Description              | Example                                |
| ---------- | ------------------------ | -------------------------------------- |
| `arch`     | Architecture changes     | `arch: implement domain-driven design` |
| `infra`    | Infrastructure           | `infra: deploy to cloudflare`          |
| `security` | Security improvements    | `security: add encryption layer`       |
| `perf`     | Performance improvements | `perf: optimize bundle size`           |

#### **Cross-Cutting Concern Types**

| Type         | Description               | Use Case                  | Example                                        |
| ------------ | ------------------------- | ------------------------- | ---------------------------------------------- |
| `security`   | Security-related changes  | Primary security focus    | `security: patch CVE-2023 vulnerability`       |
| `perf`       | Performance optimizations | Primary performance focus | `perf: optimize database queries`              |
| `compliance` | Compliance & regulatory   | Regulatory requirements   | `compliance: implement GDPR data retention`    |
| `audit`      | Audit & logging           | Audit trail changes       | `audit: enhance financial transaction logging` |

#### **Enhanced Scope Hierarchy & Usage**

##### **🎯 Primary: Domain Scopes (DDD Bounded Contexts)**

Your **scopes are your Bounded Contexts or Core Subdomains** - the most powerful
way to use scopes in DDD.

| Domain          | Description          | Business Context                  | Example                                       |
| --------------- | -------------------- | --------------------------------- | --------------------------------------------- |
| `core`          | Core domain          | Fundamental business capabilities | `feat(core): add aggregate validation`        |
| `users`         | Users domain         | User management & authentication  | `feat(users): implement OAuth2 login`         |
| `betting`       | Betting domain       | Sports betting & wagering         | `fix(betting): resolve odds calculation`      |
| `gaming`        | Gaming domain        | Fantasy sports & gaming           | `feat(gaming): add tournament system`         |
| `analytics`     | Analytics domain     | Data analysis & reporting         | `perf(analytics): optimize metrics`           |
| `finance`       | Finance domain       | Financial transactions            | `feat(finance): add transaction processing`   |
| `payments`      | Payments domain      | Payment processing                | `security(payments): add fraud detection`     |
| `security`      | Security domain      | Security & compliance             | `fix(security): resolve auth bypass`          |
| `communication` | Communication domain | Messaging & notifications         | `feat(communication): add push notifications` |
| `content`       | Content domain       | Content management                | `docs(content): update article system`        |

##### **🔧 Secondary: Technology Scopes**

Scopes for technology-specific contexts and infrastructure components.

| Technology             | Scope                      | Example                                             |
| ---------------------- | -------------------------- | --------------------------------------------------- |
| **Bun Runtime**        | `bun`                      | `fix(bun): resolve readableStream middleware issue` |
| **Cloudflare Workers** | `worker`, `cf`             | `feat(email-worker): offload sendgrid processing`   |
| **Database**           | `db`, `sqlite`, `postgres` | `perf(db): optimize query indexing`                 |
| **Docker**             | `docker`                   | `ci(docker): multi-stage build for api service`     |
| **Redis**              | `redis`                    | `chore(redis): update cluster configuration`        |
| **API Gateway**        | `api`                      | `feat(api): add rate limiting middleware`           |

##### **🏗️ Tertiary: Cross-Cutting Concern Scopes**

Apply concerns to specific domains when the concern is being _applied_ to that
domain.

| Concern      | When to Use                   | Example                                            |
| ------------ | ----------------------------- | -------------------------------------------------- |
| `perf`       | Performance tuning initiative | `refactor(search): replace forEach with for-loop`  |
| `security`   | Security feature in domain    | `feat(auth): add rate limiting for login attempts` |
| `compliance` | Domain-specific compliance    | `feat(finance): implement SEC reporting`           |
| `audit`      | Domain audit enhancements     | `feat(payments): enhance transaction logging`      |

**Massive Enterprise System Scopes** | Scope | Description | Example |
|-------|-------------|---------| | `dashboard-worker` | Dashboard Worker
Enterprise System (1000+ files) | `feat(dashboard-worker): add agent management`
| | `cloudflare` | Cloudflare Infrastructure System |
`infra(cloudflare): update worker config` | | `web-servers` | Web Server Systems
(20+ interfaces) | `feat(web-servers): add admin dashboard` | | `monitoring` |
Security Monitoring & Logging | `fix(monitoring): resolve log aggregation` | |
`telegram` | Telegram Integration Systems |
`feat(telegram): add multi-language support` | | `feeds` | RSS/Atom Feed
Syndication | `feat(feeds): add department syndication` |

**Enterprise Package Scopes** | Scope | Description | Example |
|-------|-------------|---------| | `accounting` | Accounting package |
`feat(accounting): add financial reports` | | `analytics` | Analytics package |
`fix(analytics): resolve metrics calculation` | | `api` | API package |
`feat(api): add REST endpoints` | | `application` | Application layer |
`refactor(application): optimize use cases` | | `balance` | Account balances |
`feat(balance): add balance validation` | | `benchmarking` | Performance testing
| `perf(benchmarking): optimize test suite` | | `betting` | Betting package |
`fix(betting): resolve odds calculation` | | `collections` | Data collections |
`feat(collections): add data aggregation` | | `communications` | Communication
systems | `feat(communications): add email templates` | | `compliance` |
Compliance package | `security(compliance): add audit logging` | |
`config-management` | Configuration management |
`feat(config-management): add env validation` | | `content` | Content management
| `docs(content): update content API` | | `core` | Core package |
`refactor(core): simplify business logic` | | `crypto` | Cryptography |
`security(crypto): add encryption layer` | | `dashboard` | Dashboard package |
`feat(dashboard): add analytics widgets` | | `database` | Database package |
`fix(database): resolve connection issues` | | `demo` | Demo applications |
`feat(demo): add interactive showcase` | | `docs` | Documentation package |
`docs(docs): update API docs` | | `external` | External integrations |
`feat(external): add third-party API` | | `finance` | Finance package |
`feat(finance): add transaction processing` | | `financial-reporting` |
Financial reporting | `docs(financial-reporting): update reports` | | `frontend`
| Frontend package | `feat(frontend): add responsive design` | | `health` |
Health monitoring | `feat(health): add system checks` | | `integration` |
Integration package | `fix(integration): resolve API sync` | | `maintenance` |
Maintenance tools | `feat(maintenance): add cleanup scripts` | | `mobile` |
Mobile applications | `feat(mobile): add offline support` | | `payment` |
Payment systems | `security(payment): add PCI compliance` | | `projects` |
Project management | `feat(projects): add task tracking` | | `scripts` | Script
collections | `build(scripts): add deployment tools` | | `secrets` | Secret
management | `security(secrets): add encryption` | | `security` | Security
package | `fix(security): resolve auth bypass` | | `settlement` | Settlement
systems | `feat(settlement): add auto-settlement` | | `shared` | Shared
utilities | `feat(shared): add validation helpers` | | `testing` | Testing
frameworks | `test(testing): add integration tests` | | `user-mgmt` | User
management | `feat(user-mgmt): add role management` | | `vip` | VIP systems |
`feat(vip): add premium features` |

**DDD Domain Scopes (Architectural)** | Scope | Description | Example |
|-------|-------------|---------| | `core` | Core domain |
`feat(core): add aggregate validation` | | `users` | Users domain |
`feat(users): add profile management` | | `betting` | Betting domain |
`fix(betting): resolve odds calculation` | | `gaming` | Gaming domain |
`feat(gaming): add tournament system` | | `analytics` | Analytics domain |
`perf(analytics): optimize metrics` | | `finance` | Finance domain |
`feat(finance): add transaction processing` | | `payments` | Payments domain |
`security(payments): add fraud detection` | | `security` | Security domain |
`fix(security): resolve auth bypass` | | `communication` | Communication domain
| `feat(communication): add push notifications` | | `content` | Content domain |
`docs(content): update article system` |

**Technical Scopes** | Scope | Description | Example |
|-------|-------------|---------| | `api` | API layer |
`fix(api): handle null responses` | | `ui` | Presentation layer |
`feat(ui): add dashboard component` | | `infra` | Infrastructure layer |
`refactor(infra): optimize database` | | `shared` | Shared utilities |
`feat(shared): add validation helpers` | | `worker` | Cloudflare Workers |
`perf(worker): reduce cold start` | | `registry` | Package registry |
`feat(registry): add private packages` | | `hub` | Interactive hub |
`fix(hub): resolve websocket issue` | | `db` | Database operations |
`refactor(db): optimize queries` | | `auth` | Authentication system |
`security(auth): add MFA` | | `ci` | CI/CD pipelines |
`build(ci): add deployment automation` |

### **📝 Enhanced Commit Examples**

#### **DDD Domain Examples**

```bash
# Core business logic changes
feat(core): implement user aggregate validation
fix(betting): resolve odds calculation edge case
refactor(finance): change transaction aggregation root
docs(analytics): add data flow sequence diagram

# Cross-domain communication
feat(communication): add domain event for user registration
fix(payments): handle betting settlement notifications
```

#### **Technology-Specific Examples**

```bash
# Bun runtime specific
fix(bun): resolve readableStream middleware compatibility
chore(bun): update to version 1.0.25 for performance
build(bun): add package script for executable generation

# Cloudflare Workers
feat(email-worker): offload sendgrid processing to background
perf(image-worker): optimize sharp processing parameters
fix(cf): handle Cloudflare queue payload serialization

# Database optimizations
perf(db): add indexing for product search queries
fix(sqlite): resolve connection pooling issue
chore(postgres): update to version 15 for security
```

#### **Cross-Cutting Concern Examples**

```bash
# Primary concern focus (use TYPE)
perf: optimize database query performance across domains
security: patch handlebars to v4.7.7 preventing RCE
compliance: implement GDPR data retention policies
audit: enhance financial transaction logging system

# Applied to specific domain (use SCOPE)
refactor(search): replace forEach with for-loop in data processing
feat(auth): add rate limiting for login attempts
feat(finance): implement SEC regulatory reporting
fix(payments): enhance transaction audit logging
```

#### **Enterprise System Examples**

```bash
# Dashboard Worker Enterprise System
feat(dashboard-worker): add real-time agent management
fix(dashboard-worker): resolve websocket connection issues
perf(dashboard-worker): optimize dashboard rendering

# Cloudflare Infrastructure
infra(cf): deploy multi-region worker infrastructure
feat(worker-email): implement background email processing
fix(cf): handle Cloudflare queue error scenarios

# Security & Compliance
security(auth): implement enterprise SSO integration
compliance(finance): add SEC reporting capabilities
audit(payments): enhance transaction traceability
```

#### **Complex Multi-Concern Examples**

```bash
# Performance + Security + Domain
perf(security): optimize JWT token validation performance
security(auth): add rate limiting with performance monitoring

# Compliance + Technology + Domain
compliance(finance): implement SOX audit logging for PostgreSQL
feat(postgres): add compliance triggers for financial data

# Architecture + Performance + Technology
arch(bun): redesign module loading for better performance
perf(worker): optimize Cloudflare Worker cold start times
```

### **🎯 Commit Best Practices**

#### **🎯 Decision Framework: Type vs Scope for Cross-Cutting Concerns**

**Use TYPE when the change's PRIMARY PURPOSE is that concern:**

```bash
# ✅ PRIMARY security focus
security: patch handlebars to prevent RCE vulnerability
perf: optimize database queries across all domains
compliance: implement GDPR data retention policies

# ✅ PRIMARY performance focus
perf: implement caching layer for API responses
perf: optimize bundle size and loading times
```

**Use SCOPE when APPLYING the concern to a specific domain:**

```bash
# ✅ APPLYING security to auth domain
feat(auth): add rate limiting for login attempts
fix(payments): enhance fraud detection algorithms
refactor(search): replace forEach with for-loop for performance

# ✅ APPLYING performance to specific technology
perf(bun): optimize module loading and resolution
perf(worker): reduce Cloudflare Worker cold start time
```

#### **1. Use Imperative Mood**

```bash
✅ feat: add user authentication
❌ feat: added user authentication
❌ feat: adding user authentication
```

#### **2. Keep Subject Line Concise**

```bash
✅ feat: implement user registration flow
❌ feat: implement a comprehensive user registration flow with email verification and password strength validation
```

#### **3. Use Body for Details**

```bash
feat: add user authentication

- Implement OAuth2 login flow
- Add JWT token management
- Create user session handling
- Add password reset functionality

Closes #123
```

#### **4. Reference Issues**

```bash
fix: resolve websocket connection issue

Connection was dropping after 30 seconds due to timeout.
Increased timeout to 5 minutes and added heartbeat.

Fixes #456
Closes #457
```

#### **5. Use Breaking Change Notation**

```bash
feat!: change API response format

BREAKING CHANGE: Response now includes user metadata
Migration guide: https://docs.apexodds.net/migration
```

### **🤖 Automated Enforcement**

#### **Git Hooks**

```bash
# Pre-commit hook validates commit messages
# Pre-push hook runs tests and linting
# Commit-msg hook enforces conventional format
```

#### **GitHub Actions**

```bash
# Validates PR titles follow convention
# Auto-generates changelogs from commits
# Creates release notes automatically
```

### **📊 Release Automation**

#### **Version Bumping**

```bash
# Based on commit types:
feat:     -> Minor version (1.2.0)
fix:      -> Patch version (1.2.1)
feat!:    -> Major version (2.0.0)
```

#### **Changelog Generation**

```bash
# Auto-generates from conventional commits:
## [1.3.0] - 2024-01-15
### Features
- feat: add user authentication (#123)
- feat(ui): create dashboard component (#124)

### Bug Fixes
- fix: resolve memory leak (#125)
- fix(api): handle null responses (#126)
```

### **🚀 Advanced Commit Patterns**

#### **Work-in-Progress Commits**

```bash
feat: implement user auth [WIP]
fix: debug websocket issue [TEMP]
```

#### **Revert Commits**

```bash
revert: feat: add user authentication

This reverts commit abc123def456
Original commit message: feat: add user authentication
```

#### **Co-authored Commits**

```bash
feat: implement enterprise SSO

Co-authored-by: Security Team <security@fire22.com>
Co-authored-by: DevOps Team <devops@fire22.com>
```

### **🔧 Configuration**

#### **Package.json Integration**

```json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-commit": "lint-staged"
    }
  }
}
```

#### **Commitlint Configuration**

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'arch',
        'infra',
        'security',
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
  },
};
```

### **📈 Benefits**

#### **For Developers**

- ✅ Clear commit history
- ✅ Easy to understand changes
- ✅ Automated tooling support
- ✅ Consistent code quality

#### **For Teams**

- ✅ Standardized communication
- ✅ Automated release notes
- ✅ Better collaboration
- ✅ Easier code reviews

#### **For Enterprise**

- ✅ Audit trail compliance
- ✅ Regulatory requirements
- ✅ Change management
- ✅ Quality assurance

### **🎯 Implementation Checklist**

- [ ] Install commitlint and husky
- [ ] Configure commit message validation
- [ ] Set up pre-commit hooks
- [ ] Create PR templates
- [ ] Configure GitHub Actions validation
- [ ] Train team on conventional commits
- [ ] Set up automated changelog generation
- [ ] Configure release automation

### **📚 Resources**

- [Conventional Commits Specification](https://conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

**🎯 Ready to standardize your commit workflow? Follow the implementation
checklist above!**

**Questions?** Check the resources or create an issue! 🚀
