#!/usr/bin/env bun

/**
 * Interactive Project Management Dashboard - Real-time Updates
 * 
 * Enhanced version with live status tracking, progress updates,
 * and interactive command interface for project management.
 */


interface LiveProjectStatus {
  lastUpdated: Date;
  currentPhase: string;
  overallProgress: number;
  activeTasks: string[];
  blockedItems: string[];
  upcomingMilestones: string[];
  teamStatus: Record<string, string>;
}

class InteractiveProjectDashboard {
  private projectData: any;
  private liveStatus: LiveProjectStatus;

  constructor() {
    this.initializeProject();
    this.liveStatus = this.initializeLiveStatus();
  }

  private initializeProject(): void {
    // Load the base project data
    this.projectData = {
      phases: [
        {
          name: 'Foundation',
          startDate: '2026-01-16',
          endDate: '2026-01-26',
          progress: 0,
          status: 'planned',
          tasks: [
            { id: 'a1', name: 'Search CLI Development', progress: 0, status: 'todo' },
            { id: 'a2', name: 'Governance Documentation', progress: 0, status: 'todo' }
          ]
        },
        {
          name: 'Automation',
          startDate: '2026-01-24',
          endDate: '2026-02-01',
          progress: 0,
          status: 'planned',
          tasks: [
            { id: 'b1', name: 'Maintenance Suite Development', progress: 0, status: 'todo' },
            { id: 'b2', name: 'Metadata Parser Implementation', progress: 0, status: 'todo' }
          ]
        },
        {
          name: 'Intelligence',
          startDate: '2026-02-01',
          endDate: '2026-02-07',
          progress: 0,
          status: 'planned',
          tasks: [
            { id: 'c1', name: 'Visualization System', progress: 0, status: 'todo' },
            { id: 'c2', name: 'VS Code Extension', progress: 0, status: 'todo' }
          ]
        }
      ]
    };
  }

  private initializeLiveStatus(): LiveProjectStatus {
    return {
      lastUpdated: new Date(),
      currentPhase: 'Foundation',
      overallProgress: 0,
      activeTasks: [],
      blockedItems: [],
      upcomingMilestones: [
        'Search CLI MVP ready (2026-01-23)',
        'Governance docs approved (2026-01-26)',
        'Maintenance suite deployed (2026-01-31)',
        'Visualizations MVP (2026-02-06)'
      ],
      teamStatus: {
        'CLI Team': 'Ready to start',
        'Documentation Team': 'Waiting for dependencies',
        'DevOps Team': 'Planning phase',
        'Backend Team': 'Architecture review',
        'Frontend Team': 'Design phase',
        'Tools Team': 'Research phase'
      }
    };
  }

  /**
   * Display the main dashboard
   */
  async showDashboard(): Promise<void> {
    console.clear();
    console.log('🎮 Interactive Project Management Dashboard');
    console.log('==========================================\n');

    this.showHeader();
    this.showProgressOverview();
    this.showPhaseStatus();
    this.showTeamStatus();
    this.showUpcomingMilestones();
    this.showActiveTasks();
    this.showMenu();
  }

  private showHeader(): void {
    const now = new Date();
    console.log(`📅 Last Updated: ${now.toLocaleString()}`);
    console.log(`🎯 Current Phase: ${this.liveStatus.currentPhase}`);
    console.log(`📊 Overall Progress: ${this.liveStatus.overallProgress}%`);
    console.log(`⏰ Project Day: ${this.calculateProjectDay(now)} of 22\n`);
  }

  private showProgressOverview(): void {
    console.log('📈 Progress Overview');
    console.log('===================');
    
    this.projectData.phases.forEach((phase: any, index: number) => {
      const progressBar = this.createProgressBar(phase.progress, 20);
      const statusIcon = this.getStatusIcon(phase.status);
      console.log(`${statusIcon} Phase ${index + 1}: ${phase.name.padEnd(12)} ${progressBar} ${phase.progress}%`);
    });
    console.log();
  }

  private showPhaseStatus(): void {
    console.log('📍 Phase Details');
    console.log('================');
    
    this.projectData.phases.forEach((phase: any) => {
      console.log(`\n🔧 ${phase.name} (${phase.startDate} → ${phase.endDate})`);
      console.log(`   Status: ${phase.status}`);
      
      phase.tasks.forEach((task: any) => {
        const taskIcon = this.getStatusIcon(task.status);
        const taskBar = this.createProgressBar(task.progress, 15);
        console.log(`   ${taskIcon} ${task.name}: ${taskBar} ${task.progress}%`);
      });
    });
    console.log();
  }

  private showTeamStatus(): void {
    console.log('👥 Team Status');
    console.log('==============');
    
    Object.entries(this.liveStatus.teamStatus).forEach(([team, status]) => {
      const statusIcon = status.includes('Ready') ? '✅' : 
                        status.includes('Waiting') ? '⏳' : 
                        status.includes('Active') ? '🔄' : '📋';
      console.log(`${statusIcon} ${team.padEnd(18)}: ${status}`);
    });
    console.log();
  }

  private showUpcomingMilestones(): void {
    console.log('🎯 Upcoming Milestones');
    console.log('======================');
    
    this.liveStatus.upcomingMilestones.slice(0, 3).forEach((milestone, index) => {
      const daysUntil = this.calculateDaysUntil(milestone);
      const urgency = daysUntil <= 3 ? '🔴' : daysUntil <= 7 ? '🟡' : '🟢';
      console.log(`${index + 1}. ${urgency} ${milestone} (${daysUntil} days)`);
    });
    console.log();
  }

  private showActiveTasks(): void {
    console.log('🔄 Active Tasks');
    console.log('===============');
    
    if (this.liveStatus.activeTasks.length === 0) {
      console.log('No active tasks. Use "start <task-id>" to begin work.');
    } else {
      this.liveStatus.activeTasks.forEach((task, index) => {
        console.log(`${index + 1}. 🔄 ${task}`);
      });
    }
    
    if (this.liveStatus.blockedItems.length > 0) {
      console.log('\n⚠️  Blocked Items:');
      this.liveStatus.blockedItems.forEach((item, index) => {
        console.log(`${index + 1}. 🚫 ${item}`);
      });
    }
    console.log();
  }

  private showMenu(): void {
    console.log('🎮 Available Commands');
    console.log('====================');
    console.log('start <task-id>    - Start working on a task');
    console.log('progress <task-id> <0-100> - Update task progress');
    console.log('complete <task-id> - Mark task as completed');
    console.log('block <description> - Add a blocked item');
    console.log('status <team> <status> - Update team status');
    console.log('milestone <description> - Add new milestone');
    console.log('report             - Generate progress report');
    console.log('refresh            - Refresh dashboard');
    console.log('help               - Show this help');
    console.log('exit               - Exit dashboard');
    console.log();
  }

  /**
   * Start interactive command loop
   */
  async startInteractiveMode(): Promise<void> {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    console.log('🎮 Interactive mode started. Type "help" for commands.\n');

    while (true) {
      try {
        const input = await askQuestion('dashboard> ');
        const [command, ...args] = input.trim().split(' ');
        
        if (command === 'exit' || command === 'quit') {
          break;
        }

        await this.handleCommand(command, args);
        
        if (command !== 'help') {
          console.log('\nPress Enter to continue...');
          await askQuestion('');
          await this.showDashboard();
        }
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    rl.close();
    console.log('\n👋 Dashboard session ended. Project data saved.');
  }

  private async handleCommand(command: string, args: string[]): Promise<void> {
    switch (command) {
      case 'start':
        await this.handleStartTask(args[0]);
        break;
      case 'progress':
        await this.handleUpdateProgress(args[0], parseInt(args[1]));
        break;
      case 'complete':
        await this.handleCompleteTask(args[0]);
        break;
      case 'block':
        this.handleBlockItem(args.join(' '));
        break;
      case 'status':
        this.handleUpdateTeamStatus(args[0], args.slice(1).join(' '));
        break;
      case 'milestone':
        this.handleAddMilestone(args.join(' '));
        break;
      case 'report':
        this.generateReport();
        break;
      case 'refresh':
        this.liveStatus.lastUpdated = new Date();
        console.log('✅ Dashboard refreshed');
        break;
      case 'help':
        this.showMenu();
        break;
      default:
        console.log('Unknown command. Type "help" for available commands.');
    }
  }

  private async handleStartTask(taskId: string): Promise<void> {
    if (!taskId) {
      console.log('❌ Please provide a task ID (e.g., a1, a2, b1, b2, c1, c2)');
      return;
    }

    // Find and update the task
    for (const phase of this.projectData.phases) {
      const task = phase.tasks.find((t: any) => t.id === taskId);
      if (task) {
        task.status = 'in-progress';
        if (!this.liveStatus.activeTasks.includes(task.name)) {
          this.liveStatus.activeTasks.push(task.name);
        }
        console.log(`✅ Started task: ${task.name}`);
        return;
      }
    }
    
    console.log('❌ Task not found');
  }

  private async handleUpdateProgress(taskId: string, progress: number): Promise<void> {
    if (!taskId || isNaN(progress)) {
      console.log('❌ Usage: progress <task-id> <0-100>');
      return;
    }

    if (progress < 0 || progress > 100) {
      console.log('❌ Progress must be between 0 and 100');
      return;
    }

    // Find and update the task
    for (const phase of this.projectData.phases) {
      const task = phase.tasks.find((t: any) => t.id === taskId);
      if (task) {
        task.progress = progress;
        this.updatePhaseProgress(phase);
        this.updateOverallProgress();
        console.log(`✅ Updated ${task.name} progress to ${progress}%`);
        return;
      }
    }
    
    console.log('❌ Task not found');
  }

  private async handleCompleteTask(taskId: string): Promise<void> {
    if (!taskId) {
      console.log('❌ Please provide a task ID');
      return;
    }

    // Find and update the task
    for (const phase of this.projectData.phases) {
      const task = phase.tasks.find((t: any) => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.progress = 100;
        this.liveStatus.activeTasks = this.liveStatus.activeTasks.filter(t => t !== task.name);
        this.updatePhaseProgress(phase);
        this.updateOverallProgress();
        console.log(`✅ Completed task: ${task.name}`);
        return;
      }
    }
    
    console.log('❌ Task not found');
  }

  private handleBlockItem(description: string): void {
    if (!description) {
      console.log('❌ Please provide a description');
      return;
    }
    
    this.liveStatus.blockedItems.push(description);
    console.log(`🚫 Added blocked item: ${description}`);
  }

  private handleUpdateTeamStatus(team: string, status: string): void {
    if (!team || !status) {
      console.log('❌ Usage: status <team> <status>');
      return;
    }
    
    if (this.liveStatus.teamStatus[team]) {
      this.liveStatus.teamStatus[team] = status;
      console.log(`✅ Updated ${team} status to: ${status}`);
    } else {
      console.log('❌ Team not found');
    }
  }

  private handleAddMilestone(description: string): void {
    if (!description) {
      console.log('❌ Please provide a milestone description');
      return;
    }
    
    this.liveStatus.upcomingMilestones.push(description);
    console.log(`✅ Added milestone: ${description}`);
  }

  private generateReport(): void {
    console.log('\n📊 Project Progress Report');
    console.log('========================');
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log(`Overall Progress: ${this.liveStatus.overallProgress}%`);
    console.log(`Active Tasks: ${this.liveStatus.activeTasks.length}`);
    console.log(`Blocked Items: ${this.liveStatus.blockedItems.length}`);
    console.log(`Upcoming Milestones: ${this.liveStatus.upcomingMilestones.length}`);
    
    console.log('\n📈 Phase Progress:');
    this.projectData.phases.forEach((phase: any, index: number) => {
      console.log(`Phase ${index + 1} (${phase.name}): ${phase.progress}% - ${phase.tasks.filter((t: any) => t.status === 'completed').length}/${phase.tasks.length} tasks completed`);
    });
  }

  private updatePhaseProgress(phase: any): void {
    const completedTasks = phase.tasks.filter((t: any) => t.status === 'completed').length;
    phase.progress = Math.round((completedTasks / phase.tasks.length) * 100);
    
    if (phase.progress === 100) {
      phase.status = 'completed';
    } else if (phase.progress > 0) {
      phase.status = 'in-progress';
    }
  }

  private updateOverallProgress(): void {
    const totalProgress = this.projectData.phases.reduce((sum: number, phase: any) => sum + phase.progress, 0);
    this.liveStatus.overallProgress = Math.round(totalProgress / this.projectData.phases.length);
    
    // Update current phase
    for (const phase of this.projectData.phases) {
      if (phase.status === 'in-progress') {
        this.liveStatus.currentPhase = phase.name;
        break;
      }
    }
  }

  private createProgressBar(progress: number, width: number): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'planned': return '📋';
      case 'blocked': return '🚫';
      default: return '⏳';
    }
  }

  private calculateProjectDay(currentDate: Date): number {
    const start = new Date('2026-01-16');
    const diffTime = Math.abs(currentDate.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateDaysUntil(milestone: string): number {
    // Extract date from milestone string (simplified)
    const dateMatch = milestone.match(/\((\d{4}-\d{2}-\d{2})\)/);
    if (dateMatch) {
      const milestoneDate = new Date(dateMatch[1]);
      const today = new Date();
      const diffTime = milestoneDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  }
}

// CLI function
async function runInteractiveDashboard() {
  const dashboard = new InteractiveProjectDashboard();
  await dashboard.showDashboard();
  await dashboard.startInteractiveMode();
}

// Auto-run if executed directly
if (import.meta.main) {
  runInteractiveDashboard().catch(console.error);
}

export { InteractiveProjectDashboard, runInteractiveDashboard };
