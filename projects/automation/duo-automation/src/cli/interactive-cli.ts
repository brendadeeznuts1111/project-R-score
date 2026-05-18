#!/usr/bin/env bun

/**
 * Empire Pro Interactive CLI
 * Enhanced user experience with interactive mode and better UX
 */

import { createSpinner } from '../../utils/bun-spinner';
import { empireLog, chalk } from '../../utils/bun-console-colors';
import { renderLogo } from '../../utils/native-ascii-art';
import { CashAppIntelligence } from '../cashapp/intelligence.js';
import { EmailIntelligenceEngine } from '../email/intelligence.js';
import { AddressIntelligenceEngine } from '../address/intelligence.js';
import { SocialIntelligenceEngine } from '../social/intelligence.js';

interface CLIOptions {
  format: 'table' | 'json' | 'csv';
  debug: boolean;
  parallel: number;
  timeout: number;
}

interface MenuOption {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void>;
  suboptions?: MenuOption[];
}

export class InteractiveCLI {
  private options: CLIOptions;
  private cashAppIntel: CashAppIntelligence;
  private emailIntel: EmailIntelligenceEngine;
  private addressIntel: AddressIntelligenceEngine;
  private socialIntel: SocialIntelligenceEngine;

  constructor(options: Partial<CLIOptions> = {}) {
    this.options = {
      format: 'table',
      debug: false,
      parallel: 32,
      timeout: 30000,
      ...options
    };

    // Initialize intelligence engines
    this.cashAppIntel = new CashAppIntelligence();
    this.emailIntel = new EmailIntelligenceEngine();
    this.addressIntel = new AddressIntelligenceEngine();
    this.socialIntel = new SocialIntelligenceEngine();
  }

  /**
   * Start the interactive CLI
   */
  async start(): Promise<void> {
    console.clear();
    console.info(renderLogo('large'));
    empireLog.info('🚀 Empire Pro Interactive CLI v4.0');
    empireLog.info('💫 Advanced Identity Intelligence Platform\n');

    await this.showMainMenu();
  }

  /**
   * Display main menu and handle user input
   */
  private async showMainMenu(): Promise<void> {
    const mainMenu: MenuOption[] = [
      {
        id: 'phone',
        label: '📱 Phone Intelligence',
        description: 'Analyze phone numbers for fraud detection and intelligence gathering',
        action: () => this.showPhoneMenu(),
        suboptions: [
          {
            id: 'phone-audit',
            label: '🔍 Comprehensive Phone Audit',
            description: 'Complete phone number analysis with risk assessment',
            action: () => this.performPhoneAudit()
          },
          {
            id: 'phone-batch',
            label: '📦 Batch Phone Analysis',
            description: 'Analyze multiple phone numbers in parallel',
            action: () => this.performBatchPhoneAnalysis()
          },
          {
            id: 'phone-monitor',
            label: '👁️ Live Phone Monitoring',
            description: 'Real-time monitoring of phone number activities',
            action: () => this.startPhoneMonitoring()
          }
        ]
      },
      {
        id: 'email',
        label: '📧 Email Intelligence',
        description: 'Advanced email analysis and verification',
        action: () => this.showEmailMenu(),
        suboptions: [
          {
            id: 'email-verify',
            label: '✅ Email Verification',
            description: 'Verify email validity and deliverability',
            action: () => this.performEmailVerification()
          },
          {
            id: 'email-breach',
            label: '🔓 Breach Check',
            description: 'Check if email appears in data breaches',
            action: () => this.performBreachCheck()
          },
          {
            id: 'email-enrich',
            label: '💎 Email Enrichment',
            description: 'Enrich email data with additional intelligence',
            action: () => this.performEmailEnrichment()
          }
        ]
      },
      {
        id: 'cashapp',
        label: '💰 CashApp Intelligence',
        description: 'CashApp fraud detection and risk assessment',
        action: () => this.showCashAppMenu(),
        suboptions: [
          {
            id: 'cashapp-analyze',
            label: '🔍 CashApp Analysis',
            description: 'Analyze CashApp account for fraud indicators',
            action: () => this.performCashAppAnalysis()
          },
          {
            id: 'cashapp-batch',
            label: '📦 Batch CashApp Analysis',
            description: 'Analyze multiple CashApp accounts',
            action: () => this.performBatchCashAppAnalysis()
          },
          {
            id: 'cashapp-monitor',
            label: '📊 Real-time Monitoring',
            description: 'Monitor CashApp transactions in real-time',
            action: () => this.startCashAppMonitoring()
          },
          {
            id: 'cashapp-webhooks',
            label: '🪝 Webhook Management',
            description: 'Manage CashApp webhooks for notifications',
            action: () => this.manageCashAppWebhooks()
          }
        ]
      },
      {
        id: 'address',
        label: '🏠 Address Intelligence',
        description: 'Address verification and geographic analysis',
        action: () => this.showAddressMenu()
      },
      {
        id: 'social',
        label: '👤 Social Intelligence',
        description: 'Social media analysis and identity mapping',
        action: () => this.showSocialMenu()
      },
      {
        id: 'settings',
        label: '⚙️ Settings',
        description: 'Configure CLI options and preferences',
        action: () => this.showSettingsMenu()
      },
      {
        id: 'exit',
        label: '👋 Exit',
        description: 'Exit the interactive CLI',
        action: () => this.exit()
      }
    ];

    while (true) {
      this.displayMenu(mainMenu, '🎯 Main Menu - Select an option:');
      
      const choice = await this.getUserInput('Enter your choice (or type "help" for more info):');
      
      if (choice.toLowerCase() === 'help') {
        await this.showHelp(mainMenu);
        continue;
      }

      const option = this.findMenuOption(mainMenu, choice);
      if (option) {
        if (option.suboptions) {
          await this.handleSubMenu(option);
        } else {
          await option.action();
        }
      } else {
        empireLog.error(`❌ Invalid choice: ${choice}. Please try again.`);
        await this.pause();
      }
    }
  }

  /**
   * Display menu options
   */
  private displayMenu(options: MenuOption[], title: string): void {
    console.clear();
    console.info(renderLogo('small'));
    console.info(chalk.cyan(`\n${title}\n`));
    
    options.forEach((option, index) => {
      const prefix = `${index + 1}.`.padEnd(3);
      console.info(`${prefix} ${chalk.green(option.label.padEnd(25))} ${chalk.gray(option.description)}`);
    });
    
    console.info(chalk.yellow('\n💡 Tip: You can also type the option name or number'));
  }

  /**
   * Get user input with prompt
   */
  private async getUserInput(prompt: string): Promise<string> {
    console.info(chalk.cyan(`\n${prompt}`));
    process.stdout.write('> ');
    
    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let input = '';
      
      process.stdin.on('data', (key) => {
        if (key === '\r' || key === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.info();
          resolve(input.trim());
        } else if (key === '\u0003') { // Ctrl+C
          process.exit(0);
        } else if (key === '\u007F') { // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (key >= ' ') {
          input += key;
          process.stdout.write(key);
        }
      });
    });
  }

  /**
   * Find menu option by user input
   */
  private findMenuOption(options: MenuOption[], input: string): MenuOption | null {
    // Try by number
    const index = parseInt(input) - 1;
    if (index >= 0 && index < options.length) {
      return options[index];
    }
    
    // Try by ID
    return options.find(option => 
      option.id.toLowerCase().includes(input.toLowerCase()) ||
      option.label.toLowerCase().includes(input.toLowerCase())
    ) || null;
  }

  /**
   * Handle submenu navigation
   */
  private async handleSubMenu(parentOption: MenuOption): Promise<void> {
    if (!parentOption.suboptions) return;
    
    while (true) {
      this.displayMenu(parentOption.suboptions, `${parentOption.label} - Select an option:`);
      
      const choice = await this.getUserInput('Enter your choice (or "back" to return):');
      
      if (choice.toLowerCase() === 'back') {
        break;
      }
      
      const option = this.findMenuOption(parentOption.suboptions, choice);
      if (option) {
        await option.action();
      } else {
        empireLog.error(`❌ Invalid choice: ${choice}. Please try again.`);
        await this.pause();
      }
    }
  }

  /**
   * Show help information
   */
  private async showHelp(options: MenuOption[]): Promise<void> {
    console.clear();
    console.info(chalk.cyan('📚 Help - Available Commands\n'));
    
    options.forEach(option => {
      console.info(chalk.green(`${option.label}`));
      console.info(`  ${option.description}`);
      console.info(`  Command: ${option.id}`);
      if (option.suboptions) {
        console.info('  Suboptions:');
        option.suboptions.forEach(sub => {
          console.info(`    • ${sub.label} (${sub.id})`);
        });
      }
      console.info();
    });
    
    await this.pause();
  }

  /**
   * Pause execution until user presses Enter
   */
  private async pause(): Promise<void> {
    console.info(chalk.yellow('\nPress Enter to continue...'));
    await this.getUserInput('');
  }

  /**
   * Phone Intelligence Menu
   */
  private async showPhoneMenu(): Promise<void> {
    // Implementation will be added in next step
    empireLog.info('📱 Phone Intelligence menu coming soon...');
    await this.pause();
  }

  /**
   * Email Intelligence Menu
   */
  private async showEmailMenu(): Promise<void> {
    // Implementation will be added in next step
    empireLog.info('📧 Email Intelligence menu coming soon...');
    await this.pause();
  }

  /**
   * CashApp Intelligence Menu
   */
  private async showCashAppMenu(): Promise<void> {
    // Implementation will be added in next step
    empireLog.info('💰 CashApp Intelligence menu coming soon...');
    await this.pause();
  }

  /**
   * Address Intelligence Menu
   */
  private async showAddressMenu(): Promise<void> {
    // Implementation will be added in next step
    empireLog.info('🏠 Address Intelligence menu coming soon...');
    await this.pause();
  }

  /**
   * Social Intelligence Menu
   */
  private async showSocialMenu(): Promise<void> {
    // Implementation will be added in next step
    empireLog.info('👤 Social Intelligence menu coming soon...');
    await this.pause();
  }

  /**
   * Settings Menu
   */
  private async showSettingsMenu(): Promise<void> {
    console.clear();
    console.info(chalk.cyan('⚙️ Settings\n'));
    
    console.info(`Current Settings:`);
    console.info(`  Output Format: ${chalk.green(this.options.format)}`);
    console.info(`  Debug Mode: ${chalk.green(this.options.debug ? 'Enabled' : 'Disabled')}`);
    console.info(`  Parallel Processing: ${chalk.green(this.options.parallel.toString())}`);
    console.info(`  Timeout: ${chalk.green(this.options.timeout.toString() + 'ms')}`);
    
    await this.pause();
  }

  /**
   * Phone Audit Implementation
   */
  private async performPhoneAudit(): Promise<void> {
    const phoneNumber = await this.getUserInput('Enter phone number to audit:');
    
    if (!phoneNumber) {
      empireLog.error('❌ Phone number is required');
      await this.pause();
      return;
    }

    const spinner = createSpinner('🔍 Performing comprehensive phone audit...');
    spinner.start();

    try {
      const result = await this.cashAppIntel.audit(phoneNumber, {
        correlate: ['email', 'address', 'social'],
        mockLevel: 'high',
        mlConfidence: 0.85
      });

      spinner.succeed();
      
      console.clear();
      console.info(chalk.cyan('📊 Phone Audit Results\n'));
      
      this.displayResults(result, this.options.format);
      
    } catch (error) {
      spinner.fail();
      empireLog.error(`❌ Audit failed: ${error}`);
    }
    
    await this.pause();
  }

  /**
   * Display results in specified format
   */
  private displayResults(results: any, format: string): void {
    switch (format) {
      case 'json':
        console.info(JSON.stringify(results, null, 2));
        break;
      case 'csv':
        // CSV formatting implementation
        console.info('CSV format coming soon...');
        break;
      case 'table':
      default:
        this.displayTable(results);
        break;
    }
  }

  /**
   * Display results as table
   */
  private displayTable(results: any): void {
    // Simple table display - will be enhanced
    console.info(chalk.green('✅ Audit completed successfully'));
    console.info(`Risk Score: ${chalk.yellow(results.risk?.score || 'N/A')}`);
    console.info(`Trust Score: ${chalk.green(results.trust?.score || 'N/A')}`);
  }

  /**
   * Placeholder implementations for other methods
   */
  private async performBatchPhoneAnalysis(): Promise<void> {
    empireLog.info('📦 Batch phone analysis coming soon...');
    await this.pause();
  }

  private async startPhoneMonitoring(): Promise<void> {
    empireLog.info('👁️ Phone monitoring coming soon...');
    await this.pause();
  }

  private async performEmailVerification(): Promise<void> {
    empireLog.info('✅ Email verification coming soon...');
    await this.pause();
  }

  private async performBreachCheck(): Promise<void> {
    empireLog.info('🔓 Breach check coming soon...');
    await this.pause();
  }

  private async performEmailEnrichment(): Promise<void> {
    empireLog.info('💎 Email enrichment coming soon...');
    await this.pause();
  }

  private async performCashAppAnalysis(): Promise<void> {
    empireLog.info('🔍 CashApp analysis coming soon...');
    await this.pause();
  }

  private async performBatchCashAppAnalysis(): Promise<void> {
    empireLog.info('📦 Batch CashApp analysis coming soon...');
    await this.pause();
  }

  private async startCashAppMonitoring(): Promise<void> {
    empireLog.info('📊 CashApp monitoring coming soon...');
    await this.pause();
  }

  private async manageCashAppWebhooks(): Promise<void> {
    empireLog.info('🪝 Webhook management coming soon...');
    await this.pause();
  }

  private async exit(): Promise<void> {
    console.info(chalk.green('\n👋 Thank you for using Empire Pro CLI!'));
    console.info(chalk.cyan('🚀 Empire Pro - Advanced Identity Intelligence Platform\n'));
    process.exit(0);
  }
}

// Export for use in other modules
export default InteractiveCLI;
