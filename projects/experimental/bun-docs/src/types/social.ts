export interface SocialMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
  // You can extend this later with more fields if needed
  [key: string]: string | undefined;
}
