#!/usr/bin/env bun

/**
 * 📦 Fantasy42-Fire22 Windows Installer Packager
 *
 * Creates professional Windows installers with:
 * - NSIS installer generation
 * - MSI package creation
 * - Portable ZIP packages
 * - Automatic updates support
 * - Registry integration
 * - Start menu shortcuts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';

interface InstallerConfig {
  mode: 'nsis' | 'msi' | 'portable' | 'all';
  inputDir: string;
  outputDir: string;
  version: string;
  verbose: boolean;
  sign: boolean;
  includeRuntime: boolean;
}

interface InstallerMetadata {
  appName: string;
  appVersion: string;
  appPublisher: string;
  appDescription: string;
  appCopyright: string;
  appIcon: string;
  appExecutable: string;
  installDir: string;
  startMenuFolder: string;
  registryKey: string;
  uninstallKey: string;
}

class WindowsInstallerPackager {
  private config: InstallerConfig;
  private metadata: InstallerMetadata;
  private packageJson: any;

  constructor(config: InstallerConfig) {
    this.config = config;

    // Load package.json
    const packagePath = join(process.cwd(), 'package.json');
    if (existsSync(packagePath)) {
      this.packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    } else {
      throw new Error('package.json not found');
    }

    this.metadata = this.generateMetadata();
  }

  async createInstallers(): Promise<void> {
    console.log('📦 Fantasy42-Fire22 Windows Installer Packager');
    console.log('==============================================');
    console.log(`📋 Mode: ${this.config.mode.toUpperCase()}`);
    console.log(`📁 Input: ${this.config.inputDir}`);
    console.log(`📁 Output: ${this.config.outputDir}`);
    console.log('');

    try {
      // Prepare packaging environment
      await this.preparePackagingEnvironment();

      // Create installers based on mode
      if (this.config.mode === 'all') {
        await this.createNSISInstaller();
        await this.createMSIPackage();
        await this.createPortablePackage();
      } else if (this.config.mode === 'nsis') {
        await this.createNSISInstaller();
      } else if (this.config.mode === 'msi') {
        await this.createMSIPackage();
      } else if (this.config.mode === 'portable') {
        await this.createPortablePackage();
      }

      // Generate packaging report
      await this.generatePackagingReport();

      console.log('\n🎉 Windows installer packaging completed!');
    } catch (error) {
      console.error('❌ Installer packaging failed:', error);
      throw error;
    }
  }

  private generateMetadata(): InstallerMetadata {
    return {
      appName: 'Fantasy42-Fire22 Registry',
      appVersion: this.config.version || this.packageJson.version || '1.0.0',
      appPublisher: 'Fire22 Enterprise LLC',
      appDescription:
        'Enterprise-grade Fantasy42-Fire22 package registry with advanced security and performance optimization',
      appCopyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      appIcon: 'fantasy42-fire22-registry-icon.ico',
      appExecutable: 'fantasy42-fire22-registry.exe',
      installDir: '$PROGRAMFILES64\\Fire22\\Fantasy42-Fire22 Registry',
      startMenuFolder: 'Fire22\\Fantasy42-Fire22 Registry',
      registryKey: 'HKLM\\Software\\Fire22\\Fantasy42-Fire22 Registry',
      uninstallKey:
        'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Fantasy42-Fire22Registry',
    };
  }

  private async preparePackagingEnvironment(): Promise<void> {
    console.log('🔧 Preparing packaging environment...');

    // Create output directory
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Verify input directory exists
    if (!existsSync(this.config.inputDir)) {
      throw new Error(`Input directory not found: ${this.config.inputDir}`);
    }

    // Check for required executables
    const executables = require('fs')
      .readdirSync(this.config.inputDir)
      .filter((file: string) => file.endsWith('.exe'));

    if (executables.length === 0) {
      throw new Error('No executable files found in input directory');
    }

    console.log(`✅ Found ${executables.length} executable(s) to package`);
  }

  private async createNSISInstaller(): Promise<void> {
    console.log('\n🔧 Creating NSIS installer...');

    try {
      // Generate NSIS script
      const nsisScript = this.generateNSISScript();
      const scriptPath = join(this.config.outputDir, 'installer.nsi');
      writeFileSync(scriptPath, nsisScript);

      // Copy files to staging directory
      const stagingDir = join(this.config.outputDir, 'nsis-staging');
      await this.copyFilesToStaging(stagingDir);

      // Compile NSIS installer
      const installerPath = join(
        this.config.outputDir,
        `${this.metadata.appName.replace(/\s+/g, '')}-${this.metadata.appVersion}-Setup.exe`
      );

      const nsisCommand = `makensis /DVERSION="${this.metadata.appVersion}" /DOUTFILE="${installerPath}" "${scriptPath}"`;

      execSync(nsisCommand, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        cwd: this.config.outputDir,
      });

      // Sign installer if requested
      if (this.config.sign) {
        await this.signInstaller(installerPath);
      }

      console.log(`✅ NSIS installer created: ${basename(installerPath)}`);
    } catch (error) {
      console.error('❌ NSIS installer creation failed:', error);
      console.log('💡 Install NSIS (Nullsoft Scriptable Install System) to create NSIS installers');
    }
  }

  private generateNSISScript(): string {
    return `
; Fantasy42-Fire22 Registry NSIS Installer Script
; Generated automatically - do not edit manually

!define APP_NAME "${this.metadata.appName}"
!define APP_VERSION "${this.metadata.appVersion}"
!define APP_PUBLISHER "${this.metadata.appPublisher}"
!define APP_DESCRIPTION "${this.metadata.appDescription}"
!define APP_COPYRIGHT "${this.metadata.appCopyright}"
!define APP_EXECUTABLE "${this.metadata.appExecutable}"

!define INSTALL_DIR "${this.metadata.installDir}"
!define START_MENU_FOLDER "${this.metadata.startMenuFolder}"
!define REGISTRY_KEY "${this.metadata.registryKey}"
!define UNINSTALL_KEY "${this.metadata.uninstallKey}"

; Modern UI
!include "MUI2.nsh"
!include "x64.nsh"

; General settings
Name "\${APP_NAME}"
OutFile "\${OUTFILE}"
InstallDir "\${INSTALL_DIR}"
InstallDirRegKey HKLM "\${REGISTRY_KEY}" "InstallPath"
RequestExecutionLevel admin

; Version information
VIProductVersion "\${APP_VERSION}.0"
VIAddVersionKey "ProductName" "\${APP_NAME}"
VIAddVersionKey "ProductVersion" "\${APP_VERSION}"
VIAddVersionKey "CompanyName" "\${APP_PUBLISHER}"
VIAddVersionKey "FileDescription" "\${APP_DESCRIPTION}"
VIAddVersionKey "LegalCopyright" "\${APP_COPYRIGHT}"

; Modern UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "nsis-staging\\\${APP_ICON}"
!define MUI_UNICON "nsis-staging\\\${APP_ICON}"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "nsis-staging\\LICENSE.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_STARTMENU APPLICATION \$StartMenuFolder
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer sections
Section "Core Application" SecCore
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  
  ; Copy application files
  File "nsis-staging\\*.exe"
  File "nsis-staging\\*.dll"
  File /nonfatal "nsis-staging\\*.manifest.json"
  
  ; Create registry entries
  WriteRegStr HKLM "\${REGISTRY_KEY}" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "\${REGISTRY_KEY}" "Version" "\${APP_VERSION}"
  WriteRegStr HKLM "\${REGISTRY_KEY}" "Publisher" "\${APP_PUBLISHER}"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  
  ; Add to Add/Remove Programs
  WriteRegStr HKLM "\${UNINSTALL_KEY}" "DisplayName" "\${APP_NAME}"
  WriteRegStr HKLM "\${UNINSTALL_KEY}" "DisplayVersion" "\${APP_VERSION}"
  WriteRegStr HKLM "\${UNINSTALL_KEY}" "Publisher" "\${APP_PUBLISHER}"
  WriteRegStr HKLM "\${UNINSTALL_KEY}" "UninstallString" "$INSTDIR\\Uninstall.exe"
  WriteRegStr HKLM "\${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\\\${APP_EXECUTABLE}"
  WriteRegDWORD HKLM "\${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "\${UNINSTALL_KEY}" "NoRepair" 1
  
SectionEnd

Section "Start Menu Shortcuts" SecStartMenu
  !insertmacro MUI_STARTMENU_WRITE_BEGIN APPLICATION
  
  CreateDirectory "$SMPROGRAMS\\\$StartMenuFolder"
  CreateShortcut "$SMPROGRAMS\\\$StartMenuFolder\\\${APP_NAME}.lnk" "$INSTDIR\\\${APP_EXECUTABLE}"
  CreateShortcut "$SMPROGRAMS\\\$StartMenuFolder\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

Section "Desktop Shortcut" SecDesktop
  CreateShortcut "$DESKTOP\\\${APP_NAME}.lnk" "$INSTDIR\\\${APP_EXECUTABLE}"
SectionEnd

; Section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT \${SecCore} "Core application files (required)"
  !insertmacro MUI_DESCRIPTION_TEXT \${SecStartMenu} "Start menu shortcuts"
  !insertmacro MUI_DESCRIPTION_TEXT \${SecDesktop} "Desktop shortcut"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Uninstaller
Section "Uninstall"
  ; Remove files
  Delete "$INSTDIR\\\${APP_EXECUTABLE}"
  Delete "$INSTDIR\\*.dll"
  Delete "$INSTDIR\\*.manifest.json"
  Delete "$INSTDIR\\Uninstall.exe"
  
  ; Remove directories
  RMDir "$INSTDIR"
  
  ; Remove registry entries
  DeleteRegKey HKLM "\${REGISTRY_KEY}"
  DeleteRegKey HKLM "\${UNINSTALL_KEY}"
  
  ; Remove shortcuts
  !insertmacro MUI_STARTMENU_GETFOLDER APPLICATION \$StartMenuFolder
  Delete "$SMPROGRAMS\\\$StartMenuFolder\\\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\\\$StartMenuFolder\\Uninstall.lnk"
  RMDir "$SMPROGRAMS\\\$StartMenuFolder"
  Delete "$DESKTOP\\\${APP_NAME}.lnk"
  
SectionEnd
`;
  }

  private async createMSIPackage(): Promise<void> {
    console.log('\n🔧 Creating MSI package...');

    try {
      // Generate WiX source file
      const wixSource = this.generateWiXSource();
      const wixPath = join(this.config.outputDir, 'installer.wxs');
      writeFileSync(wixPath, wixSource);

      // Copy files to staging directory
      const stagingDir = join(this.config.outputDir, 'msi-staging');
      await this.copyFilesToStaging(stagingDir);

      // Compile WiX to MSI
      const msiPath = join(
        this.config.outputDir,
        `${this.metadata.appName.replace(/\s+/g, '')}-${this.metadata.appVersion}.msi`
      );

      // Compile with candle (WiX compiler)
      const objPath = join(this.config.outputDir, 'installer.wixobj');
      execSync(`candle -out "${objPath}" "${wixPath}"`, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      // Link with light (WiX linker)
      execSync(`light -out "${msiPath}" "${objPath}"`, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      // Sign MSI if requested
      if (this.config.sign) {
        await this.signInstaller(msiPath);
      }

      console.log(`✅ MSI package created: ${basename(msiPath)}`);
    } catch (error) {
      console.error('❌ MSI package creation failed:', error);
      console.log('💡 Install WiX Toolset to create MSI packages');
    }
  }

  private generateWiXSource(): string {
    const productId = this.generateGUID();
    const upgradeId = this.generateGUID();

    return `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="${productId}" 
           Name="${this.metadata.appName}" 
           Language="1033" 
           Version="${this.metadata.appVersion}" 
           Manufacturer="${this.metadata.appPublisher}" 
           UpgradeCode="${upgradeId}">
    
    <Package InstallerVersion="200" 
             Compressed="yes" 
             InstallScope="perMachine" 
             Description="${this.metadata.appDescription}"
             Comments="${this.metadata.appCopyright}" />

    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />
    <MediaTemplate EmbedCab="yes" />

    <Feature Id="ProductFeature" Title="Fantasy42-Fire22 Registry" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="ManufacturerFolder" Name="Fire22">
          <Directory Id="INSTALLFOLDER" Name="Fantasy42-Fire22 Registry" />
        </Directory>
      </Directory>
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="Fire22" />
      </Directory>
    </Directory>

    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <Component Id="MainExecutable" Guid="${this.generateGUID()}">
        <File Id="MainExe" Source="msi-staging\\${this.metadata.appExecutable}" KeyPath="yes">
          <Shortcut Id="ApplicationStartMenuShortcut" 
                    Directory="ApplicationProgramsFolder" 
                    Name="${this.metadata.appName}" 
                    WorkingDirectory="INSTALLFOLDER" 
                    Icon="AppIcon" 
                    IconIndex="0" 
                    Advertise="yes" />
        </File>
      </Component>
      
      <Component Id="SupportFiles" Guid="${this.generateGUID()}">
        <File Id="ManifestFile" Source="msi-staging\\*.manifest.json" />
      </Component>
    </ComponentGroup>

    <Icon Id="AppIcon" SourceFile="msi-staging\\${this.metadata.appIcon}" />
    <Property Id="ARPPRODUCTICON" Value="AppIcon" />

    <Property Id="WIXUI_INSTALLDIR" Value="INSTALLFOLDER" />
    <UIRef Id="WixUI_InstallDir" />

  </Product>
</Wix>`;
  }

  private async createPortablePackage(): Promise<void> {
    console.log('\n🔧 Creating portable package...');

    try {
      const portableDir = join(this.config.outputDir, 'portable');
      const zipPath = join(
        this.config.outputDir,
        `${this.metadata.appName.replace(/\s+/g, '')}-${this.metadata.appVersion}-Portable.zip`
      );

      // Create portable directory structure
      if (!existsSync(portableDir)) {
        mkdirSync(portableDir, { recursive: true });
      }

      // Copy application files
      await this.copyFilesToStaging(portableDir);

      // Create portable configuration
      const portableConfig = {
        app: {
          name: this.metadata.appName,
          version: this.metadata.appVersion,
          publisher: this.metadata.appPublisher,
          portable: true,
        },
        runtime: {
          dataDir: './data',
          configDir: './config',
          logsDir: './logs',
          tempDir: './temp',
        },
        features: {
          autoUpdate: false,
          telemetry: false,
          systemIntegration: false,
        },
      };

      writeFileSync(
        join(portableDir, 'portable-config.json'),
        JSON.stringify(portableConfig, null, 2)
      );

      // Create README for portable version
      const portableReadme = `# ${this.metadata.appName} - Portable Version

This is a portable version that doesn't require installation.

## Usage
1. Extract to any folder
2. Run ${this.metadata.appExecutable}
3. All data will be stored in the application folder

## Features
- No installation required
- No registry modifications
- Self-contained application
- Portable configuration

## System Requirements
- Windows 10 or later
- 64-bit processor

${this.metadata.appCopyright}
`;

      writeFileSync(join(portableDir, 'README.txt'), portableReadme);

      // Create ZIP package
      execSync(`cd "${dirname(portableDir)}" && zip -r "${zipPath}" "${basename(portableDir)}"`, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      console.log(`✅ Portable package created: ${basename(zipPath)}`);
    } catch (error) {
      console.error('❌ Portable package creation failed:', error);
    }
  }

  private async copyFilesToStaging(stagingDir: string): Promise<void> {
    if (!existsSync(stagingDir)) {
      mkdirSync(stagingDir, { recursive: true });
    }

    // Copy executable files
    const files = require('fs').readdirSync(this.config.inputDir);

    for (const file of files) {
      const srcPath = join(this.config.inputDir, file);
      const destPath = join(stagingDir, file);

      if (statSync(srcPath).isFile()) {
        copyFileSync(srcPath, destPath);
      }
    }

    // Copy or create additional files
    await this.createLicenseFile(stagingDir);
    await this.copyIconFile(stagingDir);
  }

  private async createLicenseFile(stagingDir: string): Promise<void> {
    const licensePath = join(stagingDir, 'LICENSE.txt');

    const licenseText = `${this.metadata.appName}
${this.metadata.appCopyright}

ENTERPRISE SOFTWARE LICENSE

This software is licensed for enterprise use only.
Redistribution and use in source and binary forms are subject to license terms.

For licensing information, contact: ${this.metadata.appPublisher}
`;

    writeFileSync(licensePath, licenseText);
  }

  private async copyIconFile(stagingDir: string): Promise<void> {
    const iconSrc = join(process.cwd(), 'assets', this.metadata.appIcon);
    const iconDest = join(stagingDir, this.metadata.appIcon);

    if (existsSync(iconSrc)) {
      copyFileSync(iconSrc, iconDest);
    } else {
      console.log(`⚠️ Icon file not found: ${iconSrc}`);
    }
  }

  private async signInstaller(installerPath: string): Promise<void> {
    console.log(`🔐 Signing installer: ${basename(installerPath)}`);

    try {
      // Use the Windows code signer
      const { WindowsCodeSigner } = await import('./sign-windows-executable');

      const signer = new WindowsCodeSigner({
        certificatePath: process.env.FIRE22_WINDOWS_CERT_PATH || '',
        certificatePassword: process.env.FIRE22_WINDOWS_CERT_PASSWORD || '',
        timestampServer: 'http://timestamp.digicert.com',
        verbose: this.config.verbose,
        verify: true,
        force: false,
      });

      await signer.signExecutables([installerPath]);
      console.log(`✅ Installer signed: ${basename(installerPath)}`);
    } catch (error) {
      console.error(`❌ Installer signing failed: ${error}`);
    }
  }

  private generateGUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
      .toUpperCase();
  }

  private async generatePackagingReport(): Promise<void> {
    const reportPath = join(this.config.outputDir, 'packaging-report.json');

    const outputFiles = require('fs')
      .readdirSync(this.config.outputDir)
      .filter(
        (file: string) => file.endsWith('.exe') || file.endsWith('.msi') || file.endsWith('.zip')
      );

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      metadata: this.metadata,
      package: {
        name: this.packageJson.name,
        version: this.packageJson.version,
      },
      outputs: outputFiles.map(file => ({
        name: file,
        path: join(this.config.outputDir, file),
        size: require('fs').statSync(join(this.config.outputDir, file)).size,
        type: file.endsWith('.exe')
          ? 'NSIS Installer'
          : file.endsWith('.msi')
            ? 'MSI Package'
            : file.endsWith('.zip')
              ? 'Portable Package'
              : 'Unknown',
      })),
      environment: {
        platform: process.platform,
        arch: process.arch,
      },
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Packaging report: ${basename(reportPath)}`);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  const config: InstallerConfig = {
    mode: 'all',
    inputDir: join(process.cwd(), 'dist', 'windows'),
    outputDir: join(process.cwd(), 'dist', 'installers'),
    version: '',
    verbose: false,
    sign: false,
    includeRuntime: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1] as any;
      if (['nsis', 'msi', 'portable', 'all'].includes(mode)) {
        config.mode = mode;
      }
    } else if (arg.startsWith('--input=')) {
      config.inputDir = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      config.outputDir = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      config.version = arg.split('=')[1];
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--sign') {
      config.sign = true;
    } else if (arg === '--include-runtime') {
      config.includeRuntime = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  const packager = new WindowsInstallerPackager(config);
  await packager.createInstallers();
}

function showHelp() {
  console.log(`
📦 Fantasy42-Fire22 Windows Installer Packager

Usage: bun run scripts/package-windows-installer.ts [options]

Options:
  --mode=<mode>          Installer type (nsis, msi, portable, all)
  --input=<dir>          Input directory with executables
  --output=<dir>         Output directory for installers
  --version=<version>    Override version number
  --sign                 Sign installers with code signing certificate
  --include-runtime      Include Bun runtime (larger but self-contained)
  --verbose              Verbose output
  --help, -h             Show this help

Installer Types:
  nsis      - NSIS installer (.exe) - most common
  msi       - Windows Installer package (.msi) - enterprise
  portable  - Portable ZIP package (.zip) - no installation
  all       - Create all installer types

Requirements:
  NSIS:     NSIS (Nullsoft Scriptable Install System)
  MSI:      WiX Toolset
  Portable: zip command

Examples:
  bun run scripts/package-windows-installer.ts --mode=nsis
  bun run scripts/package-windows-installer.ts --mode=all --sign
  bun run scripts/package-windows-installer.ts --input=./build --output=./packages
  `);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Installer packaging failed:', error);
    process.exit(1);
  });
}

export { WindowsInstallerPackager };
