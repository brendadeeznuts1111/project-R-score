#!/usr/bin/env bun
/**
 * Bun News & Updates Reader
 * Fetches and displays latest news from Bun RSS feed
 *
 * Usage:
 *   bun run cli/bun-news.ts
 *   bun run cli/bun-news.ts --latest=5
 *   bun run cli/bun-news.ts --format=json
 */

import { parseArgs } from "util";

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
}

interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
}

// =============================================================================
// RSS Parsing
// =============================================================================

function parseRSS(xml: string): RSSFeed {
  const items: RSSItem[] = [];
  
  // Extract channel info
  const channelMatch = xml.match(/<channel>(.*?)<\/channel>/s);
  if (!channelMatch) {
    throw new Error("Invalid RSS feed format");
  }
  
  const channel = channelMatch[1];
  const title = channel.match(/<title>(.*?)<\/title>/)?.[1] || "Bun RSS Feed";
  const link = channel.match(/<link>(.*?)<\/link>/)?.[1] || "";
  const description = channel.match(/<description>(.*?)<\/description>/)?.[1] || "";
  
  // Extract items
  const itemMatches = channel.matchAll(/<item>(.*?)<\/item>/gs);
  
  for (const itemMatch of itemMatches) {
    const itemXml = itemMatch[1];
    const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const description = itemXml.match(/<description>(.*?)<\/description>/)?.[1] || "";
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const guid = itemXml.match(/<guid>(.*?)<\/guid>/)?.[1];
    
    if (title && link) {
      items.push({
        title: decodeEntities(title),
        link: decodeEntities(link),
        description: decodeEntities(description),
        pubDate,
        guid,
      });
    }
  }
  
  return {
    title: decodeEntities(title),
    link: decodeEntities(link),
    description: decodeEntities(description),
    items,
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Output Formatters
// =============================================================================

function formatBox(feed: RSSFeed, limit: number = 10): string {
  const items = feed.items.slice(0, limit);
  
  let output = `
╔══════════════════════════════════════════════════════╗
║           ${c.bold}${feed.title}${c.reset}                    ║
╠══════════════════════════════════════════════════════╣
`;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const date = formatDate(item.pubDate);
    const title = item.title.length > 45 ? item.title.substring(0, 42) + "..." : item.title;
    
    output += `│ ${c.bold}${i + 1}. ${title.padEnd(45)}${c.reset} │\n`;
    output += `│    ${c.dim}${date.padEnd(20)} ${c.cyan}${item.link.substring(0, 25)}...${c.reset} │\n`;
    
    if (item.description) {
      const desc = item.description.replace(/<[^>]*>/g, "").substring(0, 50);
      if (desc) {
        output += `│    ${c.dim}${desc}...${c.reset} │\n`;
      }
    }
    
    if (i < items.length - 1) {
      output += `│${" ".repeat(52)}│\n`;
    }
  }
  
  output += `╚══════════════════════════════════════════════════════╝\n`;
  output += `\n${c.dim}Total items: ${feed.items.length} | Showing: ${items.length}${c.reset}\n`;
  
  return output;
}

function formatJSON(feed: RSSFeed, limit: number = 10): string {
  return JSON.stringify({
    feed: {
      title: feed.title,
      link: feed.link,
      description: feed.description,
    },
    items: feed.items.slice(0, limit).map((item) => ({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
      guid: item.guid,
    })),
    total: feed.items.length,
  }, null, 2);
}

function formatMarkdown(feed: RSSFeed, limit: number = 10): string {
  const items = feed.items.slice(0, limit);
  
  let output = `# ${feed.title}\n\n`;
  output += `${feed.description}\n\n`;
  output += `**Feed:** ${feed.link}\n\n`;
  output += `## Latest Updates (${items.length}/${feed.items.length})\n\n`;
  
  for (const item of items) {
    const date = formatDate(item.pubDate);
    output += `### ${item.title}\n\n`;
    output += `- **Date:** ${date}\n`;
    output += `- **Link:** ${item.link}\n`;
    if (item.description) {
      const desc = item.description.replace(/<[^>]*>/g, "").trim();
      if (desc) {
        output += `- **Description:** ${desc.substring(0, 200)}${desc.length > 200 ? "..." : ""}\n`;
      }
    }
    output += `\n`;
  }
  
  return output;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      latest: { type: "string" },
      format: { type: "string" },
      help: { type: "boolean" },
    },
  });

  if (values.help) {
    console.log(`
${c.bold}Bun News & Updates Reader${c.reset}

${c.bold}Usage:${c.reset}
  bun run cli/bun-news.ts [options]

${c.bold}Options:${c.reset}
  --latest=<n>     Show latest N items (default: 10)
  --format=<fmt>   Output format (box|json|markdown)
  --help           Show this help

${c.bold}Examples:${c.reset}
  bun run cli/bun-news.ts
  bun run cli/bun-news.ts --latest=5
  bun run cli/bun-news.ts --format=json
  bun run cli/bun-news.ts --format=markdown > bun-news.md
`);
    process.exit(0);
  }

  const limit = values.latest ? parseInt(values.latest as string) : 10;
  const format = (values.format as string) || "box";

  console.log(`${c.cyan}Fetching Bun RSS feed...${c.reset}\n`);

  try {
    const response = await fetch("https://bun.com/rss.xml");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const feed = parseRSS(xml);

    switch (format) {
      case "json":
        console.log(formatJSON(feed, limit));
        break;
      case "markdown":
        console.log(formatMarkdown(feed, limit));
        break;
      default:
        console.log(formatBox(feed, limit));
    }
  } catch (error) {
    console.error(`${c.red}Error fetching RSS feed:${c.reset} ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}