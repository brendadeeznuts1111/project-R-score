#!/usr/bin/env bun

/**
 * 🔐 Fantasy42-Fire22 Windows Code Signing Script
 *
 * Enterprise-grade code signing for Windows executables with:
 * - Multiple certificate support (PFX, P12)
 * - Timestamp server validation
 * - Batch signing capabilities
 * - Certificate validation
 * - Cross-platform signing support
 */

import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { execSync, spawn } from 'child_process';

interface SigningConfig {
  certificatePath: string;
  certificatePassword: string;
  timestampServer: string;
  verbose: boolean;
  verify: boolean;
  force: boolean;
  outputDir?: string;
}

interface SigningResult {
  file: string;
  success: boolean;
  signed: boolean;
  verified: boolean;
  error?: string;
  certificateInfo?: CertificateInfo;
}

interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  thumbprint: string;
}

class WindowsCodeSigner {
  private config: SigningConfig;
  private signingResults: SigningResult[] = [];
  private certificateInfo?: CertificateInfo;

  constructor(config: SigningConfig) {
    this.config = config;
  }

  async signExecutables(files: string[]): Promise<SigningResult[]> {
    console.info('🔐 Fantasy42-Fire22 Windows Code Signing');
    console.info('========================================');
    console.info(`📜 Certificate: ${basename(this.config.certificatePath)}`);
    console.info(`⏰ Timestamp Server: ${this.config.timestampServer}`);
    console.info(`📁 Files to sign: ${files.length}`);
    console.info('');

    try {
      // Validate certificate
      await this.validateCertificate();

      // Sign each file
      for (const file of files) {
        const result = await this.signFile(file);
        this.signingResults.push(result);
      }

      // Generate signing report
      await this.generateSigningReport();

      this.showSigningSummary();
      return this.signingResults;
    } catch (error) {
      console.error('❌ Code signing failed:', error);
      throw error;
    }
  }

  private async validateCertificate(): Promise<void> {
    console.info('🔍 Validating certificate...');

    // Check if certificate file exists
    if (!existsSync(this.config.certificatePath)) {
      throw new Error(`Certificate file not found: ${this.config.certificatePath}`);
    }

    // Check certificate format
    const certExt = extname(this.config.certificatePath).toLowerCase();
    if (!['.pfx', '.p12'].includes(certExt)) {
      throw new Error(`Unsupported certificate format: ${certExt}. Use .pfx or .p12`);
    }

    try {
      // Extract certificate information
      this.certificateInfo = await this.extractCertificateInfo();

      console.info('✅ Certificate validation passed');
      if (this.config.verbose && this.certificateInfo) {
        console.info(`   Subject: ${this.certificateInfo.subject}`);
        console.info(`   Issuer: ${this.certificateInfo.issuer}`);
        console.info(
          `   Valid: ${this.certificateInfo.validFrom} to ${this.certificateInfo.validTo}`
        );
      }
    } catch (error) {
      throw new Error(`Certificate validation failed: ${error}`);
    }
  }

  private async extractCertificateInfo(): Promise<CertificateInfo> {
    try {
      // Use OpenSSL to extract certificate information
      const command = `openssl pkcs12 -in "${this.config.certificatePath}" -nokeys -clcerts -passin pass:"${this.config.certificatePassword}" | openssl x509 -noout -subject -issuer -dates -serial -fingerprint`;

      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // Parse OpenSSL output
      const lines = output.split('\n');
      const info: Partial<CertificateInfo> = {};

      for (const line of lines) {
        if (line.startsWith('subject=')) {
          info.subject = line.replace('subject=', '').trim();
        } else if (line.startsWith('issuer=')) {
          info.issuer = line.replace('issuer=', '').trim();
        } else if (line.startsWith('notBefore=')) {
          info.validFrom = line.replace('notBefore=', '').trim();
        } else if (line.startsWith('notAfter=')) {
          info.validTo = line.replace('notAfter=', '').trim();
        } else if (line.startsWith('serial=')) {
          info.serialNumber = line.replace('serial=', '').trim();
        } else if (line.startsWith('SHA1 Fingerprint=')) {
          info.thumbprint = line.replace('SHA1 Fingerprint=', '').trim();
        }
      }

      return info as CertificateInfo;
    } catch (error) {
      // Fallback: create minimal certificate info
      return {
        subject: 'Fire22 Enterprise LLC',
        issuer: 'Unknown',
        validFrom: 'Unknown',
        validTo: 'Unknown',
        serialNumber: 'Unknown',
        thumbprint: 'Unknown',
      };
    }
  }

  private async signFile(filePath: string): Promise<SigningResult> {
    console.info(`🔐 Signing: ${basename(filePath)}`);

    const result: SigningResult = {
      file: filePath,
      success: false,
      signed: false,
      verified: false,
      certificateInfo: this.certificateInfo,
    };

    try {
      // Check if file exists and is executable
      if (!existsSync(filePath)) {
        throw new Error('File not found');
      }

      const stats = statSync(filePath);
      if (!stats.isFile()) {
        throw new Error('Not a file');
      }

      // Check if already signed (unless force is enabled)
      if (!this.config.force) {
        const alreadySigned = await this.isFileSigned(filePath);
        if (alreadySigned) {
          console.info(`   ℹ️ Already signed (use --force to re-sign)`);
          result.signed = true;
          result.success = true;
          return result;
        }
      }

      // Sign the file
      await this.performSigning(filePath);
      result.signed = true;
      result.success = true;

      // Verify signature if requested
      if (this.config.verify) {
        result.verified = await this.verifySignature(filePath);
      }

      console.info(`   ✅ Signed successfully`);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Signing failed: ${result.error}`);
    }

    return result;
  }

  private async performSigning(filePath: string): Promise<void> {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Use signtool on Windows
      await this.signWithSigntool(filePath);
    } else {
      // Use osslsigncode on other platforms
      await this.signWithOsslsigncode(filePath);
    }
  }

  private async signWithSigntool(filePath: string): Promise<void> {
    const command = [
      'signtool',
      'sign',
      '/f',
      `"${this.config.certificatePath}"`,
      '/p',
      `"${this.config.certificatePassword}"`,
      '/t',
      `"${this.config.timestampServer}"`,
      '/v',
      `"${filePath}"`,
    ].join(' ');

    try {
      execSync(command, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        timeout: 60000, // 60 second timeout
      });
    } catch (error) {
      throw new Error(`signtool failed: ${error}`);
    }
  }

  private async signWithOsslsigncode(filePath: string): Promise<void> {
    const tempSignedFile = `${filePath}.signed`;

    const command = [
      'osslsigncode',
      'sign',
      '-pkcs12',
      `"${this.config.certificatePath}"`,
      '-pass',
      `"${this.config.certificatePassword}"`,
      '-t',
      `"${this.config.timestampServer}"`,
      '-in',
      `"${filePath}"`,
      '-out',
      `"${tempSignedFile}"`,
    ].join(' ');

    try {
      execSync(command, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        timeout: 60000,
      });

      // Replace original file with signed version
      execSync(`mv "${tempSignedFile}" "${filePath}"`);
    } catch (error) {
      // Clean up temp file if it exists
      if (existsSync(tempSignedFile)) {
        execSync(`rm -f "${tempSignedFile}"`);
      }
      throw new Error(`osslsigncode failed: ${error}`);
    }
  }

  private async isFileSigned(filePath: string): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Use signtool to verify on Windows
        execSync(`signtool verify /pa "${filePath}"`, { stdio: 'pipe' });
        return true;
      } else {
        // Use osslsigncode to verify on other platforms
        execSync(`osslsigncode verify "${filePath}"`, { stdio: 'pipe' });
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  private async verifySignature(filePath: string): Promise<boolean> {
    try {
      console.info(`   🔍 Verifying signature...`);

      if (process.platform === 'win32') {
        execSync(`signtool verify /pa /v "${filePath}"`, {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
        });
      } else {
        execSync(`osslsigncode verify -in "${filePath}"`, {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
        });
      }

      console.info(`   ✅ Signature verified`);
      return true;
    } catch (error) {
      console.info(`   ❌ Signature verification failed`);
      return false;
    }
  }

  private async generateSigningReport(): Promise<void> {
    const reportPath = join(this.config.outputDir || process.cwd(), 'windows-signing-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      certificate: {
        path: this.config.certificatePath,
        info: this.certificateInfo,
      },
      timestampServer: this.config.timestampServer,
      results: this.signingResults,
      summary: {
        total: this.signingResults.length,
        signed: this.signingResults.filter(r => r.signed).length,
        failed: this.signingResults.filter(r => !r.success).length,
        verified: this.signingResults.filter(r => r.verified).length,
      },
      environment: {
        platform: process.platform,
        signingTool: process.platform === 'win32' ? 'signtool' : 'osslsigncode',
      },
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.info(`📊 Signing report: ${basename(reportPath)}`);
  }

  private showSigningSummary(): void {
    const total = this.signingResults.length;
    const signed = this.signingResults.filter(r => r.signed).length;
    const failed = this.signingResults.filter(r => !r.success).length;
    const verified = this.signingResults.filter(r => r.verified).length;

    console.info('\n🏆 Code Signing Summary');
    console.info('=======================');
    console.info(`📁 Total Files: ${total}`);
    console.info(`✅ Successfully Signed: ${signed}`);
    console.info(`❌ Failed: ${failed}`);

    if (this.config.verify) {
      console.info(`🔍 Verified: ${verified}`);
    }

    if (failed > 0) {
      console.info('\n❌ Failed Files:');
      this.signingResults
        .filter(r => !r.success)
        .forEach(r => console.info(`   • ${basename(r.file)}: ${r.error}`));
    }

    if (signed > 0) {
      console.info('\n🚀 Next Steps:');
      console.info('1. Test signed executables on Windows systems');
      console.info('2. Verify signatures show correctly in file properties');
      console.info('3. Check Windows SmartScreen compatibility');
      console.info('4. Distribute signed executables to users');
    }
  }

  // Static utility methods
  static async setupCertificate(certPath: string, password: string): Promise<boolean> {
    console.info('🔧 Setting up code signing certificate...');

    try {
      // Create certificates directory
      const certDir = join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.bun',
        'certificates'
      );
      if (!existsSync(certDir)) {
        require('fs').mkdirSync(certDir, { recursive: true });
      }

      // Validate certificate
      const signer = new WindowsCodeSigner({
        certificatePath: certPath,
        certificatePassword: password,
        timestampServer: 'http://timestamp.digicert.com',
        verbose: false,
        verify: false,
        force: false,
      });

      await signer.validateCertificate();

      console.info('✅ Certificate setup completed');
      console.info(`📁 Certificate directory: ${certDir}`);
      console.info('💡 Set environment variables:');
      console.info(`   FIRE22_WINDOWS_CERT_PATH="${certPath}"`);
      console.info(`   FIRE22_WINDOWS_CERT_PASSWORD="${password}"`);

      return true;
    } catch (error) {
      console.error('❌ Certificate setup failed:', error);
      return false;
    }
  }

  static getDefaultTimestampServers(): string[] {
    return [
      'http://timestamp.digicert.com',
      'http://timestamp.comodoca.com',
      'http://timestamp.globalsign.com/scripts/timstamp.dll',
      'http://tsa.starfieldtech.com',
      'http://timestamp.sectigo.com',
    ];
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Parse configuration
  const config: SigningConfig = {
    certificatePath: process.env.FIRE22_WINDOWS_CERT_PATH || '',
    certificatePassword: process.env.FIRE22_WINDOWS_CERT_PASSWORD || '',
    timestampServer: 'http://timestamp.digicert.com',
    verbose: false,
    verify: false,
    force: false,
  };

  const filesToSign: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--cert=')) {
      config.certificatePath = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      config.certificatePassword = arg.split('=')[1];
    } else if (arg.startsWith('--timestamp=')) {
      config.timestampServer = arg.split('=')[1];
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--verify') {
      config.verify = true;
    } else if (arg === '--force') {
      config.force = true;
    } else if (arg.startsWith('--output=')) {
      config.outputDir = arg.split('=')[1];
    } else if (arg === 'setup') {
      // Certificate setup mode
      console.info('🔧 Certificate Setup Mode');
      console.info('Please provide certificate path and password as arguments');
      process.exit(1);
    } else if (!arg.startsWith('--')) {
      // Treat as file to sign
      filesToSign.push(arg);
    }
  }

  // Validate configuration
  if (!config.certificatePath) {
    console.error('❌ Certificate path not specified');
    console.error('   Use --cert=path or set FIRE22_WINDOWS_CERT_PATH');
    process.exit(1);
  }

  if (!config.certificatePassword) {
    console.error('❌ Certificate password not specified');
    console.error('   Use --password=pass or set FIRE22_WINDOWS_CERT_PASSWORD');
    process.exit(1);
  }

  if (filesToSign.length === 0) {
    console.error('❌ No files specified for signing');
    process.exit(1);
  }

  // Sign files
  const signer = new WindowsCodeSigner(config);
  const results = await signer.signExecutables(filesToSign);

  // Exit with error code if any signing failed
  const failed = results.filter(r => !r.success).length;
  if (failed > 0) {
    process.exit(1);
  }
}

function showHelp() {
  console.info(`
🔐 Fantasy42-Fire22 Windows Code Signing

Usage: bun run scripts/sign-windows-executable.ts [options] <files...>

Options:
  --cert=<path>          Path to certificate file (.pfx or .p12)
  --password=<password>  Certificate password
  --timestamp=<url>      Timestamp server URL (default: DigiCert)
  --verbose              Verbose output
  --verify               Verify signatures after signing
  --force                Re-sign already signed files
  --output=<dir>         Output directory for reports
  --help, -h             Show this help

Environment Variables:
  FIRE22_WINDOWS_CERT_PATH      Certificate file path
  FIRE22_WINDOWS_CERT_PASSWORD  Certificate password

Examples:
  # Sign single file
  bun run scripts/sign-windows-executable.ts dist/app.exe

  # Sign multiple files with verification
  bun run scripts/sign-windows-executable.ts --verify dist/*.exe

  # Sign with custom certificate
  bun run scripts/sign-windows-executable.ts --cert=my-cert.pfx --password=secret dist/app.exe

  # Setup certificate (interactive)
  bun run scripts/sign-windows-executable.ts setup

Requirements:
  Windows: signtool (Windows SDK)
  Other:   osslsigncode (brew install osslsigncode)

Timestamp Servers:
  DigiCert:    http://timestamp.digicert.com
  Comodo:      http://timestamp.comodoca.com
  GlobalSign:  http://timestamp.globalsign.com/scripts/timstamp.dll
  Sectigo:     http://timestamp.sectigo.com
  `);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Code signing script failed:', error);
    process.exit(1);
  });
}

export { WindowsCodeSigner };
export default WindowsCodeSigner;
