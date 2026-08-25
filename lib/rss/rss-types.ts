import type { FeedImageMetadata, FeedImageSource } from './feed-image.ts';

export interface RSSChannelImage {
  url: string;
  title: string;
  link: string;
  width?: number;
  height?: number;
  description?: string;
}

export interface RSSEnclosure {
  url: string;
  length: number;
  type: string;
}

export interface RSSMediaThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface RSSMediaCredit {
  value: string;
  role?: string;
}

export interface RSSMediaContent {
  url?: string;
  playerUrl?: string;
  fileSize?: number;
  type?: string;
  medium?: 'image' | 'audio' | 'video' | 'document' | 'executable';
  expression?: 'sample' | 'full' | 'nonstop';
  width?: number;
  height?: number;
  thumbnail?: RSSMediaThumbnail;
  credits?: RSSMediaCredit[];
}

export interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  category?: string[];
  guid: string;
  enclosure?: RSSEnclosure;
  media?: RSSMediaContent;
  imageUrl?: string;
  imageSource?: FeedImageSource;
  image?: FeedImageMetadata;
}

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSFeedItem[];
  lastBuildDate: string;
  ttl: number;
  selfUrl?: string;
  image?: RSSChannelImage;
}
