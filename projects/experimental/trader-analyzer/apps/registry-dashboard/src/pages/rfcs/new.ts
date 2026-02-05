/**
 * @fileoverview RFC Creation Page
 * @description Web form for creating new RFCs
 * @module apps/registry-dashboard/src/pages/rfcs/new
 */

import { Elysia } from 'elysia';

// Team data mapping (shared with packages page)
const TEAM_DATA = {
	'sports-correlation': {
		name: 'Sports Correlation',
		emoji: '🏀',
		packages: ['@graph/layer4', '@graph/layer3'],
		teamLead: 'alex.chen@yourcompany.com',
		telegramTopicId: 1,
		color: '#667eea',
	},
	'market-analytics': {
		name: 'Market Analytics',
		emoji: '📊',
		packages: ['@graph/layer2', '@graph/layer1'],
		teamLead: 'sarah.kumar@yourcompany.com',
		telegramTopicId: 3,
		color: '#f093fb',
	},
	'platform-tools': {
		name: 'Platform & Tools',
		emoji: '🔧',
		packages: [
			'@graph/algorithms',
			'@graph/storage',
			'@graph/streaming',
			'@graph/utils',
			'@bench/*',
		],
		teamLead: 'mike.rodriguez@yourcompany.com',
		telegramTopicId: 5,
		color: '#4facfe',
	},
} as const;

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

app.get('/rfcs/new', async ({ query }) => {
	const packageName = (query.package as string) || '';
	const packageEscaped = escapeHtml(packageName);

	// Get team info for the package if provided
	let teamInfo = null;
	if (packageName) {
		for (const [teamKey, team] of Object.entries(TEAM_DATA)) {
			if (team.packages.some((p) => packageName.startsWith(p.replace('/*', '')))) {
				teamInfo = { key: teamKey, ...team };
				break;
			}
		}
	}

	// Generate package options
	const allPackages = Object.values(TEAM_DATA).flatMap((team) => team.packages);

	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Create RFC - Registry Dashboard</title>
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
			margin-bottom: 30px;
		}
		.form-group {
			margin-bottom: 20px;
		}
		label {
			display: block;
			margin-bottom: 5px;
			font-weight: 600;
			color: #333;
		}
		input[type="text"],
		input[type="email"],
		select,
		textarea {
			width: 100%;
			padding: 10px;
			border: 1px solid #ddd;
			border-radius: 6px;
			font-size: 14px;
			font-family: inherit;
		}
		textarea {
			min-height: 120px;
			resize: vertical;
		}
		.help-text {
			font-size: 0.85rem;
			color: #666;
			margin-top: 5px;
		}
		.btn {
			padding: 12px 24px;
			border: none;
			border-radius: 6px;
			font-size: 16px;
			cursor: pointer;
			font-weight: 500;
			transition: all 0.2s;
		}
		.btn-primary {
			background: #007bff;
			color: white;
		}
		.btn-primary:hover {
			background: #0056b3;
		}
		.btn-secondary {
			background: #6c757d;
			color: white;
			margin-left: 10px;
		}
		.btn-secondary:hover {
			background: #545b62;
		}
		.team-badge {
			display: inline-block;
			padding: 5px 12px;
			border-radius: 12px;
			font-size: 0.85rem;
			margin-left: 10px;
			background: #e9ecef;
			color: #495057;
		}
		.alert {
			padding: 15px;
			border-radius: 6px;
			margin-bottom: 20px;
		}
		.alert-info {
			background: #d1ecf1;
			border: 1px solid #bee5eb;
			color: #0c5460;
		}
		.alert-success {
			background: #d4edda;
			border: 1px solid #c3e6cb;
			color: #155724;
		}
		.alert-error {
			background: #f8d7da;
			border: 1px solid #f5c6cb;
			color: #721c24;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📝 Create New RFC</h1>
		
		${teamInfo ? `
		<div class="alert alert-info">
			<strong>Team:</strong> ${teamInfo.emoji} ${teamInfo.name}<br>
			<strong>Team Lead:</strong> ${teamInfo.teamLead}
		</div>
		` : ''}
		
		<form id="rfc-form" onsubmit="submitRFC(event)">
			<div class="form-group">
				<label for="package">Package <span style="color: red;">*</span></label>
				<select id="package" name="package" required>
					<option value="">Select a package...</option>
					${allPackages
						.map(
							(pkg) => `
						<option value="${escapeHtml(pkg)}" ${pkg === packageName ? 'selected' : ''}>
							${escapeHtml(pkg)}
						</option>
					`
						)
						.join('')}
				</select>
				<div class="help-text">Select the package this RFC affects</div>
			</div>
			
			<div class="form-group">
				<label for="title">RFC Title <span style="color: red;">*</span></label>
				<input 
					type="text" 
					id="title" 
					name="title" 
					required 
					placeholder="e.g., Increase threshold from 0.75 to 0.80"
				/>
				<div class="help-text">Brief, descriptive title for the RFC</div>
			</div>
			
			<div class="form-group">
				<label for="author">Author Email <span style="color: red;">*</span></label>
				<input 
					type="email" 
					id="author" 
					name="author" 
					required 
					placeholder="your.email@yourcompany.com"
				/>
				<div class="help-text">Your email address</div>
			</div>
			
			<div class="form-group">
				<label for="description">Description <span style="color: red;">*</span></label>
				<textarea 
					id="description" 
					name="description" 
					required
					placeholder="Describe the proposed change, motivation, and expected impact..."
				></textarea>
				<div class="help-text">Detailed description of the RFC proposal</div>
			</div>
			
			<div class="form-group">
				<label for="proposed-changes">Proposed Changes (Optional)</label>
				<textarea 
					id="proposed-changes" 
					name="proposed-changes"
					placeholder="// Before&#10;currentImplementation() {&#10;  // existing code&#10;}&#10;&#10;// After&#10;proposedImplementation() {&#10;  // new code&#10;}"
					style="font-family: 'Monaco', 'Courier New', monospace;"
				></textarea>
				<div class="help-text">Code changes in before/after format</div>
			</div>
			
			<div style="margin-top: 30px;">
				<button type="submit" class="btn btn-primary">📤 Submit RFC</button>
				<a href="/packages" class="btn btn-secondary">Cancel</a>
			</div>
		</form>
		
		<div id="result" style="margin-top: 20px;"></div>
	</div>
	
	<script>
		async function submitRFC(event) {
			event.preventDefault();
			
			const form = event.target;
			const resultDiv = document.getElementById('result');
			const submitBtn = form.querySelector('button[type="submit"]');
			
			const data = {
				package: form.package.value,
				title: form.title.value,
				author: form.author.value,
				description: form.description.value,
				proposedChanges: form['proposed-changes'].value ? { code: form['proposed-changes'].value } : undefined
			};
			
			// Disable submit button
			submitBtn.disabled = true;
			submitBtn.textContent = 'Submitting...';
			
			try {
				const response = await fetch('/api/rfcs/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
				
				const result = await response.json();
				
				if (response.ok && result.success) {
					resultDiv.innerHTML = \`
						<div class="alert alert-success">
							<strong>✅ RFC Submitted Successfully!</strong><br>
							RFC ID: \${result.rfcId}<br>
							📢 Notification sent to Telegram topic<br>
							<a href="/rfcs/\${result.rfcId}">View RFC</a> | <a href="/packages">Back to Packages</a>
						</div>
					\`;
					form.reset();
				} else {
					resultDiv.innerHTML = \`
						<div class="alert alert-error">
							<strong>❌ Submission Failed</strong><br>
							\${result.error || 'Unknown error'}
						</div>
					\`;
				}
			} catch (error) {
				resultDiv.innerHTML = \`
					<div class="alert alert-error">
						<strong>❌ Submission Failed</strong><br>
						\${error.message}
					</div>
				\`;
			} finally {
				submitBtn.disabled = false;
				submitBtn.textContent = '📤 Submit RFC';
			}
		}
	</script>
</body>
</html>
	`;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	});
});

export default app;
