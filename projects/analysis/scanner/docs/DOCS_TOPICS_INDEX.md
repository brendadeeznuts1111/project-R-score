# Bun Documentation Topics Index

**Source**: `matrix-analysis/mcp-bun-docs/docs.json` (Mintlify navigation)  
**Indexed**: via `bun scripts/index-docs-topics.ts`

## Summary

| Metric                            | Count |
| --------------------------------- | ----- |
| **Total navigation entries**      | 328   |
| **Unique pages**                  | 305   |
| **Tabs**                          | 8     |
| **Unique tab+group combinations** | 44    |

_Note: Reference and Blog tabs are external (bun.com/reference, bun.com/blog) and not indexed._

---

## Topics by Tab

| Tab             | Entries | Unique Pages | Groups |
| --------------- | ------- | ------------ | ------ |
| Runtime         | 66      | 66           | 12     |
| Package Manager | 24      | 24           | 4      |
| Bundler         | 12      | 12           | 7      |
| Test Runner     | 12      | 12           | 5      |
| Guides          | 213     | 190          | 15     |
| Feedback        | 1       | 1            | 1      |

---

## Topics by Tab › Group (precise)

### Runtime

| Group                     | Pages |
| ------------------------- | ----- |
| Get Started               | 6     |
| Core Runtime              | 4     |
| File & Module System      | 6     |
| HTTP server               | 6     |
| Networking                | 5     |
| Data & Storage            | 9     |
| Concurrency               | 1     |
| Process & System          | 3     |
| Interop & Tooling         | 4     |
| Utilities                 | 12    |
| Standards & Compatibility | 4     |
| Contributing              | 6     |

### Package Manager

| Group                  | Pages |
| ---------------------- | ----- |
| Core Commands          | 5     |
| Publishing & Analysis  | 5     |
| Workspace Management   | 4     |
| Advanced Configuration | 10    |

### Bundler

| Group                  | Pages |
| ---------------------- | ----- |
| Core                   | 1     |
| Development Server     | 2     |
| Asset Processing       | 3     |
| Single File Executable | 1     |
| Extensions             | 2     |
| Optimization           | 2     |
| Migration              | 1     |

### Test Runner

| Group               | Pages |
| ------------------- | ----- |
| Getting Started     | 3     |
| Test Execution      | 2     |
| Test Features       | 4     |
| Specialized Testing | 1     |
| Reporting           | 2     |

### Guides

| Group                  | Pages     | Notes                            |
| ---------------------- | --------- | -------------------------------- |
| Overview               | 1         |                                  |
| Deployment             | 6         |                                  |
| Runtime & Debugging    | 7 unique  | 9 entries (2 dup)                |
| Utilities              | 12 unique | 19 entries (7 dup across groups) |
| Ecosystem & Frameworks | 28        |                                  |
| HTTP & Networking      | 12        |                                  |
| WebSocket              | 4         |                                  |
| Processes & System     | 13        |                                  |
| Package Manager        | 17        |                                  |
| Test Runner            | 19        |                                  |
| Module System          | 10        |                                  |
| File System            | 21        |                                  |
| HTML Processing        | 2         |                                  |
| Binary Data            | 22        |                                  |
| Streams                | 12        |                                  |

### Feedback

| Group  | Pages |
| ------ | ----- |
| (root) | 1     |

---

## All 305 Unique Page Paths

Paths use the docs base https://bun.com/docs. Example: `/runtime/file-io` → `https://bun.com/docs/runtime/file-io`

<details>
<summary>Expand full list</summary>

```text
/bundler/bytecode
/bundler/css
/bundler/esbuild
/bundler/executables
/bundler/fullstack
/bundler/hot-reloading
/bundler/html-static
/bundler/index
/bundler/loaders
/bundler/macros
/bundler/minifier
/bundler/plugins
/feedback
/guides/binary/* (22 pages)
/guides/deployment/* (6 pages)
/guides/ecosystem/* (28 pages)
/guides/html-rewriter/* (2 pages)
/guides/http/* (12 pages)
/guides/index
/guides/install/* (16 pages)
/guides/process/* (9 pages)
/guides/read-file/* (9 pages)
/guides/runtime/* (16 pages)
/guides/streams/* (12 pages)
/guides/test/* (19 pages)
/guides/util/* (18 pages)
/guides/websocket/* (4 pages)
/guides/write-file/* (11 pages)
/index
/installation
/pm/* (24 pages)
/project/* (6 pages)
/quickstart
/runtime/* (66 pages)
/test/* (12 pages)
/typescript
```

</details>

---

## Regenerate Index

```bash
bun scripts/index-docs-topics.ts matrix-analysis/mcp-bun-docs/docs.json
```

Or from scanner root:

```bash
bun run extract:docs-topics
```
