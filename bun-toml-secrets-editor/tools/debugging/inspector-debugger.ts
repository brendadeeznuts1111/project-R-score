#!/usr/bin/env bun

// scripts/inspector-debugger.js - Advanced debugging with Bun v1.3.7 Inspector API

import { writeFileSync } from 'node:fs';

/**
 * Advanced debugging system leveraging Bun v1.3.7 Inspector API:
 * - node:inspector Profiler API integration
 * - Real-time debugging capabilities
 * - Advanced profiling and analysis
 */

class InspectorDebugger {
  constructor(options = {}) {
    this.port = options.port || 9229;
    this.host = options.host || 'localhost';
    this.inspectorUrl = `http://${this.host}:${this.port}`;
    this.isRunning = false;
    this.sessions = new Map();
    this.breakpoints = new Set();
  }

  // Start inspector server
  async startInspector() {
    if (this.isRunning) {
      console.log('🔍 Inspector is already running');
      return;
    }

    try {
      console.log(`🚀 Starting Inspector on ${this.inspectorUrl}`);
      
      // Enable inspector using Node.js compatibility
      process.env.NODE_OPTIONS = `--inspect=${this.host}:${this.port}`;
      
      // Create inspector session
      const inspector = await import('node:inspector');
      this.inspector = inspector;
      
      // Open session
      this.session = new inspector.Session();
      this.session.connect();
      
      this.isRunning = true;
      console.log(`✅ Inspector started successfully`);
      console.log(`🌐 Open Chrome DevTools: chrome://inspect → ${this.inspectorUrl}`);
      
      // Setup event handlers
      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ Failed to start inspector:', error.message);
      throw error;
    }
  }

  setupEventHandlers() {
    if (!this.session) return;

    this.session.on('Debugger.paused', (params) => {
      console.log('⏸️  Debugger paused:', params.reason);
      console.log(`📍 Location: ${params.callFrames[0]?.functionName || 'anonymous'} at ${params.callFrames[0]?.url}:${params.callFrames[0]?.lineNumber}`);
    });

    this.session.on('Debugger.resumed', () => {
      console.log('▶️  Debugger resumed');
    });

    this.session.on('Debugger.breakpointResolved', (params) => {
      console.log(`🎯 Breakpoint resolved: ${params.breakpointId}`);
    });
  }

  // Enable debugger
  async enableDebugger() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    await this.session.post('Debugger.enable');
    console.log('🔧 Debugger enabled');
  }

  // Set breakpoint
  async setBreakpoint(url, lineNumber, condition = null) {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      const result = await this.session.post('Debugger.setBreakpoint', {
        location: { url, lineNumber },
        condition
      });

      const breakpointId = result.breakpointId;
      this.breakpoints.add(breakpointId);
      
      console.log(`🎯 Breakpoint set at ${url}:${lineNumber}`);
      if (condition) {
        console.log(`   Condition: ${condition}`);
      }
      
      return breakpointId;
    } catch (error) {
      console.error('❌ Failed to set breakpoint:', error.message);
      throw error;
    }
  }

  // Remove breakpoint
  async removeBreakpoint(breakpointId) {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      await this.session.post('Debugger.removeBreakpoint', { breakpointId });
      this.breakpoints.delete(breakpointId);
      console.log(`🗑️  Breakpoint removed: ${breakpointId}`);
    } catch (error) {
      console.error('❌ Failed to remove breakpoint:', error.message);
      throw error;
    }
  }

  // Start CPU profiling
  async startCPUProfiling() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      await this.session.post('Profiler.enable');
      await this.session.post('Profiler.start');
      
      console.log('🔥 CPU profiling started');
      this.profiling = { type: 'cpu', startTime: Date.now() };
      
    } catch (error) {
      console.error('❌ Failed to start CPU profiling:', error.message);
      throw error;
    }
  }

  // Stop CPU profiling
  async stopCPUProfiling() {
    if (!this.session || !this.profiling) {
      throw new Error('CPU profiling not active');
    }

    try {
      const result = await this.session.post('Profiler.stop');
      const profile = result.profile;
      
      const duration = Date.now() - this.profiling.startTime;
      console.log(`✅ CPU profiling completed in ${duration}ms`);
      
      // Save profile
      const profilePath = `./profiles/cpu-inspector-${Date.now()}.json`;
      writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      console.log(`📁 Profile saved: ${profilePath}`);
      
      // Analyze profile
      this.analyzeCPUProfile(profile);
      
      this.profiling = null;
      return profile;
      
    } catch (error) {
      console.error('❌ Failed to stop CPU profiling:', error.message);
      throw error;
    }
  }

  // Analyze CPU profile
  analyzeCPUProfile(profile) {
    console.log('📊 CPU Profile Analysis:');
    
    const totalTime = profile.nodes.reduce((sum, node) => sum + (node.callCount || 0), 0);
    const heavyFunctions = profile.nodes
      .filter(node => node.callCount > 100)
      .sort((a, b) => (b.callCount || 0) - (a.callCount || 0))
      .slice(0, 5);

    console.log(`   Total function calls: ${totalTime.toLocaleString()}`);
    console.log(`   Heavy functions (top 5):`);
    
    heavyFunctions.forEach((func, index) => {
      console.log(`   ${index + 1}. ${func.functionName || 'anonymous'}: ${func.callCount?.toLocaleString() || 0} calls`);
    });
  }

  // Start heap profiling
  async startHeapProfiling() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      await this.session.post('HeapProfiler.enable');
      await this.session.post('HeapProfiler.startSampling', {
        samplingInterval: 1024
      });
      
      console.log('🧠 Heap profiling started');
      this.profiling = { type: 'heap', startTime: Date.now() };
      
    } catch (error) {
      console.error('❌ Failed to start heap profiling:', error.message);
      throw error;
    }
  }

  // Stop heap profiling
  async stopHeapProfiling() {
    if (!this.session || !this.profiling) {
      throw new Error('Heap profiling not active');
    }

    try {
      const result = await this.session.post('HeapProfiler.stopSampling');
      const profile = result.profile;
      
      const duration = Date.now() - this.profiling.startTime;
      console.log(`✅ Heap profiling completed in ${duration}ms`);
      
      // Save profile
      const profilePath = `./profiles/heap-inspector-${Date.now()}.json`;
      writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      console.log(`📁 Profile saved: ${profilePath}`);
      
      // Analyze profile
      this.analyzeHeapProfile(profile);
      
      this.profiling = null;
      return profile;
      
    } catch (error) {
      console.error('❌ Failed to stop heap profiling:', error.message);
      throw error;
    }
  }

  // Analyze heap profile
  analyzeHeapProfile(profile) {
    console.log('📊 Heap Profile Analysis:');
    
    const totalSize = profile.samples.reduce((sum, sample) => sum + sample.size, 0);
    const objectTypes = {};
    
    profile.samples.forEach(sample => {
      const type = sample.object?.type || 'unknown';
      objectTypes[type] = (objectTypes[type] || 0) + 1;
    });

    console.log(`   Total heap size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Object types:`);
    
    Object.entries(objectTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count.toLocaleString()} objects`);
      });
  }

  // Pause execution
  async pause() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    await this.session.post('Debugger.pause');
    console.log('⏸️  Execution paused');
  }

  // Resume execution
  async resume() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    await this.session.post('Debugger.resume');
    console.log('▶️  Execution resumed');
  }

  // Step over
  async stepOver() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    await this.session.post('Debugger.stepOver');
    console.log('⏭️  Stepped over');
  }

  // Step into
  async stepInto() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    await this.session.post('Debugger.stepInto');
    console.log('⤵️  Stepped into');
  }

  // Step out
  async stepOut() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    await this.session.post('Debugger.stepOut');
    console.log('⤴️  Stepped out');
  }

  // Get current call stack
  async getCallStack() {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      const result = await this.session.post('Debugger.getStackTrace', {
        stackTraceId: 1
      });

      console.log('📋 Current Call Stack:');
      result.callFrames.forEach((frame, index) => {
        console.log(`   ${index}. ${frame.functionName || 'anonymous'} at ${frame.url}:${frame.lineNumber}:${frame.columnNumber}`);
      });

      return result.callFrames;
    } catch (error) {
      console.error('❌ Failed to get call stack:', error.message);
      throw error;
    }
  }

  // Evaluate expression
  async evaluate(expression, context = 0) {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      const result = await this.session.post('Runtime.evaluate', {
        expression,
        contextId: context,
        returnByValue: true
      });

      console.log(`🔍 Evaluation: ${expression}`);
      console.log(`   Result: ${result.result.value}`);
      
      return result.result;
    } catch (error) {
      console.error('❌ Failed to evaluate expression:', error.message);
      throw error;
    }
  }

  // Debug a function
  async debugFunction(fn, _options = {}) {
    if (!this.session) {
      throw new Error('Inspector session not active');
    }

    try {
      // Enable debugger
      await this.enableDebugger();

      // Set breakpoint at function start
      const funcStr = fn.toString();
      const lines = funcStr.split('\n');
      
      console.log(`🐛 Debugging function: ${fn.name || 'anonymous'}`);
      console.log(`📝 Function source (${lines.length} lines)`);

      // Execute function with debugging
      const result = await this.evaluate(`(${funcStr})()`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to debug function:', error.message);
      throw error;
    }
  }

  // Stop inspector
  async stopInspector() {
    if (!this.isRunning) {
      console.log('🔍 Inspector is not running');
      return;
    }

    try {
      if (this.session) {
        this.session.disconnect();
      }
      
      this.isRunning = false;
      console.log('🛑 Inspector stopped');
      
    } catch (error) {
      console.error('❌ Failed to stop inspector:', error.message);
    }
  }

  // Get inspector status
  getStatus() {
    return {
      isRunning: this.isRunning,
      url: this.inspectorUrl,
      breakpoints: this.breakpoints.size,
      profiling: this.profiling,
      session: this.session ? 'active' : 'inactive'
    };
  }
}

// Export for use in other modules
export { InspectorDebugger };

// CLI interface
if (import.meta.main) {
  const = new InspectorDebugger();
  
  console.log('🔍 Bun Inspector Debugger Demo');
  console.log('================================');
  
  try {
    // Start inspector
    await .startInspector();
    
    // Enable debugger
    await .enableDebugger();
    
    // Demo profiling
    console.log('\n📊 Starting profiling demo...');
    
    await .startCPUProfiling();
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await .stopCPUProfiling();
    
    // Show status
    console.log('\n📋 Inspector Status:');
    console.log(JSON.stringify(debugger.getStatus(), null, 2));
    
    console.log('\n✅ Inspector demo complete!');
    console.log(`🌐 Connect with Chrome DevTools: ${debugger.inspectorUrl}`);
    
  } catch (error) {
    console.error('❌ Inspector demo failed:', error.message);
  }
}
