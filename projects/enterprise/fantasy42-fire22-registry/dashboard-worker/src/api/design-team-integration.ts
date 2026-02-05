/**
 * Fire22 Dashboard Design Team Integration API
 * Coordinates with Isabella Martinez (Design Director) and Ethan Cooper (UI/UX Designer)
 * for proper design system integration and collaborative workflows
 */

import { SQL } from 'bun';
import { TaskService } from './tasks-enhanced';
import { TaskEventService } from './task-events';

export interface DesignReviewRequest {
  taskUuid: string;
  reviewType: 'ui_design' | 'ux_review' | 'design_system' | 'accessibility' | 'brand_compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  assets?: string[]; // URLs to Figma, prototypes, etc.
  deadline?: string;
  requesterId: string;
  specificReviewer?: 'isabella-martinez' | 'ethan-cooper' | 'any';
}

export interface DesignAsset {
  id: string;
  taskUuid: string;
  type: 'figma_file' | 'prototype' | 'mockup' | 'wireframe' | 'design_token' | 'component';
  url: string;
  title: string;
  description?: string;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DesignSystemUpdate {
  component: string;
  version: string;
  changes: string[];
  affectedTasks: string[];
  migrationGuide?: string;
  updatedBy: string;
}

export class DesignTeamIntegrationService {
  private db: SQL;
  private taskService: TaskService;
  private eventService: TaskEventService;

  // Design team member IDs
  private readonly DESIGN_DIRECTOR = 'isabella-martinez';
  private readonly UX_DESIGNER = 'ethan-cooper';
  private readonly DESIGN_DEPARTMENT = 'design';

  constructor(db: SQL) {
    this.db = db;
    this.taskService = new TaskService(db);
    this.eventService = new TaskEventService(db);
  }

  /**
   * Request design review from the design team
   */
  async requestDesignReview(request: DesignReviewRequest) {
    try {
      console.log(`🎨 Creating design review request for task: ${request.taskUuid}`);

      // Determine the best reviewer based on request type
      const assigneeId = this.determineReviewer(request.reviewType, request.specificReviewer);

      // Create a design review task
      const reviewTask = await this.taskService.createTask({
        title: `Design Review: ${request.reviewType.replace('_', ' ').toUpperCase()}`,
        description: `${request.description}\n\nOriginal Task: ${request.taskUuid}\nAssets: ${request.assets?.join(', ') || 'None provided'}`,
        priority: request.priority,
        status: 'planning',
        progress: 0,
        departmentId: this.DESIGN_DEPARTMENT,
        assigneeId,
        reporterId: request.requesterId,
        dueDate: request.deadline,
        tags: ['design-review', request.reviewType, 'collaboration'],
      });

      if (reviewTask.success) {
        // Add cross-reference comment to original task
        await this.taskService.addComment(request.taskUuid, {
          content: `🎨 Design review requested: ${reviewTask.data!.uuid}\nReview Type: ${request.reviewType}\nAssigned to: ${assigneeId}`,
          type: 'design_review_request',
          userId: request.requesterId,
        });

        // Store design review metadata
        await this.storeDesignReviewMetadata(reviewTask.data!.uuid, request);

        // Emit design review event
        await this.eventService.emitEvent({
          type: 'task_created',
          taskUuid: reviewTask.data!.uuid,
          task: reviewTask.data!,
          user: { id: request.requesterId, name: 'System' },
          timestamp: new Date().toISOString(),
          departmentId: this.DESIGN_DEPARTMENT,
        });

        return {
          success: true,
          data: {
            reviewTaskUuid: reviewTask.data!.uuid,
            assignedTo: assigneeId,
            message: `Design review request created and assigned to ${assigneeId}`,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'REVIEW_CREATION_FAILED',
          message: 'Failed to create design review task',
        },
      };
    } catch (error) {
      console.error('❌ Error creating design review request:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  /**
   * Upload design assets for a task
   */
  async uploadDesignAsset(asset: Omit<DesignAsset, 'id' | 'uploadedAt'>) {
    try {
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const uploadedAt = new Date().toISOString();

      // Store asset metadata in database
      await this.db`
        INSERT INTO design_assets (
          id, task_uuid, type, url, title, description, version, uploaded_by, uploaded_at
        ) VALUES (
          ${assetId}, ${asset.taskUuid}, ${asset.type}, ${asset.url}, 
          ${asset.title}, ${asset.description || ''}, ${asset.version}, 
          ${asset.uploadedBy}, ${uploadedAt}
        )
      `;

      // Add comment to task about new asset
      await this.taskService.addComment(asset.taskUuid, {
        content: `🎨 New design asset uploaded: ${asset.title}\nType: ${asset.type}\nVersion: ${asset.version}\nURL: ${asset.url}`,
        type: 'design_asset',
        userId: asset.uploadedBy,
      });

      return {
        success: true,
        data: {
          id: assetId,
          ...asset,
          uploadedAt,
        },
      };
    } catch (error) {
      console.error('❌ Error uploading design asset:', error);
      return {
        success: false,
        error: {
          code: 'ASSET_UPLOAD_FAILED',
          message: 'Failed to upload design asset',
        },
      };
    }
  }

  /**
   * Get design assets for a task
   */
  async getDesignAssets(taskUuid: string) {
    try {
      const assets = await this.db`
        SELECT * FROM design_assets 
        WHERE task_uuid = ${taskUuid} 
        ORDER BY uploaded_at DESC
      `;

      return {
        success: true,
        data: assets,
      };
    } catch (error) {
      console.error('❌ Error fetching design assets:', error);
      return {
        success: false,
        error: {
          code: 'ASSETS_FETCH_FAILED',
          message: 'Failed to fetch design assets',
        },
      };
    }
  }

  /**
   * Notify about design system updates
   */
  async notifyDesignSystemUpdate(update: DesignSystemUpdate) {
    try {
      console.log(`🔄 Processing design system update for component: ${update.component}`);

      // Create notification tasks for affected projects
      for (const taskUuid of update.affectedTasks) {
        await this.taskService.addComment(taskUuid, {
          content: `🔄 Design System Update: ${update.component} v${update.version}\n\nChanges:\n${update.changes.map(c => `• ${c}`).join('\n')}\n\n${update.migrationGuide ? `Migration Guide: ${update.migrationGuide}` : 'No migration required.'}`,
          type: 'design_system_update',
          userId: update.updatedBy,
        });
      }

      // Store update record
      await this.db`
        INSERT INTO design_system_updates (
          component, version, changes, affected_tasks, migration_guide, updated_by, updated_at
        ) VALUES (
          ${update.component}, ${update.version}, ${JSON.stringify(update.changes)}, 
          ${JSON.stringify(update.affectedTasks)}, ${update.migrationGuide || ''}, 
          ${update.updatedBy}, ${new Date().toISOString()}
        )
      `;

      return {
        success: true,
        data: {
          message: `Design system update processed for ${update.affectedTasks.length} tasks`,
        },
      };
    } catch (error) {
      console.error('❌ Error processing design system update:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_PROCESSING_FAILED',
          message: 'Failed to process design system update',
        },
      };
    }
  }

  /**
   * Get design team workload and availability
   */
  async getDesignTeamWorkload() {
    try {
      const isabellaWorkload = await this.getDesignerWorkload(this.DESIGN_DIRECTOR);
      const ethanWorkload = await this.getDesignerWorkload(this.UX_DESIGNER);

      return {
        success: true,
        data: {
          team: [
            {
              id: this.DESIGN_DIRECTOR,
              name: 'Isabella Martinez',
              role: 'Design Director',
              ...isabellaWorkload,
            },
            {
              id: this.UX_DESIGNER,
              name: 'Ethan Cooper',
              role: 'UI/UX Designer',
              ...ethanWorkload,
            },
          ],
          recommendations: this.generateAssignmentRecommendations(isabellaWorkload, ethanWorkload),
        },
      };
    } catch (error) {
      console.error('❌ Error fetching design team workload:', error);
      return {
        success: false,
        error: {
          code: 'WORKLOAD_FETCH_FAILED',
          message: 'Failed to fetch design team workload',
        },
      };
    }
  }

  /**
   * Initialize design team integration (create necessary tables)
   */
  async initializeDesignIntegration() {
    try {
      // Create design assets table
      await this.db`
        CREATE TABLE IF NOT EXISTS design_assets (
          id TEXT PRIMARY KEY,
          task_uuid TEXT NOT NULL,
          type TEXT NOT NULL,
          url TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          version TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          uploaded_at TEXT NOT NULL,
          FOREIGN KEY (task_uuid) REFERENCES tasks(uuid)
        )
      `;

      // Create design review metadata table
      await this.db`
        CREATE TABLE IF NOT EXISTS design_review_metadata (
          review_task_uuid TEXT PRIMARY KEY,
          original_task_uuid TEXT NOT NULL,
          review_type TEXT NOT NULL,
          assets TEXT,
          requester_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (review_task_uuid) REFERENCES tasks(uuid)
        )
      `;

      // Create design system updates table
      await this.db`
        CREATE TABLE IF NOT EXISTS design_system_updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          component TEXT NOT NULL,
          version TEXT NOT NULL,
          changes TEXT NOT NULL,
          affected_tasks TEXT NOT NULL,
          migration_guide TEXT,
          updated_by TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;

      console.log('✅ Design team integration tables initialized');
      return { success: true };
    } catch (error) {
      console.error('❌ Error initializing design integration:', error);
      return {
        success: false,
        error: {
          code: 'INITIALIZATION_FAILED',
          message: 'Failed to initialize design team integration',
        },
      };
    }
  }

  // Private helper methods
  private determineReviewer(reviewType: string, specificReviewer?: string): string {
    if (specificReviewer && specificReviewer !== 'any') {
      return specificReviewer;
    }

    // Auto-assign based on review type
    switch (reviewType) {
      case 'design_system':
      case 'brand_compliance':
        return this.DESIGN_DIRECTOR; // Isabella for strategic design decisions
      case 'ui_design':
      case 'ux_review':
      case 'accessibility':
        return this.UX_DESIGNER; // Ethan for hands-on UI/UX work
      default:
        return this.DESIGN_DIRECTOR; // Default to Design Director
    }
  }

  private async storeDesignReviewMetadata(reviewTaskUuid: string, request: DesignReviewRequest) {
    await this.db`
      INSERT INTO design_review_metadata (
        review_task_uuid, original_task_uuid, review_type, assets, requester_id, created_at
      ) VALUES (
        ${reviewTaskUuid}, ${request.taskUuid}, ${request.reviewType}, 
        ${JSON.stringify(request.assets || [])}, ${request.requesterId}, 
        ${new Date().toISOString()}
      )
    `;
  }

  private async getDesignerWorkload(designerId: string) {
    const activeTasks = await this.taskService.getTasks({
      assigneeId: designerId,
      status: 'active',
    });

    const inProgressTasks = await this.taskService.getTasks({
      assigneeId: designerId,
      status: 'in-progress',
    });

    const totalActive =
      (activeTasks.success ? activeTasks.data!.pagination.total : 0) +
      (inProgressTasks.success ? inProgressTasks.data!.pagination.total : 0);

    return {
      activeTasks: totalActive,
      availability: totalActive < 5 ? 'available' : totalActive < 10 ? 'busy' : 'overloaded',
    };
  }

  private generateAssignmentRecommendations(isabellaWorkload: any, ethanWorkload: any) {
    const recommendations = [];

    if (isabellaWorkload.availability === 'available') {
      recommendations.push(
        'Isabella Martinez is available for strategic design work and design system reviews'
      );
    }

    if (ethanWorkload.availability === 'available') {
      recommendations.push('Ethan Cooper is available for UI/UX design and accessibility reviews');
    }

    if (
      isabellaWorkload.availability === 'overloaded' &&
      ethanWorkload.availability === 'overloaded'
    ) {
      recommendations.push(
        'Both designers are overloaded. Consider extending deadlines or redistributing work.'
      );
    }

    return recommendations;
  }
}

export default DesignTeamIntegrationService;
