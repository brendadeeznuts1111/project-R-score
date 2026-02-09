# Next.js Integration Guide

This guide shows how to integrate `@bun-tools/markdown-constants` with Next.js applications.

## Installation

```bash
bun add @bun-tools/markdown-constants
```

## Server-Side Rendering (App Router)

### Basic Page Component

```tsx
// app/blog/[slug]/page.tsx
import { MarkdownPresets } from '@bun-tools/markdown-constants';

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // Fetch markdown content (from CMS, file system, etc.)
  const markdown = await fetchPost(params.slug);
  
  // Render on the server using Bun.markdown
  const html = MarkdownPresets.html('BLOG', 'MODERATE')(markdown);
  
  return (
    <article 
      className="prose prose-lg max-w-3xl mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### With Caching

```tsx
// app/blog/[slug]/page.tsx
import { MarkdownPresets, MarkdownCache } from '@bun-tools/markdown-constants';

// Create cache (persists across requests in production)
const cache = MarkdownCache.createLRUCache(1000, 3600000); // 1 hour TTL

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const cacheKey = `blog:${params.slug}`;
  
  // Check cache first
  let html = cache.get(cacheKey);
  
  if (!html) {
    const markdown = await fetchPost(params.slug);
    html = MarkdownPresets.html('BLOG', 'MODERATE')(markdown);
    cache.set(cacheKey, html);
  }
  
  return (
    <article 
      className="prose prose-lg max-w-3xl mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

## React Components (Client-Side)

### Dynamic Import

```tsx
// components/MarkdownContent.tsx
'use client';

import { useMemo } from 'react';
import { MarkdownPresets } from '@bun-tools/markdown-constants';

export function MarkdownContent({ content }: { content: string }) {
  // Create renderer once
  const renderMarkdown = useMemo(
    () => MarkdownPresets.react('TAILWIND_TYPOGRAPHY'),
    []
  );
  
  // Render to React elements
  return renderMarkdown(content);
}
```

### With Syntax Highlighting

```tsx
// components/MarkdownWithCode.tsx
'use client';

import { useEffect, useRef } from 'react';
import { highlightAll } from 'prismjs';
import { MarkdownContent } from './MarkdownContent';

export function MarkdownWithCode({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      highlightAll();
    }
  }, [content]);
  
  return (
    <div ref={ref} className="prose">
      <MarkdownContent content={content} />
    </div>
  );
}
```

## API Routes

### Markdown Processing API

```tsx
// app/api/render-markdown/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MarkdownPresets, validateMarkdown } from '@bun-tools/markdown-constants';

export async function POST(request: NextRequest) {
  try {
    const { markdown, options = {} } = await request.json();
    
    // Validate input
    const validation = validateMarkdown(markdown, { maxSize: 50000 });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid markdown', issues: validation.errors },
        { status: 400 }
      );
    }
    
    // Render based on options
    const render = MarkdownPresets.html(
      options.preset || 'GFM',
      options.security || 'MODERATE'
    );
    
    const html = render(markdown);
    
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to render markdown' },
      { status: 500 }
    );
  }
}
```

## Static Site Generation (SSG)

### With generateStaticParams

```tsx
// app/blog/[slug]/page.tsx
import { MarkdownPresets } from '@bun-tools/markdown-constants';
import { getAllPosts, getPostBySlug } from '@/lib/posts';

// Generate static pages at build time
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  const html = MarkdownPresets.html('BLOG', 'MODERATE')(post.content);
  
  return (
    <article 
      className="prose prose-lg max-w-3xl mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

## Edge Runtime

### Edge API Route

```tsx
// app/api/markdown-edge/route.ts
export const runtime = 'edge';

import { MarkdownPresets } from '@bun-tools/markdown-constants';

export async function POST(request: Request) {
  const { markdown } = await request.json();
  
  const html = MarkdownPresets.html('GFM', 'STRICT')(markdown);
  
  return new Response(JSON.stringify({ html }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## Security Best Practices

### Content Security Policy

```tsx
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/blog/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'",
          },
        ],
      },
    ];
  },
};
```

### Using STRICT Security

```tsx
// For user-generated content
const renderUserContent = MarkdownPresets.html('BLOG', 'STRICT');

// For trusted admin content
const renderAdminContent = MarkdownPresets.html('DOCS', 'DEVELOPER');
```

## Performance Optimization

### React Server Components

```tsx
// components/MarkdownServer.tsx
// This is a Server Component by default in App Router
import { MarkdownPresets } from '@bun-tools/markdown-constants';

export async function MarkdownServer({ content }: { content: string }) {
  // Runs on server with Bun's SIMD-accelerated rendering
  const html = MarkdownPresets.html('GFM', 'MODERATE')(content);
  
  return (
    <div 
      className="prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Streaming

```tsx
// app/blog/[slug]/page.tsx
import { Suspense } from 'react';
import { MarkdownServer } from '@/components/MarkdownServer';

export default function BlogPost({ params }: { params: { slug: string } }) {
  return (
    <div>
      <h1>My Blog Post</h1>
      <Suspense fallback={<div>Loading content...</div>}>
        <Content slug={params.slug} />
      </Suspense>
    </div>
  );
}

async function Content({ slug }: { slug: string }) {
  const content = await fetchContent(slug);
  return <MarkdownServer content={content} />;
}
```

## Troubleshooting

### "React is not defined" Error

Make sure to install React as a dependency:

```bash
bun add react react-dom
bun add -d @types/react @types/react-dom
```

### TypeScript Errors

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

### Build Errors

Ensure you're using Bun to run Next.js:

```bash
bunx next build
bunx next dev
```
