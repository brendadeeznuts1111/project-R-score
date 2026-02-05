import { readFileSync } from 'fs';
import { join } from 'path';

// Fire22 Dashboard Worker - ETag-Enabled Static Server
// Leverages Bun's automatic ETag generation for efficient caching

interface ReviewData {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  changes: number;
  tests_passing: boolean;
  build_time: string;
  bundle_size: string;
  security_grade: string;
}

interface DashboardMetrics {
  performance_score: number;
  security_checks: number;
  total_packages: number;
  pending_reviews: number;
  deployment_status: 'staging' | 'production';
  cloudflare_metrics: {
    edge_locations: number;
    response_time_ms: number;
    cache_hit_rate: number;
    requests_24h: number;
  };
}

// Staging review data that updates periodically
const stagingReviews: ReviewData[] = [
  {
    id: 'telegram-bot',
    title: '@fire22/telegram-bot',
    status: 'pending',
    timestamp: Date.now(),
    changes: 47,
    tests_passing: true,
    build_time: '12.3s',
    bundle_size: '847KB',
    security_grade: 'A+',
  },
  {
    id: 'queue-system',
    title: '@fire22/queue-system',
    status: 'pending',
    timestamp: Date.now(),
    changes: 23,
    tests_passing: true,
    build_time: '8.7s',
    bundle_size: '523KB',
    security_grade: 'A+',
  },
  {
    id: 'core-dashboard',
    title: '@fire22/core-dashboard',
    status: 'approved',
    timestamp: Date.now() - 3600000,
    changes: 89,
    tests_passing: true,
    build_time: '47.2s',
    bundle_size: '2.4MB',
    security_grade: 'A+',
  },
];

const dashboardMetrics: DashboardMetrics = {
  performance_score: 96,
  security_checks: 15,
  total_packages: 11,
  pending_reviews: 2,
  deployment_status: 'staging',
  cloudflare_metrics: {
    edge_locations: 300,
    response_time_ms: 12,
    cache_hit_rate: 94.2,
    requests_24h: 35453,
  },
};

// Create Bun server with automatic ETag support
const server = Bun.serve({
  port: 3002,

  // Static routes with automatic ETag generation
  static: {
    // Serve staging review HTML files
    '/': './src/staging-review.html',
    '/staging-reviews/telegram-bot-review.html': './src/staging-reviews/telegram-bot-review.html',
    '/staging-reviews/queue-system-review.html': './src/staging-reviews/queue-system-review.html',
    '/staging-reviews/core-dashboard-review.html':
      './src/staging-reviews/core-dashboard-review.html',

    // Serve CSS files with automatic ETag
    '/styles/staging-review-base.css': './src/styles/staging-review-base.css',
    '/styles/components/modals.css': './src/styles/components/modals.css',

    // Serve documentation files
    '/docs/telegram-bot-integration.html': './docs/telegram-bot-integration.html',
    '/docs/fire22-api-integration.html': './docs/fire22-api-integration.html',
  },

  // Dynamic routes that also benefit from ETag
  fetch(req) {
    const url = new URL(req.url);

    // API endpoints with JSON responses (automatic ETag)
    if (url.pathname === '/api/reviews/pending') {
      const pendingReviews = stagingReviews.filter(r => r.status === 'pending');
      return Response.json({
        reviews: pendingReviews,
        total: pendingReviews.length,
        timestamp: Date.now(),
      });
    }

    if (url.pathname === '/api/reviews/all') {
      return Response.json({
        reviews: stagingReviews,
        total: stagingReviews.length,
        timestamp: Date.now(),
      });
    }

    if (url.pathname === '/api/metrics/dashboard') {
      return Response.json(dashboardMetrics);
    }

    if (url.pathname === '/api/metrics/cloudflare') {
      return Response.json({
        ...dashboardMetrics.cloudflare_metrics,
        last_updated: Date.now(),
      });
    }

    // Review stats endpoint
    if (url.pathname === '/api/reviews/stats') {
      const stats = {
        total_reviews: stagingReviews.length,
        pending: stagingReviews.filter(r => r.status === 'pending').length,
        approved: stagingReviews.filter(r => r.status === 'approved').length,
        rejected: stagingReviews.filter(r => r.status === 'rejected').length,
        approval_rate: '87.3%',
        avg_review_time: '2h 14m',
        recent_activity: {
          today: 3,
          this_week: 12,
          this_month: 47,
        },
      };
      return Response.json(stats);
    }

    // Individual review details
    const reviewMatch = url.pathname.match(/^\/api\/reviews\/([^/]+)$/);
    if (reviewMatch) {
      const reviewId = reviewMatch[1];
      const review = stagingReviews.find(r => r.id === reviewId);

      if (review) {
        return Response.json({
          ...review,
          details: {
            author: 'fire22-team',
            priority: 'high',
            type: 'package',
            tests: {
              total: 47,
              passing: 47,
              coverage: '94.2%',
            },
            build: {
              status: 'success',
              duration: review.build_time,
            },
          },
        });
      }

      return new Response('Review not found', { status: 404 });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        etag_enabled: true,
        cache_efficiency: 'high',
      });
    }

    // 404 for unknown routes
    return new Response('Not Found', { status: 404 });
  },
});

// Demo: Testing ETag functionality
async function testETagSupport() {
  // Test static route
  const staticUrl = new URL('/', server.url);
  const staticResponse = await fetch(staticUrl);
  const staticETag = staticResponse.headers.get('etag');

  // Test with If-None-Match (should return 304)
  const cachedResponse = await fetch(staticUrl, {
    headers: {
      'If-None-Match': staticETag,
    },
  });

  // Test JSON endpoint
  const jsonUrl = new URL('/api/reviews/pending', server.url);
  const jsonResponse = await fetch(jsonUrl);
  const jsonETag = jsonResponse.headers.get('etag');

  // Test JSON with If-None-Match
  const cachedJsonResponse = await fetch(jsonUrl, {
    headers: {
      'If-None-Match': jsonETag,
    },
  });

  // Demonstrate bandwidth savings
  const fullSize = (await staticResponse.text()).length;
}

// Run test after 1 second
setTimeout(testETagSupport, 1000);

export { server };
