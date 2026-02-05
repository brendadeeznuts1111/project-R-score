/**
 * @fileoverview RFC Detail Page
 * @description View individual RFC details
 * @module apps/registry-dashboard/src/pages/rfcs/[id]
 */

import { getRFC } from '@graph/telegram/rfc';
import { Elysia } from 'elysia';

const app = new Elysia();

// Helper to escape HTML
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

app.get('/rfcs/:id', async ({ params }) => {
	const rfcId = parseInt(params.id as string);
	
	if (isNaN(rfcId)) {
		return new Response('Invalid RFC ID', { status: 400 });
	}

	const rfc = getRFC(rfcId);
	
	if (!rfc) {
		return new Response('RFC not found', { status: 404 });
	}

	const statusColors = {
		draft: '#6c757d',
		review: '#007bff',
		approved: '#28a745',
		rejected: '#dc3545',
		implemented: '#17a2b8',
	};

	const statusEmojis = {
		draft: '📝',
		review: '📋',
		approved: '✅',
		rejected: '❌',
		implemented: '🚀',
	};

	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>RFC #${rfcId} - ${escapeHtml(rfc.title)}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			margin: 0;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			max-width: 900px;
			margin: 0 auto;
			background: white;
			border-radius: 8px;
			padding: 30px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		h1 {
			color: #333;
			border-bottom: 2px solid #007bff;
			padding-bottom: 10px;
		}
		.status-badge {
			display: inline-block;
			padding: 5px 12px;
			border-radius: 12px;
			font-size: 0.85rem;
			font-weight: 600;
			margin-left: 10px;
		}
		.metadata {
			background: #f8f9fa;
			padding: 15px;
			border-radius: 6px;
			margin: 20px 0;
		}
		.metadata p {
			margin: 5px 0;
		}
		.description {
			margin: 20px 0;
			line-height: 1.6;
		}
		.actions {
			margin-top: 30px;
			padding-top: 20px;
			border-top: 1px solid #ddd;
		}
		.btn {
			padding: 10px 20px;
			border: none;
			border-radius: 6px;
			font-size: 14px;
			cursor: pointer;
			margin-right: 10px;
			text-decoration: none;
			display: inline-block;
		}
		.btn-primary {
			background: #007bff;
			color: white;
		}
		.btn-success {
			background: #28a745;
			color: white;
		}
		.btn-danger {
			background: #dc3545;
			color: white;
		}
		.btn-secondary {
			background: #6c757d;
			color: white;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>
			RFC #${rfcId}: ${escapeHtml(rfc.title)}
			<span class="status-badge" style="background: ${statusColors[rfc.status as keyof typeof statusColors] || '#6c757d'}; color: white;">
				${statusEmojis[rfc.status as keyof typeof statusEmojis] || '📝'} ${rfc.status.toUpperCase()}
			</span>
		</h1>
		
		<div class="metadata">
			<p><strong>Package:</strong> ${escapeHtml(rfc.package_name)}</p>
			<p><strong>Author:</strong> ${escapeHtml(rfc.author)}</p>
			<p><strong>Submitted:</strong> ${new Date(rfc.submitted_at).toLocaleString()}</p>
			${rfc.reviewed_by ? `<p><strong>Reviewed by:</strong> ${escapeHtml(rfc.reviewed_by)}</p>` : ''}
			${rfc.reviewed_at ? `<p><strong>Reviewed:</strong> ${new Date(rfc.reviewed_at).toLocaleString()}</p>` : ''}
		</div>
		
		<div class="description">
			<h2>Description</h2>
			<p style="white-space: pre-wrap;">${escapeHtml(rfc.description)}</p>
		</div>
		
		<div class="actions">
			<a href="/packages" class="btn btn-secondary">← Back to Packages</a>
			<a href="/rfcs/new?package=${encodeURIComponent(rfc.package_name)}" class="btn btn-primary">📝 Create Similar RFC</a>
		</div>
	</div>
</body>
</html>
	`;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	});
});

export default app;
