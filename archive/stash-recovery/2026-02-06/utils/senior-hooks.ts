// SeniorHooks - Advanced Integrations for Senior Developers
// Builds on junior foundation with crypto, middleware, and advanced features

import { LeadSpecProfile, validateLeadSpecProfile, generateETag, generateIntegrityHash } from './lead-spec-profile';
import { juniorProfile } from './junior-runner';

/**
 * Senior-level markdown profiling with crypto and advanced features
 * Extends junior profiling with security, custom rendering, and middleware integration
 */
export async function seniorProfile(md: string, secret: string = 'team-lead-secret'): Promise<LeadSpecProfile> {
  console.log('\x1b[1;35m🔧 Senior Profile: Advanced Analysis\x1b[0m');
  
  // Build on junior foundation
  const tempFile = `/tmp/senior-${crypto.randomUUID()}.md`;
  try {
    await Bun.write(tempFile, md);
    const profile = await juniorProfile(tempFile);
    
    // Senior Enhancement 1: Cryptographic Etag with team secret
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(md + JSON.stringify(profile) + secret);
    profile.security.etag = hasher.digest("hex");
  
  // Senior Enhancement 2: LeadSpec ANSI custom rendering
  const leadSpecAnsi = Bun.markdown.render(md, {
    heading: (children, { level }) => {
      const colors = ['32', '33', '34', '35', '36', '37'];
      return `\x1b[1;${colors[level - 1]}mLead L${level}: ${children}\x1b[0m\n`;
    },
    table: (children) => `\x1b[7m\x1b[1;33m📊 Senior Table\x1b[0m\x1b[27m\n${children}\n`,
    code: (children) => `\x1b[44m\x1b[97m${children}\x1b[0m`,
    strong: (children) => `\x1b[1;91m${children}\x1b[0m`,
    emphasis: (children) => `\x1b[3;94m${children}\x1b[0m`,
    blockquote: (children) => `\x1b[2;37m│ ${children}\x1b[0m`,
    task: (checked, children) => checked ? `\x1b[32m✓ ${children}\x1b[0m` : `\x1b[31m○ ${children}\x1b[0m`,
    link: (children, href) => `\x1b[34;4m${children}\x1b[0m (\x1b[36m${href}\x1b[0m)`,
    image: (children, src, title) => `\x1b[35m🖼️ ${children}\x1b[0m [\x1b[36m${src}\x1b[0m]`
  });
  profile.markdown.outputs.ansiSize = leadSpecAnsi.length;
  
  // Senior Enhancement 3: Advanced feature analysis
  profile.markdown.featureCounts = {
    ...profile.markdown.featureCounts,
    // Senior-level detailed analysis
    mathExpressions: (md.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g) || []).length,
    footnotes: (md.match(/\[\^([^\]]+)\]/g) || []).length,
    definitions: (md.match(/^: .+$/gm) || []).length,
    abbreviations: (md.match(/\*\[.+\]: .+/g) || []).length
  };
  
  // Senior Enhancement 4: Compliance scoring (advanced)
  profile.markdown.compliance = {
    gfm: calculateGFMCompliance(md),
    commonmark: calculateCommonMarkCompliance(md)
  };
  
  // Senior Enhancement 5: React component estimation
  profile.markdown.outputs.reactEst = estimateReactComponents(md);
  
  // Update audit trail
  profile.audit.runner = 'senior';
  profile.audit.timestamp = new Date().toISOString();
  
  // Validate enhanced profile
  if (!validateLeadSpecProfile(profile)) {
    throw new Error('Senior profile validation failed');
  }
  
  return profile;
  
  } finally {
    // Cleanup temp file with error handling
    try {
      await Bun.file(tempFile).delete();
    } catch (error) {
      console.warn(`Warning: Failed to cleanup temp file ${tempFile}:`, error);
    }
  }
}

/**
 * Calculate GitHub Flavored Markdown compliance score
 */
function calculateGFMCompliance(md: string): number {
  let score = 60; // Base CommonMark compliance
  
  // GFM features
  if (md.includes('|')) score += 5; // Tables
  if (md.includes('- [')) score += 5; // Task lists
  if (md.includes('~~')) score += 5; // Strikethrough
  if (md.match(/\b[A-Z][a-z]+[A-Z][a-z]+\b/)) score += 5; // Autolinks
  if (md.match(/\.md\b/)) score += 5; // Wiki links
  
  return Math.min(score, 100);
}

/**
 * Calculate CommonMark specification compliance
 */
function calculateCommonMarkCompliance(md: string): number {
  let score = 50; // Base score
  
  // CommonMark features
  if (md.match(/^#{1,6}\s/m)) score += 10; // Headings
  if (md.match(/\*\*.*?\*\*/)) score += 10; // Strong emphasis
  if (md.match(/\*.*?\*/)) score += 10; // Emphasis
  if (md.match(/^>\s/m)) score += 10; // Blockquotes
  if (md.match(/\[.*\]\(.*\)/)) score += 10; // Links
  
  return Math.min(score, 100);
}

/**
 * Estimate React component count for rendering
 */
function estimateReactComponents(md: string): number {
  let components = 0;
  
  // Each heading = component
  components += (md.match(/^#{1,6}\s/gm) || []).length;
  
  // Each table = component
  components += (md.match(/\|.*\|/g) || []).length;
  
  // Each code block = component
  components += (md.match(/```/g) || []).length / 2;
  
  // Each list = component
  components += (md.match(/^(\s*[-*+]|\s*\d+\.)\s/gm) || []).length;
  
  return Math.ceil(components);
}

/**
 * Elysia middleware for senior-level production
 */
export function createSeniorMiddleware(secret: string = 'team-lead-secret') {
  return {
    // Senior: POST endpoint for lead-spec profiling
    postLeadSpec: async (request: Request) => {
      try {
        const body = await request.json() as { md: string };
        
        if (!body.md) {
          return new Response(JSON.stringify({ error: 'Markdown content required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const profile = await seniorProfile(body.md, secret);
        
        return new Response(JSON.stringify({
          success: true,
          profile,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'X-Senior-Etag': profile.security.etag
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Senior processing failed',
          details: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },
    
    // Senior: GET endpoint for profile validation
    validateProfile: async (request: Request) => {
      try {
        const url = new URL(request.url);
        const profileData = url.searchParams.get('profile');
        
        if (!profileData) {
          return new Response(JSON.stringify({ error: 'Profile data required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const profile = JSON.parse(profileData) as LeadSpecProfile;
        const isValid = validateLeadSpecProfile(profile);
        
        return new Response(JSON.stringify({
          valid: isValid,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Validation failed',
          details: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  };
}

/**
 * Senior CLI tool for advanced profiling
 */
export async function seniorCLI(mdFile: string, options: {
  secret?: string;
  output?: string;
  verbose?: boolean;
} = {}): Promise<void> {
  const { secret = 'team-lead-secret', output, verbose = false } = options;
  
  if (verbose) {
    console.log('\x1b[1;35m🔧 Senior CLI: Advanced Profiling\x1b[0m');
    console.log(`File: ${mdFile}`);
    console.log(`Secret: ${secret.slice(0, 3)}***`);
  }
  
  const md = await Bun.file(mdFile).text();
  const profile = await seniorProfile(md, secret);
  
  // Display senior dashboard
  console.log('\n\x1b[1;35m🔧 Senior Dashboard\x1b[0m');
  console.log('\x1b[1;35m' + '='.repeat(60) + '\x1b[0m');
  
  console.table({
    'Document Size': `${(profile.core.documentSize / 1024).toFixed(2)} KB`,
    'Parse Time': `${profile.markdown.parseTimeMs.toFixed(2)}ms`,
    'Throughput': `${Math.round(profile.core.throughput).toLocaleString()} chars/s`,
    'Complexity': profile.markdown.complexityTier.toUpperCase(),
    'GFM Compliance': `${profile.markdown.compliance.gfm}%`,
    'CommonMark': `${profile.markdown.compliance.commonmark}%`,
    'React Est.': `${profile.markdown.outputs.reactEst} components`,
    'Security': profile.security.etag.slice(0, 8) + '...'
  });
  
  // Export if requested
  if (output) {
    await Bun.write(output, JSON.stringify(profile, null, 2));
    console.log(`\x1b[1;33m📁 Senior export: ${output}\x1b[0m`);
  }
  
  console.log('\x1b[1;35m✅ Senior profiling complete!\x1b[0m');
}

/**
 * Example Elysia server setup
 */
export function createSeniorServer(secret: string = 'team-lead-secret') {
  // Note: This would require Elysia to be installed
  // import { Elysia } from 'elysia';
  
  const middleware = createSeniorMiddleware(secret);
  
  /*
  return new Elysia()
    .post('/lead-spec', middleware.postLeadSpec)
    .get('/validate-profile', middleware.validateProfile)
    .get('/health', () => ({ status: 'healthy', runner: 'senior' }))
    .listen(3000);
  */
  
  console.log('\x1b[1;33m📡 Senior Server: Install Elysia to enable\x1b[0m');
  console.log('\x1b[36m# npm install elysia\x1b[0m');
  console.log('\x1b[36m# Then uncomment the server code\x1b[0m');
  
  return null;
}
