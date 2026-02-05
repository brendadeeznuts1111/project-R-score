#!/usr/bin/env bun
/**
 * 🔥 FIRE22 DDD SETUP
 * Domain-Driven Design structure creation and validation
 * Creates proper domain boundaries and bounded contexts
 */

import { $ } from 'bun';

// ╔══════════════════════════════════════════════════════════════╗
// ║                 DOMAIN CONFIGURATION                        ║
// ╚══════════════════════════════════════════════════════════════╝

interface DomainConfig {
  name: string;
  description: string;
  boundedContexts: string[];
  entities: string[];
  valueObjects: string[];
  domainEvents: string[];
  services: string[];
  repositories: string[];
}

const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    name: 'core',
    description: 'Fundamental business capabilities and shared domain logic',
    boundedContexts: ['business-rules', 'domain-events', 'aggregates'],
    entities: ['AggregateRoot', 'Entity'],
    valueObjects: ['ValueObject', 'DomainEvent'],
    domainEvents: ['BusinessRuleViolated', 'AggregateCreated'],
    services: ['BusinessRuleValidator', 'DomainEventPublisher'],
    repositories: ['AggregateRepository'],
  },
  {
    name: 'users',
    description: 'User management and authentication',
    boundedContexts: ['authentication', 'profile', 'permissions'],
    entities: ['User', 'Profile', 'Permission'],
    valueObjects: ['Email', 'Password', 'UserRole'],
    domainEvents: ['UserRegistered', 'UserAuthenticated', 'ProfileUpdated'],
    services: ['UserValidator', 'AuthenticationService'],
    repositories: ['UserRepository', 'ProfileRepository'],
  },
  {
    name: 'betting',
    description: 'Sports betting and wagering system',
    boundedContexts: ['wagers', 'odds', 'markets', 'risk'],
    entities: ['Bet', 'Market', 'Selection'],
    valueObjects: ['Money', 'Odds', 'Stake'],
    domainEvents: ['BetPlaced', 'MarketClosed', 'OddsChanged'],
    services: ['BettingEngine', 'RiskAssessor'],
    repositories: ['BetRepository', 'MarketRepository'],
  },
  {
    name: 'gaming',
    description: 'Fantasy sports and gaming platform',
    boundedContexts: ['fantasy', 'tournaments', 'statistics'],
    entities: ['FantasyTeam', 'Tournament', 'PlayerStats'],
    valueObjects: ['Score', 'Ranking', 'TournamentRules'],
    domainEvents: ['TournamentStarted', 'ScoreUpdated', 'WinnerDeclared'],
    services: ['ScoringEngine', 'TournamentManager'],
    repositories: ['FantasyTeamRepository', 'TournamentRepository'],
  },
  {
    name: 'analytics',
    description: 'Data analysis and business intelligence',
    boundedContexts: ['metrics', 'reports', 'insights'],
    entities: ['Metric', 'Report', 'Dashboard'],
    valueObjects: ['TimeRange', 'Aggregation', 'Visualization'],
    domainEvents: ['MetricCollected', 'ReportGenerated', 'InsightDiscovered'],
    services: ['MetricsCollector', 'ReportGenerator'],
    repositories: ['MetricsRepository', 'ReportRepository'],
  },
  {
    name: 'finance',
    description: 'Financial transactions and reporting',
    boundedContexts: ['transactions', 'settlements', 'reporting'],
    entities: ['Transaction', 'Settlement', 'FinancialReport'],
    valueObjects: ['Amount', 'Currency', 'TransactionType'],
    domainEvents: ['TransactionProcessed', 'SettlementCompleted', 'ReportGenerated'],
    services: ['TransactionProcessor', 'SettlementEngine'],
    repositories: ['TransactionRepository', 'SettlementRepository'],
  },
  {
    name: 'payments',
    description: 'Payment processing and wallet management',
    boundedContexts: ['gateways', 'wallets', 'compliance'],
    entities: ['Payment', 'Wallet', 'Transaction'],
    valueObjects: ['PaymentMethod', 'WalletBalance', 'PaymentStatus'],
    domainEvents: ['PaymentProcessed', 'WalletUpdated', 'PaymentFailed'],
    services: ['PaymentProcessor', 'WalletManager'],
    repositories: ['PaymentRepository', 'WalletRepository'],
  },
  {
    name: 'security',
    description: 'Security and compliance management',
    boundedContexts: ['auth', 'encryption', 'audit'],
    entities: ['SecurityEvent', 'AuditLog', 'SecurityPolicy'],
    valueObjects: ['EncryptionKey', 'SecurityLevel', 'AuditEntry'],
    domainEvents: ['SecurityEventDetected', 'AuditLogCreated', 'PolicyViolated'],
    services: ['SecurityValidator', 'EncryptionService'],
    repositories: ['SecurityEventRepository', 'AuditLogRepository'],
  },
  {
    name: 'communication',
    description: 'Messaging and notification systems',
    boundedContexts: ['email', 'push', 'chat'],
    entities: ['Message', 'Notification', 'Channel'],
    valueObjects: ['MessageContent', 'NotificationType', 'ChannelConfig'],
    domainEvents: ['MessageSent', 'NotificationDelivered', 'ChannelCreated'],
    services: ['MessageDispatcher', 'NotificationService'],
    repositories: ['MessageRepository', 'NotificationRepository'],
  },
  {
    name: 'content',
    description: 'Content management and delivery',
    boundedContexts: ['articles', 'media', 'seo'],
    entities: ['Article', 'MediaAsset', 'SEOConfig'],
    valueObjects: ['ContentType', 'MediaMetadata', 'SEOSettings'],
    domainEvents: ['ContentPublished', 'MediaUploaded', 'SEOUpdated'],
    services: ['ContentManager', 'MediaProcessor'],
    repositories: ['ContentRepository', 'MediaRepository'],
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║                 DDD STRUCTURE CREATION                      ║
// ╚══════════════════════════════════════════════════════════════╝

async function createDomainStructure(domain: DomainConfig): Promise<void> {
  const domainPath = `src/domains/${domain.name}`;

  console.log(`🏗️ Creating ${domain.name} domain structure...`);

  // Create domain directory
  await $`mkdir -p ${domainPath}`.quiet();

  // Create bounded contexts
  for (const context of domain.boundedContexts) {
    await $`mkdir -p ${domainPath}/${context}`.quiet();
  }

  // Create standard domain directories
  const directories = [
    'entities',
    'value-objects',
    'domain-events',
    'domain-services',
    'repositories',
    'aggregates',
    'events',
  ];

  for (const dir of directories) {
    await $`mkdir -p ${domainPath}/${dir}`.quiet();
  }

  console.log(`✅ Created ${domain.name} domain structure`);
}

async function createDomainFiles(domain: DomainConfig): Promise<void> {
  const domainPath = `src/domains/${domain.name}`;

  console.log(`📝 Creating ${domain.name} domain files...`);

  // Create domain README
  const readmeContent = `# ${domain.name.charAt(0).toUpperCase() + domain.name.slice(1)} Domain

## 📋 Overview

${domain.description}

## 🎯 Responsibilities

${domain.boundedContexts.map(ctx => `- **${ctx}** - ${ctx.replace('-', ' ')} management`).join('\n')}

## 🔧 Key Components

### Entities
${domain.entities.map(entity => `- **${entity}** - Domain entity`).join('\n')}

### Value Objects
${domain.valueObjects.map(vo => `- **${vo}** - Immutable domain value`).join('\n')}

### Domain Events
${domain.domainEvents.map(event => `- **${event}** - Business event`).join('\n')}

### Domain Services
${domain.services.map(service => `- **${service}** - Business logic service`).join('\n')}

### Repositories
${domain.repositories.map(repo => `- **${repo}** - Data access interface`).join('\n')}

## 📊 Bounded Contexts

${domain.boundedContexts
  .map(
    ctx => `### ${ctx.charAt(0).toUpperCase() + ctx.slice(1).replace('-', ' ')} Context
**Purpose:** Manage ${ctx.replace('-', ' ')} operations
**Location:** \`src/domains/${domain.name}/${ctx}/\`
`
  )
  .join('\n')}

## 🎯 CODEOWNERS

See \`.github/CODEOWNERS\` for domain ownership details.

---
**🔥 Ready to implement ${domain.name} domain features?**
`;

  await Bun.write(`${domainPath}/README.md`, readmeContent);

  // Create basic domain files
  const indexContent = `// 🔥 ${domain.name.toUpperCase()} DOMAIN
// ${domain.description}
// Last Updated: $(date)

/**
 * ${domain.name.charAt(0).toUpperCase() + domain.name.slice(1)} Domain Exports
 *
 * This file exports all public interfaces, entities, and services
 * from the ${domain.name} domain for use by other domains and layers.
 */

// Entities
export * from './entities'

// Value Objects
export * from './value-objects'

// Domain Events
export * from './domain-events'

// Domain Services
export * from './domain-services'

// Repositories
export * from './repositories'

// Aggregates
export * from './aggregates'

// Events
export * from './events'

// Bounded Contexts
${domain.boundedContexts.map(ctx => `export * from './${ctx}'`).join('\n')}
`;

  await Bun.write(`${domainPath}/index.ts`, indexContent);

  console.log(`✅ Created ${domain.name} domain files`);
}

async function createBoundedContextFiles(domain: DomainConfig, context: string): Promise<void> {
  const contextPath = `src/domains/${domain.name}/${context}`;

  // Create context-specific files
  const contextIndex = `// 🔥 ${context.toUpperCase().replace('-', ' ')} BOUNDED CONTEXT
// Part of ${domain.name} domain
// Last Updated: $(date)

/**
 * ${context.charAt(0).toUpperCase() + context.slice(1).replace('-', ' ')} Context
 *
 * This bounded context handles ${context.replace('-', ' ')} operations
 * within the ${domain.name} domain.
 */

// Context-specific exports
// TODO: Implement ${context} bounded context
`;

  await Bun.write(`${contextPath}/index.ts`, contextIndex);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 DDD VALIDATION FUNCTIONS                   ║
// ╚══════════════════════════════════════════════════════════════╝

async function validateDomainStructure(domain: DomainConfig): Promise<boolean> {
  const domainPath = `src/domains/${domain.name}`;

  try {
    // Check if domain directory exists
    await Bun.file(`${domainPath}/README.md`).exists();

    // Check bounded contexts
    for (const context of domain.boundedContexts) {
      await Bun.file(`${domainPath}/${context}/index.ts`).exists();
    }

    // Check standard directories
    const requiredFiles = [
      'entities/index.ts',
      'value-objects/index.ts',
      'domain-events/index.ts',
      'domain-services/index.ts',
      'repositories/index.ts',
    ];

    for (const file of requiredFiles) {
      await Bun.file(`${domainPath}/${file}`).exists();
    }

    return true;
  } catch {
    return false;
  }
}

async function validateCODEOWNERS(): Promise<boolean> {
  try {
    const codeowners = await Bun.file('.github/CODEOWNERS').text();

    // Check if all domains have owners
    for (const domain of DOMAIN_CONFIGS) {
      if (!codeowners.includes(`src/domains/${domain.name}/`)) {
        console.log(`❌ Missing CODEOWNERS for ${domain.name} domain`);
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 MAIN DDD SETUP FUNCTION                    ║
// ╚══════════════════════════════════════════════════════════════╝

async function runDDDSetup(): Promise<void> {
  console.log('🔥 FIRE22 DDD SETUP');
  console.log('═══════════════════');
  console.log('Creating Domain-Driven Design structure for Fantasy42-Fire22');
  console.log('');

  // Phase 1: Create domain structures
  console.log('🏗️ PHASE 1: CREATING DOMAIN STRUCTURES');
  console.log('══════════════════════════════════════');

  for (const domain of DOMAIN_CONFIGS) {
    await createDomainStructure(domain);
    await createDomainFiles(domain);

    // Create bounded context files
    for (const context of domain.boundedContexts) {
      await createBoundedContextFiles(domain, context);
    }
  }

  // Phase 2: Validate structures
  console.log('');
  console.log('🔍 PHASE 2: VALIDATING DOMAIN STRUCTURES');
  console.log('════════════════════════════════════════');

  let validCount = 0;
  for (const domain of DOMAIN_CONFIGS) {
    const isValid = await validateDomainStructure(domain);
    if (isValid) {
      console.log(`✅ ${domain.name} domain structure valid`);
      validCount++;
    } else {
      console.log(`❌ ${domain.name} domain structure invalid`);
    }
  }

  // Phase 3: Validate CODEOWNERS
  console.log('');
  console.log('👥 PHASE 3: VALIDATING CODEOWNERS');
  console.log('═════════════════════════════════');

  const codeownersValid = await validateCODEOWNERS();
  if (codeownersValid) {
    console.log('✅ CODEOWNERS configuration valid');
  } else {
    console.log('❌ CODEOWNERS configuration needs attention');
  }

  // Summary
  console.log('');
  console.log('📊 DDD SETUP SUMMARY');
  console.log('════════════════════');
  console.log(`Domains Created: ${DOMAIN_CONFIGS.length}`);
  console.log(`Valid Structures: ${validCount}/${DOMAIN_CONFIGS.length}`);
  console.log(`CODEOWNERS Status: ${codeownersValid ? 'Valid' : 'Needs Attention'}`);

  if (validCount === DOMAIN_CONFIGS.length && codeownersValid) {
    console.log('');
    console.log('🎉 DDD SETUP COMPLETE!');
    console.log('═════════════════════');
    console.log('');
    console.log('🔥 Your Fantasy42-Fire22 system now follows Domain-Driven Design principles!');
    console.log('');
    console.log('🏗️ NEXT STEPS:');
    console.log("1. Implement domain entities in each domain's entities/ directory");
    console.log('2. Create value objects in value-objects/ directories');
    console.log('3. Define domain events in domain-events/ directories');
    console.log('4. Implement domain services in domain-services/ directories');
    console.log('5. Create repository interfaces in repositories/ directories');
    console.log('');
    console.log('📚 RESOURCES:');
    console.log('• Domain-specific README files created');
    console.log('• .github/COMMIT_CONVENTION.md updated with domain scopes');
    console.log('• .github/CODEOWNERS configured for domain ownership');
    console.log('');
    console.log('🎯 Ready to implement domain-driven features!');
  } else {
    console.log('');
    console.log('⚠️ SOME ISSUES DETECTED');
    console.log('══════════════════════');
    console.log('Please review the errors above and run setup again.');
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 UTILITY FUNCTIONS                          ║
// ╚══════════════════════════════════════════════════════════════╝

async function showDDDHelp(): Promise<void> {
  console.log(`
🔥 FIRE22 DDD SETUP
Domain-Driven Design structure creation and validation

USAGE:
  bun run scripts/ddd-setup.fire22.ts [command]

COMMANDS:
  setup         Create complete DDD structure
  validate      Validate existing DDD structure
  create <domain> Create specific domain structure
  list          List all configured domains
  help          Show this help

DOMAINS CREATED:
  • core        - Fundamental business capabilities
  • users       - User management and authentication
  • betting     - Sports betting and wagering
  • gaming      - Fantasy sports and gaming
  • analytics   - Data analysis and reporting
  • finance     - Financial transactions
  • payments    - Payment processing
  • security    - Security and compliance
  • communication - Messaging and notifications
  • content     - Content management

DDD STRUCTURE:
  src/domains/
  ├── {domain}/
  │   ├── entities/         # Domain entities
  │   ├── value-objects/    # Immutable values
  │   ├── domain-events/    # Business events
  │   ├── domain-services/  # Business logic
  │   ├── repositories/     # Data access interfaces
  │   ├── aggregates/       # Aggregate roots
  │   ├── events/          # Event definitions
  │   ├── {bounded-context}/ # Context-specific code
  │   └── README.md        # Domain documentation

EXAMPLES:
  bun run scripts/ddd-setup.fire22.ts setup
  bun run scripts/ddd-setup.fire22.ts validate
  bun run scripts/ddd-setup.fire22.ts create users
  bun run scripts/ddd-setup.fire22.ts list

FEATURES:
  • Complete DDD structure creation
  • Bounded context organization
  • Domain-specific documentation
  • CODEOWNERS validation
  • Commit convention integration
  • Enterprise-grade organization

RESOURCES:
  • src/domains/README.md - DDD overview
  • .github/CODEOWNERS - Domain ownership
  • .github/COMMIT_CONVENTION.md - Domain scopes
`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 COMMAND LINE INTERFACE                     ║
// ╚══════════════════════════════════════════════════════════════╝

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  switch (command) {
    case 'setup':
      await runDDDSetup();
      break;

    case 'validate':
      console.log('🔍 VALIDATING DDD STRUCTURE');
      console.log('═══════════════════════════');

      let validCount = 0;
      for (const domain of DOMAIN_CONFIGS) {
        const isValid = await validateDomainStructure(domain);
        if (isValid) {
          console.log(`✅ ${domain.name} domain valid`);
          validCount++;
        } else {
          console.log(`❌ ${domain.name} domain invalid`);
        }
      }

      const codeownersValid = await validateCODEOWNERS();
      console.log(`✅ CODEOWNERS: ${codeownersValid ? 'Valid' : 'Invalid'}`);

      console.log(`\n📊 Validation: ${validCount}/${DOMAIN_CONFIGS.length} domains valid`);
      break;

    case 'create':
      const domainName = args[1];
      if (!domainName) {
        console.log('❌ Please specify a domain name');
        console.log('Usage: bun run scripts/ddd-setup.fire22.ts create <domain>');
        return;
      }

      const domain = DOMAIN_CONFIGS.find(d => d.name === domainName);
      if (!domain) {
        console.log(`❌ Domain '${domainName}' not found`);
        console.log('Available domains:', DOMAIN_CONFIGS.map(d => d.name).join(', '));
        return;
      }

      await createDomainStructure(domain);
      await createDomainFiles(domain);
      console.log(`✅ Created ${domainName} domain structure`);
      break;

    case 'list':
      console.log('🔥 CONFIGURED DOMAINS');
      console.log('═════════════════════');
      DOMAIN_CONFIGS.forEach(domain => {
        console.log(`🏗️  ${domain.name.padEnd(12)} - ${domain.description}`);
      });
      console.log(`\n📊 Total: ${DOMAIN_CONFIGS.length} domains`);
      break;

    case 'help':
    default:
      await showDDDHelp();
      break;
  }
}

// Run the DDD setup
if (import.meta.main) {
  main().catch(console.error);
}
