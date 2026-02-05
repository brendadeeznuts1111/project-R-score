import { EnhancedDocsFetcher } from './lib/docs/index-fetcher-enhanced'

export class ScannerWithDocs {
  private docsFetcher: EnhancedDocsFetcher
  private cookies: Map<string, string>

  constructor() {
    this.docsFetcher = new EnhancedDocsFetcher()
    this.cookies = new Map()
  }

  async scanWithDocumentation(projectId: string, r2Bucket?: string) {
    console.log('🚀 Tier-1380 Scanner with Documentation Integration')

    // Get version info
    const version = Bun.version
    const semverDoc = await this.docsFetcher.getApiDoc('Bun.semver.satisfies')

    console.log(`📦 Bun ${version}`)
    console.log(`📚 SemVer Docs: ${semverDoc}`)

    // Check version compatibility
    const compatible = Bun.semver.satisfies(version, '>=1.3.6')
    if (!compatible) {
      console.warn(`⚠️  Version ${version} may not support all features`)
      console.log(`   See: ${semverDoc}`)
    }

    // Create scanner cookies
    this.cookies.set('projectId', projectId)
    this.cookies.set('sessionId', crypto.randomUUID())
    this.cookies.set('bunVersion', version)
    this.cookies.set('timestamp', Date.now().toString())

    // Get Buffer docs (50% faster in v1.3.6+)
    const bufferDoc = await this.docsFetcher.getApiDoc('Buffer.from')
    console.log(`⚡ Buffer Performance: 50% faster Buffer.from()`)
    console.log(`   Docs: ${bufferDoc}`)

    // Serialize with faster Buffer.from
    const data = Array.from(this.cookies.entries())
    const buffer = Buffer.from(data.flatMap(([k, v]) =>
      [k.length, ...Buffer.from(k), v.length, ...Buffer.from(v)]
    ))

    // Get compression docs
    const compressionDoc = await this.docsFetcher.getApiDoc('Bun.zstdCompressSync')
    const compressed = Bun.zstdCompressSync(buffer)
    const prefixed = Buffer.concat([Buffer.from([0x01]), compressed])

    console.log(`🗜️  Compression: ${buffer.length}B → ${prefixed.length}B`)
    console.log(`   Docs: ${compressionDoc}`)

    // Save to R2 if bucket provided
    if (r2Bucket) {
      const key = `${projectId}/${Date.now()}.bin`
      const r2Path = `s3://${r2Bucket}/${key}`
      await Bun.write(r2Path, prefixed)

      console.log(`💾 Saved to R2: ${r2Path}`)

      // Get R2/S3 documentation
      const fileIODoc = await this.docsFetcher.search('file i/o')
      if (fileIODoc.length > 0) {
        console.log(`📖 File I/O Docs: ${fileIODoc[0].domains.com}`)
      }
    }

    // Display summary
    const checksum = Bun.hash.crc32(buffer).toString(16)

    const summary = {
      projectId,
      sessionId: this.cookies.get('sessionId'),
      bufferSize: buffer.length,
      compressedSize: prefixed.length,
      ratio: (buffer.length / prefixed.length).toFixed(1) + 'x',
      checksum,
      bunVersion: version,
      documentation: {
        semver: semverDoc,
        buffer: bufferDoc,
        compression: compressionDoc
      }
    }

    console.log('\n📊 Summary:')
    console.log(JSON.stringify(summary, null, 2))

    return summary
  }
}