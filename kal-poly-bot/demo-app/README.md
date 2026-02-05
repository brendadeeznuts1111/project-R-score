# my-demo-app

MCP server with ripgrep codebase search

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development
bun run dev

# Start MCP server (in another terminal)
bun run mcp:start
```

## 📋 Features

- ✅ mcp
- ✅ benchmarks

## 🛠️ Available Scripts

- `bun run dev` - bun run src/index.ts
- `bun run build` - bun build src/index.ts
- `bun run test` - bun test
- `bun run lint` - bunx eslint src
- `bun run type-check` - bunx tsc --noEmit
- `bun run help` - bun run scripts/help.ts
- `bun run mcp:start` - bun mcp/server.ts
- `bun run mcp:search` - curl -X POST http://localhost:8787/mcp/codesearch -H "Content-Type: application/json" -d '{"query":"function","type":"ts"}'
- `bun run mcp:health` - curl http://localhost:8787/health
- `bun run bench:all` - bun run bench:performance && bun run bench:search
- `bun run bench:performance` - bun test --reporter=verbose
- `bun run bench:search` - bun scripts/search-benchmark.ts

## 📚 Documentation

- [Surgical Precision Platform](https://github.com/brendadeeznuts1111/kal-poly-bot)
- [Bun Documentation](https://bun.sh/docs)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT - Surgical Precision Team
