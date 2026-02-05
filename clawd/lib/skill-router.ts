/**
 * skill-router.ts - Topic-aware skill routing for clawdbot
 *
 * Usage:
 *   import { SkillRouter } from './lib/skill-router';
 *   const router = new SkillRouter();
 *   const context = await router.getTopicContext(groupId, topicId);
 */

const CONFIG_FILE = `${Bun.env.HOME}/.clawdbot/clawdbot.json`;
const SKILLS_DIR = `${Bun.env.HOME}/clawd/skills`;

export interface SkillInfo {
  name: string;
  description: string;
  emoji?: string;
  content: string;
  triggers?: string[];
}

export interface TopicContext {
  topicId: string;
  systemPrompt: string;
  skills: SkillInfo[];
  requireMention: boolean;
}

interface TopicConfig {
  systemPrompt: string;
  requireMention: boolean;
  skills?: string[];
}

interface Config {
  channels: {
    telegram: {
      groups: {
        [key: string]: {
          enabled?: boolean;
          requireMention?: boolean;
          topics?: {
            [key: string]: TopicConfig;
          };
        };
      };
    };
  };
}

export class SkillRouter {
  private config: Config | null = null;
  private skillCache: Map<string, SkillInfo> = new Map();
  private lastConfigLoad = 0;
  private configTTL = 5000; // Reload config every 5 seconds

  async loadConfig(): Promise<Config> {
    const now = Date.now();
    if (this.config && now - this.lastConfigLoad < this.configTTL) {
      return this.config;
    }

    const file = Bun.file(CONFIG_FILE);
    this.config = await file.json();
    this.lastConfigLoad = now;
    return this.config!;
  }

  async loadSkill(name: string): Promise<SkillInfo | null> {
    if (this.skillCache.has(name)) {
      return this.skillCache.get(name)!;
    }

    const filePath = `${SKILLS_DIR}/${name}.md`;
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      return null;
    }

    const content = await file.text();
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatter) {
      return null;
    }

    const nameMatch = frontmatter[1].match(/name:\s*(.+)/);
    const descMatch = frontmatter[1].match(/description:\s*(.+)/);
    const metaMatch = frontmatter[1].match(/metadata:\s*(.+)/);

    let emoji = "📄";
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        emoji = meta.clawdbot?.emoji || emoji;
      } catch {}
    }

    // Extract triggers from content
    const triggerSection = content.match(/## Triggers\n\n[\s\S]*?Respond to:\n([\s\S]*?)(?:\n##|$)/);
    let triggers: string[] = [];
    if (triggerSection) {
      triggers = triggerSection[1]
        .split("\n")
        .filter(l => l.startsWith("- "))
        .map(l => l.slice(2).replace(/"/g, "").trim());
    }

    const skill: SkillInfo = {
      name: nameMatch?.[1] || name,
      description: descMatch?.[1] || "No description",
      emoji,
      content: content.replace(/^---\n[\s\S]*?\n---\n/, ""), // Remove frontmatter
      triggers
    };

    this.skillCache.set(name, skill);
    return skill;
  }

  async loadAllSkills(): Promise<SkillInfo[]> {
    const skills: SkillInfo[] = [];
    const proc = Bun.spawn(["ls", SKILLS_DIR], { stdout: "pipe" });
    const output = await new Response(proc.stdout).text();

    for (const file of output.trim().split("\n")) {
      if (!file.endsWith(".md")) continue;
      const name = file.replace(".md", "");
      const skill = await this.loadSkill(name);
      if (skill) skills.push(skill);
    }

    return skills;
  }

  async getTopicContext(groupId: string, topicId: string): Promise<TopicContext | null> {
    const config = await this.loadConfig();
    const groupConfig = config.channels.telegram.groups[groupId];

    if (!groupConfig?.topics?.[topicId]) {
      // Return default context if topic not configured
      return {
        topicId,
        systemPrompt: "General assistant",
        skills: [],
        requireMention: groupConfig?.requireMention ?? true
      };
    }

    const topicConfig = groupConfig.topics[topicId];
    const skills: SkillInfo[] = [];

    if (topicConfig.skills) {
      for (const skillName of topicConfig.skills) {
        const skill = await this.loadSkill(skillName);
        if (skill) skills.push(skill);
      }
    }

    return {
      topicId,
      systemPrompt: topicConfig.systemPrompt,
      skills,
      requireMention: topicConfig.requireMention
    };
  }

  buildSystemPrompt(context: TopicContext): string {
    let prompt = context.systemPrompt;

    if (context.skills.length > 0) {
      prompt += "\n\n## Available Skills\n\n";
      for (const skill of context.skills) {
        prompt += `### ${skill.emoji} ${skill.name}\n`;
        prompt += `${skill.description}\n\n`;
        // Include condensed skill content
        const condensed = this.condenseSkillContent(skill.content);
        prompt += condensed + "\n\n";
      }
    }

    return prompt;
  }

  private condenseSkillContent(content: string): string {
    // Extract key sections: Quick Commands, Example Interactions
    const sections: string[] = [];

    const quickCmds = content.match(/## Quick Commands\n\n([\s\S]*?)(?:\n##|$)/);
    if (quickCmds) {
      sections.push("**Quick Commands:**\n" + quickCmds[1].trim());
    }

    const examples = content.match(/## Example Interactions\n\n([\s\S]*?)(?:\n##|$)/);
    if (examples) {
      // Only include first 2-3 examples
      const exampleLines = examples[1].split("\n\n").slice(0, 3).join("\n\n");
      sections.push("**Examples:**\n" + exampleLines);
    }

    // Include any bash code blocks for reference
    const bashBlocks = content.match(/```bash\n([\s\S]*?)```/g);
    if (bashBlocks && bashBlocks.length > 0) {
      const firstBlocks = bashBlocks.slice(0, 2).join("\n");
      if (!sections.some(s => s.includes("```bash"))) {
        sections.push(firstBlocks);
      }
    }

    return sections.join("\n\n");
  }

  matchSkillTrigger(message: string, skills: SkillInfo[]): SkillInfo | null {
    const lowerMsg = message.toLowerCase();

    for (const skill of skills) {
      for (const trigger of skill.triggers || []) {
        // Handle triggers with alternatives (e.g., "weather in [city]")
        const pattern = trigger
          .replace(/\[.*?\]/g, ".*")
          .replace(/,\s*/g, "|");

        try {
          const regex = new RegExp(pattern, "i");
          if (regex.test(lowerMsg)) {
            return skill;
          }
        } catch {
          // Fallback to simple includes check
          if (lowerMsg.includes(trigger.toLowerCase())) {
            return skill;
          }
        }
      }
    }

    return null;
  }

  async getSkillsForTopic(groupId: string, topicId: string): Promise<string[]> {
    const config = await this.loadConfig();
    const groupConfig = config.channels.telegram.groups[groupId];
    return groupConfig?.topics?.[topicId]?.skills || [];
  }

  async getAllTopics(groupId: string): Promise<Map<string, TopicConfig>> {
    const config = await this.loadConfig();
    const groupConfig = config.channels.telegram.groups[groupId];
    return new Map(Object.entries(groupConfig?.topics || {}));
  }

  clearCache() {
    this.skillCache.clear();
    this.config = null;
    this.lastConfigLoad = 0;
  }
}

// Export singleton instance
export const skillRouter = new SkillRouter();
