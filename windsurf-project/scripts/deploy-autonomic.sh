#!/bin/bash
# deploy-autonomic.sh

echo "🚀 Deploying Autonomic Intelligence Layer (Patterns 101-105)"

# 1. Build images
docker build -t empirepro/autonomic-intelligence:1.0.0 -f Dockerfile.autonomic .
docker build -t empirepro/autonomic-healing:1.0.0 -f Dockerfile.healing .

# 2. Push to registry
docker push empirepro/autonomic-intelligence:1.0.0
docker push empirepro/autonomic-healing:1.0.0

# 3. Deploy to Kubernetes
kubectl apply -f manifests/autonomic-orchestration.yaml

# 4. Configure secrets
kubectl create secret generic empire-pro-secrets \
  --from-literal=cashAppApiKey=$CASH_APP_API_KEY \
  --from-literal=ourAppAuthToken=$OUR_APP_AUTH_TOKEN \
  --namespace empire-pro

# 5. Deploy monitoring
kubectl apply -f manifests/monitoring/

# 6. Initialize autonomic patterns
kubectl exec -it deployment/empire-pro-autonomic -- \
  node -e "require('./dist/patterns/autonomic-matrix').registerAutonomicPatterns()"

# 7. Run health check
echo "Waiting for deployment to be ready..."
sleep 30
curl http://empire-pro-autonomic.empire-pro.svc.cluster.local/health

# 8. Test autonomic patterns
echo "Testing autonomic patterns..."
curl -X POST http://empire-pro-autonomic.empire-pro.svc.cluster.local/process \
  -H "Content-Type: application/json" \
  -d '{"phone": "+14155551234"}'

echo "✅ Autonomic Intelligence Layer deployed successfully!"
