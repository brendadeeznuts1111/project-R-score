# rss-feed-optimization

High-performance RSS feed optimization system built with Bun.js v1.3.7+

## Creating a new project

You can scaffold a new project in two ways:

### Option 1: `bun create` (local template)

Use the template in this repo. Run **from this directory**:

```bash
bun create rss-feed-template ./my-app
cd my-app && bun install && bun dev
```

Bun copies `.bun-create/rss-feed-template` into `./my-app`, runs `bun install`, and the template’s `postinstall` runs `setup-template` (creates `profiles/`, `content/posts/`, `.env` from `.env.example`). Use `--no-git` to skip `git init` (e.g. if you hit commit-msg hooks).

**Global usage:** To use `bun create rss-feed-template` from anywhere, from the repo root run:

```bash
mkdir -p "$HOME/.bun-create"
ln -sf "$(pwd)/.bun-create/rss-feed-template" "$HOME/.bun-create/rss-feed-template"
```

You can customize the global template path by setting the [`BUN_CREATE_DIR`](https://bun.com/docs/runtime/templating/create#from-a-local-template) environment variable (default: `$HOME/.bun-create`).

### Option 2: `bun init-rss` (scaffold CLI)

Generates a minimal or full project with `--cwd`, `--minimal`, `--skip-env`, etc. Use a **separate directory** (never run in this repo root):

```bash
bun init-rss --cwd ./my-app --yes
# or minimal, no .env:
bun init-rss -m --skip-env --cwd ./my-app
```

See `bun run init-rss -- --help` for all flags.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Run tests
bun test
```

## Scripts

- `bun dev` - Start development server with hot reload
- `bun start` - Start production server
- `bun test` - Run tests
- `bun run benchmark` - Run performance benchmarks

## Environment Variables

Create a `.env` file with:

```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket
ADMIN_TOKEN=your-admin-token
```

## License

MIT
