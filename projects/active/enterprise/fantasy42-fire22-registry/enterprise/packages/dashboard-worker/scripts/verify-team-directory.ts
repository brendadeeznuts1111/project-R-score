#!/usr/bin/env bun

/**
 * Team Directory Verification Script
 *
 * Verifies that all team members in the directory have complete information:
 * - Name
 * - Email address (following Fire22 domain conventions)
 * - Role
 * - Phone number
 * - Slack handle
 * - Status
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  slack: string;
  phone?: string;
  status: string;
  avatar: string;
  quickActions: string[];
  priority?: string;
}

interface Department {
  name: string;
  domain: string;
  email: string;
  slack: string;
  color: string;
  members: TeamMember[];
}

interface TeamDirectory {
  departments: Record<string, Department>;
  communicationChannels: any;
}

class TeamDirectoryVerifier {
  private directory: TeamDirectory;
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.directory = this.loadTeamDirectory();
  }

  private loadTeamDirectory(): TeamDirectory {
    const directoryPath = join(this.projectRoot, 'src/communications/team-directory.json');

    try {
      const content = readFileSync(directoryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Failed to load team directory:', error);
      process.exit(1);
    }
  }

  private validateEmail(email: string, departmentDomain: string): boolean {
    // Check if email follows Fire22 domain convention
    const expectedDomain = departmentDomain.replace('@', '');
    return email.endsWith(expectedDomain);
  }

  private validateSlack(slack: string): boolean {
    // Slack handle should start with @
    return slack.startsWith('@');
  }

  private validatePhone(phone: string): boolean {
    // Phone should follow +1-555-#### format
    return /^\+1-555-\d{4}$/.test(phone);
  }

  private validateAvatar(avatar: string, name: string): boolean {
    // Avatar should be initials (2-3 characters)
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
    return avatar === initials;
  }

  public verifyDirectory(): void {
    console.info('🔍 Fire22 Team Directory Verification');
    console.info('═'.repeat(50));

    let totalMembers = 0;
    let validMembers = 0;
    let issues: string[] = [];

    // Verify each department
    Object.entries(this.directory.departments).forEach(([deptKey, department]) => {
      console.info(`\n📂 ${department.name} (${deptKey})`);
      console.info(`   Domain: ${department.domain}`);
      console.info(`   Members: ${department.members.length}`);

      if (department.members.length === 0) {
        console.info('   ⚠️  No members in this department');
        return;
      }

      department.members.forEach((member, index) => {
        totalMembers++;
        let memberValid = true;
        let memberIssues: string[] = [];

        // Validate required fields
        if (!member.name || member.name.trim() === '') {
          memberIssues.push('Missing name');
          memberValid = false;
        }

        if (!member.email || member.email.trim() === '') {
          memberIssues.push('Missing email');
          memberValid = false;
        } else if (!this.validateEmail(member.email, department.domain)) {
          memberIssues.push(`Email domain mismatch (expected ${department.domain})`);
          memberValid = false;
        }

        if (!member.role || member.role.trim() === '') {
          memberIssues.push('Missing role');
          memberValid = false;
        }

        if (!member.slack || !this.validateSlack(member.slack)) {
          memberIssues.push('Invalid Slack handle (should start with @)');
          memberValid = false;
        }

        if (member.phone && !this.validatePhone(member.phone)) {
          memberIssues.push('Invalid phone format (expected +1-555-####)');
          memberValid = false;
        }

        if (!member.status || member.status.trim() === '') {
          memberIssues.push('Missing status');
          memberValid = false;
        }

        if (!member.avatar || !this.validateAvatar(member.avatar, member.name)) {
          memberIssues.push('Invalid avatar (should be initials)');
          memberValid = false;
        }

        if (!member.quickActions || member.quickActions.length === 0) {
          memberIssues.push('Missing quick actions');
          memberValid = false;
        }

        // Display member status
        const statusIcon = memberValid ? '✅' : '❌';
        console.info(`   ${statusIcon} ${member.name} (${member.role})`);
        console.info(`      📧 ${member.email}`);

        if (member.phone) {
          console.info(`      📞 ${member.phone}`);
        }

        if (!memberValid) {
          console.info(`      ⚠️  Issues: ${memberIssues.join(', ')}`);
          issues.push(`${department.name} - ${member.name}: ${memberIssues.join(', ')}`);
        } else {
          validMembers++;
        }
      });
    });

    // Summary
    console.info('\n📊 Verification Summary');
    console.info('═'.repeat(50));
    console.info(`Total Departments: ${Object.keys(this.directory.departments).length}`);
    console.info(`Total Team Members: ${totalMembers}`);
    console.info(`Valid Members: ${validMembers}`);
    console.info(`Invalid Members: ${totalMembers - validMembers}`);

    const validPercentage =
      totalMembers > 0 ? ((validMembers / totalMembers) * 100).toFixed(1) : '0';
    console.info(`Validation Rate: ${validPercentage}%`);

    if (issues.length > 0) {
      console.info('\n❌ Issues Found:');
      console.info('─'.repeat(30));
      issues.forEach((issue, index) => {
        console.info(`${index + 1}. ${issue}`);
      });
    } else {
      console.info('\n✅ All team members have complete information!');
    }

    // Department breakdown
    console.info('\n🏢 Department Breakdown:');
    console.info('─'.repeat(30));
    Object.entries(this.directory.departments).forEach(([key, dept]) => {
      const validDeptMembers = dept.members.filter(
        member => member.name && member.email && member.role && member.slack && member.status
      ).length;
      const totalDeptMembers = dept.members.length;
      const deptRate =
        totalDeptMembers > 0 ? ((validDeptMembers / totalDeptMembers) * 100).toFixed(0) : '0';

      console.info(`${dept.name}: ${validDeptMembers}/${totalDeptMembers} (${deptRate}%)`);
    });

    // Email domains verification
    console.info('\n📧 Email Domain Verification:');
    console.info('─'.repeat(30));
    Object.entries(this.directory.departments).forEach(([key, dept]) => {
      const expectedDomain = dept.domain.replace('@', '');
      const correctEmails = dept.members.filter(
        member => member.email && member.email.endsWith(expectedDomain)
      ).length;

      if (dept.members.length > 0) {
        const domainRate = ((correctEmails / dept.members.length) * 100).toFixed(0);
        console.info(
          `${dept.name}: ${correctEmails}/${dept.members.length} use ${expectedDomain} (${domainRate}%)`
        );
      }
    });

    // Exit code based on validation
    if (issues.length > 0) {
      console.info('\n⚠️  Directory verification completed with issues.');
      process.exit(1);
    } else {
      console.info('\n✅ Directory verification passed!');
      process.exit(0);
    }
  }

  public generateTeamList(): void {
    console.info('\n👥 Complete Team Directory:');
    console.info('═'.repeat(50));

    Object.entries(this.directory.departments).forEach(([key, dept]) => {
      if (dept.members.length > 0) {
        console.info(`\n📂 ${dept.name}`);
        dept.members.forEach(member => {
          console.info(`   • ${member.name} - ${member.role}`);
          console.info(`     📧 ${member.email}`);
          console.info(`     💬 ${member.slack}`);
          if (member.phone) console.info(`     📞 ${member.phone}`);
          console.info(`     📊 Status: ${member.status}`);
        });
      }
    });
  }
}

// Execute if run directly
if (import.meta.main) {
  const verifier = new TeamDirectoryVerifier();

  const args = process.argv.slice(2);
  const command = args[0] || 'verify';

  switch (command) {
    case 'verify':
      verifier.verifyDirectory();
      break;
    case 'list':
      verifier.generateTeamList();
      break;
    case 'both':
      verifier.verifyDirectory();
      verifier.generateTeamList();
      break;
    default:
      console.info('Usage: bun run scripts/verify-team-directory.ts [verify|list|both]');
      process.exit(1);
  }
}

export { TeamDirectoryVerifier };
