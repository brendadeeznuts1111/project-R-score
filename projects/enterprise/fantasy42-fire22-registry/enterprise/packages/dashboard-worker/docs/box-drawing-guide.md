# Box Drawing Character Guide

## Smooth Unicode Box Drawing Characters

### Character Reference

```
╭ = Top-left corner (smooth)
╮ = Top-right corner (smooth)
╰ = Bottom-left corner (smooth)
╯ = Bottom-right corner (smooth)
─ = Horizontal line
│ = Vertical line
├ = Left T-junction
┤ = Right T-junction
┬ = Top T-junction
┴ = Bottom T-junction
┼ = Cross junction
```

## Example: Project Structure with Smooth Boxes

### Before (Sharp Corners)

```
+-- dashboard-worker/
|   +-- src/
|   |   +-- index.ts
|   |   +-- config.ts
|   |   +-- types.ts
|   +-- docs/
|       +-- README.md
```

### After (Smooth Corners)

```
╭── dashboard-worker/
│   ╭── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ╰── types.ts
│   ╰── docs/
│       ╰── README.md
```

## File Tree Examples

### Simple File Tree

```
dashboard-worker/
├── 📄 .env.example
├── 📄 package.json
├── 📁 src/
│   ├── 📄 index.ts
│   ├── 📄 config.ts
│   ╰── 📄 types.ts
╰── 📁 docs/
    ├── 📄 README.md
    ╰── 📄 guide.md
```

### Complex Nested Structure

```
╭─ Fire22 Dashboard Worker
│
├─ 📁 Core System
│  ├─ 🔧 Configuration
│  │  ├── .env
│  │  ├── wrangler.toml
│  │  ╰── tsconfig.json
│  │
│  ├─ 📦 Packages
│  │  ├── middleware/
│  │  ├── wager-system/
│  │  ╰── env-manager/
│  │
│  ╰─ 🧪 Testing
│     ├── unit-tests/
│     ├── integration-tests/
│     ╰── e2e-tests/
│
├─ 📁 Documentation
│  ├── API Reference
│  ├── User Guides
│  ╰── Developer Docs
│
╰─ 📁 Build & Deploy
   ├── scripts/
   ├── dist/
   ╰── releases/
```

## Box Diagrams

### API Flow Diagram

```
╭─────────────────╮
│   Client App    │
╰────────┬────────╯
         │
         ▼
╭────────────────────╮
│   API Gateway      │
├────────────────────┤
│ • Authentication   │
│ • Rate Limiting    │
│ • Request Routing  │
╰────────┬───────────╯
         │
    ╭────┴────╮
    ▼         ▼
╭─────────╮ ╭─────────╮
│ Service │ │ Service │
│    A    │ │    B    │
╰─────────╯ ╰─────────╯
```

### Component Architecture

```
╭──────────────────────────────────────╮
│         Fire22 Dashboard             │
├──────────────────────────────────────┤
│                                      │
│  ╭─────────────╮   ╭──────────────╮ │
│  │   Frontend  │   │   Backend    │ │
│  │             │◄──┤              │ │
│  │  • React    │   │  • Bun       │ │
│  │  • Tailwind │   │  • PostgreSQL│ │
│  ╰─────────────╯   ╰──────────────╯ │
│                                      │
╰──────────────────────────────────────╯
```

## Data Flow with Smooth Lines

```
    User Input
         │
         ▼
    ╭─────────╮
    │ Validate│
    ╰────┬────╯
         │
    Pass │ Fail
         │
    ╭────┴────╮
    ▼         ▼
╭────────╮ ╭─────────╮
│Process │ │  Error  │
│ Data   │ │ Handler │
╰───┬────╯ ╰─────────╯
    │
    ▼
╭────────╮
│ Store  │
│  DB    │
╰────────╯
```

## Configuration Structure

```
╭─ Environment Configuration
│
├─ Development (.env.development)
│  ├─ DATABASE_URL
│  ├─ API_KEY
│  ╰─ DEBUG_MODE=true
│
├─ Staging (.env.staging)
│  ├─ DATABASE_URL
│  ├─ API_KEY
│  ╰─ DEBUG_MODE=false
│
╰─ Production (.env.production)
   ├─ DATABASE_URL
   ├─ API_KEY
   ├─ MONITORING=true
   ╰─ DEBUG_MODE=false
```

## API Response Structure

```
╭─ Response
│
├─ Headers
│  ├─ Content-Type: application/json
│  ├─ X-Request-ID: abc123
│  ╰─ X-Rate-Limit: 100
│
├─ Body
│  ├─ success: true
│  ├─ data: {
│  │   ├─ id: 1
│  │   ├─ name: "Fire22"
│  │   ╰─ status: "active"
│  │ }
│  ╰─ timestamp: "2024-08-27"
│
╰─ Status: 200 OK
```

## Database Schema

```
╭───────────────────────────╮
│        customers          │
├───────────────────────────┤
│ • id (PRIMARY KEY)        │
│ • username                │
│ • balance                 │
│ • created_at              │
╰───────────┬───────────────╯
            │
            │ 1:N
            ▼
╭───────────────────────────╮
│         wagers            │
├───────────────────────────┤
│ • id (PRIMARY KEY)        │
│ • customer_id (FK)        │
│ • amount                  │
│ • status                  │
│ • created_at              │
╰───────────────────────────╯
```

## Best Practices

1. **Use smooth corners** (`╭╮╰╯`) for modern, clean appearance
2. **Consistent alignment** - Ensure vertical lines align properly
3. **Appropriate connectors** - Use `├` for middle items, `╰` for last items
4. **Visual hierarchy** - Indent nested items consistently
5. **Icons for clarity** - Add emojis or symbols for file types

## Implementation in Code Comments

```typescript
/**
 * ╭─────────────────────────────────╮
 * │   Fire22 Dashboard Worker       │
 * ├─────────────────────────────────┤
 * │   Version: 3.0.8                │
 * │   Author: Fire22 Team           │
 * │   License: MIT                  │
 * ╰─────────────────────────────────╯
 */

// ╭─ Configuration Section ─╮
// │ Load environment vars   │
// ╰─────────────────────────╯

// ├─ Database Connection
// ├─ API Routes
// ╰─ Server Initialization
```

## Markdown Tables with Box Drawing

```
╭───────────┬────────────┬───────────╮
│  Feature  │   Status   │  Version  │
├───────────┼────────────┼───────────┤
│  API      │  ✅ Active │   1.2.0   │
│  Database │  ✅ Active │   2.1.0   │
│  Cache    │  🔄 Beta   │   0.9.0   │
│  Queue    │  📦 Alpha  │   0.5.0   │
╰───────────┴────────────┴───────────╯
```

## Terminal Output Examples

```bash
╭─ Build Process ──────────────────────╮
│                                      │
│  ► Building dashboard-worker...      │
│    ├─ Compiling TypeScript          │
│    ├─ Bundling assets               │
│    ├─ Optimizing code               │
│    ╰─ Creating executables          │
│                                      │
│  ✅ Build completed successfully!    │
│                                      │
╰──────────────────────────────────────╯
```

## Summary

Using smooth box-drawing characters creates a more professional and visually
appealing documentation. The characters flow better and create a modern, clean
aesthetic that's easier on the eyes than sharp ASCII corners.

### Quick Reference

- Replace `+--` with `╭──`
- Replace `+` corners with `╭╮╰╯`
- Use `├` instead of `|--` for branches
- Use `╰` for the last item in a list
- Keep `│` for vertical lines
- Keep `─` for horizontal lines
