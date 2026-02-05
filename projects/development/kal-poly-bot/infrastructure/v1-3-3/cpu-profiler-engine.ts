import "./types.d.ts";
// infrastructure/v1-3-3/cpu-profiler-engine.ts
// Component #57: CPU Profiler Engine for Hot Path Analysis


// Export interfaces for type safety
export interface ProfilerOptions {
  name: string;
  dir?: string;
  sampleInterval?: number;
  duration?: number;
  includeLineNumbers?: boolean;
}

export interface ProfileResult {
  name: string;
  filePath: string;
  samples: number;
  duration: number;
  nodes: ProfileNode[];
  timestamp: number;
}

export interface ProfileNode {
  id: number;
  functionName: string;
  scriptName: string;
  lineNumber: number;
  columnNumber: number;
  hitCount: number;
  children: ProfileNode[];
}

// CPU profiling for Kalman filter hot path analysis
export class CPUProfilerEngine {
  private static activeProfiles = new Map<string, ProfilerSession>();
  private static profileCount = 0;
  private static metrics = {
    totalProfiles: 0,
    averageDuration: 0,
    hotspotsFound: 0,
    kalmanOptimizations: 0,
  };

  // Start CPU profiling session
  static start(options: ProfilerOptions): string {
    if (!process.env.FEATURE_CPU_PROFILING === "1") {
      console.warn("CPU profiling disabled - using no-op profiler");
      return "no-op-profile";
    }

    const sessionId = `profile-${this.profileCount++}-${Date.now()}`;
    const profileDir = options.dir || "./profiles";

    // Ensure profile directory exists
    try {
      Bun.$`mkdir -p ${profileDir}`;
    } catch (error) {
      console.warn(`Failed to create profile directory: ${profileDir}`);
    }

    const session: ProfilerSession = {
      id: sessionId,
      name: options.name,
      startTime: performance.now(),
      options: {
        ...options,
        dir: profileDir,
        sampleInterval: options.sampleInterval || 1,
        includeLineNumbers: options.includeLineNumbers ?? true,
      },
    };

    this.activeProfiles.set(sessionId, session);

    // Start native CPU profiling
    try {
      if (typeof globalThis.startProfiling === "function") {
        globalThis.startProfiling(sessionId, options.sampleInterval);
      } else {
        // Fallback: use performance.mark for basic timing
        performance.mark(`profile-start-${sessionId}`);
      }
    } catch (error) {
      console.warn(`Failed to start profiling: ${error}`);
    }

    console.log(`[PROFILER] Started CPU profile: ${sessionId}`);
    return sessionId;
  }

  // Stop CPU profiling and return results
  static stop(sessionId?: string): string {
    if (!process.env.FEATURE_CPU_PROFILING === "1") {
      return "no-op-profile.cpuprofile";
    }

    const profileId = sessionId || this.getLastActiveProfile();

    if (!profileId) {
      throw new Error("No active profiling session found");
    }

    const session = this.activeProfiles.get(profileId);
    if (!session) {
      throw new Error(`Profile session not found: ${profileId}`);
    }

    const endTime = performance.now();
    const duration = endTime - session.startTime;

    try {
      let profilePath: string;

      if (typeof globalThis.stopProfiling === "function") {
        // Native profiling
        const profileData = globalThis.stopProfiling(profileId);
        profilePath = this.saveProfile(profileId, profileData, session);
      } else {
        // Fallback: create basic profile from performance marks
        profilePath = this.createBasicProfile(profileId, session, duration);
      }

      // Update metrics
      this.updateMetrics(duration, profilePath);

      // Analyze for Kalman-specific hotspots
      this.analyzeKalmanHotspots(profilePath);

      console.log(
        `[PROFILER] Stopped profile: ${profileId} (${duration.toFixed(2)}ms)`
      );
      return profilePath;
    } catch (error) {
      console.error(`Failed to stop profiling: ${error}`);
      throw error;
    } finally {
      this.activeProfiles.delete(profileId);
    }
  }

  // Get last active profile ID
  private static getLastActiveProfile(): string | null {
    const sessions = Array.from(this.activeProfiles.entries());
    if (sessions.length === 0) return null;

    // Return the most recent session
    return sessions[sessions.length - 1][0];
  }

  // Save profile data to file
  private static saveProfile(
    sessionId: string,
    profileData: any,
    session: ProfilerSession
  ): string {
    const fileName = `${session.name}-${Date.now()}.cpuprofile`;
    const filePath = `${session.options.dir}/${fileName}`;

    const profileResult: ProfileResult = {
      name: session.name,
      filePath,
      samples: profileData.samples?.length || 0,
      duration: performance.now() - session.startTime,
      nodes: this.processProfileNodes(profileData.nodes || []),
      timestamp: Date.now(),
    };

    Bun.write(filePath, JSON.stringify(profileResult, null, 2));
    return filePath;
  }

  // Create basic profile from performance marks
  private static createBasicProfile(
    sessionId: string,
    session: ProfilerSession,
    duration: number
  ): string {
    const fileName = `${session.name}-${Date.now()}.cpuprofile`;
    const filePath = `${session.options.dir}/${fileName}`;

    const basicProfile: ProfileResult = {
      name: session.name,
      filePath,
      samples: Math.floor(duration / (session.options.sampleInterval || 1)),
      duration,
      nodes: [
        {
          id: 1,
          functionName: "unknown",
          scriptName: session.name,
          lineNumber: 0,
          columnNumber: 0,
          hitCount: 1,
          children: [],
        },
      ],
      timestamp: Date.now(),
    };

    Bun.write(filePath, JSON.stringify(basicProfile, null, 2));
    return filePath;
  }

  // Process profile nodes for analysis
  private static processProfileNodes(nodes: any[]): ProfileNode[] {
    return nodes.map((node) => ({
      id: node.id || 0,
      functionName: node.functionName || "unknown",
      scriptName: node.scriptName || "unknown",
      lineNumber: node.lineNumber || 0,
      columnNumber: node.columnNumber || 0,
      hitCount: node.hitCount || 0,
      children: this.processProfileNodes(node.children || []),
    }));
  }

  // Analyze profile for Kalman-specific hotspots
  private static analyzeKalmanHotspots(profilePath: string): void {
    try {
      const profileContent = Bun.file(profilePath).text();
      const profile: ProfileResult = JSON.parse(profileContent);

      // Look for Kalman filter related functions
      const kalmanFunctions = profile.nodes.filter(
        (node) =>
          node.functionName.includes("kalman") ||
          node.functionName.includes("filter") ||
          node.functionName.includes("predict") ||
          node.functionName.includes("update") ||
          node.functionName.includes("measure")
      );

      if (kalmanFunctions.length > 0) {
        const totalHitCount = kalmanFunctions.reduce(
          (sum, node) => sum + node.hitCount,
          0
        );
        const avgHitCount = totalHitCount / kalmanFunctions.length;

        console.log(
          `[PROFILER] Found ${kalmanFunctions.length} Kalman hotspots (avg hits: ${avgHitCount.toFixed(0)})`
        );
        this.metrics.kalmanOptimizations++;

        // Log optimization suggestions
        if (avgHitCount > 1000) {
          console.log(
            `[PROFILER] High-frequency Kalman function detected - consider optimization`
          );
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze Kalman hotspots: ${error}`);
    }
  }

  // Update profiling metrics
  private static updateMetrics(duration: number, profilePath: string): void {
    this.metrics.totalProfiles++;
    this.metrics.averageDuration =
      (this.metrics.averageDuration * (this.metrics.totalProfiles - 1) +
        duration) /
      this.metrics.totalProfiles;
  }

  // Get profiling metrics
  static getMetrics(): typeof CPUProfilerEngine.metrics {
    return { ...this.metrics };
  }

  // Reset metrics
  static resetMetrics(): void {
    this.metrics = {
      totalProfiles: 0,
      averageDuration: 0,
      hotspotsFound: 0,
      kalmanOptimizations: 0,
    };
  }

  // CLI helper for CPU profiling
  static cpuProfCLIHelper(): void {
    if (!process.env.FEATURE_CPU_PROFILING === "1") {
      console.log("CPU profiling is disabled");
      return;
    }

    console.log(`
CPU Profiler CLI Helper
=====================

Usage:
  const profiler = CPUProfilerEngine;

  // Start profiling
  const sessionId = profiler.start({
    name: 'kalman-pattern-74',
    dir: './profiles',
    sampleInterval: 1 // 1ms sampling
  });

  // Run your code...

  // Stop profiling
  const profilePath = profiler.stop(sessionId);
  console.log(\`Profile saved to: \${profilePath}\`);

Current Metrics:
- Total Profiles: ${this.metrics.totalProfiles}
- Average Duration: ${this.metrics.averageDuration.toFixed(2)}ms
- Kalman Optimizations: ${this.metrics.kalmanOptimizations}
    `);
  }
}

interface ProfilerSession {
  id: string;
  name: string;
  startTime: number;
  options: Required<ProfilerOptions>;
}

// Zero-cost export
export const { start, stop, getMetrics, resetMetrics, cpuProfCLIHelper } =
  process.env.FEATURE_CPU_PROFILING === "1"
    ? CPUProfilerEngine
    : {
        start: () => "no-op-profile",
        stop: () => "no-op-profile.cpuprofile",
        getMetrics: () => ({
          totalProfiles: 0,
          averageDuration: 0,
          hotspotsFound: 0,
          kalmanOptimizations: 0,
        }),
        resetMetrics: () => {},
        cpuProfCLIHelper: () => console.log("CPU profiling disabled"),
      };

export default CPUProfilerEngine;
