import '../../shared-styles/highlight.css';

// Package data type
type Package = {
  icon: string;
  name: string;
  version: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  codeowner: string;
  tags: string[];
};

// Fire22 packages data
const packages: Package[] = [
  // Telegram System
  {
    icon: '🤖',
    name: '@fire22/telegram-bot',
    version: 'v1.0.0',
    description: 'Grammy Framework • 77 Language Codes',
    status: 'pending',
    codeowner: '@fire22-team/telegram-maintainers',
    tags: ['telegram', 'grammy', 'bot', 'multilingual'],
  },
  {
    icon: '🔄',
    name: '@fire22/queue-system',
    version: 'v1.0.0',
    description: 'P2P Matching • Transaction Processing',
    status: 'pending',
    codeowner: '@fire22-team/queue-maintainers',
    tags: ['p2p', 'queue', 'matching', 'transactions'],
  },
  {
    icon: '🌍',
    name: '@fire22/multilingual',
    version: 'v1.0.0',
    description: '4 Languages • i18n System',
    status: 'pending',
    codeowner: '@fire22-team/i18n-maintainers',
    tags: ['i18n', 'multilingual', 'localization', 'translations'],
  },
  {
    icon: '⚡',
    name: '@fire22/telegram-workflows',
    version: 'v1.0.0',
    description: '6 Departments • 23 Access Levels',
    status: 'pending',
    codeowner: '@fire22-team/workflow-maintainers',
    tags: ['workflows', 'departments', 'permissions', 'rbac'],
  },
  {
    icon: '📊',
    name: '@fire22/telegram-dashboard',
    version: 'v1.0.0',
    description: 'Staging Server • SSE Real-time',
    status: 'pending',
    codeowner: '@fire22-team/dashboard-maintainers',
    tags: ['dashboard', 'sse', 'real-time', 'staging'],
  },

  // Core Infrastructure
  {
    icon: '🎛️',
    name: '@fire22/core-dashboard',
    version: 'v2.1.0',
    description: 'Main Dashboard • Core Components',
    status: 'pending',
    codeowner: '@fire22-team/core-maintainers',
    tags: ['core', 'dashboard', 'components', 'ui'],
  },
  {
    icon: '🔗',
    name: '@fire22/api-client',
    version: 'v3.0.9',
    description: 'Fire22 API • HTTP Client',
    status: 'pending',
    codeowner: '@fire22-team/api-maintainers',
    tags: ['api', 'client', 'http', 'rest'],
  },
  {
    icon: '🧩',
    name: '@fire22/pattern-system',
    version: 'v1.5.0',
    description: '13 Unified Patterns • Weaver',
    status: 'pending',
    codeowner: '@fire22-team/pattern-maintainers',
    tags: ['patterns', 'weaver', 'architecture', 'design'],
  },

  // Specialized Systems
  {
    icon: '⚽',
    name: '@fire22/sports-betting',
    version: 'v2.0.1',
    description: 'Sports Integration • Betting System',
    status: 'pending',
    codeowner: '@fire22-team/sports-maintainers',
    tags: ['sports', 'betting', 'odds', 'live'],
  },
  {
    icon: '🔒',
    name: '@fire22/security-registry',
    version: 'v1.2.3',
    description: 'Security Scanner • Audit System',
    status: 'pending',
    codeowner: '@fire22-team/security-maintainers',
    tags: ['security', 'scanner', 'audit', 'compliance'],
  },
  {
    icon: '📈',
    name: '@fire22/telegram-benchmarks',
    version: 'v1.0.0',
    description: 'Performance Testing • Metrics',
    status: 'pending',
    codeowner: '@fire22-team/performance-maintainers',
    tags: ['benchmarks', 'performance', 'metrics', 'testing'],
  },
];

// Package Card component with Bun JSX
function PackageCard({ icon, name, version, description, status, codeowner, tags }: Package) {
  const statusClass =
    status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning';

  return (
    <article className={`fire22-highlight fire22-package-card ${statusClass}`}>
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{name}</h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(64, 224, 208, 0.1)',
              border: '1px solid rgba(64, 224, 208, 0.3)',
              color: '#40e0d0',
            }}
          >
            {version}
          </span>
        </div>

        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0' }}>👤 {codeowner}</p>

        <p style={{ fontSize: '12px', color: '#e0e6ed', margin: '8px 0' }}>{description}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          {tags.map((tag, i) => (
            <span
              key={tag}
              style={{
                fontSize: '9px',
                padding: '2px 5px',
                borderRadius: '3px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: `rgba(${60 + i * 30}, ${130 + i * 20}, ${246 - i * 30}, 0.2)`,
                color: `rgb(${96 + i * 30}, ${165 + i * 20}, ${250 - i * 30})`,
                border: `1px solid rgba(${60 + i * 30}, ${130 + i * 20}, ${246 - i * 30}, 0.3)`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              background:
                statusClass === 'success'
                  ? 'rgba(74, 222, 128, 0.2)'
                  : statusClass === 'error'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(251, 191, 36, 0.2)',
              color:
                statusClass === 'success'
                  ? '#4ade80'
                  : statusClass === 'error'
                    ? '#ef4444'
                    : '#fbbf24',
              border: `1px solid ${
                statusClass === 'success'
                  ? 'rgba(74, 222, 128, 0.3)'
                  : statusClass === 'error'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(251, 191, 36, 0.3)'
              }`,
            }}
          >
            {status.toUpperCase()}
          </span>

          <a
            href={`#review-${name}`}
            style={{
              color: '#40e0d0',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '6px 12px',
              border: '1px solid rgba(64, 224, 208, 0.3)',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(64, 224, 208, 0.1)';
              e.currentTarget.style.borderColor = '#40e0d0';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.3)';
            }}
          >
            Review →
          </a>
        </div>
      </div>
    </article>
  );
}

// Category section component
function CategorySection({ title, packages }: { title: string; packages: Package[] }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2
        style={{
          color: '#ff6b35',
          fontSize: '18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {packages.map(pkg => (
          <PackageCard key={pkg.name} {...pkg} />
        ))}
      </div>
    </section>
  );
}

// Main Grid component
export default function PackageReviewGrid() {
  const telegramPackages = packages.filter(
    p => p.name.includes('telegram') || p.name.includes('queue') || p.name.includes('multilingual')
  );

  const corePackages = packages.filter(
    p => p.name.includes('core') || p.name.includes('api') || p.name.includes('pattern')
  );

  const specializedPackages = packages.filter(
    p => p.name.includes('sports') || p.name.includes('security') || p.name.includes('benchmarks')
  );

  return (
    <main
      style={{
        padding: '30px',
        background: 'linear-gradient(135deg, #0a0e27 0%, #151932 100%)',
        minHeight: '100vh',
        color: '#e0e6ed',
        fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
      }}
    >
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '32px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px',
          }}
        >
          📦 Fire22 Package Review Grid
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          Powered by Bun JSX + Native CSS Bundling
        </p>
      </header>

      <CategorySection title="🤖 Telegram System" packages={telegramPackages} />
      <CategorySection title="🏗️ Core Infrastructure" packages={corePackages} />
      <CategorySection title="🎯 Specialized Systems" packages={specializedPackages} />

      <footer
        style={{
          marginTop: '60px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
        }}
      >
        Built with Bun {Bun.version} • Zero dependencies • Native JSX
      </footer>
    </main>
  );
}

// Mount if running directly (explicit DOM mounting)
if (import.meta.main) {
  console.log('🔥 Fire22 Package Review Grid');
  console.log('📦 Rendered with Bun JSX');
  console.log('🎨 Styled with @fire22/shared-styles');

  // Bun's JSX runtime returns DOM nodes, not virtual trees
  const root = document.getElementById('app') ?? document.body;
  root.appendChild(<PackageReviewGrid />);
}

// Export for SSR or other consumption
export default <PackageReviewGrid />;
