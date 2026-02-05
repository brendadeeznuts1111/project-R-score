import { s3 } from 'bun';

export async function verifyInlinePreview(embedUrl: string) {
  try {
    const resp = await fetch(embedUrl);
    
    if (!resp.ok) {
       console.log(`❌ Fetch failed: ${resp.status} ${resp.statusText}`);
       return { success: false, error: resp.statusText };
    }

    const disposition = resp.headers.get('content-disposition');
    const contentType = resp.headers.get('content-type');
    
    console.log('✅ Inline Preview Headers:');
    console.log(`  Disposition: ${disposition || 'inline (default)'}`);
    console.log(`  Content-Type: ${contentType}`);
    
    // Metadata JSON (your demo)
    const metaText = await resp.text();
    try {
      const metadata = JSON.parse(metaText);
      console.log('📋 Parsed Metadata:', Bun.inspect.table(Object.entries(metadata).map(([k,v]) => ({ Key: k, Value: v })), { colors: true }));
      return { disposition, metadata, success: !disposition || disposition.includes('inline') };
    } catch (e) {
      console.log('📄 Content is not valid JSON, raw text excerpt:', metaText.slice(0, 100).replace(/\n/g, ' '));
      return { disposition, metadata: null, success: !disposition || disposition.includes('inline') };
    }
  } catch (error: any) {
    console.error('❌ Error during verification:', error.message);
    return { success: false, error: error.message };
  }
}

// If run directly
if (import.meta.main) {
  let demoUrl = process.argv[2];
  
  if (!demoUrl) {
    // Attempt to find a real URL from environment or fallback
    const bucketUrl = Bun.env.S3_ENDPOINT ? Bun.env.S3_ENDPOINT.replace('https://', `https://${Bun.env.S3_BUCKET}.`) : null;
    demoUrl = bucketUrl ? `${bucketUrl}/test-verify.json` : 'https://pub-295f9061822d480cbe2b81318d88d774.r2.dev/test.json';
    console.log(`⚠️ No URL provided, using fallback: ${demoUrl}`);
  }
  
  await verifyInlinePreview(demoUrl);
}
