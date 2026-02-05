#!/usr/bin/env bun

/**
 * Department Dependency Manager
 * Handles department dependency submissions and package maintenance assignments
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Department {
  name: string;
  head: string;
  email: string;
  internalId: string;
  headEmployeeId: string;
  packages: string[];
  dependencies: string[];
  maintenanceResponsibilities: string[];
  status: 'active' | 'pending' | 'inactive';
}

interface DependencySubmission {
  department: string;
  dependencies: string[];
  justification: string;
  submittedBy: string;
  timestamp: string;
}

interface PackageAssignment {
  packageName: string;
  department: string;
  maintainer: string;
  maintainerEmail: string;
  maintainerEmployeeId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

class DepartmentDependencyManager {
  private departmentsPath = 'src/departments/data/departments.json';
  private submissionsPath = 'src/departments/data/dependency-submissions.json';
  private assignmentsPath = 'src/departments/data/package-assignments.json';
  private notificationsPath = 'src/notifications/department-notifications.json';

  constructor() {
    this.ensureDirectoriesExist();
    this.initializeDepartments();
  }

  private ensureDirectoriesExist() {
    const dirs = ['src/departments/data', 'src/notifications'];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private initializeDepartments() {
    if (!existsSync(this.departmentsPath)) {
      const defaultDepartments: Department[] = [
        {
          name: 'Technology',
          head: 'Mike Hunt',
          email: 'mike.hunt@technology.fire22',
          internalId: 'DEPT-TECH-001',
          headEmployeeId: 'EMP-TECH-001',
          packages: ['@fire22/core-dashboard', '@fire22/pattern-system'],
          dependencies: [],
          maintenanceResponsibilities: [],
          status: 'active',
        },
        {
          name: 'Marketing',
          head: 'TBD',
          email: 'head@marketing.fire22',
          internalId: 'DEPT-MARK-002',
          headEmployeeId: 'TBD',
          packages: ['@fire22/marketing-tools'],
          dependencies: [],
          maintenanceResponsibilities: [],
          status: 'pending',
        },
        {
          name: 'Security',
          head: 'TBD',
          email: 'head@security.fire22',
          internalId: 'DEPT-SEC-003',
          headEmployeeId: 'TBD',
          packages: ['@fire22/security-scanner'],
          dependencies: [],
          maintenanceResponsibilities: [],
          status: 'pending',
        },
        {
          name: 'Finance',
          head: 'TBD',
          email: 'head@finance.fire22',
          internalId: 'DEPT-FIN-004',
          headEmployeeId: 'TBD',
          packages: ['@fire22/financial-reporting'],
          dependencies: [],
          maintenanceResponsibilities: [],
          status: 'pending',
        },
        {
          name: 'Operations',
          head: 'TBD',
          email: 'head@operations.fire22',
          internalId: 'DEPT-OPS-005',
          headEmployeeId: 'TBD',
          packages: ['@fire22/ops-tools'],
          dependencies: [],
          maintenanceResponsibilities: [],
          status: 'pending',
        },
        {
          name: 'Legal',
          head: 'TBD',
          email: 'head@legal.fire22',
          internalId: 'DEPT-LEG-006',
          headEmployeeId: 'TBD',
          packages: ['@fire22/compliance-tools'],
          dependencies: [],
          maintenanceResponsibilities: [],
          status: 'pending',
        },
      ];
      this.saveDepartments(defaultDepartments);
    }
  }

  private loadDepartments(): Department[] {
    try {
      const data = readFileSync(this.departmentsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading departments:', error);
      return [];
    }
  }

  private saveDepartments(departments: Department[]) {
    writeFileSync(this.departmentsPath, JSON.stringify(departments, null, 2));
  }

  private loadSubmissions(): DependencySubmission[] {
    if (!existsSync(this.submissionsPath)) {
      return [];
    }
    try {
      const data = readFileSync(this.submissionsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
      return [];
    }
  }

  private saveSubmissions(submissions: DependencySubmission[]) {
    writeFileSync(this.submissionsPath, JSON.stringify(submissions, null, 2));
  }

  private loadAssignments(): PackageAssignment[] {
    if (!existsSync(this.assignmentsPath)) {
      return [];
    }
    try {
      const data = readFileSync(this.assignmentsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
      return [];
    }
  }

  private saveAssignments(assignments: PackageAssignment[]) {
    writeFileSync(this.assignmentsPath, JSON.stringify(assignments, null, 2));
  }

  // Submit department dependencies
  submitDependencies(
    department: string,
    dependencies: string[],
    justification: string,
    submittedBy: string
  ): boolean {
    try {
      const submissions = this.loadSubmissions();
      const nanoseconds = Bun.nanoseconds();
      const nanoFormatted = (nanoseconds / 1_000_000).toFixed(6);
      const timestampWithNano = `${new Date().toISOString()}[${nanoFormatted}ns]`;

      const newSubmission: DependencySubmission = {
        department,
        dependencies,
        justification,
        submittedBy,
        timestamp: timestampWithNano,
      };

      submissions.push(newSubmission);
      this.saveSubmissions(submissions);

      // Update department dependencies
      const departments = this.loadDepartments();
      const dept = departments.find(d => d.name.toLowerCase() === department.toLowerCase());
      if (dept) {
        dept.dependencies = [...new Set([...dept.dependencies, ...dependencies])];
        this.saveDepartments(departments);
      }

      console.log(`✅ Dependencies submitted for ${department} department`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to submit dependencies for ${department}:`, error);
      return false;
    }
  }

  // Generate package assignments based on department expertise
  generatePackageAssignments() {
    const departments = this.loadDepartments();
    const assignments: PackageAssignment[] = [];

    // Core Fire22 packages with automatic assignments
    const coreAssignments = [
      {
        packageName: '@fire22/core-dashboard',
        department: 'Technology',
        maintainer: 'Mike Hunt',
        maintainerEmail: 'mike.hunt@technology.fire22',
        maintainerEmployeeId: 'EMP-TECH-001',
        priority: 'critical' as const,
        description: 'Main dashboard application with SSE and real-time features',
      },
      {
        packageName: '@fire22/pattern-system',
        department: 'Technology',
        maintainer: 'Mike Hunt',
        maintainerEmail: 'mike.hunt@technology.fire22',
        maintainerEmployeeId: 'EMP-TECH-001',
        priority: 'critical' as const,
        description: 'Pattern Weaver system with 13 unified patterns',
      },
      {
        packageName: '@fire22/security-scanner',
        department: 'Security',
        maintainer: 'TBD',
        maintainerEmail: 'head@security.fire22',
        maintainerEmployeeId: 'TBD',
        priority: 'critical' as const,
        description: 'Bun-native security scanner with CVE detection',
      },
      {
        packageName: '@fire22/api-client',
        department: 'Technology',
        maintainer: 'Mike Hunt',
        maintainerEmail: 'mike.hunt@technology.fire22',
        maintainerEmployeeId: 'EMP-TECH-001',
        priority: 'high' as const,
        description: 'Fire22 API integration client with authentication',
      },
      {
        packageName: '@fire22/sports-betting',
        department: 'Operations',
        maintainer: 'TBD',
        maintainerEmail: 'head@operations.fire22',
        maintainerEmployeeId: 'TBD',
        priority: 'high' as const,
        description: 'Sports betting functionality and wager management',
      },
      {
        packageName: '@fire22/telegram-integration',
        department: 'Marketing',
        maintainer: 'TBD',
        maintainerEmail: 'head@marketing.fire22',
        maintainerEmployeeId: 'TBD',
        priority: 'medium' as const,
        description: 'Telegram bot and notification system',
      },
      {
        packageName: '@fire22/build-system',
        department: 'Technology',
        maintainer: 'Mike Hunt',
        maintainerEmail: 'mike.hunt@technology.fire22',
        maintainerEmployeeId: 'EMP-TECH-001',
        priority: 'high' as const,
        description: 'Multi-profile build system with 9 build profiles',
      },
      {
        packageName: '@fire22/financial-reporting',
        department: 'Finance',
        maintainer: 'TBD',
        maintainerEmail: 'head@finance.fire22',
        maintainerEmployeeId: 'TBD',
        priority: 'high' as const,
        description: 'Financial data processing and reporting tools',
      },
      {
        packageName: '@fire22/compliance-tools',
        department: 'Legal',
        maintainer: 'TBD',
        maintainerEmail: 'head@legal.fire22',
        maintainerEmployeeId: 'TBD',
        priority: 'medium' as const,
        description: 'Legal compliance and audit trail management',
      },
    ];

    assignments.push(...coreAssignments);

    // Update department maintenance responsibilities
    departments.forEach(dept => {
      const deptAssignments = assignments.filter(a => a.department === dept.name);
      dept.maintenanceResponsibilities = deptAssignments.map(a => a.packageName);
    });

    this.saveAssignments(assignments);
    this.saveDepartments(departments);

    console.log('✅ Package assignments generated successfully');
    return assignments;
  }

  // Create notifications for departments
  createDepartmentNotifications() {
    const departments = this.loadDepartments();
    const assignments = this.loadAssignments();
    const notifications = [];

    departments.forEach(dept => {
      const deptAssignments = assignments.filter(a => a.department === dept.name);
      const criticalPackages = deptAssignments.filter(a => a.priority === 'critical');
      const highPackages = deptAssignments.filter(a => a.priority === 'high');

      const notification = {
        id: `dept-${dept.name.toLowerCase()}-${Date.now()}-${Bun.nanoseconds()}`,
        type: 'package-assignment',
        department: dept.name,
        recipient: dept.email,
        head: dept.head,
        timestamp: `${new Date().toISOString()}[${(Bun.nanoseconds() / 1_000_000).toFixed(6)}ns]`,
        subject: `Package Maintenance Assignments - ${dept.name} Department`,
        priority:
          criticalPackages.length > 0 ? 'critical' : highPackages.length > 0 ? 'high' : 'medium',
        content: {
          totalPackages: deptAssignments.length,
          criticalPackages: criticalPackages.length,
          highPackages: highPackages.length,
          assignments: deptAssignments,
          actionRequired:
            dept.head === 'TBD' ? 'Assign department head' : 'Review and acknowledge assignments',
          dependencySubmissionRequired: dept.dependencies.length === 0,
        },
      };

      notifications.push(notification);
    });

    // Save notifications
    writeFileSync(this.notificationsPath, JSON.stringify(notifications, null, 2));
    console.log('✅ Department notifications created');
    return notifications;
  }

  // Generate email templates for departments
  generateEmailTemplates() {
    const departments = this.loadDepartments();
    const assignments = this.loadAssignments();
    const templates = [];

    departments.forEach(dept => {
      const deptAssignments = assignments.filter(a => a.department === dept.name);

      const emailTemplate = {
        to: dept.email,
        cc: 'mike.hunt@management.fire22',
        subject: `🏢 Fire22 Package Maintenance Assignments - ${dept.name} Department`,
        body: `Hello ${dept.head !== 'TBD' ? dept.head : `${dept.name} Department Head`},

🚀 **Fire22 Package Maintenance Assignments**

As part of our enterprise workspace orchestration, your department has been assigned responsibility for maintaining the following packages:

📦 **Your Package Assignments (${deptAssignments.length} total):**

${deptAssignments
  .map(
    a => `
   • **${a.packageName}** (${a.priority.toUpperCase()} priority)
     └─ ${a.description}
     └─ Maintainer: ${a.maintainer}
`
  )
  .join('')}

📋 **Action Items Required:**

${dept.head === 'TBD' ? '1. 🔴 **URGENT**: Assign department head immediately' : '1. ✅ Review package assignments and confirm acceptance'}
${dept.dependencies.length === 0 ? '2. 📝 **Submit department dependencies** using: bun run deps:submit' : '2. ✅ Dependencies already submitted'}
3. 📊 Review package maintenance procedures in CLAUDE.md
4. 🔍 Run package health checks: bun run packages:health-check
5. 📬 Confirm receipt of this assignment

🛠️ **Department Dependency Submission:**
${
  dept.dependencies.length === 0
    ? `
To submit your department's required dependencies, use:
\`\`\`bash
bun run deps:submit --department "${dept.name}" --deps "package1,package2,package3" --justification "reason"
\`\`\`
`
    : `
✅ Dependencies already submitted: ${dept.dependencies.join(', ')}
`
}

📈 **Package Priority Breakdown:**
- Critical: ${deptAssignments.filter(a => a.priority === 'critical').length} packages
- High: ${deptAssignments.filter(a => a.priority === 'high').length} packages  
- Medium: ${deptAssignments.filter(a => a.priority === 'medium').length} packages
- Low: ${deptAssignments.filter(a => a.priority === 'low').length} packages

📚 **Resources:**
- Package Documentation: /docs/packages/${dept.name.toLowerCase()}/
- Maintenance Guide: CLAUDE.md#package-management
- Fire22 Workspace: workspaces/@fire22-${dept.name.toLowerCase()}/
- Support Channel: #${dept.name.toLowerCase()}-department

⚡ **Next Steps:**
1. Acknowledge this email within 24 hours
2. Submit any missing dependencies
3. Review assigned packages
4. Set up department maintenance workflows

Questions? Contact the Technology Department Head: Mike Hunt <mike.hunt@technology.fire22>

Best regards,
Fire22 Management System

🤖 Generated with [Claude Code](https://claude.ai/code)

---
Department: Management  
System: Fire22 Dashboard Worker
Timestamp: ${new Date().toISOString()}[${(Bun.nanoseconds() / 1_000_000).toFixed(6)}ns]`,
      };

      templates.push(emailTemplate);
    });

    // Save email templates
    writeFileSync(
      'src/notifications/department-email-templates.json',
      JSON.stringify(templates, null, 2)
    );
    console.log('✅ Email templates generated');
    return templates;
  }

  // Display department status
  displayDepartmentStatus() {
    const departments = this.loadDepartments();
    const assignments = this.loadAssignments();
    const submissions = this.loadSubmissions();

    console.log('\n📊 DEPARTMENT STATUS REPORT');
    console.log('!==!==!==!==!===');

    departments.forEach(dept => {
      const deptAssignments = assignments.filter(a => a.department === dept.name);
      const deptSubmissions = submissions.filter(s => s.department === dept.name);

      console.log(`\n🏢 ${dept.name.toUpperCase()} DEPARTMENT`);
      console.log(`ID: ${dept.internalId}`);
      console.log(`Head: ${dept.head} (${dept.email})`);
      console.log(`Employee ID: ${dept.headEmployeeId}`);
      console.log(`Status: ${dept.status.toUpperCase()}`);
      console.log(`Packages: ${deptAssignments.length}`);
      console.log(`Dependencies: ${dept.dependencies.length}`);
      console.log(`Submissions: ${deptSubmissions.length}`);

      if (deptAssignments.length > 0) {
        console.log('Package Assignments:');
        deptAssignments.forEach(a => {
          console.log(`  • ${a.packageName} (${a.priority})`);
          console.log(`    └─ Maintainer: ${a.maintainer} (${a.maintainerEmail})`);
          console.log(`    └─ Employee ID: ${a.maintainerEmployeeId}`);
        });
      }
    });

    console.log('\n📋 SUMMARY:');
    console.log(`Total Departments: ${departments.length}`);
    console.log(`Active Departments: ${departments.filter(d => d.status === 'active').length}`);
    console.log(`Pending Departments: ${departments.filter(d => d.status === 'pending').length}`);
    console.log(`Total Packages: ${assignments.length}`);
    console.log(`Total Submissions: ${submissions.length}`);
  }

  // CLI handler
  async handleCommand(command: string, args: string[]) {
    switch (command) {
      case 'submit':
        if (args.length < 4) {
          console.log(
            'Usage: bun run deps:submit --department "Department" --deps "dep1,dep2" --justification "reason"'
          );
          return;
        }
        const deptIndex = args.indexOf('--department') + 1;
        const depsIndex = args.indexOf('--deps') + 1;
        const justIndex = args.indexOf('--justification') + 1;

        if (deptIndex && depsIndex && justIndex) {
          const department = args[deptIndex];
          const dependencies = args[depsIndex].split(',').map(d => d.trim());
          const justification = args[justIndex];
          this.submitDependencies(department, dependencies, justification, 'CLI User');
        }
        break;

      case 'assign':
        this.generatePackageAssignments();
        break;

      case 'notify':
        this.createDepartmentNotifications();
        this.generateEmailTemplates();
        break;

      case 'status':
        this.displayDepartmentStatus();
        break;

      default:
        console.log(`
🏢 Fire22 Department Dependency Manager

Usage:
  bun run dept:dependencies submit --department "Technology" --deps "lodash,express" --justification "Core utilities"
  bun run dept:dependencies assign     # Generate package assignments
  bun run dept:dependencies notify     # Create notifications and email templates  
  bun run dept:dependencies status     # Display department status

Examples:
  bun run dept:dependencies submit --department "Marketing" --deps "@types/react,styled-components" --justification "UI development"
  bun run dept:dependencies assign
  bun run dept:dependencies notify
        `);
    }
  }
}

// Main execution
async function main() {
  const manager = new DepartmentDependencyManager();
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    await manager.handleCommand('help', []);
    return;
  }

  await manager.handleCommand(command, args);
}

// Run if called directly
if (import.meta.main) {
  main();
}
