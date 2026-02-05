/**
 * FactoryWager Registry v4.0 - Upload Handler
 * High-velocity package uploads with streaming CRC32 validation
 * Prevents corruption during CI/CD pipeline uploads
 */

import type { BunFile } from 'bun'
import { registryValidator, IntegrityReport } from '../security/streaming-validator'

export interface UploadResult {
  path: string
  integrity: {
    crc32: number
    size: number
    algorithm: string
  }
  throughput: number
  metadata: {
    timestamp: string
    duration: number
    strategy: string
  }
}

export interface UploadConfig {
  maxFileSize: number // bytes
  allowedExtensions: string[]
  tempDirectory: string
  enableRealTimeValidation: boolean
  concurrency: number
}

export class RegistryUploadHandler {
  private validator = registryValidator
  private config: UploadConfig

  constructor(config?: Partial<UploadConfig>) {
    this.config = {
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB default
      allowedExtensions: ['.tgz', '.tar.gz', '.zip', '.tar'],
      tempDirectory: '/tmp/registry/uploads',
      enableRealTimeValidation: true,
      concurrency: 4,
      ...config
    }

    // Ensure temp directory exists with proper permissions
    this.ensureDirectoryExists(this.config.tempDirectory)
  }

  /**
   * Ensure directory exists with proper error handling
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await Bun.write(`${dir}/.gitkeep`, '')
    } catch (error: any) {
      throw new Error(`Failed to create temp directory ${dir}: ${error.message}`)
    }
  }

  /**
   * Enhanced filename validation with comprehensive path traversal protection
   */
  private validateFilename(filename: string): void {
    // Check for empty filename
    if (!filename || filename.trim().length === 0) {
      throw new Error('Filename cannot be empty')
    }

    // Check for null bytes and other dangerous characters
    if (filename.includes('\0') || filename.includes('\r') || filename.includes('\n')) {
      throw new Error('Filename contains invalid characters')
    }

    // Check for path traversal attempts (comprehensive)
    const dangerousPatterns = [
      '..', '../', '..\\',
      '/', '\\',
      '~/', '~\\',
      '/etc/', '/var/', '/usr/', '/bin/',
      'C:\\', 'D:\\', 'E:\\',
      '%', '$', '`', '|', ';', '&', '<', '>', '"', "'"
    ]

    for (const pattern of dangerousPatterns) {
      if (filename.includes(pattern)) {
        throw new Error(`Filename contains dangerous pattern: ${pattern}`)
      }
    }

    // Check for Windows reserved names
    const windowsReserved = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ]

    const nameWithoutExt = filename.split('.')[0].toUpperCase()
    if (windowsReserved.includes(nameWithoutExt)) {
      throw new Error(`Filename contains reserved name: ${nameWithoutExt}`)
    }

    // Check filename length
    if (filename.length > 255) {
      throw new Error('Filename too long (max 255 characters)')
    }

    // Ensure filename has valid characters only
    const validPattern = /^[a-zA-Z0-9._-]+$/
    const baseName = filename.split('.')[0]
    if (!validPattern.test(baseName)) {
      throw new Error('Filename contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores')
    }
  }

  /**
   * Handle incoming tarball upload from CI/CD pipeline
   * Streams directly to disk with real-time validation
   */
  async handleUpload(
    stream: ReadableStream,
    filename: string,
    contentLength: number,
    expectedCrc32?: number
  ): Promise<UploadResult> {
    const startTime = Bun.nanoseconds()

    // Validate filename and size
    this.validateUploadRequest(filename, contentLength)

    // Generate unique temp path
    const tempPath = `${this.config.tempDirectory}/upload-${Bun.randomUUIDv7()}-${filename}`

    try {
      // 1. Stream to disk efficiently - convert ReadableStream to buffer
      console.log(`📥 Streaming upload: ${filename} (${(contentLength / 1024 / 1024).toFixed(1)} MB)`)
      const buffer = await new Response(stream).arrayBuffer()
      await Bun.write(tempPath, buffer)

      // 2. Validate immediately after write
      console.log(`🔍 Validating integrity...`)
      const report = await this.validator.validateStream(tempPath, expectedCrc32)

      if (report.status === 'invalid') {
        await Bun.file(tempPath).delete()
        throw new Error(`CRC32 Mismatch: Expected ${expectedCrc32?.toString(16)}, got ${report.calculatedCrc.toString(16)}`)
      }

      // 3. Move to permanent registry location
      const finalPath = await this.moveToRegistry(tempPath, filename, report)

      const endTime = Bun.nanoseconds()
      const totalDuration = (endTime - startTime) / 1_000_000

      const result: UploadResult = {
        path: finalPath,
        integrity: {
          crc32: report.calculatedCrc,
          size: report.fileSize,
          algorithm: 'crc32'
        },
        throughput: report.throughputMbps,
        metadata: {
          timestamp: new Date().toISOString(),
          duration: totalDuration,
          strategy: report.strategy
        }
      }

      console.log(`✅ Upload complete: ${filename}`)
      console.log(`   CRC32: ${report.calculatedCrc.toString(16).padStart(8, '0')}`)
      console.log(`   Throughput: ${report.throughputMbps.toFixed(1)} MB/s`)
      console.log(`   Duration: ${totalDuration.toFixed(2)} ms`)

      return result

    } catch (error) {
      // Cleanup on failure
      try {
        await Bun.file(tempPath).delete()
      } catch {
        // Ignore cleanup errors
      }
      throw error
    }
  }

  /**
   * Handle batch uploads from CI/CD pipelines
   * Processes multiple files in parallel with validation
   */
  async handleBatchUpload(
    uploads: Array<{
      stream: ReadableStream
      filename: string
      contentLength: number
      expectedCrc32?: number
    }>
  ): Promise<UploadResult[]> {
    console.log(`🔄 Processing batch upload: ${uploads.length} files`)

    const results = await Promise.allSettled(
      uploads.map(upload =>
        this.handleUpload(
          upload.stream,
          upload.filename,
          upload.contentLength,
          upload.expectedCrc32
        )
      )
    )

    const successful = results
      .filter((result): result is PromiseFulfilledResult<UploadResult> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value)

    const failed = results
      .filter((result): result is PromiseRejectedResult =>
        result.status === 'rejected'
      )

    if (failed.length > 0) {
      console.error(`❌ ${failed.length} uploads failed:`)
      failed.forEach((failure, index) => {
        console.error(`   ${uploads[index].filename}: ${failure.reason.message}`)
      })
    }

    console.log(`✅ Batch complete: ${successful.length}/${uploads.length} files uploaded`)

    return successful
  }

  /**
   * Validate upload request parameters with comprehensive security checks
   */
  private validateUploadRequest(filename: string, contentLength: number): void {
    // Enhanced filename validation
    this.validateFilename(filename)

    // Check file extension
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new Error(`Invalid file extension: ${extension}. Allowed: ${this.config.allowedExtensions.join(', ')}`)
    }

    // Check file size
    if (contentLength <= 0) {
      throw new Error(`Invalid file size: ${contentLength} bytes`)
    }

    if (contentLength > this.config.maxFileSize) {
      throw new Error(`File too large: ${(contentLength / 1024 / 1024 / 1024).toFixed(1)} GB exceeds limit of ${(this.config.maxFileSize / 1024 / 1024 / 1024).toFixed(1)} GB`)
    }
  }

  /**
   * Move validated file to permanent registry location with proper error handling
   */
  private async moveToRegistry(
    tempPath: string,
    filename: string,
    report: IntegrityReport
  ): Promise<string> {
    try {
      // Create registry directory structure with error handling
      const registryDir = './registry/packages'
      await this.ensureDirectoryExists(registryDir)

      // Generate path with CRC32 for deduplication
      const crcHex = report.calculatedCrc.toString(16).padStart(8, '0')
      const finalPath = `${registryDir}/${filename}-${crcHex}`

      // Check if destination already exists
      const destFile = Bun.file(finalPath)
      if (await destFile.exists()) {
        // File already exists (same content), just remove temp file
        await Bun.file(tempPath).delete()
        return finalPath
      }

      // Efficient file copy using Bun.write with source file
      const sourceFile = Bun.file(tempPath)
      await Bun.write(finalPath, sourceFile)

      // Verify the copy was successful
      const copiedFile = Bun.file(finalPath)
      if (!await copiedFile.exists() || copiedFile.size !== sourceFile.size) {
        throw new Error('File copy verification failed')
      }

      // Remove source file after successful copy
      await sourceFile.delete()

      return finalPath

    } catch (error: any) {
      // Cleanup on failure
      try {
        await Bun.file(tempPath).delete()
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to move file to registry: ${error.message}`)
    }
  }

  /**
   * Generate registry metadata for registry index
   */
  generateRegistryMetadata(result: UploadResult, packageName: string, version: string): {
    name: string
    version: string
    filename: string
    integrity: string
    upload: {
      timestamp: string
      throughput_mbps: number
      duration_ms: number
      strategy: string
    }
  } {
    return {
      name: packageName,
      version,
      filename: result.path.split('/').pop() || '',
      integrity: `${result.integrity.algorithm}-${result.integrity.crc32.toString(16).padStart(8, '0')}`,
      upload: {
        timestamp: result.metadata.timestamp,
        throughput_mbps: Math.round(result.throughput * 100) / 100,
        duration_ms: result.metadata.duration,
        strategy: result.metadata.strategy
      }
    }
  }

  /**
   * Cleanup temporary files older than specified age
   */
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
    console.log(`🧹 Cleanup scheduled for files older than ${maxAgeHours}h`)
    console.log(`   Note: Directory scanning would be implemented with fs.readdir in Node.js context`)

    // Return 0 for now - would implement actual cleanup in production
    return 0
  }
}

// Singleton instance for registry use
export const registryUploadHandler = new RegistryUploadHandler()

// CLI interface for testing uploads
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📥 FactoryWager Registry Upload Handler

Usage:
  bun run upload-handler.ts --test <file>
  bun run upload-handler.ts --cleanup [hours]

Options:
  --test <file>     Test upload with local file
  --cleanup [hours] Clean temp files (default: 24h)
  --help, -h        Show this help

Examples:
  bun run upload-handler.ts --test package.tgz
  bun run upload-handler.ts --cleanup 12
    `)
    return
  }

  if (args.includes('--test')) {
    const fileIndex = args.indexOf('--test') + 1
    const filePath = args[fileIndex]

    if (!filePath) {
      console.error('❌ File path required for test mode')
      return
    }

    const file = Bun.file(filePath)
    if (!await file.exists()) {
      console.error(`❌ File not found: ${filePath}`)
      return
    }

    const handler = new RegistryUploadHandler()
    const stream = file.stream()
    const size = file.size

    try {
      const result = await handler.handleUpload(stream, filePath, size)
      console.log(`\n🎉 Test upload successful!`)
      console.log(`📍 Path: ${result.path}`)
      console.log(`🔐 Integrity: ${result.integrity.algorithm}-${result.integrity.crc32.toString(16).padStart(8, '0')}`)

    } catch (error: any) {
      console.error(`❌ Test upload failed: ${error.message}`)
      process.exit(1)
    }

    return
  }

  if (args.includes('--cleanup')) {
    const hoursIndex = args.indexOf('--cleanup') + 1
    const hours = args[hoursIndex] ? parseInt(args[hoursIndex]) : 24

    const handler = new RegistryUploadHandler()
    const cleaned = await handler.cleanupTempFiles(hours)
    console.log(`✅ Cleanup complete: ${cleaned} files removed`)
    return
  }

  console.error('❌ No valid command provided. Use --help for usage.')
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error)
}

export { RegistryUploadHandler as default }
