#!/usr/bin/env bun
/**
 * React Integration Example
 * 
 * Shows how to use @bun-tools/markdown-constants with React
 * 
 * Note: This example requires React to be installed:
 *   bun add react react-dom
 *   bun add -d @types/react @types/react-dom
 */

import React from 'react';
import { MarkdownPresets, REACT_COMPONENTS } from '../src/index';

// Create a React component using MarkdownPresets
const MarkdownComponent = ({ content }: { content: string }) => {
  // Create the renderer once (can be memoized)
  const renderMarkdown = MarkdownPresets.react('TAILWIND_TYPOGRAPHY');
  
  // Render markdown to React elements
  return renderMarkdown(content);
};

// Example usage component
const App = () => {
  const markdownContent = `# Welcome to React + Bun

This is a **React component** rendering Markdown using Bun's built-in parser.

## Features

- ⚡ Fast rendering with SIMD acceleration
- 🎨 Styled with Tailwind Typography
- 🔒 Security presets built-in

\`\`\`tsx
const Component = () => {
  const render = MarkdownPresets.react('TAILWIND_TYPOGRAPHY');
  return render('# Hello');
};
\`\`\`

| Library | Speed | Bundle Size |
|---------|-------|-------------|
| Bun.markdown | Fastest | 0KB (built-in) |
| marked | Fast | 50KB |
| remark | Medium | 200KB+ |
`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">React Integration Demo</h1>
        <div className="prose prose-lg">
          <MarkdownComponent content={markdownContent} />
        </div>
      </div>
    </div>
  );
};

// Custom components example
const CustomComponents = {
  h1: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h1 id={id} className="text-4xl font-extrabold text-indigo-600 mb-6">
      {children}
    </h1>
  ),
  h2: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id} className="text-2xl font-bold text-gray-800 mt-8 mb-4 border-b pb-2">
      {children}
    </h2>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-gray-600 leading-relaxed mb-4">
      {children}
    </p>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono text-sm">
      {children}
    </code>
  ),
  pre: ({ language, children }: { language?: string; children: React.ReactNode }) => (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-6">
      <code className={`language-${language}`}>{children}</code>
    </pre>
  ),
};

// Using custom components
const CustomStyledApp = () => {
  const renderCustom = MarkdownPresets.react('TAILWIND_TYPOGRAPHY', {
    components: CustomComponents
  });

  return (
    <div className="p-8">
      {renderCustom('# Custom Styled\n\nThis uses **custom React components**.')}
    </div>
  );
};

console.log('React Integration Example loaded.');
console.log('Components available: MarkdownComponent, App, CustomStyledApp');

export { MarkdownComponent, App, CustomStyledApp, CustomComponents };
