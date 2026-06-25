#!/usr/bin/env bun
import readline from 'readline';

class HTTPPlayground {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🌐> '
    });
    
    this.history = [];
    this.baseUrl = 'https://httpbin.org';
  }

  async initialize() {
    console.clear();
    this.showBanner();
    
    console.info('🌐 HTTP Playground Ready!');
    console.info('💡 Type "help" to see available commands\n');
    
    this.rl.prompt();
    
    this.rl.on('line', async (line) => {
      await this.handleCommand(line.trim());
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.info('\n👋 Goodbye! Happy HTTP hacking!');
      process.exit(0);
    });
  }

  showBanner() {
    const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌐 HTTP PLAYGROUND                                         ║
║   ================                                           ║
║                                                               ║
║   Interactive HTTP Client Testing & Learning                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `;
    console.info(banner);
  }

  async handleCommand(input) {
    if (!input) return;
    
    this.history.push(input);
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (command) {
      case 'help':
        this.showHelp();
        break;
        
      case 'get':
        await this.handleGet(args[0]);
        break;
        
      case 'post':
        await this.handlePost(args[0], args.slice(1).join(' '));
        break;
        
      case 'put':
        await this.handlePut(args[0], args.slice(1).join(' '));
        break;
        
      case 'delete':
        await this.handleDelete(args[0]);
        break;
        
      case 'headers':
        await this.handleHeaders(args[0]);
        break;
        
      case 'status':
        await this.handleStatus(args[0]);
        break;
        
      case 'json':
        await this.handleJSON(args[0], args.slice(1).join(' '));
        break;
        
      case 'form':
        await this.handleForm(args[0]);
        break;
        
      case 'upload':
        await this.handleUpload(args[0]);
        break;
        
      case 'timeout':
        await this.handleTimeout(args[0]);
        break;
        
      case 'retry':
        await this.handleRetry(args[0], parseInt(args[1]) || 3);
        break;
        
      case 'base':
        this.setBaseUrl(args[0]);
        break;
        
      case 'history':
        this.showHistory();
        break;
        
      case 'clear':
        console.clear();
        this.showBanner();
        break;
        
      case 'exit':
      case 'quit':
        this.rl.close();
        break;
        
      default:
        console.info(`❌ Unknown command: ${command}`);
        console.info('💡 Type "help" for available commands');
        break;
    }
  }

  showHelp() {
    console.info('\n🌐 HTTP Playground Commands:');
    console.info('='.repeat(50));
    
    const commands = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'get <endpoint>', desc: 'Send GET request' },
      { cmd: 'post <endpoint> <data>', desc: 'Send POST request with data' },
      { cmd: 'put <endpoint> <data>', desc: 'Send PUT request with data' },
      { cmd: 'delete <endpoint>', desc: 'Send DELETE request' },
      { cmd: 'headers <endpoint>', desc: 'Show response headers' },
      { cmd: 'status <code>', desc: 'Test specific status code' },
      { cmd: 'json <endpoint> <data>', desc: 'Send JSON data' },
      { cmd: 'form <endpoint>', desc: 'Send form data' },
      { cmd: 'upload <endpoint>', desc: 'Upload file' },
      { cmd: 'timeout <ms>', desc: 'Test request timeout' },
      { cmd: 'retry <endpoint> <times>', desc: 'Retry failed requests' },
      { cmd: 'base <url>', desc: 'Set base URL' },
      { cmd: 'history', desc: 'Show command history' },
      { cmd: 'clear', desc: 'Clear screen' },
      { cmd: 'exit', desc: 'Exit playground' }
    ];
    
    commands.forEach(item => {
      console.info(`  ${item.cmd.padEnd(25)} ${item.desc}`);
    });
    
    console.info('\n🎯 Examples:');
    console.info('  get /get                    - GET request to /get');
    console.info('  post /post {"name":"test"} - POST JSON data');
    console.info('  status 404                  - Test 404 response');
    console.info('  base https://api.example.com - Change base URL');
  }

  async handleGet(endpoint) {
    if (!endpoint) {
      console.info('Usage: get <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`📥 GET ${url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(url);
      const endTime = Date.now();
      
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      console.info(`⏱️  Time: ${endTime - startTime}ms`);
      console.info(`📋 Content-Type: ${response.headers.get('content-type')}`);
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.info('📊 Response (JSON):');
        console.info(JSON.stringify(data, null, 2));
      } else {
        const text = await response.text();
        console.info('📄 Response (Text):');
        console.info(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      }
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handlePost(endpoint, data) {
    if (!endpoint) {
      console.info('Usage: post <endpoint> <data>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`📤 POST ${url}`);
    
    try {
      let body = data || '{}';
      let headers = { 'Content-Type': 'application/json' };
      
      // Try to parse as JSON, fallback to text
      try {
        JSON.parse(body);
      } catch {
        headers = { 'Content-Type': 'text/plain' };
      }
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      });
      const endTime = Date.now();
      
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      console.info(`⏱️  Time: ${endTime - startTime}ms`);
      
      const responseData = await response.json();
      console.info('📊 Response:');
      console.info(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handlePut(endpoint, data) {
    if (!endpoint) {
      console.info('Usage: put <endpoint> <data>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`📤 PUT ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: data || '{}'
      });
      
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.info('📊 Response:');
      console.info(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleDelete(endpoint) {
    if (!endpoint) {
      console.info('Usage: delete <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`🗑️  DELETE ${url}`);
    
    try {
      const response = await fetch(url, { method: 'DELETE' });
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      
      const responseData = await response.json();
      console.info('📊 Response:');
      console.info(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleHeaders(endpoint) {
    if (!endpoint) {
      console.info('Usage: headers <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`📋 Headers for ${url}`);
    
    try {
      const response = await fetch(url);
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      
      console.info('📋 Response Headers:');
      response.headers.forEach((value, key) => {
        console.info(`   ${key}: ${value}`);
      });
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleStatus(statusCode) {
    if (!statusCode) {
      console.info('Usage: status <code>');
      return;
    }
    
    const url = `${this.baseUrl}/status/${statusCode}`;
    console.info(`🔍 Testing status code ${statusCode}`);
    
    try {
      const response = await fetch(url);
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.info('✅ Request successful');
      } else {
        console.info('⚠️  Request failed as expected');
      }
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleJSON(endpoint, data) {
    if (!endpoint) {
      console.info('Usage: json <endpoint> <json-data>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    const jsonData = data || '{"test": true}';
    
    console.info(`📊 JSON POST ${url}`);
    console.info(`📝 Data: ${jsonData}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonData
      });
      
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.info('📊 Response:');
      console.info(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleForm(endpoint) {
    if (!endpoint) {
      console.info('Usage: form <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`📝 Form POST ${url}`);
    
    try {
      const formData = new FormData();
      formData.append('name', 'HTTP Playground');
      formData.append('message', 'Testing form data');
      formData.append('timestamp', Date.now().toString());
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.info('📊 Response:');
      console.info(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleUpload(endpoint) {
    if (!endpoint) {
      console.info('Usage: upload <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.info(`📁 File Upload ${url}`);
    
    try {
      const fileContent = 'Hello from HTTP Playground!\nThis is a test file.';
      const blob = new Blob([fileContent], { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('file', blob, 'test.txt');
      formData.append('description', 'Test upload from playground');
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      console.info(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.info('📊 Response:');
      console.info(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async handleTimeout(ms) {
    if (!ms) {
      console.info('Usage: timeout <milliseconds>');
      return;
    }
    
    const url = `${this.baseUrl}/delay/5`; // 5 second delay
    console.info(`⏱️  Testing timeout (${ms}ms) against 5s delay`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), parseInt(ms));
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.info('✅ Request completed within timeout');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.info('⏱️  Request timed out as expected');
      } else {
        console.info(`❌ Error: ${error.message}`);
      }
    }
  }

  async handleRetry(endpoint, times) {
    if (!endpoint) {
      console.info('Usage: retry <endpoint> <times>');
      return;
    }
    
    const url = `${this.baseUrl}/status/500`; // Will always fail
    console.info(`🔄 Retry ${endpoint} ${times} times`);
    
    for (let attempt = 1; attempt <= times; attempt++) {
      try {
        console.info(`📡 Attempt ${attempt}/${times}...`);
        const response = await fetch(url);
        
        if (response.ok) {
          console.info('✅ Request successful!');
          return;
        }
        
        console.info(`❌ Attempt ${attempt} failed: ${response.status}`);
      } catch (error) {
        console.info(`❌ Attempt ${attempt} error: ${error.message}`);
      }
      
      if (attempt < times) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.info(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.info(`🔄 All ${times} attempts failed`);
  }

  setBaseUrl(url) {
    if (!url) {
      console.info('Usage: base <url>');
      return;
    }
    
    this.baseUrl = url;
    console.info(`🔧 Base URL set to: ${this.baseUrl}`);
  }

  showHistory() {
    console.info('\n📜 Command History:');
    this.history.forEach((cmd, i) => {
      console.info(`${i + 1}. ${cmd}`);
    });
  }
}

// Start the HTTP playground
if (import.meta.main) {
  const playground = new HTTPPlayground();
  await playground.initialize();
}

export { HTTPPlayground };
