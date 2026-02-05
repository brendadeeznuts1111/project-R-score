#!/usr/bin/env bun
/**
 * Voice Streamer - Real-time voice channel over WebSocket
 * VOICE.STREAM.WEBSOCKET - Hands-free Cursor operation via voice commands
 */

import { spawn } from "bun";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface VoiceSession {
  id: string;
  clientId: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  language: string;
  transcription: string[];
  commands: VoiceCommand[];
}

interface VoiceCommand {
  timestamp: number;
  rawAudio: Uint8Array;
  transcription: string;
  confidence: number;
  intent: string;
  parameters: Record<string, any>;
  executed: boolean;
  result?: string;
}

interface VoiceConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  language: string;
  vadThreshold: number; // Voice Activity Detection
  silenceTimeout: number;
  maxSessionDuration: number;
}

class VoiceStreamer {
  private sessions: Map<string, VoiceSession> = new Map();
  private config: VoiceConfig;
  private activeSessions: Set<string> = new Set();

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      language: 'en-US',
      vadThreshold: 0.3,
      silenceTimeout: 3000,
      maxSessionDuration: 3600000, // 1 hour
      ...config
    };
  }

  // Start voice session
  startSession(clientId: string, language?: string): VoiceSession {
    const sessionId = `voice-${clientId}-${Date.now()}`;

    const session: VoiceSession = {
      id: sessionId,
      clientId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      language: language || this.config.language,
      transcription: [],
      commands: []
    };

    this.sessions.set(sessionId, session);
    this.activeSessions.add(sessionId);

    console.log(`🎤 Started voice session: ${sessionId} for client: ${clientId}`);
    return session;
  }

  // End voice session
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    this.activeSessions.delete(sessionId);

    console.log(`🎤 Ended voice session: ${sessionId} (duration: ${(Date.now() - session.startTime) / 1000}s)`);
    return true;
  }

  // Process audio chunk
  async processAudioChunk(sessionId: string, audioData: Uint8Array, websocket: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return;
    }

    session.lastActivity = Date.now();

    // Check session timeout
    if (Date.now() - session.startTime > this.config.maxSessionDuration) {
      this.endSession(sessionId);
      websocket.send(JSON.stringify({
        type: 'voice_session_ended',
        sessionId,
        reason: 'max_duration_exceeded'
      }));
      return;
    }

    try {
      // Detect voice activity
      const hasVoice = await this.detectVoiceActivity(audioData);

      if (hasVoice) {
        // Transcribe audio
        const transcription = await this.transcribeAudio(audioData, session.language);

        if (transcription.confidence > 0.7) {
          session.transcription.push(transcription.text);

          // Parse intent and execute command
          const command = await this.parseVoiceCommand(transcription.text, transcription.confidence);

          if (command.intent !== 'unknown') {
            session.commands.push({
              timestamp: Date.now(),
              rawAudio: audioData,
              transcription: transcription.text,
              confidence: transcription.confidence,
              ...command,
              executed: false
            });

            // Execute command
            const result = await this.executeVoiceCommand(command.intent, command.parameters);

            // Update command with result
            const lastCommand = session.commands[session.commands.length - 1];
            lastCommand.executed = true;
            lastCommand.result = result;

            // Send response back through WebSocket
            websocket.send(JSON.stringify({
              type: 'voice_command_executed',
              sessionId,
              command: lastCommand,
              result
            }));
          }
        }

        // Send transcription update
        websocket.send(JSON.stringify({
          type: 'voice_transcription',
          sessionId,
          transcription: transcription.text,
          confidence: transcription.confidence,
          timestamp: Date.now()
        }));

      } else {
        // Check for silence timeout
        if (Date.now() - session.lastActivity > this.config.silenceTimeout) {
          websocket.send(JSON.stringify({
            type: 'voice_silence_detected',
            sessionId,
            duration: this.config.silenceTimeout
          }));
        }
      }

    } catch (error) {
      console.error(`Voice processing error for session ${sessionId}:`, error);

      websocket.send(JSON.stringify({
        type: 'voice_error',
        sessionId,
        error: error.message
      }));
    }
  }

  // Detect voice activity in audio chunk
  private async detectVoiceActivity(audioData: Uint8Array): Promise<boolean> {
    // Simple VAD implementation - calculate RMS amplitude
    let sum = 0;
    for (let i = 0; i < audioData.length; i += 2) {
      // Convert 16-bit PCM to number
      const sample = (audioData[i + 1] << 8) | audioData[i];
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / (audioData.length / 2));
    const normalizedRMS = rms / 32768; // 16-bit range

    return normalizedRMS > this.config.vadThreshold;
  }

  // Transcribe audio using speech recognition
  private async transcribeAudio(audioData: Uint8Array, language: string): Promise<{ text: string; confidence: number }> {
    try {
      // For demo purposes, we'll simulate transcription
      // In production, integrate with:
      // - Web Speech API (browser)
      // - Google Speech-to-Text
      // - Azure Speech Services
      // - Whisper (OpenAI)

      // Simulate transcription delay
      await Bun.sleep(100);

      // Mock transcription based on audio data length
      const mockTranscriptions = [
        "implement user authentication",
        "run the tests",
        "deploy to production",
        "create a new component",
        "fix the bug in line 42",
        "optimize database query",
        "add error handling",
        "update dependencies"
      ];

      const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
      const confidence = 0.8 + Math.random() * 0.2; // 0.8-1.0

      return {
        text: mockTranscriptions[randomIndex],
        confidence
      };

    } catch (error) {
      console.error('Transcription error:', error);
      return { text: '', confidence: 0 };
    }
  }

  // Parse voice command intent
  private async parseVoiceCommand(text: string, confidence: number): Promise<{ intent: string; parameters: Record<string, any> }> {
    const normalizedText = text.toLowerCase().trim();

    // Simple intent classification
    if (normalizedText.includes('implement') || normalizedText.includes('create') || normalizedText.includes('add')) {
      return {
        intent: 'code_generation',
        parameters: { task: text, language: 'typescript' }
      };
    }

    if (normalizedText.includes('test') || normalizedText.includes('testing')) {
      return {
        intent: 'run_tests',
        parameters: { suite: 'all', coverage: normalizedText.includes('coverage') }
      };
    }

    if (normalizedText.includes('deploy') || normalizedText.includes('production')) {
      return {
        intent: 'deploy',
        parameters: {
          environment: normalizedText.includes('prod') ? 'production' : 'staging',
          service: 'main-api'
        }
      };
    }

    if (normalizedText.includes('lint') || normalizedText.includes('check')) {
      return {
        intent: 'lint_code',
        parameters: { fix: normalizedText.includes('fix') }
      };
    }

    if (normalizedText.includes('build') || normalizedText.includes('compile')) {
      return {
        intent: 'build_project',
        parameters: { production: normalizedText.includes('prod') }
      };
    }

    return { intent: 'unknown', parameters: {} };
  }

  // Execute voice command
  private async executeVoiceCommand(intent: string, parameters: Record<string, any>): Promise<string> {
    try {
      switch (intent) {
        case 'code_generation':
          return await this.executeCodeGeneration(parameters);

        case 'run_tests':
          return await this.executeTestRun(parameters);

        case 'deploy':
          return await this.executeDeployment(parameters);

        case 'lint_code':
          return await this.executeLinting(parameters);

        case 'build_project':
          return await this.executeBuild(parameters);

        default:
          return `Unknown command intent: ${intent}`;
      }
    } catch (error) {
      return `Command execution failed: ${error.message}`;
    }
  }

  private async executeCodeGeneration(params: any): Promise<string> {
    const proc = spawn({
      cmd: ['bun', 'run', 'scripts/agent-spawn.ts', 'coder', JSON.stringify({
        task: params.task,
        language: params.language
      })],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    return exitCode === 0 ? `Code generated successfully` : `Code generation failed`;
  }

  private async executeTestRun(params: any): Promise<string> {
    const args = ['test'];
    if (params.coverage) args.push('--coverage');

    const proc = spawn({
      cmd: ['bun', 'run', 'package.json', ...args],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    return exitCode === 0 ? `Tests passed ✅` : `Tests failed ❌`;
  }

  private async executeDeployment(params: any): Promise<string> {
    const proc = spawn({
      cmd: ['bun', 'run', 'scripts/agent-spawn.ts', 'installer', JSON.stringify({
        packageName: 'deploy',
        options: params
      })],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    return exitCode === 0 ? `Deployment to ${params.environment} initiated` : `Deployment failed`;
  }

  private async executeLinting(params: any): Promise<string> {
    const args = ['lint'];
    if (params.fix) args.push('--fix');

    const proc = spawn({
      cmd: ['bun', 'run', 'package.json', ...args],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    return exitCode === 0 ? `Linting completed ✅` : `Linting found issues`;
  }

  private async executeBuild(params: any): Promise<string> {
    const args = ['build'];
    if (params.production) args.push('--production');

    const proc = spawn({
      cmd: ['bun', 'run', 'package.json', ...args],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    return exitCode === 0 ? `Build completed ✅` : `Build failed ❌`;
  }

  // Get session statistics
  getSessionStats(sessionId: string): VoiceSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // List active sessions
  getActiveSessions(): VoiceSession[] {
    return Array.from(this.activeSessions).map(id => this.sessions.get(id)!).filter(Boolean);
  }

  // Cleanup inactive sessions
  cleanupInactiveSessions(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (!session.isActive && (now - session.lastActivity) > maxAge) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Generate voice session report
  generateReport(): string {
    const activeSessions = this.getActiveSessions();
    const totalSessions = this.sessions.size;

    let report = '# Voice Streaming Report\n\n';
    report += `## Session Statistics\n\n`;
    report += `- **Active Sessions**: ${activeSessions.length}\n`;
    report += `- **Total Sessions**: ${totalSessions}\n`;
    report += `- **Inactive Sessions**: ${totalSessions - activeSessions.length}\n\n`;

    if (activeSessions.length > 0) {
      report += '## Active Voice Sessions\n\n';
      activeSessions.forEach(session => {
        const duration = Math.floor((Date.now() - session.startTime) / 1000);
        report += `### Session ${session.id}\n\n`;
        report += `- **Client**: ${session.clientId}\n`;
        report += `- **Language**: ${session.language}\n`;
        report += `- **Duration**: ${duration}s\n`;
        report += `- **Transcriptions**: ${session.transcription.length}\n`;
        report += `- **Commands Executed**: ${session.commands.filter(c => c.executed).length}\n\n`;
      });
    }

    return report;
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Voice Streamer v1.0.0 - Real-time voice channel over WebSocket

Usage:
  bun run scripts/voice-streamer.ts <command> [options]

Commands:
  start-session <client-id> [language]    Start voice session
  end-session <session-id>                End voice session
  list-sessions                           List active sessions
  stats                                   Show voice streaming statistics
  report                                  Generate voice session report
  cleanup                                 Clean up inactive sessions

Examples:
  bun run scripts/voice-streamer.ts start-session client-123 en-US
  bun run scripts/voice-streamer.ts list-sessions
  bun run scripts/voice-streamer.ts stats
`);
    return;
  }

  const streamer = new VoiceStreamer();

  try {
    switch (command) {
      case 'start-session':
        const [clientId, language] = args;
        if (!clientId) {
          throw new Error('Usage: start-session <client-id> [language]');
        }
        const session = streamer.startSession(clientId, language);
        console.log(`✅ Started voice session: ${session.id}`);
        break;

      case 'end-session':
        const [sessionId] = args;
        if (!sessionId) {
          throw new Error('Usage: end-session <session-id>');
        }
        const ended = streamer.endSession(sessionId);
        console.log(ended ? `✅ Ended session: ${sessionId}` : `❌ Session not found: ${sessionId}`);
        break;

      case 'list-sessions':
        const sessions = streamer.getActiveSessions();
        console.log('Active Voice Sessions:');
        sessions.forEach(session => {
          const duration = Math.floor((Date.now() - session.startTime) / 1000);
          console.log(`  ${session.id}: ${session.clientId} (${duration}s)`);
        });
        break;

      case 'stats':
        const active = streamer.getActiveSessions();
        console.log('Voice Streaming Statistics:');
        console.log(`  Active Sessions: ${active.length}`);
        console.log(`  Total Sessions: ${streamer.getActiveSessions().length}`);
        break;

      case 'report':
        console.log(streamer.generateReport());
        break;

      case 'cleanup':
        const cleaned = streamer.cleanupInactiveSessions();
        console.log(`🧹 Cleaned up ${cleaned} inactive sessions`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Voice Streamer error:', error.message);
    process.exit(1);
  }
}

export { VoiceStreamer };
export type { VoiceSession, VoiceCommand, VoiceConfig };

// Run CLI if called directly
if (import.meta.main) {
  main();
}
