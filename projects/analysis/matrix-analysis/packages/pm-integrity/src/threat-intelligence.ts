import { ThreatAnalysis, PackageManifest, ScriptAnomaly, DependencyRisk, ThreatDetectionError } from './types.js';
import { calculateManifestDiffs, hashManifest } from './integrity-utils.js';

export class ThreatIntelligenceService {
  private readonly ANOMALY_THRESHOLD = 0.001;
  private readonly mutationPatterns = [
    /eval\s*\(/i,
    /Function\s*\(/i,
    /process\.env\./i,
    /require\(['"]\.\.\//,
    /__dirname.*path\.join/,
    /child_process/,
    /fs\.(write|append|unlink)/,
    /http(s)?:\/\/(?!registry\.npmjs\.org)/,
    /\$\{[^}]*\}/,
    /;\s*rm\s+/i,
    />\s*\/dev\/null\s*2>&1/,
    /curl\s+.*\|/,
    /wget\s+.*\|/,
    /bash\s+-c/,
    /sh\s+-c/,
    /exec\s*\(/,
    /spawn\s*\(/,
    /\.exec\(/
  ];
  
  private readonly suspiciousDependencies = [
    /^eval-/i,
    /^function-/i,
    /^shelljs/i,
    /^child_process/i,
    /^fs-extra/i,
    /^rimraf/i,
    /^cross-env/i,
    /^dotenv/i
  ];
  
  async analyzeTarball(
    tarball: Buffer,
    originalManifest: PackageManifest
  ): Promise<number> {
    try {
      let anomalyScore = 0;
      
      // 1. File pattern analysis
      const extractedFiles = await this.extractTarballFiles(tarball);
      anomalyScore += await this.analyzeFilePatterns(extractedFiles);
      
      // 2. Manifest mutation analysis
      const extractedManifest = await this.extractPackageJson(tarball);
      anomalyScore += await this.analyzeManifestMutations(
        originalManifest,
        extractedManifest
      );
      
      // 3. Script content analysis
      if (extractedManifest.scripts) {
        anomalyScore += await this.analyzeScriptContent(
          extractedManifest.scripts
        );
      }
      
      // 4. Dependency graph analysis
      anomalyScore += await this.analyzeDependencyGraph(extractedManifest);
      
      // 5. File size and structure analysis
      anomalyScore += await this.analyzeFileStructure(extractedFiles);
      
      return Math.min(1.0, anomalyScore);
    } catch (error) {
      throw new ThreatDetectionError(
        'Failed to analyze tarball',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
  
  private async extractTarballFiles(tarball: Buffer): Promise<string[]> {
    // Simple file extraction simulation
    // In production, use proper tar extraction
    const tarballStr = tarball.toString();
    const fileMatches = tarballStr.match(/[^ \n\r\t]+\.(js|ts|json|md|txt|yml|yaml)/g) || [];
    return [...new Set(fileMatches)];
  }
  
  private async extractPackageJson(tarball: Buffer): Promise<PackageManifest> {
    const tarballStr = tarball.toString();
    const packageJsonMatch = tarballStr.match(/package\.json[^]*?\{[\s\S]*?\}/);
    
    if (!packageJsonMatch) {
      throw new ThreatDetectionError('Could not extract package.json', {});
    }
    
    try {
      const jsonStart = packageJsonMatch[0].indexOf('{');
      const jsonStr = packageJsonMatch[0].substring(jsonStart);
      return JSON.parse(jsonStr);
    } catch (error) {
      throw new ThreatDetectionError('Failed to parse extracted package.json', { error });
    }
  }
  
  private async analyzeFilePatterns(files: string[]): Promise<number> {
    let score = 0;
    
    for (const file of files) {
      // Check for suspicious file extensions
      if (file.endsWith('.exe') || file.endsWith('.bat') || file.endsWith('.sh')) {
        score += 0.2;
      }
      
      // Check for hidden files
      if (file.startsWith('.') && !file.startsWith('.git')) {
        score += 0.1;
      }
      
      // Check for suspicious file names
      if (file.match(/(backdoor|malware|trojan|virus|exploit)/i)) {
        score += 0.5;
      }
      
      // Check for deeply nested files
      const depth = (file.match(/\//g) || []).length;
      if (depth > 10) {
        score += 0.1;
      }
    }
    
    return Math.min(0.5, score);
  }
  
  private async analyzeManifestMutations(
    original: PackageManifest,
    extracted: PackageManifest
  ): Promise<number> {
    const diffs = calculateManifestDiffs(original, extracted);
    let score = 0;
    
    for (const diff of diffs) {
      // Critical fields
      if (['name', 'main', 'exports', 'bin', 'module'].includes(diff.path[0])) {
        score += 0.3;
      }
      
      // Dependency modifications
      if (['dependencies', 'peerDependencies'].includes(diff.path[0])) {
        score += await this.analyzeDependencyChange(diff);
      }
      
      // Script modifications
      if (diff.path[0] === 'scripts') {
        score += await this.analyzeScriptChange(diff);
      }
      
      // New files inclusion
      if (diff.path[0] === 'files' && diff.type === 'added') {
        if (Array.isArray(diff.rhs) && diff.rhs.includes('**/*')) {
          score += 0.2;
        }
      }
    }
    
    return Math.min(0.8, score);
  }
  
  private async analyzeDependencyChange(diff: any): Promise<number> {
    let score = 0.1;
    
    if (diff.type === 'added' && typeof diff.rhs === 'object') {
      for (const [name, version] of Object.entries(diff.rhs)) {
        // Check for suspicious dependency names
        if (this.suspiciousDependencies.some(pattern => pattern.test(name))) {
          score += 0.2;
        }
        
        // Check for version anomalies
        if (typeof version === 'string') {
          if (version.includes('git+') || version.includes('file:')) {
            score += 0.1;
          }
          
          if (version === '*' || version === 'latest') {
            score += 0.05;
          }
        }
      }
    }
    
    return Math.min(0.4, score);
  }
  
  private async analyzeScriptChange(diff: any): Promise<number> {
    let score = 0.1;
    
    if (diff.type === 'modified' && typeof diff.rhs === 'string') {
      // Check for suspicious patterns in new script
      for (const pattern of this.mutationPatterns) {
        if (pattern.test(diff.rhs)) {
          score += 0.15;
        }
      }
      
      // Check script length changes
      if (typeof diff.lhs === 'string') {
        const lengthChange = Math.abs(diff.rhs.length - diff.lhs.length);
        if (lengthChange > 1000) {
          score += 0.1;
        }
      }
    }
    
    return Math.min(0.3, score);
  }
  
  private async analyzeScriptContent(scripts: Record<string, string>): Promise<number> {
    let score = 0;
    
    for (const [name, script] of Object.entries(scripts)) {
      // Check for suspicious patterns
      for (const pattern of this.mutationPatterns) {
        if (pattern.test(script)) {
          score += 0.1;
        }
      }
      
      // Check script length anomalies
      const expectedLength = this.getExpectedScriptLength(name);
      if (script.length > expectedLength * 2) {
        score += 0.05;
      }
      
      // Check for obfuscated code
      if (this.isObfuscated(script)) {
        score += 0.2;
      }
      
      // Check for network requests
      if (script.match(/(curl|wget|fetch|axios|request)/i)) {
        score += 0.1;
      }
    }
    
    return Math.min(0.5, score);
  }
  
  private getExpectedScriptLength(scriptName: string): number {
    const baseLengths: Record<string, number> = {
      'prepack': 100,
      'prepare': 200,
      'prepublishOnly': 150,
      'postpack': 100,
      'publish': 100,
      'postpublish': 100,
      'install': 300,
      'postinstall': 300,
      'test': 200,
      'start': 100,
      'build': 300,
      'dev': 100
    };
    
    return baseLengths[scriptName] || 200;
  }
  
  private isObfuscated(script: string): boolean {
    // Check for common obfuscation patterns
    const obfuscationPatterns = [
      /\\x[0-9a-f]{2}/gi,
      /\\u[0-9a-f]{4}/gi,
      /\[\s*"[^"]+"\s*\]/g,
      /String\.fromCharCode/g,
      /\[\s*\d+\s*\]/g
    ];
    
    let obfuscatedCount = 0;
    for (const pattern of obfuscationPatterns) {
      if (pattern.test(script)) {
        obfuscatedCount++;
      }
    }
    
    return obfuscatedCount >= 2;
  }
  
  private async analyzeDependencyGraph(manifest: PackageManifest): Promise<number> {
    let score = 0;
    
    // Analyze dependencies
    if (manifest.dependencies) {
      score += await this.analyzeDependencies(manifest.dependencies);
    }
    
    // Analyze devDependencies
    if (manifest.devDependencies) {
      score += await this.analyzeDependencies(manifest.devDependencies) * 0.5;
    }
    
    // Check dependency count
    const totalDeps = Object.keys(manifest.dependencies || {}).length + 
                     Object.keys(manifest.devDependencies || {}).length;
    
    if (totalDeps > 500) {
      score += 0.1;
    }
    
    if (totalDeps > 1000) {
      score += 0.2;
    }
    
    return Math.min(0.4, score);
  }
  
  private async analyzeDependencies(deps: Record<string, string>): Promise<number> {
    let score = 0;
    
    for (const [name, version] of Object.entries(deps)) {
      // Check for suspicious names
      if (this.suspiciousDependencies.some(pattern => pattern.test(name))) {
        score += 0.1;
      }
      
      // Check version patterns
      if (typeof version === 'string') {
        if (version.includes('github.com') && !version.includes('#')) {
          score += 0.05;
        }
        
        if (version.match(/[a-f0-9]{40}/)) {
          // Full git hash - less suspicious
          score -= 0.02;
        }
        
        if (version === '*' || version === 'latest') {
          score += 0.05;
        }
      }
    }
    
    return Math.min(0.3, score);
  }
  
  private async analyzeFileStructure(files: string[]): Promise<number> {
    let score = 0;
    
    // Check file count
    if (files.length > 1000) {
      score += 0.1;
    }
    
    // Check for duplicate files
    const uniqueFiles = new Set(files);
    if (uniqueFiles.size !== files.length) {
      score += 0.1;
    }
    
    // Check directory structure
    const dirs = files.map(f => f.split('/')[0]).filter(d => d);
    const uniqueDirs = new Set(dirs);
    
    if (uniqueDirs.size > 50) {
      score += 0.05;
    }
    
    // Check for empty files
    let emptyFileCount = 0;
    for (const file of files) {
      if (file.length < 10) {
        emptyFileCount++;
      }
    }
    
    if (emptyFileCount > files.length * 0.1) {
      score += 0.1;
    }
    
    return Math.min(0.3, score);
  }
  
  // Public methods for detailed threat analysis
  async getDetailedThreatAnalysis(
    tarball: Buffer,
    originalManifest: PackageManifest
  ): Promise<ThreatAnalysis> {
    const anomalyScore = await this.analyzeTarball(tarball, originalManifest);
    
    const extractedFiles = await this.extractTarballFiles(tarball);
    const extractedManifest = await this.extractPackageJson(tarball);
    
    const suspiciousPatterns = await this.identifySuspiciousPatterns(extractedFiles);
    const unauthorizedMutations = calculateManifestDiffs(originalManifest, extractedManifest);
    const scriptAnomalies = await this.analyzeScriptAnomalies(extractedManifest.scripts || {});
    const dependencyRisks = await this.assessDependencyRisks(extractedManifest);
    
    return {
      anomalyScore,
      suspiciousPatterns,
      unauthorizedMutations,
      scriptAnomalies,
      dependencyRisks
    };
  }
  
  private async identifySuspiciousPatterns(files: string[]): Promise<string[]> {
    const patterns: string[] = [];
    
    for (const file of files) {
      if (file.match(/\.(exe|bat|sh|cmd|ps1)$/i)) {
        patterns.push(`Executable file: ${file}`);
      }
      
      if (file.match(/(backdoor|malware|trojan|virus|exploit)/i)) {
        patterns.push(`Suspicious filename: ${file}`);
      }
      
      if (file.startsWith('.') && !file.startsWith('.git')) {
        patterns.push(`Hidden file: ${file}`);
      }
    }
    
    return [...new Set(patterns)];
  }
  
  private async analyzeScriptAnomalies(scripts: Record<string, string>): Promise<ScriptAnomaly[]> {
    const anomalies: ScriptAnomaly[] = [];
    
    for (const [name, script] of Object.entries(scripts)) {
      for (const pattern of this.mutationPatterns) {
        const match = script.match(pattern);
        if (match) {
          const lines = script.split('\n');
          const lineIndex = lines.findIndex(line => line.match(pattern));
          
          anomalies.push({
            script: name,
            pattern: pattern.source,
            severity: this.getPatternSeverity(pattern),
            line: lineIndex >= 0 ? lineIndex + 1 : undefined
          });
        }
      }
    }
    
    return anomalies;
  }
  
  private getPatternSeverity(pattern: RegExp): number {
    const severityMap: Record<string, number> = {
      'eval\\s*\\(': 0.9,
      'Function\\s*\\(': 0.8,
      'child_process': 0.7,
      'fs\\.(write|append|unlink)': 0.6,
      'process\\.env\\.': 0.5,
      'curl\\s+.*\\|': 0.8,
      'wget\\s+.*\\|': 0.8,
      '\\$\\{[^}]*\\}': 0.4
    };
    
    const patternStr = pattern.source;
    return severityMap[patternStr] || 0.3;
  }
  
  private async assessDependencyRisks(manifest: PackageManifest): Promise<DependencyRisk[]> {
    const risks: DependencyRisk[] = [];
    
    const allDeps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies
    };
    
    for (const [name, version] of Object.entries(allDeps)) {
      let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let reason = '';
      
      if (this.suspiciousDependencies.some(pattern => pattern.test(name))) {
        risk = 'high';
        reason = 'Matches suspicious dependency pattern';
      }
      
      if (typeof version === 'string') {
        if (version === '*' || version === 'latest') {
          risk = 'medium';
          reason = 'Uses wildcard version';
        }
        
        if (version.includes('git+') && !version.includes('github.com')) {
          risk = 'high';
          reason = 'Uses non-GitHub git URL';
        }
      }
      
      if (risk !== 'low') {
        risks.push({ name, risk, reason });
      }
    }
    
    return risks;
  }
}
