#!/usr/bin/env bun

// [GIT][BRANCH][MANAGEMENT][GIT-BR-001][v2.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-GB1][v2.0.0][ACTIVE]

import { execSync, spawn } from 'child_process';

interface BranchOptions {
  id: string;
  type?: 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore';
  description?: string;
  baseBranch?: string;
}

class GitBranchManager {
  private currentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      throw new Error('Not in a git repository');
    }
  }

  private branchExists(branchName: string): boolean {
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branchName}`);
      return true;
    } catch {
      return false;
    }
  }

  private isWorkingTreeClean(): boolean {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      return status.trim() === '';
    } catch {
      return false;
    }
  }

  async createBranch(options: BranchOptions): Promise<{ success: boolean; branchName: string; message: string }> {
    const { id, type = 'feat', description = '', baseBranch = 'master' } = options;

    try {
      // Validate we're in a git repo
      this.currentBranch();

      // Check if working tree is clean
      if (!this.isWorkingTreeClean()) {
        throw new Error('Working tree is not clean. Please commit or stash changes first.');
      }

      // Generate branch name
      const branchName = `feat/${id.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

      // Check if branch already exists
      if (this.branchExists(branchName)) {
        throw new Error(`Branch '${branchName}' already exists`);
      }

      // Switch to base branch if not already on it
      const current = this.currentBranch();
      if (current !== baseBranch) {
        console.log(`Switching to ${baseBranch}...`);
        execSync(`git checkout ${baseBranch}`, { stdio: 'inherit' });
        execSync(`git pull origin ${baseBranch}`, { stdio: 'inherit' });
      }

      // Create and switch to new branch
      console.log(`Creating branch: ${branchName}`);
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

      // Create PR template if description provided
      if (description) {
        await this.createPRTemplate(id, description, type);
      }

      return {
        success: true,
        branchName,
        message: `Branch '${branchName}' created successfully${description ? ' with PR template' : ''}`
      };

    } catch (error) {
      return {
        success: false,
        branchName: '',
        message: `Failed to create branch: ${error.message}`
      };
    }
  }

  private async createPRTemplate(id: string, description: string, type: string): Promise<void> {
    const template = `# ${type}: ${id}

## Description
${description}

## Changes
- ${description}

## Validation
- [ ] Code builds successfully
- [ ] Tests pass
- [ ] GOV rules compliant (\`bun rules:validate\`)
- [ ] Documentation updated
- [ ] No breaking changes

## Checklist
- [ ] Self-reviewed
- [ ] Ready for merge

## Related Issues
Closes #${id}
`;

    const filename = `pr-template-${id}.md`;
    await Bun.write(filename, template);
    console.log(`PR template created: ${filename}`);
  }

  async mergeBranch(targetBranch: string = 'master', ffOnly: boolean = true): Promise<{ success: boolean; message: string }> {
    try {
      const current = this.currentBranch();

      if (current === targetBranch) {
        throw new Error('Cannot merge into the same branch');
      }

      // Check if working tree is clean
      if (!this.isWorkingTreeClean()) {
        throw new Error('Working tree is not clean. Please commit changes first.');
      }

      // Fetch latest changes
      execSync(`git fetch origin`, { stdio: 'inherit' });

      // Try fast-forward merge first
      try {
        execSync(`git merge origin/${targetBranch} --ff-only`, { stdio: 'inherit' });
        return {
          success: true,
          message: `Fast-forward merged ${current} into ${targetBranch}`
        };
      } catch (error) {
        if (ffOnly) {
          throw new Error('Fast-forward merge not possible. Use --no-ff-only for merge commit.');
        }

        // Perform regular merge
        execSync(`git merge origin/${targetBranch}`, { stdio: 'inherit' });
        return {
          success: true,
          message: `Merged ${current} into ${targetBranch} with merge commit`
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `Merge failed: ${error.message}`
      };
    }
  }

  async pushBranch(branchName?: string): Promise<{ success: boolean; message: string }> {
    try {
      const branch = branchName || this.currentBranch();

      // Check if remote branch exists
      try {
        execSync(`git ls-remote --heads origin ${branch}`, { stdio: 'pipe' });
      } catch {
        // Remote branch doesn't exist, push with upstream
        execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });
        return {
          success: true,
          message: `Pushed new branch '${branch}' to origin`
        };
      }

      // Push existing branch
      execSync(`git push origin ${branch}`, { stdio: 'inherit' });
      return {
        success: true,
        message: `Pushed branch '${branch}' to origin`
      };

    } catch (error) {
      return {
        success: false,
        message: `Push failed: ${error.message}`
      };
    }
  }

  listBranches(): string {
    try {
      const branches = execSync('git branch -a', { encoding: 'utf-8' });
      return `Git Branches:\n${branches}`;
    } catch (error) {
      return `Error listing branches: ${error.message}`;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const manager = new GitBranchManager();

  if (args.length === 0) {
    console.log(`🚀 Git Branch Manager

USAGE:
  bun branch:create <id> [description] [--type feat|fix|docs|refactor|test|chore]
  bun branch:merge [target-branch] [--no-ff-only]
  bun branch:push [branch-name]
  bun branch:list

EXAMPLES:
  bun branch:create RULE-001 "Add new security rule"
  bun branch:create DP-ALERT-001 --type fix "Fix alert threshold"
  bun branch:merge master
  bun branch:push

SHORTCUTS:
  bun branch:pr <id> [desc]  # Create branch + PR template
`);
    return;
  }

  const command = args[0];

  switch (command) {
    case 'create':
      if (args.length < 2) {
        console.error('Usage: bun branch:create <id> [description] [--type <type>]');
        process.exit(1);
      }

      const id = args[1];
      let description = '';
      let type = 'feat';

      // Parse arguments
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--type' && i + 1 < args.length) {
          type = args[i + 1];
          i++; // Skip next arg
        } else if (!args[i].startsWith('--')) {
          description = args.slice(i).join(' ');
          break;
        }
      }

      const result = await manager.createBranch({ id, type: type as any, description });
      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log(`📝 Next steps:`);
        console.log(`   1. Make your changes`);
        console.log(`   2. bun branch:push`);
        console.log(`   3. Create PR on GitHub`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;

    case 'merge':
      const targetBranch = args[1] || 'master';
      const ffOnly = !args.includes('--no-ff-only');

      const mergeResult = await manager.mergeBranch(targetBranch, ffOnly);
      if (mergeResult.success) {
        console.log(`✅ ${mergeResult.message}`);
      } else {
        console.error(`❌ ${mergeResult.message}`);
        process.exit(1);
      }
      break;

    case 'push':
      const branchName = args[1];
      const pushResult = await manager.pushBranch(branchName);
      if (pushResult.success) {
        console.log(`✅ ${pushResult.message}`);
      } else {
        console.error(`❌ ${pushResult.message}`);
        process.exit(1);
      }
      break;

    case 'list':
      console.log(manager.listBranches());
      break;

    case 'pr':
      // Shortcut for creating branch with PR template
      if (args.length < 2) {
        console.error('Usage: bun branch:pr <id> [description]');
        process.exit(1);
      }

      const prId = args[1];
      const prDesc = args.slice(2).join(' ') || `Auto-generated PR for ${prId}`;

      const prResult = await manager.createBranch({
        id: prId,
        type: 'feat',
        description: prDesc
      });

      if (prResult.success) {
        console.log(`✅ ${prResult.message}`);
        console.log(`🔗 Ready to create PR: ${prResult.branchName}`);
      } else {
        console.error(`❌ ${prResult.message}`);
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Use: bun branch --help');
      process.exit(1);
  }
}

// Export for use in other scripts
export { GitBranchManager };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
