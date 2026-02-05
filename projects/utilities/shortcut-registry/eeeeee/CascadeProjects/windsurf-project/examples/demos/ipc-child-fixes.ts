// Fixed IPC child process - TypeScript strict compliance

// Fix 1: process.send possibly undefined
function sendToParent(type: string, data: any) {
  if (process.send) {
    process.send({
      type,
      data,
      timestamp: Date.now(),
      id: 'child_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    });
  }
}

// Fix 2-3: metrics handling with proper null checks
function handleStatusRequest(message: ParentMessage) {
  const { metrics } = message;
  
  console.log(`📊 Gathering system metrics...`);
  
  // Update metrics with some randomness
  systemMetrics.cpu = Math.random() * 30 + 20;
  systemMetrics.memory = Math.random() * 40 + 30;
  systemMetrics.network = Math.random() * 20 + 10;
  systemMetrics.accuracy = aiSystemState.accuracy;
  systemMetrics.threats = Math.floor(Math.random() * 5);
  
  // Safe handling of metrics array
  const requestedMetrics = (metrics && metrics.length > 0) 
    ? metrics 
    : ['cpu', 'memory', 'network', 'accuracy', 'threats'];
  
  const filteredMetrics: any = {};
  
  // Safe iteration over requestedMetrics
  if (requestedMetrics && Array.isArray(requestedMetrics)) {
    requestedMetrics.forEach(metric => {
      if (metric && typeof metric === 'string' && metric in systemMetrics) {
        filteredMetrics[metric] = systemMetrics[metric as keyof typeof systemMetrics];
      }
    });
  }
  
  sendToParent('system_status', filteredMetrics);
}

// Fix 4: Add missing type property
function handleTrainingCommand(message: ParentMessage) {
  const { command, targetAccuracy } = message;
  
  console.log(`🧠 Training command: ${command} (target: ${targetAccuracy}%)`);
  
  if (command === 'deploy_model') {
    sendToParent('model_deployed', {
      accuracy: message.accuracy,
      deploymentTime: Date.now(),
      status: 'active'
    });
  } else if (command === 'initiate_retraining') {
    // Fix: Add missing type property
    handleTrainingStatus({ 
      type: 'training_status_request',
      modelId: 'enhanced_ai_v3' 
    });
  }
}
