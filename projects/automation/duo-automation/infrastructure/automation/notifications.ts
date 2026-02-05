// notifications.ts
interface NotificationMessage {
  title: string;
  message: string;
  details?: Record<string, any>;
  level?: "info" | "success" | "warning" | "error";
}

interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    channel?: string;
  };
  teams?: {
    webhookUrl: string;
  };
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async send(message: NotificationMessage): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.slack) {
      promises.push(this.sendSlack(message));
    }

    if (this.config.teams) {
      promises.push(this.sendTeams(message));
    }

    await Promise.allSettled(promises);
  }

  private async sendSlack(message: NotificationMessage): Promise<void> {
    if (!this.config.slack?.webhookUrl) return;

    const color = this.getColorForLevel(message.level || "info");
    const emoji = this.getEmojiForLevel(message.level || "info");

    const payload = {
      channel: this.config.slack.channel,
      username: "DuoPlus Automation",
      icon_emoji: ":robot_face:",
      attachments: [
        {
          color,
          title: `${emoji} ${message.title}`,
          text: message.message,
          fields: message.details
            ? Object.entries(message.details).map(([title, value]) => ({
                title,
                value: String(value),
                short: true
              }))
            : [],
          footer: "DuoPlus Matrix Automation",
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    try {
      // Note: Bun 1.3.6+ preserves header case (Content-Type sent as-is)
      const response = await fetch(this.config.slack.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`❌ Slack notification failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send Slack notification:`, error instanceof Error ? error.message : String(error));
    }
  }

  private async sendTeams(message: NotificationMessage): Promise<void> {
    if (!this.config.teams?.webhookUrl) return;

    const color = this.getColorForLevel(message.level || "info");
    const emoji = this.getEmojiForLevel(message.level || "info");

    const payload = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: message.title,
      themeColor: color,
      sections: [
        {
          activityTitle: `${emoji} ${message.title}`,
          activitySubtitle: message.message,
          facts: message.details
            ? Object.entries(message.details).map(([name, value]) => ({
                name,
                value: String(value)
              }))
            : [],
          markdown: true
        }
      ]
    };

    try {
      // Note: Bun 1.3.6+ preserves header case (Content-Type sent as-is)
      const response = await fetch(this.config.teams.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`❌ Teams notification failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send Teams notification:`, error instanceof Error ? error.message : String(error));
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case "success":
        return "#36a64f";
      case "warning":
        return "#ffa500";
      case "error":
        return "#ff0000";
      default:
        return "#3498db";
    }
  }

  private getEmojiForLevel(level: string): string {
    switch (level) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  }
}
