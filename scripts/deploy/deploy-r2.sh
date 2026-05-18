#!/bin/bash

echo "🚀 Deploying to R2 Buckets..."

# List of R2 domains that need simple content
R2_DOMAINS=(
    "admin.factory-wager.com"
    "api.factory-wager.com" 
    "app.factory-wager.com"
    "artifacts.factory-wager.com"
    "metrics.factory-wager.com"
    "profiles.factory-wager.com"
    "registry.factory-wager.com"
    "rss.factory-wager.com"
    "staging.factory-wager.com"
    "storage.factory-wager.com"
    "www.factory-wager.com"
)

# Create a simple landing page for each R2 bucket
for domain in "${R2_DOMAINS[@]}"; do
    echo "📄 Creating page for $domain..."
    
    bucket_name=$(echo $domain | sed 's/.factory-wager.com//')
    
    cat > "${bucket_name}-index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$domain - FactoryWager</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin: 0;
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #1e293b; margin-bottom: 1rem; }
        .status { 
            background: #f0fdf4; 
            color: #22c55e; 
            padding: 0.5rem 1rem; 
            border-radius: 20px; 
            display: inline-block;
            margin: 1rem 0;
        }
        .info { color: #64748b; margin-top: 1rem; }
        .links { margin-top: 2rem; }
        .links a { 
            color: #3b82f6; 
            text-decoration: none; 
            margin: 0 0.5rem; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🏭</div>
        <h1>$domain</h1>
        <div class="status">✅ Active</div>
        <p class="info">
            FactoryWager Infrastructure<br>
            Enterprise Management Platform
        </p>
        <div class="links">
            <a href="https://factory-wager.com">Home</a>
            <a href="https://wiki.factory-wager.com">Wiki</a>
            <a href="https://dashboard.factory-wager.com">Dashboard</a>
        </div>
    </div>
</body>
</html>
EOF

    echo "✅ Created ${bucket_name}-index.html"
done

echo ""
echo "🎯 Next Steps:"
echo "1. Upload these files to your R2 buckets"
echo "2. Enable static website hosting on each bucket"
echo "3. Verify domains are accessible"
echo ""
echo "📁 Generated files:"
ls -la *-index.html
