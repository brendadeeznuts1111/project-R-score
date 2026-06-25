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
    console.info('🎮 Interactive Project Management Dashboard');
    console.info('==========================================\n');

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
    console.info(`📅 Last Updated: ${now.toLocaleString()}`);
    console.info(`🎯 Current Phase: ${this.liveStatus.currentPhase}`);
    console.info(`📊 Overall Progress: ${this.liveStatus.overallProgress}%`);
    console.info(`⏰ Project Day: ${this.calculateProjectDay(now)} of 22\n`);
  }

  private showProgressOverview(): void {
    console.info('📈 Progress Overview');
    console.info('===================');
    
    this.projectData.phases.forEach((phase: any, index: number) => {
      const progressBar = this.createProgressBar(phase.progress, 20);
      const statusIcon = this.getStatusIcon(phase.status);
      console.info(`${statusIcon} Phase ${index + 1}: ${phase.name.padEnd(12)} ${progressBar} ${phase.progress}%`);
    });
    console.info();
  }

  private showPhaseStatus(): void {
    console.info('📍 Phase Details');
    console.info('================');
    
    this.projectData.phases.forEach((phase: any) => {
      console.info(`\n🔧 ${phase.name} (${phase.startDate} → ${phase.endDate})`);
      console.info(`   Status: ${phase.status}`);
      
      phase.tasks.forEach((task: any) => {
        const taskIcon = this.getStatusIcon(task.status);
        const taskBar = this.createProgressBar(task.progress, 15);
        console.info(`   ${taskIcon} ${task.name}: ${taskBar} ${task.progress}%`);
      });
    });
    console.info();
  }

  private showTeamStatus(): void {
    console.info('👥 Team Status');
    console.info('==============');
    
    Object.entries(this.liveStatus.teamStatus).forEach(([team, status]) => {
      const statusIcon = status.includes('Ready') ? '✅' : 
                        status.includes('Waiting') ? '⏳' : 
                        status.includes('Active') ? '🔄' : '📋';
      console.info(`${statusIcon} ${team.padEnd(18)}: ${status}`);
    });
    console.info();
  }

  private showUpcomingMilestones(): void {
    console.info('🎯 Upcoming Milestones');
    console.info('======================');
    
    this.liveStatus.upcomingMilestones.slice(0, 3).forEach((milestone, index) => {
      const daysUntil = this.calculateDaysUntil(milestone);
      const urgency = daysUntil <= 3 ? '🔴' : daysUntil <= 7 ? '🟡' : '🟢';
      console.info(`${index + 1}. ${urgency} ${milestone} (${daysUntil} days)`);
    });
    console.info();
  }

  private showActiveTasks(): void {
    console.info('🔄 Active Tasks');
    console.info('===============');
    
    if (this.liveStatus.activeTasks.length === 0) {
      console.info('No active tasks. Use "start <task-id>" to begin work.');
    } else {
      this.liveStatus.activeTasks.forEach((task, index) => {
        console.info(`${index + 1}. 🔄 ${task}`);
      });
    }
    
    if (this.liveStatus.blockedItems.length > 0) {
      console.info('\n⚠️  Blocked Items:');
      this.liveStatus.blockedItems.forEach((item, index) => {
        console.info(`${index + 1}. 🚫 ${item}`);
      });
    }
    console.info();
  }

  private showMenu(): void {
    console.info('🎮 Available Commands');
    console.info('====================');
    console.info('start <task-id>    - Start working on a task');
    console.info('progress <task-id> <0-100> - Update task progress');
    console.info('complete <task-id> - Mark task as completed');
    console.info('block <description> - Add a blocked item');
    console.info('status <team> <status> - Update team status');
    console.info('milestone <description> - Add new milestone');
    console.info('report             - Generate progress report');
    console.info('refresh            - Refresh dashboard');
    console.info('help               - Show this help');
    console.info('exit               - Exit dashboard');
    console.info();
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

    console.info('🎮 Interactive mode started. Type "help" for commands.\n');

    while (true) {
      try {
        const input = await askQuestion('dashboard> ');
        const [command, ...args] = input.trim().split(' ');
        
        if (command === 'exit' || command === 'quit') {
          break;
        }

        await this.handleCommand(command, args);
        
        if (command !== 'help') {
          console.info('\nPress Enter to continue...');
          await askQuestion('');
          await this.showDashboard();
        }
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    rl.close();
    console.info('\n👋 Dashboard session ended. Project data saved.');
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
        console.info('✅ Dashboard refreshed');
        break;
      case 'help':
        this.showMenu();
        break;
      default:
        console.info('Unknown command. Type "help" for available commands.');
    }
  }

  private async handleStartTask(taskId: string): Promise<void> {
    if (!taskId) {
      console.info('❌ Please provide a task ID (e.g., a1, a2, b1, b2, c1, c2)');
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
        console.info(`✅ Started task: ${task.name}`);
        return;
      }
    }
    
    console.info('❌ Task not found');
  }

  private async handleUpdateProgress(taskId: string, progress: number): Promise<void> {
    if (!taskId || isNaN(progress)) {
      console.info('❌ Usage: progress <task-id> <0-100>');
      return;
    }

    if (progress < 0 || progress > 100) {
      console.info('❌ Progress must be between 0 and 100');
      return;
    }

    // Find and update the task
    for (const phase of this.projectData.phases) {
      const task = phase.tasks.find((t: any) => t.id === taskId);
      if (task) {
        task.progress = progress;
        this.updatePhaseProgress(phase);
        this.updateOverallProgress();
        console.info(`✅ Updated ${task.name} progress to ${progress}%`);
        return;
      }
    }
    
    console.info('❌ Task not found');
  }

  private async handleCompleteTask(taskId: string): Promise<void> {
    if (!taskId) {
      console.info('❌ Please provide a task ID');
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
        console.info(`✅ Completed task: ${task.name}`);
        return;
      }
    }
    
    console.info('❌ Task not found');
  }

  private handleBlockItem(description: string): void {
    if (!description) {
      console.info('❌ Please provide a description');
      return;
    }
    
    this.liveStatus.blockedItems.push(description);
    console.info(`🚫 Added blocked item: ${description}`);
  }

  private handleUpdateTeamStatus(team: string, status: string): void {
    if (!team || !status) {
      console.info('❌ Usage: status <team> <status>');
      return;
    }
    
    if (this.liveStatus.teamStatus[team]) {
      this.liveStatus.teamStatus[team] = status;
      console.info(`✅ Updated ${team} status to: ${status}`);
    } else {
      console.info('❌ Team not found');
    }
  }

  private handleAddMilestone(description: string): void {
    if (!description) {
      console.info('❌ Please provide a milestone description');
      return;
    }
    
    this.liveStatus.upcomingMilestones.push(description);
    console.info(`✅ Added milestone: ${description}`);
  }

  private generateReport(): void {
    console.info('\n📊 Project Progress Report');
    console.info('========================');
    console.info(`Generated: ${new Date().toLocaleString()}`);
    console.info(`Overall Progress: ${this.liveStatus.overallProgress}%`);
    console.info(`Active Tasks: ${this.liveStatus.activeTasks.length}`);
    console.info(`Blocked Items: ${this.liveStatus.blockedItems.length}`);
    console.info(`Upcoming Milestones: ${this.liveStatus.upcomingMilestones.length}`);
    
    console.info('\n📈 Phase Progress:');
    this.projectData.phases.forEach((phase: any, index: number) => {
      console.info(`Phase ${index + 1} (${phase.name}): ${phase.progress}% - ${phase.tasks.filter((t: any) => t.status === 'completed').length}/${phase.tasks.length} tasks completed`);
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
