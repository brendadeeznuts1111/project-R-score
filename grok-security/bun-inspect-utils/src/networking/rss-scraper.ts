/**
 * [NETWORKING][RSS][SCRAPER]{BUN-NATIVE}
 * Bun-native RSS 2.0 feed scraper with XML parsing
 * Zero-npm, enterprise-grade RSS content extraction
 */

/**
 * [1.0.0.0] RSS Item Structure
 * Represents a single RSS feed item
 *
 * @tags rss,feed,item,content
 */
export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author?: string;
  category?: string[];
  guid?: string;
  content?: string;
  enclosure?: {
    url: string;
    type: string;
    length: string;
  };
}

/**
 * [1.1.0.0] RSS Feed Structure
 * Represents complete RSS feed metadata
 *
 * @tags rss,feed,metadata
 */
export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  language?: string;
  lastBuildDate?: string;
  items: RSSItem[];
  fetchedAt: string;
  sourceUrl: string;
}

/**
 * [1.2.0.0] RSS Scraper Configuration
 * Options for RSS feed fetching and parsing
 *
 * @tags rss,config,options
 */
export interface RSSScraperConfig {
  timeout?: number;
  userAgent?: string;
  followRedirects?: boolean;
  maxItems?: number;
}

/**
 * [1.3.0.0] RSS Scraper Class
 * Fetches and parses RSS 2.0 feeds using Bun's native APIs
 *
 * @tags rss,scraper,parser,enterprise
 */
export class RSSScraper {
  private config: Required<RSSScraperConfig>;

  /**
   * [1.3.1.0] Constructor
   * Initialize RSS scraper with configuration
   */
  constructor(config: RSSScraperConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 10000,
      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Bun) AppleWebKit/537.36 (KHTML, like Gecko)",
      followRedirects: config.followRedirects ?? true,
      maxItems: config.maxItems ?? 100,
    };
  }

  /**
   * [1.3.2.0] Fetch RSS feed from URL
   * @param url - RSS feed URL
   * @returns Parsed RSS feed
   * @throws Error on network or parse failure
   */
  async fetch(url: string): Promise<RSSFeed> {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.config.userAgent },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`[RSS] HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      return this.parse(xml, url);
    } catch (error) {
      throw new Error(
        `[RSS] Fetch failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * [1.3.3.0] Parse RSS XML content
   * @param xml - Raw XML string
   * @param sourceUrl - Original feed URL
   * @returns Parsed RSS feed
   */
  parse(xml: string, sourceUrl: string): RSSFeed {
    try {
      // Extract channel element
      const channelMatch = xml.match(/<channel>([\s\S]*?)<\/channel>/);
      if (!channelMatch) {
        throw new Error("No <channel> element found");
      }

      const channelXml = channelMatch[1];

      // Extract channel metadata
      const title = this.extractText(channelXml, "title");
      const description = this.extractText(channelXml, "description");
      const link = this.extractText(channelXml, "link");
      const language = this.extractText(channelXml, "language");
      const lastBuildDate = this.extractText(channelXml, "lastBuildDate");

      // Extract items
      const itemMatches = channelXml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const items = itemMatches
        .slice(0, this.config.maxItems)
        .map((itemXml) => this.parseItem(itemXml));

      return {
        title,
        description,
        link,
        language,
        lastBuildDate,
        items,
        fetchedAt: new Date().toISOString(),
        sourceUrl,
      };
    } catch (error) {
      throw new Error(
        `[RSS] Parse failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * [1.3.4.0] Parse individual RSS item
   * @private
   */
  private parseItem(itemXml: string): RSSItem {
    const title = this.extractText(itemXml, "title");
    const description = this.extractText(itemXml, "description");
    const link = this.extractText(itemXml, "link");
    const pubDate = this.extractText(itemXml, "pubDate");
    const author = this.extractText(itemXml, "author");
    const guid = this.extractText(itemXml, "guid");
    const content = this.extractText(itemXml, "content:encoded");

    // Extract categories
    const categoryMatches = itemXml.match(/<category[^>]*>([^<]*)<\/category>/g) || [];
    const category = categoryMatches.map((c) =>
      c.replace(/<[^>]*>/g, "").trim(),
    );

    // Extract enclosure
    const enclosureMatch = itemXml.match(
      /<enclosure\s+url="([^"]*)"[^>]*type="([^"]*)"[^>]*length="([^"]*)"/,
    );
    const enclosure = enclosureMatch
      ? { url: enclosureMatch[1], type: enclosureMatch[2], length: enclosureMatch[3] }
      : undefined;

    return {
      title,
      description,
      link,
      pubDate,
      author,
      category: category.length > 0 ? category : undefined,
      guid,
      content,
      enclosure,
    };
  }

  /**
   * [1.3.5.0] Extract text from XML element
   * @private
   */
  private extractText(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i");
    const match = xml.match(regex);
    return match ? this.decodeHtml(match[1].trim()) : "";
  }

  /**
   * [1.3.6.0] Decode HTML entities
   * @private
   */
  private decodeHtml(html: string): string {
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&#39;": "'",
    };
    return html.replace(/&[a-z]+;/gi, (match) => entities[match] || match);
  }
}

