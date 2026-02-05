#!/bin/bash

# Empire Pro CLI v4.0 - Run All Commands Script
# Executes all 150 enhanced one-liner commands with proper categorization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLI_CMD="bun run ep-cli"
LOG_DIR="./test-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/run-all-commands-$TIMESTAMP.log"
SUMMARY_FILE="$LOG_DIR/summary-$TIMESTAMP.json"

# Create log directory
mkdir -p "$LOG_DIR"

# Initialize counters
TOTAL_COMMANDS=150
RUN_COMMANDS=0
SUCCESS_COUNT=0
FAILED_COUNT=0
CATEGORIES=("phone" "email" "address" "social" "security" "ml" "viz" "stream")

# Function to print section header
print_section() {
    echo -e "${BLUE}📋 $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to print command execution
print_command() {
    echo -e "${YELLOW}💻 [$RUN_COMMANDS/$TOTAL_COMMANDS] $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((SUCCESS_COUNT++))
}

# Function to print failure
print_failure() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_COUNT++))
}

# Function to log result
log_result() {
    local command="$1"
    local status="$2"
    local output="$3"
    local duration="$4"
    
    echo "{\"command\":\"$command\",\"status\":\"$status\",\"duration\":$duration,\"output\":\"$output\"}" >> "$LOG_FILE"
}

# Function to execute command with timeout and error handling
execute_command() {
    local cmd="$1"
    local description="$2"
    local timeout_duration=30
    
    print_command "$description"
    
    # Record start time
    start_time=$(date +%s.%N)
    
    # Execute command with timeout
    if timeout "$timeout_duration" $CLI_CMD $cmd 2>/dev/null; then
        end_time=$(date +%s.%N)
        duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        print_success "Completed in ${duration}s"
        log_result "$cmd" "success" "Command completed successfully" "$duration"
    else
        end_time=$(date +%s.%N)
        duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        print_failure "Failed or timed out after ${timeout_duration}s"
        log_result "$cmd" "failed" "Command failed or timed out" "$duration"
    fi
    
    ((RUN_COMMANDS++))
    echo ""
}

# Function to run category of commands
run_category() {
    local category="$1"
    local start_cmd="$2"
    local end_cmd="$3"
    
    print_section "Running $category Intelligence Commands ($start_cmd-$end_cmd)"
    
    for ((i=start_cmd; i<=end_cmd; i++)); do
        case $i in
            # Phone Intelligence Commands (1-25)
            1) execute_command "phone +15551234567 --intel" "Basic phone intelligence" ;;
            2) execute_command "phone +15551234567 --audit --correlate=email:address:social" "Phone audit with correlation" ;;
            3) execute_command "phone +15551234567 --audit --risk-breakdown --ml-confidence=0.95" "Phone audit with risk breakdown" ;;
            4) execute_command "phone +15551234567 --intel --temporal --history=180" "Phone with temporal analysis" ;;
            5) execute_command "phone +15551234567 --graph --format=html --export=graph.html" "Phone identity graph" ;;
            6) execute_command "phone +15551234567 --pty --live-updates --interval=5" "Phone live monitoring" ;;
            7) execute_command "phone +15551234567 --audit --mock-level=high --correlate=email:social" "Phone audit with high mock level" ;;
            8) execute_command "phone +15551234567 --intel --history=365 --temporal" "Phone with extended history" ;;
            9) execute_command "phone +15551234567 --graph --format=gephi --export=identity-graph.gexf" "Phone graph Gephi export" ;;
            10) execute_command "phone +15551234567 --audit --risk-breakdown --ml-confidence=0.99" "Phone audit with high confidence" ;;
            11) execute_command "batch phones.txt --type=phones --parallel=32 --export=json" "Batch phone processing" ;;
            12) execute_command "batch high-risk.txt --type=phones --parallel=16 --audit --export=slack" "High-risk batch phone audit" ;;
            13) execute_command "batch phones.csv --type=phones --parallel=64 --risk-breakdown" "Large batch phone risk analysis" ;;
            14) execute_command "batch emergency-list.txt --type=phones --priority=critical --parallel=8" "Emergency priority phone batch" ;;
            15) execute_command "batch corporate-list.txt --type=phones --correlate=all --parallel=32" "Corporate phone correlation batch" ;;
            16) execute_command "phone +15551234567 --pty --live-updates --interval=1 --export=stream" "High-frequency phone monitoring" ;;
            17) execute_command "phone +15551234567 --audit --temporal --history=90 --export=timeline" "Phone temporal timeline" ;;
            18) execute_command "phone +15551234567 --intel --behavioral-analysis --risk-scoring" "Phone behavioral analysis" ;;
            19) execute_command "phone +15551234567 --graph --format=neo4j --export=cypher-queries.cypher" "Phone Neo4j graph export" ;;
            20) execute_command "phone +15551234567 --audit --cross-correlation --ml-confidence=0.95" "Phone cross-correlation analysis" ;;
            21) execute_command "phone +15551234567 --risk-assessment --compliance-check --export=pdf" "Phone risk and compliance" ;;
            22) execute_command "phone +15551234567 --audit --fraud-detection --synthetic-check" "Phone fraud and synthetic check" ;;
            23) execute_command "phone +15551234567 --security-scan --vulnerability-check" "Phone security vulnerability scan" ;;
            24) execute_command "phone +15551234567 --compliance --gdpr-check --data-protection" "Phone GDPR compliance check" ;;
            25) execute_command "phone +15551234567 --audit --full-report --export=html" "Phone full HTML report" ;;
            
            # Email Intelligence Commands (26-45)
            26) execute_command "email user@company.com --email-intel --breach-check --domain-age --mx-validation" "Complete email intelligence" ;;
            27) execute_command "email ceo@fortune500.com --enrich-linkedin --company-intel" "Email LinkedIn enrichment" ;;
            28) execute_command "email temp@mailinator.com --disposable-check --block-reason" "Disposable email check" ;;
            29) execute_command "email user@gmail.com --security-scan --reputation-check" "Email security and reputation" ;;
            30) execute_command "email corporate@enterprise.com --domain-analysis --company-intel" "Corporate domain analysis" ;;
            31) execute_command "email suspicious@unknown.com --threat-assessment --malware-check" "Email threat assessment" ;;
            32) execute_command "email user@company.com --breach-check --dark-web-monitoring" "Email breach and dark web check" ;;
            33) execute_command "email admin@system.com --security-scan --admin-check" "Admin email security check" ;;
            34) execute_command "email user@domain.com --mx-validation --spf-check --dkim-check" "Email security validation" ;;
            35) execute_command "email test@sample.com --deliverability-check --reputation-score" "Email deliverability check" ;;
            36) execute_command "email emails.txt --batch-emails --parallel=32 --export=slack" "Batch email processing to Slack" ;;
            37) execute_command "email corporate-emails.csv --batch-emails --parallel=16 --enrich-linkedin" "Corporate email batch enrichment" ;;
            38) execute_command "email high-risk.txt --batch-emails --parallel=8 --security-scan" "High-risk email security batch" ;;
            39) execute_command "email user-list.json --batch-emails --parallel=64 --export=parquet" "Large email batch to Parquet" ;;
            40) execute_command "email emergency.txt --batch-emails --priority=critical --parallel=4" "Emergency email priority batch" ;;
            41) execute_command "email user@company.com --find-associated --depth=3 --export=graph" "Email associated identity graph" ;;
            42) execute_command "email executive@corp.com --executive-enrichment --company-intel" "Executive email enrichment" ;;
            43) execute_command "email user@domain.com --behavioral-analysis --risk-profiling" "Email behavioral risk profiling" ;;
            44) execute_command "email contact@business.com --professional-networking --linkedin-enrich" "Professional networking enrichment" ;;
            45) execute_command "email user@email.com --compliance-check --gdpr-ccpa-validation" "Email compliance validation" ;;
            
            # Address Intelligence Commands (46-60)
            46) execute_command "address \"123 Main St, NYC\" --address-intel --property-value --crime-rate --income-level" "Complete address intelligence" ;;
            47) execute_command "address \"PO Box 123\" --risk-flags --commercial-check" "PO Box risk assessment" ;;
            48) execute_command "address \"1600 Pennsylvania Ave\" --resident-history --temporal=10" "Address resident history" ;;
            49) execute_command "address \"456 Oak Ave\" --property-analysis --neighborhood-insight" "Property neighborhood analysis" ;;
            50) execute_command "address \"789 Pine Rd\" --demographic-analysis --market-data" "Address demographic analysis" ;;
            51) execute_command "address addresses.txt --geo-batch --radius=5km --cluster-analysis" "Geographic batch clustering" ;;
            52) execute_command "address locations.csv --geo-cluster --density-analysis --export=map" "Location density mapping" ;;
            53) execute_command "address regions.json --regional-analysis --market-insights" "Regional market insights" ;;
            54) execute_command "address coordinates.txt --geo-spatial-analysis --heatmap" "Geospatial heatmap analysis" ;;
            55) execute_command "address addresses.json --cluster-detection --anomaly-identification" "Address anomaly detection" ;;
            56) execute_command "address suspicious-location.json --risk-assessment --security-check" "Suspicious location risk check" ;;
            57) execute_command "address business-locations.csv --commercial-analysis --zoning-check" "Business commercial analysis" ;;
            58) execute_command "address residential-areas.txt --property-risk --insurance-analysis" "Residential property risk" ;;
            59) execute_command "address high-value.json --luxury-analysis --market-valuation" "High-value property analysis" ;;
            60) execute_command "address compliance-list.json --zoning-compliance --regulatory-check" "Zoning compliance check" ;;
            
            # Social Intelligence Commands (61-80)
            61) execute_command "social \"@john_doe\" --social-map --platforms=all --influence-score" "Complete social mapping" ;;
            62) execute_command "social \"John Doe\" --find-profiles --corporate-only --executive-check" "Professional profile search" ;;
            63) execute_command "social user@social.com --activity-patterns --behavioral-score" "Social activity patterns" ;;
            64) execute_command "social \"@username\" --platforms=twitter,linkedin,github --cross-reference" "Cross-platform reference" ;;
            65) execute_command "social \"Full Name\" --professional-profiles --executive-level" "Executive professional profiles" ;;
            66) execute_command "social \"@influencer\" --influence-analysis --engagement-metrics" "Influencer analysis" ;;
            67) execute_command "social brand-handle --brand-analysis --sentiment-analysis" "Brand sentiment analysis" ;;
            68) execute_command "social competitor-profile --competitive-analysis --market-position" "Competitive analysis" ;;
            69) execute_command "social target-audience --audience-analysis --demographics" "Audience demographic analysis" ;;
            70) execute_command "social industry-leaders --thought-leadership --expertise-score" "Industry leadership analysis" ;;
            71) execute_command "social correlations.txt --identity-graph --export=neo4j --cypher-query" "Social identity graph" ;;
            72) execute_command "social network-data.json --social-graph --centrality-analysis" "Social network centrality" ;;
            73) execute_command "social connections.csv --network-analysis --influence-mapping" "Social influence mapping" ;;
            74) execute_command "social social-graph.json --community-detection --cluster-analysis" "Social community detection" ;;
            75) execute_command "social influence-data.json --influence-propagation --viral-analysis" "Influence propagation analysis" ;;
            76) execute_command "social fragment.txt --enrich-all --confidence-threshold=0.8" "Social data enrichment" ;;
            77) execute_command "social social-profiles.csv --behavioral-profiling --risk-assessment" "Social behavioral profiling" ;;
            78) execute_command "social executive-search.json --c-level-enrichment --company-intel" "C-level executive search" ;;
            79) execute_command "social social-data.json --trend-analysis --viral-potential" "Social trend analysis" ;;
            80) execute_command "social professional-network.json --career-analysis --skill-mapping" "Professional career analysis" ;;
            
            # Security & Compliance Commands (81-110)
            81) execute_command "security audit --scope=full --depth=comprehensive --include-pentest" "Comprehensive security audit" ;;
            82) execute_command "security monitor --enable-anomaly-detection --threshold=0.8" "Security anomaly monitoring" ;;
            83) execute_command "security pentest --type=black_box --duration=7 --scope=api,web,mobile" "Black box penetration test" ;;
            84) execute_command "security vulnerability-scan --target=application --export=nessus" "Vulnerability scanning" ;;
            85) execute_command "security risk-assessment --framework=nist --export=pdf" "NIST risk assessment" ;;
            86) execute_command "security ids-setup --enable-anomaly-detection --alert-channels=slack,pagerduty" "IDS setup and configuration" ;;
            87) execute_command "security monitor-anomalies --data-stream=security-logs.json" "Security anomaly monitoring" ;;
            88) execute_command "security threat-hunting --ioc-analysis --threat-intel" "Threat hunting and IOC analysis" ;;
            89) execute_command "security incident-response --playbook=security-breach --automated" "Automated incident response" ;;
            90) execute_command "security forensic-analysis --evidence-collection --timeline-generation" "Forensic analysis" ;;
            91) execute_command "compliance check --regulations=gdpr,ccpa,pci,soc2 --jurisdiction=us --industry=finance" "Multi-regulation compliance" ;;
            92) execute_command "compliance dsr --type=access --subject-id=user123 --format=json" "Data subject request" ;;
            93) execute_command "compliance docs --regulation=gdpr --format=pdf --include-evidence" "GDPR documentation" ;;
            94) execute_command "compliance audit-trail --period=90 --export=csv" "Compliance audit trail" ;;
            95) execute_command "compliance risk-assessment --framework=iso27001 --export=html" "ISO27001 risk assessment" ;;
            96) execute_command "security data-masking --sensitive-data=pii,phi --format=masked" "Data masking operation" ;;
            97) execute_command "security encryption-audit --algorithm-check --key-management" "Encryption audit" ;;
            98) execute_command "security privacy-impact-assessment --data-types=all --jurisdiction=global" "Privacy impact assessment" ;;
            99) execute_command "security consent-management --gdpr-compliance --audit-trail" "Consent management" ;;
            100) execute_command "security data-classification --sensitivity-levels --auto-tagging" "Data classification" ;;
            101) execute_command "security threat-intel --ioc-feed --automated-analysis" "Threat intelligence analysis" ;;
            102) execute_command "security security-posture-assessment --maturity-model --gap-analysis" "Security posture assessment" ;;
            103) execute_command "security pen-test-report --findings-export --remediation-plan" "Penetration test report" ;;
            104) execute_command "security security-orchestration --playbook-automation --response-automation" "Security orchestration" ;;
            105) execute_command "security zero-trust-assessment --identity-verification --access-control" "Zero trust assessment" ;;
            106) execute_command "compliance automated-reporting --schedule=monthly --recipients=compliance@company.com" "Automated compliance reporting" ;;
            107) execute_command "compliance policy-engine --rule-validation --automated-enforcement" "Compliance policy engine" ;;
            108) execute_command "compliance audit-automation --continuous-monitoring --alerting" "Compliance audit automation" ;;
            109) execute_command "compliance regulatory-change-tracking --jurisdiction=all --impact-analysis" "Regulatory change tracking" ;;
            110) execute_command "compliance compliance-dashboard --real-time-status --kpi-tracking" "Compliance dashboard" ;;
            
            # ML & Predictive Analytics Commands (111-125)
            111) execute_command "ml training-data.json --train-model=synthetic-v3 --epochs=100 --export=onnx" "ML model training" ;;
            112) execute_command "ml anomaly-stream.json --predictive-alerts --horizon=24h --confidence=0.9" "Predictive anomaly alerts" ;;
            113) execute_command "ml model-comparison.json --ab-test --metrics=accuracy:f1:roc --export=report" "ML model comparison" ;;
            114) execute_command "ml bias-audit.json --fairness-metrics --debiasing --export=report" "ML bias audit" ;;
            115) execute_command "ml reinforcement-learning --feedback-loop --reward-function=trust" "Reinforcement learning" ;;
            116) execute_command "ml graph-embeddings.json --train-embeddings --dimensions=128 --export=vectors" "Graph embeddings training" ;;
            117) execute_command "ml synthetic-detection.json --train-synthetic-detector --accuracy-target=0.98" "Synthetic detection training" ;;
            118) execute_command "ml risk-prediction.json --train-risk-model --features=behavioral,temporal,network" "Risk prediction model" ;;
            119) execute_command "ml anomaly-detection.json --train-anomaly-model --algorithm=isolation-forest" "Anomaly detection training" ;;
            120) execute_command "ml model-monitoring.json --performance-tracking --drift-detection" "ML model monitoring" ;;
            121) execute_command "ml feature-importance.json --analyze-features --export=visualization" "Feature importance analysis" ;;
            122) execute_command "ml model-explainability.json --shap-analysis --lime-explanation" "Model explainability" ;;
            123) execute_command "ml prediction-confidence.json --confidence-calibration --reliability-diagram" "Prediction confidence analysis" ;;
            124) execute_command "ml ensemble-models.json --combine-models --voting-strategy=weighted" "Ensemble model combination" ;;
            125) execute_command "ml automated-ml.json --auto-feature-selection --hyperparameter-tuning" "Automated ML" ;;
            
            # Visualization & Reporting Commands (126-140)
            126) execute_command "dashboard metrics.json --create-dashboard --export=html" "Dashboard creation" ;;
            127) execute_command "graph identity-data.json --visualize=3d --vr-ready --export=glb" "3D graph visualization" ;;
            128) execute_command "map geo-data.json --visualize-map --layers=crime:income:property --export=html" "Map visualization" ;;
            129) execute_command "timeline temporal-data.json --create-timeline --animate --export=gif" "Animated timeline" ;;
            130) execute_command "report comprehensive-data.json --generate-report --format=pdf --include-charts" "Comprehensive report" ;;
            131) execute_command "visualize network-graph.json --layout=force --interactive --export=html" "Interactive network graph" ;;
            132) execute_command "visualize risk-heatmap.json --gradient-scale --interactive --export=svg" "Interactive risk heatmap" ;;
            133) execute_command "visualize 3d-scatter.json --dimensions=x:y:z:size:color --export=html" "3D scatter visualization" ;;
            134) execute_command "visualize animated-graph.json --time-series --export=mp4 --fps=30" "Animated graph export" ;;
            135) execute_command "visualize vr-experience.json --vr-ready --controllers --export=glb" "VR experience visualization" ;;
            136) execute_command "report security-findings.json --executive-summary --risk-matrix --export=pdf" "Security findings report" ;;
            137) execute_command "report compliance-status.json --multi-regulation --dashboard --export=html" "Compliance status report" ;;
            138) execute_command "report performance-metrics.json --trend-analysis --kpis --export=excel" "Performance metrics report" ;;
            139) execute_command "report incident-analysis.json --timeline --root-cause --export=pdf" "Incident analysis report" ;;
            140) execute_command "report business-intelligence.json --insights --recommendations --export=powerpoint" "Business intelligence report" ;;
            
            # Stream Processing & Performance Commands (141-150)
            141) execute_command "stream stream.json --monitor --alerts --webhooks=slack:pagerduty:webex" "Stream monitoring with webhooks" ;;
            142) execute_command "stream incoming-stream.json --kafka-produce=topic-risks --avro-schema" "Kafka stream production" ;;
            143) execute_command "stream real-time-data.json --process-stream --buffer-size=10000 --parallel=16" "Real-time stream processing" ;;
            144) execute_command "stream event-stream.json --event-processing --complex-event-processing" "Complex event processing" ;;
            145) execute_command "stream log-stream.json --log-analysis --pattern-detection --alerting" "Log stream analysis" ;;
            146) execute_command "perf load-test.json --benchmark --scale=1M --throughput --latency" "Load testing benchmark" ;;
            147) execute_command "perf cluster-nodes.json --autoscale --metrics=cpu:memory:network" "Cluster auto-scaling" ;;
            148) execute_command "perf cache-config.json --warm-up --preload --hit-rate=99%" "Cache performance optimization" ;;
            149) execute_command "perf geo-distributed.json --edge-compute --regions=us:eu:asia" "Geo-distributed performance" ;;
            150) execute_command "perf stress-test.json --max-capacity --resource-monitoring --export=report" "Stress testing with monitoring" ;;
            
            *) echo "Unknown command number: $i" ;;
        esac
        
        # Small delay between commands
        sleep 0.5
    done
}

# Function to generate summary report
generate_summary() {
    local success_rate=0
    if [ $RUN_COMMANDS -gt 0 ]; then
        success_rate=$(echo "scale=2; $SUCCESS_COUNT * 100 / $RUN_COMMANDS" | bc -l)
    fi
    
    cat > "$SUMMARY_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "total_commands": $TOTAL_COMMANDS,
  "executed_commands": $RUN_COMMANDS,
  "successful_commands": $SUCCESS_COUNT,
  "failed_commands": $FAILED_COUNT,
  "success_rate": $success_rate,
  "categories": {
    "phone": {"start": 1, "end": 25, "total": 25},
    "email": {"start": 26, "end": 45, "total": 20},
    "address": {"start": 46, "end": 60, "total": 15},
    "social": {"start": 61, "end": 80, "total": 20},
    "security": {"start": 81, "end": 110, "total": 30},
    "ml": {"start": 111, "end": 125, "total": 15},
    "visualization": {"start": 126, "end": 140, "total": 15},
    "stream": {"start": 141, "end": 150, "total": 10}
  },
  "log_file": "$LOG_FILE",
  "performance": {
    "total_duration": "$(date -d@$SECONDS -u +%H:%M:%S)",
    "average_command_time": "$(echo "scale=3; $SECONDS / $RUN_COMMANDS" | bc -l)s"
  }
}
EOF
    
    echo -e "${GREEN}📊 Summary report generated: $SUMMARY_FILE${NC}"
}

# Function to display final results
display_results() {
    echo ""
    print_section "Execution Complete"
    echo -e "${CYAN}📋 Total Commands: $TOTAL_COMMANDS${NC}"
    echo -e "${GREEN}✅ Successful: $SUCCESS_COUNT${NC}"
    echo -e "${RED}❌ Failed: $FAILED_COUNT${NC}"
    echo -e "${BLUE}📊 Success Rate: $(echo "scale=1; $SUCCESS_COUNT * 100 / $RUN_COMMANDS" | bc -l)%${NC}"
    echo -e "${PURPLE}📁 Log File: $LOG_FILE${NC}"
    echo -e "${YELLOW}📊 Summary: $SUMMARY_FILE${NC}"
    echo ""
    
    if [ $FAILED_COUNT -gt 0 ]; then
        echo -e "${RED}⚠️ Some commands failed. Check the log file for details.${NC}"
    else
        echo -e "${GREEN}🎉 All commands executed successfully!${NC}"
    fi
}

# Main execution logic
main() {
    echo -e "${CYAN}🚀 Empire Pro CLI v4.0 - Running All 150 Enhanced Commands${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo ""
    
    # Check if CLI is available
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}❌ Bun not found. Please install Bun first.${NC}"
        exit 1
    fi
    
    if [ ! -f "cli/bin/ep-cli" ]; then
        echo -e "${RED}❌ CLI binary not found. Please run 'chmod +x cli/bin/ep-cli'${NC}"
        exit 1
    fi
    
    # Get command line arguments
    case "${1:-all}" in
        "phone")
            run_category "Phone Intelligence" 1 25
            ;;
        "email")
            run_category "Email Intelligence" 26 45
            ;;
        "address")
            run_category "Address Intelligence" 46 60
            ;;
        "social")
            run_category "Social Intelligence" 61 80
            ;;
        "security")
            run_category "Security & Compliance" 81 110
            ;;
        "ml")
            run_category "ML & Predictive Analytics" 111 125
            ;;
        "viz")
            run_category "Visualization & Reporting" 126 140
            ;;
        "stream")
            run_category "Stream Processing & Performance" 141 150
            ;;
        "all"|*)
            echo -e "${YELLOW}🔄 Running all 150 commands... This will take several minutes.${NC}"
            echo ""
            
            # Create sample data files for testing
            echo "+15551234567" > phones.txt
            echo "+15551234568" >> phones.txt
            echo "user@company.com" > emails.txt
            echo "123 Main St, NYC" > addresses.txt
            echo "@john_doe" > social.txt
            
            # Run all categories
            for category in "${CATEGORIES[@]}"; do
                case $category in
                    "phone") run_category "Phone Intelligence" 1 25 ;;
                    "email") run_category "Email Intelligence" 26 45 ;;
                    "address") run_category "Address Intelligence" 46 60 ;;
                    "social") run_category "Social Intelligence" 61 80 ;;
                    "security") run_category "Security & Compliance" 81 110 ;;
                    "ml") run_category "ML & Predictive Analytics" 111 125 ;;
                    "viz") run_category "Visualization & Reporting" 126 140 ;;
                    "stream") run_category "Stream Processing & Performance" 141 150 ;;
                esac
                
                echo -e "${YELLOW}📊 Intermediate Results: $SUCCESS_COUNT/$RUN_COMMANDS successful${NC}"
                echo ""
            done
            
            # Cleanup sample files
            rm -f phones.txt emails.txt addresses.txt social.txt
            ;;
    esac
    
    # Generate summary and display results
    generate_summary
    display_results
}

# Check for bc command (needed for calculations)
if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}⚠️ 'bc' not found. Some calculations may not work.${NC}"
fi

# Run main function with all arguments
main "$@"
