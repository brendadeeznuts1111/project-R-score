/**
 * Social feed and agent interactions.
 * Feed: in-memory posts (alerts, acknowledgements). Interactions via WebSocket social_interaction.
 */

export type FeedPostType = 'device_alert' | 'alert_ack' | 'social_message' | 'social_interaction';

export interface FeedPost {
  id: string;
  type: FeedPostType;
  fromAgent?: string;
  toAgent?: string;
  deviceId?: string;
  alertId?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface SocialInteraction {
  fromAgent: string;
  toAgent: string;
  type: string;
  content?: string;
  timestamp: number;
}

function generateId(): string {
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class SocialFeed {
  private posts: FeedPost[] = [];
  private readonly maxPosts = 500;
  private interactions: SocialInteraction[] = [];
  private readonly maxInteractions = 1000;
  private sendToAgent: (agentId: string, type: string, data: unknown) => void = () => {};

  setSendToAgent(fn: (agentId: string, type: string, data: unknown) => void): void {
    this.sendToAgent = fn;
  }

  pushPost(post: Omit<FeedPost, 'id' | 'timestamp'>): FeedPost {
    const full: FeedPost = {
      ...post,
      id: generateId(),
      timestamp: Date.now(),
    };
    this.posts.unshift(full);
    if (this.posts.length > this.maxPosts) this.posts.pop();
    return full;
  }

  pushDeviceAlert(deviceId: string, alertId: string, message: string, fromAgent?: string): FeedPost {
    return this.pushPost({
      type: 'device_alert',
      deviceId,
      alertId,
      content: message,
      fromAgent,
      metadata: { deviceId, alertId },
    });
  }

  pushAlertAck(alertId: string, deviceId: string, fromAgent?: string): FeedPost {
    return this.pushPost({
      type: 'alert_ack',
      alertId,
      deviceId,
      content: `Alert ${alertId} acknowledged`,
      fromAgent,
      metadata: { alertId, deviceId },
    });
  }

  getFeed(limit = 50, offset = 0): FeedPost[] {
    return this.posts.slice(offset, offset + limit);
  }

  recordInteraction(fromAgent: string, toAgent: string, type: string, content?: string): void {
    const interaction: SocialInteraction = {
      fromAgent,
      toAgent,
      type,
      content,
      timestamp: Date.now(),
    };
    this.interactions.unshift(interaction);
    if (this.interactions.length > this.maxInteractions) this.interactions.pop();
  }

  handleSocialInteraction(
    fromAgent: string,
    toAgent: string,
    type: string,
    content?: string
  ): void {
    this.recordInteraction(fromAgent, toAgent, type, content);
    this.pushPost({
      type: 'social_interaction',
      fromAgent,
      toAgent,
      content: content ?? type,
      metadata: { type },
    });
    this.sendToAgent(toAgent, 'social_message', {
      fromAgent,
      type,
      content,
      timestamp: Date.now(),
    });
  }

  getInteractions(limit = 100): SocialInteraction[] {
    return this.interactions.slice(0, limit);
  }
}
