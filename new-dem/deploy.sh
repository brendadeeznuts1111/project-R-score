#!/bin/bash

# T3-Lattice Production Deployment Script
set -e

echo "🚀 T3-Lattice Fractal Edge Finder - Production Deployment"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="t3-lattice"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-your-registry.com}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed."; exit 1; }
    command -v helm >/dev/null 2>&1 || { log_warn "Helm not found - using kubectl apply instead"; }

    log_info "Dependencies check passed"
}

build_and_push_image() {
    log_info "Building Docker image..."

    # Build the image
    docker build -t ${DOCKER_REGISTRY}/t3-lattice-fractal:${IMAGE_TAG} .

    # Push to registry
    log_info "Pushing image to registry..."
    docker push ${DOCKER_REGISTRY}/t3-lattice-fractal:${IMAGE_TAG}

    log_info "Image built and pushed successfully"
}

create_namespace() {
    log_info "Creating namespace ${NAMESPACE}..."

    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

    log_info "Namespace created"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure components..."

    # Create secrets (you should populate these with actual values)
    log_warn "Please ensure secrets are created before deployment:"
    log_warn "kubectl create secret generic lattice-secrets --from-literal=lattice-token=YOUR_TOKEN -n ${NAMESPACE}"

    # Deploy Redis
    kubectl apply -f k8s/redis.yml -n ${NAMESPACE}

    # Deploy PostgreSQL
    kubectl apply -f k8s/postgres.yml -n ${NAMESPACE}

    # Wait for infrastructure to be ready
    log_info "Waiting for infrastructure to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n ${NAMESPACE} --timeout=300s
    kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=300s

    log_info "Infrastructure deployed successfully"
}

deploy_application() {
    log_info "Deploying T3-Lattice application..."

    # Update image in deployment
    sed -i.bak "s|image: t3-lattice-fractal:latest|image: ${DOCKER_REGISTRY}/t3-lattice-fractal:${IMAGE_TAG}|g" k8s/deployment.yml

    # Deploy application
    kubectl apply -f k8s/deployment.yml -n ${NAMESPACE}
    kubectl apply -f k8s/hpa.yml -n ${NAMESPACE}

    # Wait for deployment to be ready
    log_info "Waiting for application to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/t3-lattice-fractal -n ${NAMESPACE}

    # Restore original deployment file
    mv k8s/deployment.yml.bak k8s/deployment.yml 2>/dev/null || true

    log_info "Application deployed successfully"
}

setup_monitoring() {
    log_info "Setting up monitoring stack..."

    # Deploy Prometheus and Grafana using helm if available
    if command -v helm >/dev/null 2>&1; then
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo add grafana https://grafana.github.io/helm-charts
        helm repo update

        # Install Prometheus
        helm upgrade --install prometheus prometheus-community/prometheus -n ${NAMESPACE}

        # Install Grafana
        helm upgrade --install grafana grafana/grafana -n ${NAMESPACE}

        log_info "Monitoring stack deployed with Helm"
    else
        log_warn "Helm not available - skipping monitoring deployment"
        log_warn "Deploy monitoring manually or install Helm"
    fi
}

run_health_checks() {
    log_info "Running health checks..."

    # Get service URL
    SERVICE_IP=$(kubectl get svc t3-lattice-fractal -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    SERVICE_PORT=$(kubectl get svc t3-lattice-fractal -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].port}')

    # Wait for service to be ready
    sleep 10

    # Test health endpoint
    if kubectl run test-health --image=curlimages/curl --rm -i --restart=Never -- curl -f http://${SERVICE_IP}:${SERVICE_PORT}/health -n ${NAMESPACE} 2>/dev/null; then
        log_info "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi

    # Test fractal analysis endpoint
    if kubectl run test-analysis --image=curlimages/curl --rm -i --restart=Never -- curl -f http://${SERVICE_IP}:${SERVICE_PORT}/api/fractal/analysis -n ${NAMESPACE} 2>/dev/null; then
        log_info "Analysis endpoint check passed"
    else
        log_error "Analysis endpoint check failed"
        exit 1
    fi
}

show_deployment_info() {
    log_info "Deployment completed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "=========================="
    echo "Namespace: ${NAMESPACE}"
    echo "Image: ${DOCKER_REGISTRY}/t3-lattice-fractal:${IMAGE_TAG}"
    echo ""
    echo "🌐 Service Endpoints:"
    kubectl get svc -n ${NAMESPACE}
    echo ""
    echo "📈 Pod Status:"
    kubectl get pods -n ${NAMESPACE}
    echo ""
    echo "🔗 Ingress URLs:"
    kubectl get ingress -n ${NAMESPACE}
    echo ""
    echo "📊 Monitoring:"
    echo "Prometheus: http://prometheus.${NAMESPACE}.svc.cluster.local"
    echo "Grafana: http://grafana.${NAMESPACE}.svc.cluster.local"
    echo ""
    echo "🚀 Access the application:"
    echo "kubectl port-forward svc/t3-lattice-fractal 8080:8080 -n ${NAMESPACE}"
    echo "Then visit: http://localhost:8080"
}

# Main deployment flow
main() {
    check_dependencies
    build_and_push_image
    create_namespace
    deploy_infrastructure
    deploy_application
    setup_monitoring
    run_health_checks
    show_deployment_info

    log_info "🎉 T3-Lattice deployment completed successfully!"
}

# Run main function
main "$@"