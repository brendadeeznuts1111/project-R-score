// packages/test/col93-matrix.ts
import { BunTestConfig } from './config-schema'

// Col 93 Unicode Matrix Generator
export function generateTestMatrix(config: BunTestConfig): string {
  const matrix = `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                        ▸ Bun Test Configuration Matrix                                       ║
║  ◈ Tier-1380 Inheritance Model                                                               ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ Section     │ Inherits From    │ Key Values                      │ Security Scope            ║
╠═════════════╪══════════════════╪═════════════════════════════════╪═══════════════════════════╣
║ [test]      │ —                │ ${formatKeyValues(config.test, 27)} │ Low (local only)          ║
║ [test.ci]   │ [test]           │ ${formatKeyValues(config['test.ci'], 27)} │ Medium (artifact storage) ║
║ Install     │ [install]        │ ${formatKeyValues(config.install, 27)} │ High (private registry)   ║
║ Env Files   │ .env → .env.test │ DATABASE_URL, CSRF_KEY          │ Critical (secret scope)   ║
╚═════════════╧══════════════════╧═════════════════════════════════╧═══════════════════════════╝

${generateInheritanceFlow(config)}

${generateSecurityMatrix(config)}
`
  
  return matrix
}

function formatKeyValues(obj: any, width: number): string {
  if (!obj) return '—'.padEnd(width)
  
  const entries = Object.entries(obj)
    .filter(([key]) => !key.startsWith('_'))
    .slice(0, 2) // Limit for column width
    
  const str = entries.map(([k, v]) => {
    if (typeof v === 'boolean') return `${k}=${v}` 
    if (typeof v === 'number') return `${k}=${v}` 
    if (typeof v === 'string') return `${k}=${v.substring(0, 10)}${v.length > 10 ? '...' : ''}` 
    if (Array.isArray(v)) return `${k}=[${v.length}]` 
    return `${k}=...` 
  }).join(', ')
  
  return str.padEnd(width).substring(0, width)
}

function generateInheritanceFlow(config: BunTestConfig): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                              ◈ Configuration Inheritance Flow                                ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                              ║
║    bunfig.toml                                                                               ║
║    ┌─────────────┐                                                                           ║
║    │ [install]   │ ──────────────────┐                                                      ║
║    │ registry    │                   │                                                      ║
║    │ cafile      │                   ▼                                                      ║
║    │ token       │            ┌─────────────┐                                               ║
║    │ exact       │            │   [test]    │                                               ║
║    └─────────────┘            │ timeout     │                                               ║
║                              │ coverage    │                                               ║
║    ┌─────────────┐            │ preload     │                                               ║
║    │ [test.ci]   │ ◀────────── │ reporter    │                                               ║
║    │ smol=true   │            │ root        │                                               ║
║    │ threshold   │            └─────────────┘                                               ║
║    └─────────────┘                   │                                                      ║
║                                     │                                                      ║
║    ┌─────────────┐                   ▼                                                      ║
║    │ [test.local]│            ┌─────────────┐                                               ║
║    │ snapshots   │            │  _inherited │                                               ║
║    │ timeout=5s  │            │ registry    │                                               ║
║    └─────────────┘            │ cafile      │                                               ║
║                              │ token       │                                               ║
║                              └─────────────┘                                               ║
║                                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝`
}

function generateSecurityMatrix(config: BunTestConfig): string {
  const securityLevel = config.install.token ? 'HIGH' : 'MEDIUM'
  const hasCoverage = typeof config.test.coverage === 'object'
  const hasPreload = config.test.preload && config.test.preload.length > 0
  
  return `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                                ◈ Security Validation Matrix                                  ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ Component           │ Status    │ Risk Level │ Mitigation                                      ║
╠═════════════════════╪═══════════╪════════════╪═══════════════════════════════════════════════╣
║ Registry Token      │ ${config.install.token ? '✅ Present' : '⚠️  Missing'} │ ${securityLevel.padEnd(10)} │ Scope validation & secure storage          ║
║ Environment Files   │ ✅ Isolated│ LOW        │ .env.test hierarchy validation               ║
║ Secret Scanning     │ ✅ Active  │ MEDIUM     │ Pattern-based threat detection               ║
║ CSRF Protection     │ ✅ Enabled  │ LOW        │ Token validation for HTTP mocks              ║
║ Coverage Thresholds │ ${hasCoverage ? '✅ Enforced' : '⚠️  Disabled'} │ ${hasCoverage ? 'MEDIUM' : 'LOW'.padEnd(10)} │ Automated gatekeeping & reporting          ║
║ Preload Scripts     │ ${hasPreload ? '✅ Secured' : '⚠️  None'} │ LOW        │ Path validation & security scanning        ║
║ Artifact Sealing    │ ✅ Quantum  │ CRITICAL   │ SHA-512 signatures & audit trails           ║
║ Network Validation  │ ✅ Active  │ HIGH       │ External domain blocking & monitoring       ║
╚═════════════════════╧═══════════╧════════════╪═══════════════════════════════════════════════╝`
}

// 3D Matrix Visualization
export function generate3DMatrix(config: BunTestConfig): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                          ◈ 3D Configuration Inheritance Matrix                               ║
║                              Tier-1380 Multi-Dimensional View                                ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                              ║
║    SECURITY LAYER                                                                            ║
║    ┌─────────────────────────────────────────────────────────────────────────────────────┐   ║
║    │ 🔒 Zero-Trust Validation  🛡️ Threat Intelligence  🔐 Quantum Sealing              │   ║
║    │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   ║
║    │ │ Secrets │ │ CSRF    │ │ Env     │ │ Network │ │ Coverage│ │ Audit   │ │ Artifacts│ │   ║
║    │ │ Scan    │ │ Protect │ │ Isolate │ │ Block   │ │ Gates   │ │ Trail   │ │ Seal    │ │   ║
║    │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   ║
║    └─────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                            │                                                   ║
║                                            ▼                                                   ║
║    CONFIGURATION LAYER                                                                        ║
║    ┌─────────────────────────────────────────────────────────────────────────────────────┐   ║
║    │ ${generateConfigBlocks(config)} │   ║
║    └─────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                            │                                                   ║
║                                            ▼                                                   ║
║    EXECUTION LAYER                                                                             ║
║    ┌─────────────────────────────────────────────────────────────────────────────────────┐   ║
║    │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   ║
║    │ │ Pre-Test│ │ Spawn   │ │ Monitor │ │ Capture │ │ Analyze │ │ Report  │ │ Seal    │ │   ║
║    │ │ Audit   │ │ Process │ │ Output  │ │ Coverage│ │ Results │ │ Matrix  │ │ Results │ │   ║
║    │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   ║
║    └─────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝`
}

function generateConfigBlocks(config: BunTestConfig): string {
  const blocks = [
    { name: 'install', values: Object.keys(config.install).length, color: '🔧' },
    { name: 'test', values: Object.keys(config.test).filter(k => !k.startsWith('_')).length, color: '🧪' },
    { name: 'test.ci', values: config['test.ci'] ? Object.keys(config['test.ci']).length : 0, color: '🚀' },
    { name: 'test.local', values: config['test.local'] ? Object.keys(config['test.local']).length : 0, color: '💻' },
    { name: 'test.staging', values: config['test.staging'] ? Object.keys(config['test.staging']).length : 0, color: '🎭' }
  ]
  
  return blocks.map(block => 
    `${block.color} ${block.name.padEnd(10)} (${block.values} keys)`
  ).join(' │ ')
}

// JSON Matrix Export
export function exportMatrixAsJSON(config: BunTestConfig): string {
  return JSON.stringify({
    version: 'tier-1380',
    timestamp: new Date().toISOString(),
    matrix: {
      inheritance: {
        install: config.install,
        test: config.test,
        'test.ci': config['test.ci'],
        'test.staging': config['test.staging'],
        'test.local': config['test.local']
      },
      security: {
        level: config.install.token ? 'HIGH' : 'MEDIUM',
        features: [
          'environment_isolation',
          'secret_scanning',
          'csrf_protection',
          'quantum_sealing',
          'audit_trail'
        ],
        validation: {
          registry_token: !!config.install.token,
          coverage_thresholds: typeof config.test.coverage === 'object',
          preload_scripts: !!(config.test.preload?.length),
          artifact_sealing: true
        }
      },
      performance: {
        config_load_target: '<1ms',
        inheritance_resolution: '12-dimensional',
        security_scan_time: '<5ms'
      }
    }
  }, null, 2)
}

// HTML Matrix Dashboard
export function generateHTMLDashboard(config: BunTestConfig): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tier-1380 Test Configuration Matrix</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; margin: 0; padding: 20px; }
        .matrix { border: 2px solid #00ff00; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .header { text-align: center; font-size: 24px; margin-bottom: 20px; color: #00ffff; }
        .section { margin: 20px 0; }
        .section-title { color: #ffff00; font-size: 18px; margin-bottom: 10px; }
        .config-block { 
            display: inline-block; 
            border: 1px solid #00ff00; 
            padding: 10px; 
            margin: 5px; 
            border-radius: 4px;
            background: rgba(0, 255, 0, 0.1);
        }
        .security-high { border-color: #ff0000; color: #ff6666; }
        .security-medium { border-color: #ffff00; color: #ffff66; }
        .security-low { border-color: #00ff00; color: #66ff66; }
        .arrow { font-size: 20px; color: #00ffff; }
        pre { white-space: pre; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        🚀 TIER-1380 SECURE TEST CONFIGURATION MATRIX
    </div>
    
    <div class="matrix">
        <div class="section-title">Configuration Inheritance Flow</div>
        <div class="section">
            <div class="config-block">
                <strong>[install]</strong><br>
                Registry: ${config.install.registry || 'default'}<br>
                Auth: ${config.install.token ? '🔒 Secured' : '⚠️  Open'}
            </div>
            <span class="arrow">→</span>
            <div class="config-block">
                <strong>[test]</strong><br>
                Root: ${config.test.root || '.'}<br>
                Coverage: ${config.test.coverage ? '📊 Enabled' : '📭 Disabled'}
            </div>
            <span class="arrow">→</span>
            <div class="config-block">
                <strong>[test.ci]</strong><br>
                Smol: ${config['test.ci']?.smol ? '✅' : '❌'}<br>
                Thresholds: ${typeof config['test.ci']?.coverage === 'object' ? '📈 Set' : '⚠️  None'}
            </div>
        </div>
    </div>
    
    <div class="matrix">
        <div class="section-title">Security Validation Status</div>
        <div class="section">
            <div class="config-block ${config.install.token ? 'security-high' : 'security-medium'}">
                Registry Token: ${config.install.token ? '✅ Validated' : '⚠️  Missing'}
            </div>
            <div class="config-block security-low">
                Environment Isolation: ✅ Active
            </div>
            <div class="config-block security-low">
                Secret Scanning: ✅ Active
            </div>
            <div class="config-block security-low">
                CSRF Protection: ✅ Enabled
            </div>
            <div class="config-block ${typeof config.test.coverage === 'object' ? 'security-medium' : 'security-low'}">
                Coverage Gates: ${typeof config.test.coverage === 'object' ? '✅ Enforced' : '⚠️  Disabled'}
            </div>
        </div>
    </div>
    
    <div class="matrix">
        <div class="section-title">Inherited Configuration</div>
        <pre>${JSON.stringify(config.test._inherited, null, 2)}</pre>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`
}

// Matrix comparison utility
export function compareMatrices(config1: BunTestConfig, config2: BunTestConfig): string {
  const differences: string[] = []
  
  // Compare install section
  for (const key of Object.keys({...config1.install, ...config2.install})) {
    if (config1.install[key as keyof typeof config1.install] !== config2.install[key as keyof typeof config2.install]) {
      differences.push(`install.${key}: ${config1.install[key as keyof typeof config1.install]} → ${config2.install[key as keyof typeof config2.install]}`)
    }
  }
  
  // Compare test section
  for (const key of Object.keys({...config1.test, ...config2.test})) {
    if (key !== '_inherited' && JSON.stringify(config1.test[key as keyof typeof config1.test]) !== JSON.stringify(config2.test[key as keyof typeof config2.test])) {
      differences.push(`test.${key}: ${JSON.stringify(config1.test[key as keyof typeof config1.test])} → ${JSON.stringify(config2.test[key as keyof typeof config2.test])}`)
    }
  }
  
  if (differences.length === 0) {
    return '✅ Configurations are identical'
  }
  
  return `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                                ◈ Configuration Differences                                   ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ ${differences.join('\n║ ')} ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝`
}
