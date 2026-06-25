/**
 * Shared types for the Bun documentation index.
 */

export interface DocPage {
  title: string;
  url: string;
  category: string;
  subcategory?: string;
  description?: string;
  isBundlerRelated: boolean;

  // Future enrichment via HTMLRewriter / OpenGraph
  image?: string;
  siteName?: string;
  type?: string;
}
