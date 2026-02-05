# TanStack Start with Bun - Production Server

A high-performance TanStack Start application with an intelligent custom production server built on Bun, featuring advanced asset preloading, configurable memory management, and enterprise-grade optimizations.

## 🚀 Quick Start

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

### Production Build

```bash
bun run build
```

### Production Server

```bash
bun run start
```

## 🎯 Production Server Features

This project includes a **custom Bun production server** (`server.ts`) with advanced capabilities:

### 🧠 Intelligent Asset Loading

- **Hybrid Strategy**: Small files are preloaded into memory, large files served on-demand
- **Configurable Memory Management**: Control exactly what gets loaded via environment variables
- **ETag Support**: Automatic cache validation for optimal performance
- **Gzip Compression**: Optional compression for eligible assets
- **Smart Caching**: Production-ready cache headers

### ⚙️ Environment Variables

Configure the production server behavior:

```bash
# Server Configuration
PORT=3000

# Asset Preloading
ASSET_PRELOAD_MAX_SIZE=5242880                    # 5MB default
ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css,*.woff2"
ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map,*.txt"

# Features
ASSET_PRELOAD_VERBOSE_LOGGING=true                # Detailed logging
ASSET_PRELOAD_ENABLE_ETAG=true                    # ETag generation
ASSET_PRELOAD_ENABLE_GZIP=true                    # Gzip compression
ASSET_PRELOAD_GZIP_MIN_SIZE=1024                  # 1KB min for compression
ASSET_PRELOAD_GZIP_MIME_TYPES="text/,application/javascript,application/json"
```

### 📊 Server Output Example

```
📦 Loading static assets from .output/public...
   Max preload size: 5.00 MB
   Include patterns: *.js,*.css,*.woff2

📁 Preloaded into memory:
Path                                          │    Size │ Gzip Size
/assets/index-a1b2c3d4.js           45.23 kB │ gzip:  15.83 kB
/assets/index-e5f6g7h8.css           12.45 kB │ gzip:   4.36 kB

💾 Served on-demand:
/assets/vendor-i9j0k1l2.js          245.67 kB │ gzip:  86.98 kB

✅ Preloaded 2 files (57.68 KB) into memory
ℹ️  1 files will be served on-demand (1 too large, 0 filtered)

🚀 Server running at http://localhost:3000
```

## 🎛️ Usage Examples

### Maximum Performance
```bash
ASSET_PRELOAD_MAX_SIZE=10485760 ASSET_PRELOAD_ENABLE_GZIP=true bun run start
```

### Minimal Memory Footprint
```bash
ASSET_PRELOAD_MAX_SIZE=1048576 \
ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css" \
ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map,vendor-*" \
ASSET_PRELOAD_ENABLE_GZIP=false \
bun run start
```

### Debug Mode
```bash
ASSET_PRELOAD_VERBOSE_LOGGING=true bun run start
```

## 🛠️ Development

### Testing

This project uses [Vitest](https://vitest.dev/) for testing:

```bash
bun run test
```

### Styling

Built with [Tailwind CSS](https://tailwindcss.com/) for styling.

### Linting & Formatting

```bash
bun run lint      # ESLint
bun run format    # Prettier
bun run check     # Type checking
```

## 🧭 Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding Routes

Create new files in `./src/routes`:

```tsx
// src/routes/about.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return <div>About Page</div>
}
```

### Navigation

Use the `Link` component for SPA navigation:

```tsx
import { Link } from "@tanstack/react-router";

<Link to="/about">About</Link>
```

### Layouts

The root layout is in `src/routes/__root.tsx`. Use `<Outlet />` to render child routes:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
    </>
  ),
})
```

## 📡 Data Fetching

### Route Loaders

Load data before route rendering:

```tsx
const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/people",
  loader: async () => {
    const response = await fetch("https://swapi.dev/api/people");
    return response.json();
  },
  component: () => {
    const data = peopleRoute.useLoaderData();
    return (
      <ul>
        {data.results.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    );
  },
});
```

### React Query

For client-side data fetching:

```bash
bun install @tanstack/react-query @tanstack/react-query-devtools
```

```tsx
import { useQuery } from "@tanstack/react-query";

function Component() {
  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: () => fetch("https://swapi.dev/api/people").then(res => res.json()),
  });
  
  // ... render data
}
```

## 🏪 State Management

Using TanStack Store:

```bash
bun install @tanstack/store
```

```tsx
import { useStore } from "@tanstack/react-store";
import { Store, Derived } from "@tanstack/store";

const countStore = new Store(0);

const doubledStore = new Derived({
  fn: () => countStore.state * 2,
  deps: [countStore],
});

function Counter() {
  const count = useStore(countStore);
  const doubled = useStore(doubledStore);
  
  return (
    <div>
      <button onClick={() => countStore.setState(n => n + 1)}>
        Count: {count}
      </button>
      <div>Doubled: {doubled}</div>
    </div>
  );
}
```

## 📁 Project Structure

```
├── src/
│   ├── routes/          # File-based routing
│   │   ├── __root.tsx   # Root layout
│   │   └── index.tsx    # Home page
│   └── main.tsx         # App entry point
├── server.ts            # Custom production server
├── vite.config.ts       # Vite configuration
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🎯 Deployment

### Build Process

1. **Development**: `bun run dev` - Hot reload development server
2. **Build**: `bun run build` - Creates optimized production build
3. **Serve**: `bun run start` - Starts custom production server

### Production Server Features

- ✅ **Intelligent Asset Preloading** - Configurable memory management
- ✅ **ETag Support** - Automatic cache validation
- ✅ **Gzip Compression** - Optional compression for text assets
- ✅ **Detailed Logging** - Performance metrics and file tracking
- ✅ **Error Handling** - Robust error management
- ✅ **SPA Routing** - Fallback to client-side routing

## 📚 Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
- [Bun Documentation](https://bun.sh)
- [Vite Documentation](https://vite.dev)

## 🗑️ Demo Files

Files prefixed with `demo` can be safely deleted. They provide examples of features you can use in your application.

---

**Built with ❤️ using TanStack Start, Bun, and modern web technologies.**
