# GitHub CLI

**11.7.0.0.0.0.0: GitHub Integration Utilities**

GitHub integration utilities and automation.

**Cross-Reference:**
- `7.11.x.x.x.x.x` → Environment & Metadata (API tokens)
- `7.5.x.x.x.x.x` → File & Stream operations

## 11.7.0.1.0.0.0: Usage

```bash
bun run github <command> [options]
```

## 11.7.0.2.0.0.0: Commands

### 11.7.1.0.0.0.0: Repository Management

#### 11.7.1.1.0.0.0: `repo <action>`

Repository management actions.

**Actions:**
- `create` - Create new repository
- `list` - List repositories
- `info` - Get repository info

**Example:**
```bash
bun run github repo list
```

### 11.7.2.0.0.0.0: Issue Management

#### 11.7.2.1.0.0.0: `issue <action>`

Issue management actions.

**Actions:**
- `create` - Create new issue
- `list` - List issues
- `close` - Close issue

**Example:**
```bash
bun run github issue list
```

## 11.7.3.0.0.0.0: Implementation Details

- Uses GitHub API
- Supports authentication via tokens
- Uses `Bun.argv` for argument parsing

## 11.7.4.0.0.0.0: See Also

- [GitHub Source](../src/cli/github.ts)
