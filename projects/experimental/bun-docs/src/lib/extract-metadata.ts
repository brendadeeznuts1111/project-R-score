import type { SocialMetadata } from "../types/social";

/**
 * Fetches a URL and extracts rich metadata using Bun's HTMLRewriter.
 * Prioritizes Open Graph tags, falls back to Twitter Card, then regular meta tags.
 */
export async function fetchBunDocMetadata(url: string): Promise<SocialMetadata> {
  const metadata: SocialMetadata = { url };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "BunDocsBot/1.0 (+https://github.com/yourname/bun-docs)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const rewriter = new HTMLRewriter()
      // Open Graph tags (highest priority)
      .on('meta[property^="og:"]', {
        element(el) {
          const property = el.getAttribute("property");
          const content = el.getAttribute("content");

          if (property && content) {
            const key = property.replace("og:", "") as keyof SocialMetadata;
            if (!metadata[key]) {
              metadata[key] = content;
            }
          }
        },
      })

      // Twitter Card tags (fallback)
      .on('meta[name^="twitter:"]', {
        element(el) {
          const name = el.getAttribute("name");
          const content = el.getAttribute("content");

          if (name && content) {
            const key = name.replace("twitter:", "") as keyof SocialMetadata;
            // Only use Twitter data if we don't already have OG data
            if (!metadata[key]) {
              metadata[key] = content;
            }
          }
        },
      })

      // Regular meta description (last fallback)
      .on('meta[name="description"]', {
        element(el) {
          if (!metadata.description) {
            const content = el.getAttribute("content");
            if (content) metadata.description = content;
          }
        },
      })

      // <title> tag fallback
      .on("title", {
        text(text) {
          if (!metadata.title) {
            metadata.title = text.text.trim();
          }
        },
      });

    // Process the HTML
    await rewriter.transform(response).blob();

    // Convert relative image URL to absolute
    if (metadata.image && !metadata.image.startsWith("http")) {
      try {
        metadata.image = new URL(metadata.image, url).toString();
      } catch {
        // Keep original if resolution fails
      }
    }

    // Clean up title if it has " | Bun" suffix
    if (metadata.title) {
      metadata.title = metadata.title.replace(/\s*\|\s*Bun\s*$/, "").trim();
    }
  } catch (error) {
    console.warn(`Failed to extract metadata for ${url}:`, error);
  }

  return metadata;
}

/**
 * Batch version - useful during generation
 */
export async function fetchMultipleMetadata(urls: string[]): Promise<Map<string, SocialMetadata>> {
  const results = new Map<string, SocialMetadata>();

  // Process in small batches to be respectful
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const promises = batch.map(async (url) => {
      const meta = await fetchBunDocMetadata(url);
      results.set(url, meta);
    });

    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}
