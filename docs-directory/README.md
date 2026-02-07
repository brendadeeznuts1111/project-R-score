# Docs Directory

A Cloudflare-inspired documentation directory with cards, grouped topics, and Cmd+K search functionality.

## Features

- **Card-based Layout**: Beautiful, responsive cards for each documentation item
- **Grouped Topics**: Documentation organized by categories (Fundamentals, Security, Performance, etc.)
- **Cmd+K Search**: Fast, keyboard-driven search with highlighting
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Micro-interactions**: Smooth animations and hover effects
- **Accessibility**: Full keyboard navigation support

## Quick Start

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run dev
```

3. Open your browser to `http://localhost:3000`

## Usage

### Navigation
- Use the quick navigation bar to jump to specific categories
- Click on any card to open the documentation in a new tab
- Use `Cmd+K` (or `Ctrl+K` on Windows) to open the search modal

### Search
- Press `Cmd+K` to open the search modal
- Type to search through titles, descriptions, and categories
- Use arrow keys to navigate results
- Press `Enter` to open a result, `Escape` to close

### Categories
The documentation is organized into the following categories:
- **Fundamentals**: Core concepts and account management
- **Security**: DDoS protection, WAF, SSL/TLS, and more
- **Performance**: Caching, CDN, load balancing, and optimization
- **Serverless & Edge**: Workers, Pages, D1, R2, and other edge products
- **Network**: DNS, Spectrum, Magic Transit, and networking
- **Zero Trust**: Access, Gateway, Browser Isolation, and Tunnel
- **Developer Tools**: SDKs, Terraform, AI Gateway, and developer utilities

## Customization

### Adding New Documentation
To add new documentation items, edit `src/data/docsData.ts`:

```typescript
{
  id: 'unique-id',
  title: 'Documentation Title',
  description: 'Brief description of what this covers',
  url: '/path/to/documentation',
  category: 'category-name',
  tags: ['optional', 'tags']
}
```

### Styling
The project uses Tailwind CSS with custom Cloudflare-inspired colors. Modify `tailwind.config.js` to adjust the theme.

### Components
- `SearchModal`: Handles the Cmd+K search functionality
- `DocCard`: Individual documentation cards
- `DocCategorySection`: Category sections with grids of cards
- `App`: Main application component

## Technologies Used

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Bun.serve**: Fast development server with HMR and HTML imports

## Build and Deploy

Build for production:
```bash
bun run build
```

Start the server:
```bash
bun run start
```

## License

MIT License - feel free to use this as inspiration for your own documentation directory.
