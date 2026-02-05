import config from '../src/config/config-loader';
// utils/puppeteer-readable.ts
import puppeteer from 'puppeteer';
import { Readable } from 'stream';
import { readableToInlineBlob } from './readable-blob-farm';

/**
 * Capture a Puppeteer screenshot as a Readable stream 
 * and upload to R2 with inline disposition.
 */
export async function puppeteerInlineScreenshot(url: string, key: string) {
  console.log(`🚀 Launching Puppeteer for: ${url}`);
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log(`🌐 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: config.getTimeout('storage') });
    
    // Puppeteer manual stream capture using screenshot() 
    // and converting the Buffer to a Node Readable.
    // page.screenshotStream is not in the standard types for all puppeteer versions,
    // so we use screenshot() which returns a Buffer and convert it to a Stream.
    console.log(`📸 Taking screenshot...`);
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    
    if (!(screenshotBuffer instanceof Buffer)) {
        throw new Error('Screenshot did not return a Buffer');
    }

    const screenshotStream = Readable.from(screenshotBuffer);
    
    // Readable → Blob → Inline R2
    console.log(`☁️ Uploading stream to R2: ${key}`);
    const embedUrl = await readableToInlineBlob(key, screenshotStream);
    
    return embedUrl;
  } finally {
    await browser.close();
  }
}

// CLI runner for E2E check
if (import.meta.main) {
  const target = process.argv[2] || 'https://example.com';
  const key = `screenshots/test-${Date.now()}.png`;
  const url = await puppeteerInlineScreenshot(target, key);
  console.log(`🖥️ Puppeteer Inline Screenshot: ${url}`);
}
