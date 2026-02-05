#!/usr/bin/env bun

/**
 * Fire22 Department Outreach Coordinator
 * Creates tasks to reach out to each department for:
 * - Primary point of contact designation
 * - Department blog information
 * - RSS feed setup and management
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { TaskService } from '../src/api/tasks-enhanced';
import { getDatabase } from '../src/database/connection';

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
  members: any[];
}

interface DepartmentOutreachRequest {
  departmentId: string;
  departmentName: string;
  currentEmail: string;
  currentMembers: any[];
  requestType: 'point_of_contact' | 'blog_setup' | 'rss_feed';
}

class DepartmentOutreachCoordinator {
  private teamDirectory: any;
  private taskService: TaskService | null = null;

  constructor() {
    // Load team directory
    const teamDirectoryPath = join(process.cwd(), 'src', 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  async initialize() {
    const db = await getDatabase(process.env);
    this.taskService = new TaskService(db);
  }

  /**
   * 📞 Create outreach tasks for all departments
   */
  async createDepartmentOutreachTasks(): Promise<void> {
    console.log('📞 Creating department outreach coordination tasks...');

    if (!this.taskService) {
      throw new Error('Task service not initialized');
    }

    const departments = this.getDepartments();
    const createdTasks = [];

    for (const dept of departments) {
      console.log(`\n🏢 Processing ${dept.name}...`);

      // Task 1: Point of Contact Request
      const pocTask = await this.createPointOfContactTask(dept);
      if (pocTask) {
        createdTasks.push(pocTask);
        console.log(`  ✅ Point of contact task created: ${pocTask.uuid}`);
      }

      // Task 2: Blog Information Request
      const blogTask = await this.createBlogInformationTask(dept);
      if (blogTask) {
        createdTasks.push(blogTask);
        console.log(`  ✅ Blog information task created: ${blogTask.uuid}`);
      }

      // Task 3: RSS Feed Setup Request
      const rssTask = await this.createRSSFeedTask(dept);
      if (rssTask) {
        createdTasks.push(rssTask);
        console.log(`  ✅ RSS feed task created: ${rssTask.uuid}`);
      }
    }

    console.log(
      `\n🎯 Summary: Created ${createdTasks.length} outreach tasks across ${departments.length} departments`
    );

    // Create master coordination task
    await this.createMasterCoordinationTask(createdTasks);
  }

  /**
   * 👤 Create point of contact designation task
   */
  private async createPointOfContactTask(dept: Department) {
    const departmentHead = this.getDepartmentHead(dept);
    const assigneeId = departmentHead?.id || 'system';

    const taskData = {
      title: `Designate Primary Point of Contact - ${dept.name}`,
      description: `Please designate the primary point of contact for ${dept.name} for external communications and coordination.

**Current Department Information:**
- Department: ${dept.name}
- Email: ${dept.email}
- Domain: ${dept.domain}
- Current Members: ${dept.members.length}

**Required Information:**
1. **Primary Point of Contact**:
   - Name and role
   - Direct email address
   - Phone number (if available)
   - Preferred communication method

2. **Secondary Contact** (backup):
   - Name and role
   - Contact information

3. **Communication Preferences**:
   - Best times for meetings
   - Preferred communication channels (email, slack, phone)
   - Response time expectations

4. **Authority Level**:
   - Decision-making authority
   - Escalation procedures
   - Budget approval limits (if applicable)

**Current Team Members:**
${dept.members.map(member => `- ${member.name} (${member.role}) - ${member.email}`).join('\n')}

**Next Steps:**
1. Review current team structure
2. Designate primary and secondary contacts
3. Update team directory with contact preferences
4. Confirm communication protocols

**Deadline:** Please respond within 5 business days.`,
      priority: 'high' as const,
      status: 'planning' as const,
      progress: 0,
      departmentId: dept.id,
      assigneeId,
      estimatedHours: 2,
      tags: ['outreach', 'point-of-contact', 'coordination', 'urgent'],
    };

    try {
      const result = await this.taskService!.createTask(taskData);
      return result.success ? result.data : null;
    } catch (error) {
      console.error(`❌ Error creating POC task for ${dept.name}:`, error);
      return null;
    }
  }

  /**
   * 📝 Create blog information request task
   */
  private async createBlogInformationTask(dept: Department) {
    const departmentHead = this.getDepartmentHead(dept);
    const assigneeId = departmentHead?.id || 'system';

    const taskData = {
      title: `Department Blog Information Request - ${dept.name}`,
      description: `Please provide information about ${dept.name}'s blog and content strategy for integration with the Fire22 dashboard system.

**Blog Information Needed:**

1. **Existing Blog Details**:
   - Blog URL (if exists)
   - Platform used (WordPress, Medium, Ghost, etc.)
   - Current posting frequency
   - Content categories/topics

2. **Content Strategy**:
   - Target audience
   - Content themes and focus areas
   - Publishing schedule
   - Content approval process

3. **Technical Details**:
   - Content management system
   - Author access and permissions
   - SEO and analytics setup
   - Integration capabilities

4. **RSS/Feed Information**:
   - Current RSS feed URL
   - Feed format preferences
   - Update frequency
   - Content syndication needs

**If No Blog Exists:**
- Interest in creating a department blog
- Content ideas and potential topics
- Resource availability for content creation
- Preferred platform and setup

**Integration Goals:**
- Dashboard integration requirements
- Cross-department content sharing
- External communication needs
- Brand consistency requirements

**Timeline:** Please provide this information within 1 week.`,
      priority: 'medium' as const,
      status: 'planning' as const,
      progress: 0,
      departmentId: dept.id,
      assigneeId,
      estimatedHours: 3,
      tags: ['outreach', 'blog', 'content-strategy', 'integration'],
    };

    try {
      const result = await this.taskService!.createTask(taskData);
      return result.success ? result.data : null;
    } catch (error) {
      console.error(`❌ Error creating blog task for ${dept.name}:`, error);
      return null;
    }
  }

  /**
   * 📡 Create RSS feed setup task
   */
  private async createRSSFeedTask(dept: Department) {
    const departmentHead = this.getDepartmentHead(dept);
    const assigneeId = departmentHead?.id || 'system';

    const taskData = {
      title: `RSS Feed Setup and Configuration - ${dept.name}`,
      description: `Set up and configure RSS feeds for ${dept.name} to enable automated content distribution and dashboard integration.

**RSS Feed Requirements:**

1. **Feed Configuration**:
   - Department-specific RSS feed URL
   - Feed title and description
   - Content categories to include
   - Update frequency (daily, weekly, etc.)

2. **Content Sources**:
   - Blog posts and articles
   - Department announcements
   - Project updates
   - News and achievements

3. **Technical Specifications**:
   - RSS 2.0 or Atom format preference
   - Feed validation and testing
   - Caching and performance considerations
   - Error handling and fallbacks

4. **Integration Points**:
   - Fire22 dashboard integration
   - Cross-department feed aggregation
   - External syndication needs
   - Analytics and tracking

**Current RSS Infrastructure:**
- Main Fire22 RSS: /feeds/error-codes-rss.xml
- Atom Feed: /feeds/error-codes-atom.xml
- Feed Directory: /feeds/index.html

**Proposed Department Feed Structure:**
- URL: /feeds/${dept.id}-rss.xml
- Atom: /feeds/${dept.id}-atom.xml
- Department Index: /feeds/${dept.id}/

**Implementation Steps:**
1. Define content sources and categories
2. Set up feed generation system
3. Configure update schedules
4. Test feed validation and performance
5. Integrate with dashboard system
6. Document feed usage and maintenance

**Support Available:**
- Technical implementation assistance
- Feed validation and testing
- Dashboard integration support
- Documentation and training

**Timeline:** Setup within 2 weeks of content source identification.`,
      priority: 'medium' as const,
      status: 'planning' as const,
      progress: 0,
      departmentId: dept.id,
      assigneeId,
      estimatedHours: 4,
      tags: ['outreach', 'rss-feed', 'technical-setup', 'integration'],
    };

    try {
      const result = await this.taskService!.createTask(taskData);
      return result.success ? result.data : null;
    } catch (error) {
      console.error(`❌ Error creating RSS task for ${dept.name}:`, error);
      return null;
    }
  }

  /**
   * 📋 Create master coordination task
   */
  private async createMasterCoordinationTask(createdTasks: any[]) {
    const taskData = {
      title: 'Department Outreach Coordination - Master Task',
      description: `Master coordination task for department outreach initiative to establish points of contact and content infrastructure.

**Outreach Scope:**
- ${this.getDepartments().length} departments contacted
- ${createdTasks.length} individual tasks created
- 3 categories: Point of Contact, Blog Information, RSS Feeds

**Department Coverage:**
${this.getDepartments()
  .map(dept => `- ${dept.name} (${dept.id})`)
  .join('\n')}

**Task Categories:**
1. **Point of Contact Designation** - Establish primary contacts
2. **Blog Information Gathering** - Document content strategies  
3. **RSS Feed Setup** - Configure automated content distribution

**Success Criteria:**
- All departments respond with contact information
- Blog strategies documented for each department
- RSS feeds configured and operational
- Dashboard integration completed

**Timeline:**
- Week 1: Initial outreach and responses
- Week 2: Follow-up and clarifications
- Week 3: Technical implementation
- Week 4: Testing and documentation

**Related Tasks:**
${createdTasks.map(task => `- ${task.title} (${task.uuid})`).join('\n')}

**Coordination Notes:**
- Monitor response rates and follow up as needed
- Provide technical assistance for RSS setup
- Ensure consistent communication standards
- Document all contact information and preferences`,
      priority: 'high' as const,
      status: 'active' as const,
      progress: 10,
      departmentId: 'communications',
      assigneeId: 'sarah-martinez',
      estimatedHours: 8,
      tags: ['coordination', 'outreach', 'master-task', 'departments'],
    };

    try {
      const result = await this.taskService!.createTask(taskData);
      if (result.success) {
        console.log(`\n📋 Master coordination task created: ${result.data!.uuid}`);
      }
    } catch (error) {
      console.error('❌ Error creating master coordination task:', error);
    }
  }

  /**
   * 🏢 Get departments from team directory
   */
  private getDepartments(): Department[] {
    const departments: Department[] = [];

    for (const [key, dept] of Object.entries(this.teamDirectory.departments)) {
      if (dept && typeof dept === 'object' && 'name' in dept) {
        departments.push({
          id: key,
          name: dept.name,
          email: dept.email,
          domain: dept.domain,
          color: dept.color,
          members: dept.members || [],
        });
      }
    }

    return departments;
  }

  /**
   * 👤 Get department head (first member with leadership role)
   */
  private getDepartmentHead(dept: Department) {
    return (
      dept.members.find(
        member =>
          member.role.toLowerCase().includes('director') ||
          member.role.toLowerCase().includes('head') ||
          member.role.toLowerCase().includes('lead') ||
          member.role.toLowerCase().includes('manager')
      ) || dept.members[0]
    ); // Fallback to first member
  }
}

// CLI execution
async function main() {
  console.log('🚀 Fire22 Department Outreach Coordinator');
  console.log('!==!==!==!==!==!==!==!==');

  try {
    const coordinator = new DepartmentOutreachCoordinator();
    await coordinator.initialize();
    await coordinator.createDepartmentOutreachTasks();

    console.log('\n✅ Department outreach coordination completed successfully!');
    console.log('\n📧 Next Steps:');
    console.log('1. Monitor task responses from each department');
    console.log('2. Follow up with non-responsive departments');
    console.log('3. Compile contact information and blog details');
    console.log('4. Implement RSS feed infrastructure');
    console.log('5. Update dashboard with new contact information');
  } catch (error) {
    console.error('❌ Error during department outreach coordination:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DepartmentOutreachCoordinator };
