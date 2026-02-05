---
type: documentation
title: Markdown Standards
status: approved
review-cycle: 90
tags:
  - documentation-standards
  - formatting-consistency
  - vault-quality
created: 2025-11-18T10:00:00Z
updated: 2025-11-18T13:40:00Z
author: system
---






# 📋 Markdown Standards

## Overview
> **Consistency guidelines for the Odds Protocol Knowledge Vault**

## 🎨 Formatting standards

### Headings
- **Style**: Title case for H1, sentence case for H2+ with smart exceptions
- **Hierarchy**: H1 → H2 → H3 (strict increment)
- **Spacing**: 1 blank line before and after
- **Exceptions**: Articles and prepositions ignored in capitalization
- **Emoji rule**: Emoji prefixes don't affect case rules

```markdown
# 📋 Markdown Standards  # Title Case (H1)
## 🎨 Formatting standards  # sentence case (h2+)
### Code block style  # sentence case (h2+)
```

### Emphasis & strong
- **Italic**: `*text*` (asterisk style)
- **Bold**: `**text**` (asterisk style)
- **Consistency**: Use asterisk style throughout

### Code blocks
- **Style**: Fenced with triple backticks
- **Language**: Always specify language
- **Spacing**: Empty line before and after

```markdown
```typescript
const example = "code";
```
```

### Lists
- **Unordered**: Use dash `-` markers
- **Ordered**: Use numeric `1.` markers
- **Indentation**: 2 spaces for nested items

```markdown
- Main item
  - Nested item
  - Another nested item

1. First step
2. Second step
   1. Sub-step
```

## 📊 Metadata standards

### Required yaml frontmatter
Every note must include:

```yaml
---
type: note
title: Note Title
status: draft
review-cycle: 90
tags: []
created: 2025-11-18T13:30:00Z
updated: 2025-11-18T13:30:00Z
author: system
---
```

### Enhanced metadata fields
Optional fields for advanced vault management:

```yaml
---
status: draft | review | approved | deprecated  # Content lifecycle
review-cycle: 90  # Days between reviews
related-systems: [bookmaker-registry, api-gateway]  # Cross-references
priority: high | medium | low  # Content importance
---
```

### Yaml key order
Priority keys (grouped at top):
1. `type`
2. `title`
3. `description`
4. `tags`
5. `categories`
6. `created`
7. `updated`
8. `author`

Remaining keys sorted alphabetically.

### Tag standards
- **Format**: kebab-case
- **Spacing**: No spaces in tag names
- **Array style**: Single line when possible
- **Prefix**: Use descriptive prefixes

```yaml
tags: [architecture, system-design, bookmaker-registry]
```

## 🏗 ️ structure standards

### Document organization
- **Maximum Line Length**
- **Body text**: Maximum 100 characters
- **Code blocks**: Maximum 80 characters
- **YAML frontmatter**: Maximum 120 characters (wrap long tag arrays)
- **URLs**: Can exceed limit when necessary, prefer line breaks for long URLs
- **Single title**: One H1 per document
- **No duplicate headings**: Unique heading text per level

### Content sections
Standard sections for most content types:

```markdown
# Title

## Overview
Brief description of the content.

## Implementation
Details and examples.

## Usage
How to use or apply.

## Notes
Additional considerations.
```

### Link standards
- **Style**: Inline links for external URLs
- **Wiki links**: Use `[[Page Name]]` for internal links
- **Descriptive text**: Use meaningful link text
- **No bare URLs**: Always wrap URLs in markdown syntax

```markdown
[Odds Protocol Documentation](https://docs.odds-protocol.com)
[[Bookmaker Registry System]]
```

## 📁 File organization standards

### Naming conventions
- **Files**: kebab-case for most files
- **Dashboards**: Numbered prefix system (`00 - Dashboard.md`)
- **Folders**: Numbered prefix system
- **Templates**: End with "Template.md"

```
00 - Dashboard.md           # Main command center
01 - Daily Notes/            # Chronological logs
├── 01 - Reports/            # Daily reports
├── 02 - Journals/           # Daily journal entries
└── 03 - Actions/            # Action items and tasks
02 - Architecture/           # System design
├── 01 - Data Models/        # Data models and schemas
├── 02 - System Design/      # System design documents
└── 03 - Patterns/           # Design patterns and best practices
03 - Development/            # Code & testing
├── 01 - Code Snippets/      # Code examples and snippets
├── 02 - Testing/            # Testing documentation and results
└── 03 - Tools/              # Development tools and utilities
04 - Documentation/          # Guides & API
├── 01 - API/                # API documentation
├── 02 - Guides/             # User guides and tutorials
├── 03 - Reports/            # Analysis and review reports
└── 04 - Reference/          # Reference materials
05 - Assets/                 # Media files
├── 01 - Images/             # Image files and graphics
├── 02 - Media/              # Audio, video, and other media
└── 03 - Resources/          # External resources and references
06 - Templates/              # Template system
├── 01 - Note Templates/     # Note-taking templates
├── 02 - Project Templates/  # Project management templates
├── 03 - Dashboard Templates/# Dashboard templates
├── 04 - Development Templates/# Development templates
├── 05 - Design Templates/   # Design templates
├── 06 - Architecture Templates/# Architecture templates
└── 07 - Configuration Templates/# Configuration file templates
07 - Archive/                # Archived content
├── 01 - Old Projects/       # Completed or obsolete projects
├── 02 - Deprecated/         # Deprecated features and code
└── 03 - Backups/            # Backup files and archives
08 - Logs/                   # Logs and monitoring
├── 01 - Validation/         # Validation logs and reports
├── 02 - Automation/         # Automation activity logs
├── 03 - Errors/             # Error logs and debugging info
└── 04 - Performance/        # Performance monitoring logs
09 - Testing/                # Testing framework
├── 01 - Unit/               # Unit tests
├── 02 - Integration/        # Integration tests
├── 03 - E2E/                # End-to-end tests
└── 04 - Performance/        # Performance tests
10 - Benchmarking/           # Performance analysis
├── 01 - Benchmarks/         # Core benchmarking scripts
├── 02 - Performance/        # Performance analysis data
└── 03 - Reports/            # Generated benchmark reports
```

### Content type matrix
| Type | Template | Folder | Naming | Required Sections |
|------|----------|--------|--------|-------------------|
| Daily Notes | Daily Note Template | `01 - Daily Notes/02 - Journals/` | `YYYY-MM-DD.md` | Focus, Development Log |
| Daily Reports | Report Template | `01 - Daily Notes/01 - Reports/` | `YYYY-MM-DD-topic.md` | Summary, Analysis, Actions |
| System Design | System Design Template | `02 - Architecture/02 - System Design/` | `Title Case.md` | Overview, Architecture |
| Data Models | Data Model Template | `02 - Architecture/01 - Data Models/` | `Title Case.md` | Schema, Validation, Usage |
| Code Snippets | Code Snippet Template | `03 - Development/01 - Code Snippets/` | `kebab-case.md` | Purpose, Code, Usage |
| Testing Docs | Test Documentation | `03 - Development/02 - Testing/` | `Title Case.md` | Overview, Test Cases, Results |
| API Documentation | API Documentation Template | `04 - Documentation/01 - API/` | `Title Case.md` | Overview, Endpoints, Examples |
| Guides | Guide Template | `04 - Documentation/02 - Guides/` | `Title Case.md` | Overview, Prerequisites, Steps |
| Reports | Report Template | `04 - Documentation/03 - Reports/` | `Title Case.md` | Executive Summary, Analysis, Recommendations |
| Reference | Reference Template | `04 - Documentation/04 - Reference/` | `Title Case.md` | Overview, Content, Links |
| Unit Tests | Test Template | `09 - Testing/01 - Unit/` | `kebab-case.test.ts` | Setup, Tests, Cleanup |
| Integration Tests | Test Template | `09 - Testing/02 - Integration/` | `kebab-case.integration.test.ts` | Setup, Tests, Cleanup |
| Benchmarks | Benchmark Template | `10 - Benchmarking/01 - Benchmarks/` | `kebab-case.benchmark.ts` | Setup, Benchmarks, Analysis |

### Obsidian-specific rules
- **Block IDs**: Use kebab-case format `^block-id-kebab-case`
- **Callouts**: Use approved types (NOTE, WARNING, TIP, INFO, QUESTION)
- **Canvas files**: Name with `canvas-` prefix and descriptive title
- **Wiki-links**: Use descriptive link text `[[Display Text|File Name]]`

### Dashboard standards
- **Type**: `dashboard`
- **Required sections**: Overview, Current Focus, System Status
- **Dataview queries**: Real-time content updates
- **Quick actions**: Essential commands and links
- **ISO timestamps**: Consistent with codebase standards

## 🔧 Enforcement

### Automatic linting with rule groups

The Obsidian Linter automatically enforces standards through organized rule groups:

#### 🎨 **formatting standards**
- ✅ **Heading capitalization**: Title case with smart exceptions
- ✅ **Emphasis consistency**: Asterisk style for *italic* and **bold**
- ✅ **Code block style**: Fenced with language specification
- ✅ **Strong formatting**: Consistent asterisk style

#### 🏗 ️ **structure standards**
- ✅ **Header increment**: Strict H1-H6 hierarchy
- ✅ **Line length**: 100 characters max (80 for code blocks)
- ✅ **Unique headings**: No duplicate heading text

#### 📊 **metadata standards**
- ✅ **YAML key sorting**: Priority grouping + alphabetical
- ✅ **Timestamp management**: Automatic creation/update dates
- ✅ **Required fields**: Title, tags, created, updated enforced

### Manual validation
Check for:
- [ ] Required YAML fields present
- [ ] Proper heading hierarchy
- [ ] Descriptive link text
- [ ] Consistent formatting
- [ ] Appropriate file location

## 🚀 Best practices

### Content creation
1. **Start with template**: Use appropriate template for content type
2. **Fill frontmatter**: Complete all required YAML fields
3. **Write overview**: Always include an Overview section
4. **Link related content**: Connect to relevant notes
5. **Add tags**: Use standardized tag format

### Maintenance
1. **Regular validation**: Run `bun run vault:validate`
2. **Link checking**: Fix broken links promptly
3. **Tag cleanup**: Standardize tag usage
4. **Archive old content**: Move outdated items to archive

### Quality checklist
Before finalizing content:
- [ ] Title is descriptive and follows naming convention
- [ ] YAML frontmatter is complete and properly ordered
- [ ] Overview section provides clear context
- [ ] Code blocks have language specified
- [ ] Links are working and descriptive
- [ ] Tags are standardized and relevant
- [ ] Line length is within limits
- [ ] No duplicate headings exist

---

**Last Updated**: 2025-11-18 | **Version**: 2.0 | **System**: Enhanced Standards

## 🏷️ Tags
`#documentation-standards` `#formatting-consistency` `#vault-quality` `#enhanced-standards`
